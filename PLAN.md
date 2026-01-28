# Poll App with Observability Stack

## Goal
Build a full-stack TypeScript voting app instrumented with Prometheus metrics, visualized in Grafana. Learn observability by doing.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              EC2 INSTANCE                               │
│                                                                         │
│  ┌──────────────────┐         ┌──────────────────┐                     │
│  │     Frontend     │  HTTP   │     Backend      │                     │
│  │  React + Vite    │────────►│  Express + TS    │                     │
│  │     :5173        │         │     :3000        │                     │
│  └──────────────────┘         └────────┬─────────┘                     │
│                                        │                                │
│                                        │ /metrics                       │
│                                        ▼                                │
│                               ┌──────────────────┐                     │
│                               │    Prometheus    │                     │
│                               │      :9090       │                     │
│                               └────────┬─────────┘                     │
│                                        │                                │
│                                        ▼                                │
│                               ┌──────────────────┐                     │
│                               │     Grafana      │                     │
│                               │      :3001       │                     │
│                               └──────────────────┘                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Frontend       | React 18, TypeScript, Vite, Tailwind|
| Backend        | Express, TypeScript, prom-client    |
| Metrics        | Prometheus                          |
| Visualization  | Grafana                             |
| Deployment     | Docker Compose on EC2               |

---

## Metrics We'll Expose

| Metric Name                        | Type      | Labels                     | Purpose                        |
|------------------------------------|-----------|----------------------------|--------------------------------|
| `poll_votes_total`                 | Counter   | `poll_id`, `option`        | Total votes per option         |
| `poll_votes_created`               | Counter   | `poll_id`                  | Total votes cast (all options) |
| `http_requests_total`              | Counter   | `method`, `path`, `status` | Request count by endpoint      |
| `http_request_duration_seconds`    | Histogram | `method`, `path`           | Request latency distribution   |
| `http_active_connections`          | Gauge     | -                          | Current open connections       |

---

## Milestones

### M1: Backend Foundation (1-2 hours)
- [ ] Initialize Express + TypeScript project
- [ ] Set up basic folder structure
- [ ] Create health check endpoint (`GET /health`)
- [ ] Add prom-client, expose `/metrics` endpoint
- [ ] Add default metrics (nodejs runtime metrics)
- [ ] Test: `curl localhost:3000/metrics` shows output

**Deliverable:** Backend that exposes Prometheus metrics

### M2: Poll API (1-2 hours)
- [ ] In-memory poll storage (no DB needed)
- [ ] `POST /api/polls` - create a poll
- [ ] `GET /api/polls/:id` - get poll with current results
- [ ] `POST /api/polls/:id/vote` - cast a vote
- [ ] Add custom metrics:
  - `poll_votes_total` counter
  - `http_request_duration_seconds` histogram
- [ ] Test: Create poll, vote, see metrics increment

**Deliverable:** Functional API with observable metrics

### M3: Frontend (1-2 hours)
- [ ] Initialize React + Vite + TypeScript
- [ ] Create poll display component
- [ ] Create voting buttons
- [ ] Show live results (poll every 2s or use SSE)
- [ ] Simple styling with Tailwind
- [ ] Seed with default poll on backend startup

**Deliverable:** Working UI to create polls and vote

### M4: Dockerize (30 min)
- [ ] Dockerfile for backend
- [ ] Dockerfile for frontend (nginx serving build)
- [ ] docker-compose.yml with both services
- [ ] Test locally: `docker compose up`

**Deliverable:** Single command runs entire app

### M5: Prometheus Setup (30 min)
- [ ] Add Prometheus to docker-compose
- [ ] Configure `prometheus.yml` to scrape backend
- [ ] Verify targets in Prometheus UI (`:9090/targets`)
- [ ] Run sample PromQL queries

**Deliverable:** Prometheus scraping app metrics

### M6: Grafana Dashboards (1 hour)
- [ ] Add Grafana to docker-compose
- [ ] Configure Prometheus as data source
- [ ] Build dashboard with panels:
  - Votes per second (rate)
  - Total votes by option (bar chart)
  - Request latency (p50, p95, p99)
  - Request rate by status code
  - Active connections gauge
- [ ] Set up auto-refresh (5s)

**Deliverable:** Real-time observability dashboard

### M7: Deploy to EC2 (1 hour)
- [ ] Launch EC2 instance (t3.medium, Ubuntu 24.04)
- [ ] Configure security groups (3000, 3001, 5173, 9090)
- [ ] Install Docker + Docker Compose
- [ ] Clone repo, run `docker compose up -d`
- [ ] Access Grafana from browser

**Deliverable:** Live app with observability on AWS

### M8: Chaos & Learning (30 min)
- [ ] Write a script to spam votes (load test)
- [ ] Watch metrics react in real-time
- [ ] Intentionally break things:
  - Add artificial latency
  - Return errors randomly
- [ ] Observe how metrics reveal problems

**Deliverable:** Intuition for reading metrics

---

## Project Structure

```
poll-app/
├── backend/
│   ├── src/
│   │   ├── index.ts           # Express app entry
│   │   ├── metrics.ts         # Prometheus setup
│   │   ├── routes/
│   │   │   └── polls.ts       # Poll endpoints
│   │   ├── middleware/
│   │   │   └── metrics.ts     # Request duration middleware
│   │   └── store/
│   │       └── polls.ts       # In-memory storage
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Poll.tsx
│   │   │   └── VoteButton.tsx
│   │   └── api/
│   │       └── polls.ts
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
│
├── prometheus/
│   └── prometheus.yml
│
├── grafana/
│   └── provisioning/
│       ├── datasources/
│       │   └── prometheus.yml
│       └── dashboards/
│           └── poll-dashboard.json
│
├── docker-compose.yml
└── README.md
```

---

## Key Files Preview

### prometheus.yml
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'poll-backend'
    static_configs:
      - targets: ['backend:3000']
```

### docker-compose.yml
```yaml
services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"

  frontend:
    build: ./frontend
    ports:
      - "5173:80"

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning
```

---

## PromQL Queries for Dashboard

```promql
# Votes per second
rate(poll_votes_total[1m])

# Total votes by option
poll_votes_total

# Request rate
rate(http_requests_total[1m])

# p95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate percentage
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100
```

---

## Success Criteria

By the end, you should be able to:

1. **Explain** the difference between Counter, Gauge, and Histogram
2. **Write** custom Prometheus metrics in any app
3. **Query** metrics using PromQL
4. **Build** Grafana dashboards from scratch
5. **Interpret** what metrics tell you about app health
6. **Debug** issues by looking at dashboards (not just logs)

---

## Time Estimate

| Milestone | Time     |
|-----------|----------|
| M1-M2     | 2-3 hrs  |
| M3        | 1-2 hrs  |
| M4-M6     | 2 hrs    |
| M7-M8     | 1.5 hrs  |
| **Total** | **6-8 hrs** |

---

## Next Step

Start with M1: Initialize the backend and get `/metrics` working.

```bash
mkdir poll-app && cd poll-app
mkdir backend && cd backend
npm init -y
npm install express prom-client
npm install -D typescript @types/express @types/node ts-node nodemon
npx tsc --init
```