# Milestone 3: Frontend

## Why This Matters

The frontend is what generates traffic to your backend. No users clicking = no metrics to observe.

For observability learning, the frontend's job is simple: display polls, vote, and show results. The interesting part is watching how user actions appear in your metrics.

## Core Concepts

### Polling vs WebSockets vs SSE

To show live results, you have three options:

| Approach | How it works | Tradeoff |
|----------|--------------|----------|
| **Polling** | Client asks every N seconds | Simple, but wasteful requests |
| **WebSockets** | Persistent bidirectional connection | Complex, but efficient |
| **SSE** | Server pushes updates to client | Middle ground, one-way |

For this project, **polling** is fine. It's simple and generates predictable traffic patterns you can observe.

### Frontend in Kubernetes

In K8s, your frontend runs in nginx serving static files. Key questions:

1. **How does the browser find the backend?**
   - Option A: Backend URL baked in at build time
   - Option B: nginx proxies `/api` to backend service

2. **Option B is cleaner** — no CORS needed, one entry point.

```
Browser → nginx (frontend pod)
              │
              ├── /           → serves index.html
              ├── /assets/*   → serves static files
              └── /api/*      → proxies to backend service
```

### nginx as Reverse Proxy

```nginx
server {
    listen 80;

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:3000/api/;
    }
}
```

This means:
- Frontend calls `/api/polls` (relative URL)
- nginx forwards to `http://backend:3000/api/polls`
- No CORS issues (same origin from browser's perspective)

### React State and Effects

Think about:
- When should you fetch poll data? (on mount, on interval)
- Where does poll state live? (component state)
- How do you clean up intervals? (useEffect cleanup)

## Quiz Yourself

1. Why use nginx to proxy `/api` instead of calling backend directly?
2. If you poll every 2 seconds and have 1000 users, how many requests/second does your backend see?
3. What happens if a poll request takes longer than 2 seconds but you're polling every 2 seconds?
4. Why would you use `useEffect` cleanup for polling intervals?
5. What does `try_files $uri $uri/ /index.html` do in nginx?
6. If the backend service is named `poll-backend`, what URL does nginx proxy to?

## Your Task

### 1. Initialize React + Vite + TypeScript

Set up a new frontend project:
- Vite as the build tool
- TypeScript enabled
- Tailwind CSS for styling (optional but recommended)

### 2. API Client

Create functions to call your backend:
- `getPoll(id)` - Fetch poll data
- `vote(id, option)` - Cast a vote

Use **relative URLs** (like `/api/polls`) — nginx will proxy them.

### 3. Poll Component

Display:
- Poll question
- Options with vote buttons
- Current results (vote counts or percentages)
- Visual indicator of which option is winning

### 4. Live Updates

Fetch fresh poll data every 2 seconds:
- Start polling when component mounts
- Stop polling when component unmounts
- Consider: should you poll while the user is actively voting?

### 5. nginx Configuration

Create `nginx.conf` that:
- Serves static files from `/usr/share/nginx/html`
- Routes `/api/*` to backend service
- Handles SPA routing (all paths → index.html)

### 6. Dockerfile

Create multi-stage Dockerfile:
- Stage 1: Build with Vite (node image)
- Stage 2: Serve with nginx (nginx image)

### 7. Folder Structure

```
frontend/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── Poll.tsx
│   │   └── VoteButton.tsx
│   └── api/
│       └── polls.ts
├── index.html
├── nginx.conf
├── Dockerfile
├── package.json
└── vite.config.ts
```

## Hints

<details>
<summary>How do I poll in React?</summary>

Think about:
- `useEffect` runs when component mounts
- `setInterval` calls a function repeatedly
- Return a cleanup function from `useEffect`
- The cleanup function should `clearInterval`

</details>

<details>
<summary>nginx.conf template?</summary>

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://poll-backend:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Note: `poll-backend` is the K8s service name — it won't resolve locally.

</details>

<details>
<summary>Dockerfile template?</summary>

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

</details>

<details>
<summary>How do I show percentage bars?</summary>

Think about:
- Total votes = sum of all options
- Percentage = (option votes / total) * 100
- CSS width can be a percentage

</details>

<details>
<summary>How do I test locally if nginx proxies to poll-backend?</summary>

For local testing, either:
1. Use `docker-compose` with service names
2. Or modify nginx.conf temporarily to use `localhost:3000`
3. Or use Vite's proxy in dev mode (`vite.config.ts`)

</details>

## Verify

### Local Development (without nginx)

```bash
cd frontend
npm install
npm run dev

# Open http://localhost:5173
# Backend should be running on :3000
```

### Docker Build

```bash
# Build image
docker build -t poll-frontend:local .

# Can't fully test proxy locally (needs K8s service discovery)
# But can verify static files are served:
docker run -p 8080:80 poll-frontend:local
curl http://localhost:8080
# Should return index.html
```

### Checklist

- [ ] Can you explain the data flow: click → API call → state update → re-render?
- [ ] Can you explain why you need the useEffect cleanup?
- [ ] Can you explain what each line of nginx.conf does?
- [ ] Can you explain why the proxy approach eliminates CORS issues?
- [ ] What happens if you vote rapidly 10 times - do all votes register?

---

**Previous: [02-backend.md](02-backend.md)** | **Next: [04-docker-registry.md](04-docker-registry.md)**
