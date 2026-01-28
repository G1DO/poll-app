# Milestone 2: Backend with Metrics

## Why This Matters

The backend is the heart of your app — it handles business logic, stores data, and exposes metrics for observability.

This milestone combines:
1. Express + TypeScript setup
2. Poll API (create, vote, get results)
3. Prometheus metrics
4. Kubernetes-ready health checks
5. Dockerfile for containerization

## Core Concepts

### Health Checks in Kubernetes

Kubernetes uses probes to know if your app is working:

| Probe | Purpose | What to return |
|-------|---------|----------------|
| **Liveness** | "Is the process alive?" | 200 if running, restart if not |
| **Readiness** | "Can it handle traffic?" | 200 if ready, remove from service if not |

```
GET /health  → liveness probe
GET /ready   → readiness probe (optional: check dependencies)
```

### Prometheus Metrics Format

When Prometheus scrapes `/metrics`, it expects:

```
# HELP poll_votes_total Total votes cast
# TYPE poll_votes_total counter
poll_votes_total{poll_id="abc",option="yes"} 42
poll_votes_total{poll_id="abc",option="no"} 31
```

The `prom-client` library generates this format for you.

### Metric Types Recap

| Type | When to use | Example |
|------|-------------|---------|
| **Counter** | Things that only increase | Total votes, total requests |
| **Gauge** | Values that go up and down | Active connections, queue size |
| **Histogram** | Measuring distributions | Request latency, response sizes |

### Labels = Dimensions

Labels let you slice metrics:

```
http_requests_total{method="GET", path="/api/polls", status="200"} 150
http_requests_total{method="POST", path="/api/polls", status="201"} 23
http_requests_total{method="POST", path="/api/polls/vote", status="500"} 2
```

**Warning**: High-cardinality labels (like user_id) create explosion of time series. Keep labels bounded.

### Multi-Stage Docker Builds

```dockerfile
# Stage 1: Build (has dev dependencies)
FROM node:20 AS builder
# ... compile TypeScript

# Stage 2: Production (minimal)
FROM node:20-slim
# ... only runtime dependencies
```

Result: Smaller image, no source code, no dev tools.

## Quiz Yourself

1. What's the difference between liveness and readiness probes?
2. If readiness probe fails, what happens to the pod? What about liveness?
3. Why use Counter for "total votes" instead of Gauge?
4. You have `http_requests_total{path="/api/polls/abc123"}` — what's wrong?
5. If you observe 150ms latency in a histogram, which buckets increment?
6. Why use multi-stage Docker builds instead of just one FROM?

## Your Task

### 1. Project Structure

```
backend/
├── src/
│   ├── index.ts           # Express app entry, health endpoints
│   ├── metrics.ts         # Prometheus registry + custom metrics
│   ├── routes/
│   │   └── polls.ts       # Poll CRUD endpoints
│   ├── middleware/
│   │   └── metrics.ts     # Request duration middleware
│   └── store/
│       └── polls.ts       # In-memory storage
├── Dockerfile
├── package.json
└── tsconfig.json
```

### 2. Initialize Project

- npm init, install Express, TypeScript, prom-client
- Configure tsconfig for Node.js
- Set up build script to compile TypeScript

### 3. Health Endpoints

| Endpoint | Response | Purpose |
|----------|----------|---------|
| `GET /health` | `{"status": "ok"}` | Liveness probe |
| `GET /ready` | `{"status": "ready"}` | Readiness probe |
| `GET /metrics` | Prometheus format | Metrics scraping |

### 4. Poll API

| Endpoint | Method | Body | Response |
|----------|--------|------|----------|
| `/api/polls` | POST | `{question, options[]}` | Created poll with ID |
| `/api/polls/:id` | GET | - | Poll with vote counts |
| `/api/polls/:id/vote` | POST | `{option}` | Updated poll |

Use in-memory storage (object or Map). No database needed.

### 5. Custom Metrics

| Metric | Type | Labels |
|--------|------|--------|
| `poll_votes_total` | Counter | `poll_id`, `option` |
| `http_requests_total` | Counter | `method`, `path`, `status` |
| `http_request_duration_seconds` | Histogram | `method`, `path` |

### 6. Request Duration Middleware

Create middleware that:
- Records timestamp before handler
- Records duration after response
- Observes in histogram

**Key insight**: Use `res.on('finish', ...)` to run code after response.

### 7. Dockerfile

Create multi-stage Dockerfile:
- Stage 1: Install deps, compile TypeScript
- Stage 2: Copy compiled JS + production deps only
- Expose port 3000
- CMD to run the app

### 8. Seed Data

On startup, create a default poll so there's something to vote on.

## Hints

<details>
<summary>How do I set up prom-client?</summary>

```typescript
import { Registry, collectDefaultMetrics, Counter, Histogram } from 'prom-client';

const register = new Registry();
collectDefaultMetrics({ register });

// Export register for /metrics endpoint
```

</details>

<details>
<summary>How do I create a Counter with labels?</summary>

```typescript
const votesCounter = new Counter({
  name: 'poll_votes_total',
  help: 'Total votes cast',
  labelNames: ['poll_id', 'option'],
  registers: [register],
});

// When voting:
votesCounter.inc({ poll_id: 'abc', option: 'yes' });
```

</details>

<details>
<summary>How do I measure request duration?</summary>

```typescript
const histogram = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Request duration',
  labelNames: ['method', 'path'],
  registers: [register],
});

// In middleware:
const end = histogram.startTimer();
res.on('finish', () => {
  end({ method: req.method, path: req.route?.path || req.path });
});
```

</details>

<details>
<summary>How do I normalize the path label?</summary>

Use `req.route?.path` to get the pattern (like `/api/polls/:id`) instead of the actual URL (like `/api/polls/abc123`).

If `req.route` is undefined, fall back to `req.path`.

</details>

<details>
<summary>Multi-stage Dockerfile template?</summary>

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

</details>

## Verify

### Local Testing

```bash
cd backend

# Install and build
npm install
npm run build

# Run
npm start

# Test health
curl http://localhost:3000/health
curl http://localhost:3000/ready

# Test metrics
curl http://localhost:3000/metrics

# Test API
curl -X POST http://localhost:3000/api/polls \
  -H "Content-Type: application/json" \
  -d '{"question": "Tabs or spaces?", "options": ["Tabs", "Spaces"]}'

curl http://localhost:3000/api/polls/<ID>

curl -X POST http://localhost:3000/api/polls/<ID>/vote \
  -H "Content-Type: application/json" \
  -d '{"option": "Tabs"}'

# Check vote metric increased
curl http://localhost:3000/metrics | grep poll_votes
```

### Docker Testing

```bash
# Build image
docker build -t poll-backend:local .

# Run container
docker run -p 3000:3000 poll-backend:local

# Test same endpoints
curl http://localhost:3000/health
```

### Checklist

- [ ] Can you explain every line of your Dockerfile?
- [ ] Can you explain the difference between `/health` and `/ready`?
- [ ] Does `/metrics` show your custom metrics AND Node.js default metrics?
- [ ] Does `poll_votes_total` increment when you vote?
- [ ] Does `http_request_duration_seconds` show request latencies?
- [ ] What happens if you vote for an option that doesn't exist?

---

**Previous: [01-ec2-k3s-setup.md](01-ec2-k3s-setup.md)** | **Next: [03-frontend.md](03-frontend.md)**
