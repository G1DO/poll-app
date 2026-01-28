# Poll App with Observability on k3s

## Goal
Build a full-stack TypeScript voting app, deploy to Kubernetes (k3s) on EC2, instrument with Prometheus, visualize in Grafana. Real-world production patterns.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              EC2 INSTANCE                                   │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                           k3s CLUSTER                                  │ │
│  │                                                                        │ │
│  │   ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │   │                     poll-app namespace                          │  │ │
│  │   │                                                                 │  │ │
│  │   │  ┌─────────────┐       ┌─────────────┐                         │  │ │
│  │   │  │   frontend  │       │   backend   │                         │  │ │
│  │   │  │   Pod(s)    │──────►│   Pod(s)    │────► /metrics           │  │ │
│  │   │  │             │       │             │                         │  │ │
│  │   │  └─────────────┘       └─────────────┘                         │  │ │
│  │   │         │                     │                                │  │ │
│  │   │         │                     │ ServiceMonitor                 │  │ │
│  │   │         ▼                     ▼                                │  │ │
│  │   │  ┌─────────────┐       ┌─────────────┐                         │  │ │
│  │   │  │   Service   │       │   Service   │                         │  │ │
│  │   │  │  ClusterIP  │       │  ClusterIP  │                         │  │ │
│  │   │  └─────────────┘       └─────────────┘                         │  │ │
│  │   │                                                                 │  │ │
│  │   └─────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                        │ │
│  │   ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │   │                   monitoring namespace                          │  │ │
│  │   │                                                                 │  │ │
│  │   │  ┌─────────────┐       ┌─────────────┐                         │  │ │
│  │   │  │ Prometheus  │◄──────│  Grafana    │                         │  │ │
│  │   │  │             │       │             │                         │  │ │
│  │   │  └─────────────┘       └─────────────┘                         │  │ │
│  │   │         │                     │                                │  │ │
│  │   │         ▼                     ▼                                │  │ │
│  │   │     NodePort              NodePort                             │  │ │
│  │   │      :30090                :30030                              │  │ │
│  │   │                                                                 │  │ │
│  │   └─────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                    │
    You access:     │
    ├── App:        http://<EC2-IP>:30080
    ├── Prometheus: http://<EC2-IP>:30090
    └── Grafana:    http://<EC2-IP>:30030
