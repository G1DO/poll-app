# Poll App with Observability on k3s

A full-stack TypeScript voting app deployed to Kubernetes (k3s), instrumented with Prometheus metrics, visualized in Grafana. Built for learning production observability patterns.

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
│  │   │  │   nginx     │       │   NestJS    │                         │  │ │
│  │   │  └─────────────┘       └─────────────┘                         │  │ │
│  │   │         │                     │                                │  │ │
│  │   │    NodePort              ClusterIP                             │  │ │
│  │   │     :30080                :3000                                │  │ │
│  │   └─────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                        │ │
│  │   ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │   │                   monitoring namespace                          │  │ │
│  │   │                                                                 │  │ │
│  │   │  ┌─────────────┐       ┌─────────────┐                         │  │ │
│  │   │  │ Prometheus  │◄──────│  Grafana    │                         │  │ │
│  │   │  │  NodePort   │       │  NodePort   │                         │  │ │
│  │   │  │   :30090    │       │   :30030    │                         │  │ │
│  │   │  └─────────────┘       └─────────────┘                         │  │ │
│  │   └─────────────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘

Access:
  App:        http://<EC2-IP>:30080
  Prometheus: http://<EC2-IP>:30090
  Grafana:    http://<EC2-IP>:30030
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Infrastructure | AWS EC2 (t3.medium), k3s |
| Frontend | React 18, TypeScript, Vite, Tailwind |
| Backend | NestJS, TypeScript, prom-client |
| Container | Docker, Docker Hub |
| Orchestration | Kubernetes (k3s) |
| Metrics | Prometheus (kube-prometheus-stack) |
| Visualization | Grafana |

## Project Structure

```
poll-app/
├── backend/
│   ├── src/
│   │   ├── main.ts              # NestJS entry point
│   │   ├── app.module.ts        # Root module
│   │   ├── polls/
│   │   │   ├── polls.module.ts
│   │   │   ├── polls.controller.ts
│   │   │   └── polls.service.ts
│   │   └── metrics/
│   │       ├── metrics.module.ts
│   │       ├── metrics.controller.ts
│   │       └── metrics.service.ts
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   └── Poll.tsx
│   │   └── api/
│   │       └── polls.ts
│   ├── nginx.conf
│   ├── Dockerfile
│   └── package.json
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
│       ├── main.tf            # VPC, EC2, security groups, k3s install
│       ├── variables.tf       # Instance type, region configuration
│       └── outputs.tf         # Public IP, SSH key outputs
│
├── scripts/
│   └── load-test.sh
│
├── grafana/
│   └── dashboard.json
│
├── docs/                      # Learning documentation
│   ├── 00-overview.md
│   ├── 01-ec2-k3s-setup.md
│   ├── 02-backend.md
│   ├── 03-frontend.md
│   ├── 04-docker-registry.md
│   ├── 05-kubernetes-manifests.md
│   ├── 06-prometheus-grafana.md
│   ├── 07-servicemonitor.md
│   ├── 08-grafana-dashboard.md
│   └── 09-chaos-learning.md
│
├── PLAN.md
└── README.md
```

## Metrics Exposed

| Metric | Type | Labels | Purpose |
|--------|------|--------|---------|
| `poll_votes_total` | Counter | `poll_id`, `option` | Votes per option |
| `http_requests_total` | Counter | `method`, `path`, `status` | Request count |
| `http_request_duration_seconds` | Histogram | `method`, `path` | Request latency |

Plus automatic Kubernetes metrics from kube-prometheus-stack:
- Container CPU/memory (cAdvisor)
- Pod status, restarts (kube-state-metrics)
- Node resources (node-exporter)

## Learning Path

This project is structured as a 9-milestone learning journey. Each milestone has documentation in `docs/` with:
- **Concepts** explained before implementation
- **Quiz questions** to test understanding
- **Implementation tasks** (hints, not solutions)
- **Verification steps**