```

---

## Why k3s?

| Feature | k3s | Full K8s (kubeadm) | EKS |
|---------|-----|-------------------|-----|
| Setup time | 30 seconds | 30+ minutes | 15+ minutes |
| Memory usage | ~512MB | ~2GB | N/A (managed) |
| Single binary | Yes | No | N/A |
| Production ready | Yes | Yes | Yes |
| Cost | Just EC2 | Just EC2 | $75/mo + EC2 |
| Cert management | Built-in | Manual | Managed |

k3s is real Kubernetes — just packaged better.

---

## Tech Stack

| Layer          | Technology                              |
|----------------|-----------------------------------------|
| Infrastructure | EC2 (t3.medium), k3s                    |
| Frontend       | React 18, TypeScript, Vite, Tailwind    |
| Backend        | Express, TypeScript, prom-client        |
| Container      | Docker, pushed to Docker Hub            |
| Orchestration  | Kubernetes (k3s)                        |
| Metrics        | Prometheus (kube-prometheus-stack)      |
| Visualization  | Grafana                                 |

---

## Metrics We'll Expose

| Metric Name                        | Type      | Labels                     | Purpose                        |
|------------------------------------|-----------|----------------------------|--------------------------------|
| `poll_votes_total`                 | Counter   | `poll_id`, `option`        | Total votes per option         |
| `http_requests_total`              | Counter   | `method`, `path`, `status` | Request count by endpoint      |
| `http_request_duration_seconds`    | Histogram | `method`, `path`           | Request latency distribution   |
| `http_active_connections`          | Gauge     | -                          | Current open connections       |

Plus automatic K8s metrics:
- Container CPU/memory (cAdvisor)
- Pod status, restarts
- Node resources

---

## Milestones

### M1: EC2 + k3s Setup (30-45 min)

**Option A: Using Terraform (Recommended)**
- [ ] Navigate to `terraform/aws/`
- [ ] Run `terraform init && terraform apply`
- [ ] Extract SSH key: `terraform output -raw private_key > poll-app-key.pem`
- [ ] Get public IP: `terraform output server_public_ip`
- [ ] SSH in: `ssh -i poll-app-key.pem ubuntu@<IP>`

**Option B: Manual Setup**
- [ ] Launch EC2 instance (t3.medium, Ubuntu 22.04 - ami-0c7217cdde317cfec in us-east-1)
- [ ] Configure security group:
  - 22 (SSH)
  - 30080 (App)
  - 30090 (Prometheus)
  - 30030 (Grafana)
  - 6443 (K8s API - optional, for local kubectl)
- [ ] SSH in, install k3s:
  ```bash
  curl -sfL https://get.k3s.io | sh -
  ```

**Both options:**
- [ ] Verify cluster:
  ```bash
  sudo kubectl get nodes
  ```
- [ ] Set up kubeconfig for non-root:
  ```bash
  mkdir -p ~/.kube
  sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
  sudo chown $USER ~/.kube/config
  ```

**Deliverable:** Running k3s cluster on EC2

---

### M2: Backend with Metrics (1-2 hours)
- [ ] Initialize Express + TypeScript project
- [ ] Create health endpoints:
  - `GET /health` (liveness)
  - `GET /ready` (readiness)
- [ ] Add prom-client, expose `/metrics`
- [ ] Implement Poll API:
  - `POST /api/polls` - create poll
  - `GET /api/polls/:id` - get poll
  - `POST /api/polls/:id/vote` - cast vote
- [ ] Add custom metrics:
  - `poll_votes_total` counter
  - `http_request_duration_seconds` histogram
- [ ] Create Dockerfile
- [ ] Test locally with Docker

**Deliverable:** Containerized backend with Prometheus metrics

---

### M3: Frontend (1-1.5 hours)
- [ ] Initialize React + Vite + TypeScript
- [ ] Poll display component (shows results as bars)
- [ ] Vote buttons
- [ ] Auto-refresh results every 2 seconds
- [ ] Simple styling (Tailwind)
- [ ] Create Dockerfile (nginx-based)
- [ ] Test locally

**Deliverable:** Containerized frontend

---

### M4: Push to Registry (15 min)
- [ ] Create Docker Hub account (if needed)
- [ ] Tag images:
  ```bash
  docker tag poll-backend:latest yourusername/poll-backend:v1
  docker tag poll-frontend:latest yourusername/poll-frontend:v1
  ```
- [ ] Push images:
  ```bash
  docker push yourusername/poll-backend:v1
  docker push yourusername/poll-frontend:v1
  ```

**Deliverable:** Images available for K8s to pull

---

### M5: Kubernetes Manifests (1-1.5 hours)
- [ ] Create namespace: `poll-app`
- [ ] Backend manifests:
  - Deployment (2 replicas)
  - Service (ClusterIP)
  - ConfigMap (if needed)
- [ ] Frontend manifests:
  - Deployment (2 replicas)
  - Service (NodePort :30080)
- [ ] Apply and verify:
  ```bash
  kubectl apply -f k8s/
  kubectl get pods -n poll-app
  ```
- [ ] Test app via `http://<EC2-IP>:30080`

**Deliverable:** App running on Kubernetes

---

### M6: Prometheus + Grafana (1 hour)
- [ ] Install kube-prometheus-stack via Helm:
  ```bash
  # Install Helm
  curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

  # Add repo
  helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
  helm repo update

  # Install (with NodePort for access)
  helm install monitoring prometheus-community/kube-prometheus-stack \
    --namespace monitoring \
    --create-namespace \
    --set prometheus.service.type=NodePort \
    --set prometheus.service.nodePort=30090 \
    --set grafana.service.type=NodePort \
    --set grafana.service.nodePort=30030
  ```
- [ ] Verify:
  ```bash
  kubectl get pods -n monitoring
  ```
- [ ] Access Prometheus: `http://<EC2-IP>:30090`
- [ ] Access Grafana: `http://<EC2-IP>:30030` (admin/prom-operator)

**Deliverable:** Monitoring stack running

---

### M7: Connect App to Prometheus (30-45 min)
- [ ] Create ServiceMonitor for backend:
  ```yaml
  apiVersion: monitoring.coreos.com/v1
  kind: ServiceMonitor
  metadata:
    name: poll-backend
    namespace: poll-app
    labels:
      release: monitoring  # Must match Prometheus selector
  spec:
    selector:
      matchLabels:
        app: poll-backend
    endpoints:
      - port: http
        path: /metrics
        interval: 15s
  ```
- [ ] Apply and verify target appears in Prometheus
- [ ] Run PromQL queries:
  ```promql
  poll_votes_total
  rate(http_requests_total[1m])
  ```

**Deliverable:** Prometheus scraping app metrics

---