| Milestone | Topic | Doc |
|-----------|-------|-----|
| M1 | EC2 + k3s Setup | [01-ec2-k3s-setup.md](docs/01-ec2-k3s-setup.md) |
| M2 | Backend + Metrics | [02-backend.md](docs/02-backend.md) |
| M3 | Frontend + nginx | [03-frontend.md](docs/03-frontend.md) |
| M4 | Docker Registry | [04-docker-registry.md](docs/04-docker-registry.md) |
| M5 | Kubernetes Manifests | [05-kubernetes-manifests.md](docs/05-kubernetes-manifests.md) |
| M6 | Prometheus + Grafana | [06-prometheus-grafana.md](docs/06-prometheus-grafana.md) |
| M7 | ServiceMonitor | [07-servicemonitor.md](docs/07-servicemonitor.md) |
| M8 | Grafana Dashboard | [08-grafana-dashboard.md](docs/08-grafana-dashboard.md) |
| M9 | Chaos Engineering | [09-chaos-learning.md](docs/09-chaos-learning.md) |

Start with [00-overview.md](docs/00-overview.md) for the big picture.

## Quick Start (if you just want to run it)

### Prerequisites
- AWS account with EC2 access
- Docker Hub account
- Docker installed locally

### 1. Launch EC2 + Install k3s

**Option A: Using Terraform (Recommended)**
```bash
cd terraform/aws
terraform init
terraform apply

# Get outputs
terraform output server_public_ip
terraform output -raw private_key > poll-app-key.pem
chmod 400 poll-app-key.pem

# SSH in (k3s already installed via user_data)
ssh -i poll-app-key.pem ubuntu@<EC2-PUBLIC-IP>
```

**Option B: Manual Setup**
```bash
# Launch t3.medium Ubuntu 22.04 (ami-0c7217cdde317cfec in us-east-1)
# Open ports: 22, 30080, 30090, 30030

# SSH in and install k3s
curl -sfL https://get.k3s.io | sh -
```

**Both options: Setup kubectl**
```bash
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER:$USER ~/.kube/config
```

### 2. Build & Push Images

```bash
# Backend
cd backend
docker build -t yourusername/poll-backend:v1 .
docker push yourusername/poll-backend:v1

# Frontend
cd ../frontend
docker build -t yourusername/poll-frontend:v1 .
docker push yourusername/poll-frontend:v1
```

### 3. Deploy to Kubernetes

```bash
# Update k8s/*.yaml with your Docker Hub username
kubectl apply -f k8s/ --recursive
```

### 4. Install Monitoring Stack

```bash
# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Add repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts

# Install
helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.service.type=NodePort \
  --set prometheus.service.nodePort=30090 \
  --set grafana.service.type=NodePort \
  --set grafana.service.nodePort=30030
```

### 5. Connect App to Prometheus

```bash
kubectl apply -f k8s/backend/servicemonitor.yaml
```

### 6. Access

- **App**: `http://<EC2-IP>:30080`
- **Prometheus**: `http://<EC2-IP>:30090`
- **Grafana**: `http://<EC2-IP>:30030` (admin/prom-operator)

## Key Concepts Covered

### Kubernetes
- Pods, Deployments, Services
- Namespaces for isolation
- NodePort for external access
- Health probes (liveness/readiness)
- Labels and selectors

### Observability
- Prometheus metrics (Counter, Gauge, Histogram)
- PromQL queries
- Grafana dashboards
- ServiceMonitor for automatic discovery

### Production Patterns
- Multi-stage Docker builds
- Container image registries
- Helm for package management
- Self-healing infrastructure

## PromQL Cheat Sheet

```promql
# Votes per second
rate(poll_votes_total[1m])

# Total votes by option
sum by (option) (poll_votes_total)

# p95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate percentage
sum(rate(http_requests_total{status=~"5.."}[5m]))
  / sum(rate(http_requests_total[5m])) * 100

# Pod CPU usage
sum by (pod) (rate(container_cpu_usage_seconds_total{namespace="poll-app"}[5m]))

# Pod memory
sum by (pod) (container_memory_usage_bytes{namespace="poll-app"})
```

## Cost Estimate

| Resource | Spec | Monthly Cost |
|----------|------|--------------|
| EC2 | t3.medium (2 vCPU, 4GB) | ~$30 |
| EBS | 30GB gp3 | ~$2.50 |
| **Total** | | **~$35/month** |

Use spot instances for ~70% savings.

## Success Criteria

By the end of this project, you should be able to:

1. Deploy containerized apps to Kubernetes
2. Explain K8s primitives (Pod, Deployment, Service, Namespace)
3. Instrument any app with Prometheus metrics
4. Write PromQL queries
5. Build Grafana dashboards
6. Debug production issues using metrics (not just logs)
7. Explain how Prometheus discovers targets in K8s

## License

MIT