### M8: Grafana Dashboard (1 hour)
- [ ] Create dashboard with panels:
  - Votes per second: `rate(poll_votes_total[1m])`
  - Total votes by option: `poll_votes_total`
  - Request latency p95: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`
  - Pod CPU/memory (from cAdvisor)
  - Pod restart count
- [ ] Set auto-refresh to 5s
- [ ] Export dashboard JSON for version control

**Deliverable:** Production-style observability dashboard

---

### M9: Load Test + Chaos (30 min)
- [ ] Write script to spam votes
- [ ] Watch metrics react in Grafana
- [ ] Chaos experiments:
  - Kill a pod: `kubectl delete pod <pod-name> -n poll-app`
  - Watch recovery, see restart metrics
  - Add artificial latency in code
  - Observe latency percentiles spike
- [ ] Learn what "normal" looks like vs problems

**Deliverable:** Intuition for reading production metrics

---

## Project Structure

```
poll-app/
├── backend/
│   ├── src/
│   │   ├── index.ts
│   │   ├── metrics.ts
│   │   ├── routes/
│   │   │   └── polls.ts
│   │   └── store/
│   │       └── polls.ts
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   └── components/
│   │       └── Poll.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── vite.config.ts
│
├── k8s/
│   ├── namespace.yaml
│   ├── backend/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── servicemonitor.yaml
│   └── frontend/
│       ├── deployment.yaml
│       └── service.yaml
│
├── terraform/
│   └── aws/
│       ├── main.tf           # VPC, EC2, security groups, k3s install
│       ├── variables.tf      # Instance type (t3.medium), region (us-east-1)
│       └── outputs.tf        # Public IP, SSH private key
│
├── scripts/
│   ├── load-test.sh
│   └── setup-ec2.sh
│
├── grafana/
│   └── dashboard.json
│
└── README.md
```

---

## Key K8s Concepts You'll Learn

| Concept | What It Does | Where You'll Use It |
|---------|--------------|---------------------|
| **Pod** | Smallest deployable unit | Your app containers |
| **Deployment** | Manages pod replicas, rolling updates | Backend/frontend |
| **Service** | Stable network endpoint for pods | Internal communication |
| **NodePort** | Exposes service on node's IP | External access |
| **Namespace** | Logical isolation | `poll-app`, `monitoring` |
| **ConfigMap** | External configuration | App settings |
| **ServiceMonitor** | Tells Prometheus what to scrape | Connecting app to Prometheus |
| **Helm** | Package manager for K8s | Installing Prometheus stack |

---

## PromQL Queries Cheat Sheet

```promql
# Votes per second (rate of counter)
rate(poll_votes_total[1m])

# Total votes by option
sum by (option) (poll_votes_total)

# Request rate by status
sum by (status) (rate(http_requests_total[5m]))

# p50, p95, p99 latency
histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Error rate percentage
sum(rate(http_requests_total{status=~"5.."}[5m])) 
  / sum(rate(http_requests_total[5m])) * 100

# Pod CPU usage
sum by (pod) (rate(container_cpu_usage_seconds_total{namespace="poll-app"}[5m]))

# Pod memory
sum by (pod) (container_memory_usage_bytes{namespace="poll-app"})
```

---

## EC2 Security Group Rules

| Port  | Protocol | Source    | Purpose          |
|-------|----------|-----------|------------------|
| 22    | TCP      | 0.0.0.0/0 | SSH              |
| 30080 | TCP      | 0.0.0.0/0 | App frontend     |
| 30090 | TCP      | 0.0.0.0/0 | Prometheus UI    |
| 30030 | TCP      | 0.0.0.0/0 | Grafana UI       |
| 6443  | TCP      | 0.0.0.0/0 | K8s API          |

**Note**: The Terraform config opens all ports to 0.0.0.0/0 for learning convenience. In production, restrict SSH and monitoring ports (30090, 30030, 6443) to your IP only.

---

## Cost Estimate

| Resource | Spec | Monthly Cost |
|----------|------|--------------|
| EC2 | t3.medium (2 vCPU, 4GB) | ~$30 |
| EBS | 30GB gp3 | ~$2.50 |
| Data transfer | ~10GB | ~$1 |
| **Total** | | **~$35/month** |

Tip: Use spot instance for ~70% savings if you're okay with interruptions.

---

## Success Criteria

By the end, you should be able to:

1. **Deploy** a containerized app to Kubernetes
2. **Explain** K8s primitives (Pod, Deployment, Service, Namespace)
3. **Instrument** any app with Prometheus metrics
4. **Query** metrics with PromQL
5. **Build** Grafana dashboards
6. **Debug** production issues using observability data
7. **Explain** how Prometheus service discovery works in K8s

---

## Time Estimate

| Milestone | Time     |
|-----------|----------|
| M1        | 45 min   |
| M2-M3     | 2.5-3 hrs|
| M4-M5     | 1.5 hrs  |
| M6-M7     | 1.5 hrs  |
| M8-M9     | 1.5 hrs  |
| **Total** | **8-10 hrs** |

---

## Next Step

Start with M1: Launch EC2 and install k3s.

Do you have AWS CLI configured, or do you want to use the console?