# Overview: Poll App with Observability on k3s

## What You're Building

A voting application deployed to Kubernetes (k3s) on EC2, instrumented with Prometheus metrics, visualized in Grafana. Production-grade patterns on a single server.

## Why Kubernetes?

Docker Compose is great for local development. But production systems need:
- Self-healing (restart crashed containers)
- Scaling (run multiple replicas)
- Rolling updates (zero-downtime deploys)
- Service discovery (containers find each other)
- Health checks (automatic traffic routing)

Kubernetes provides all of this. k3s is Kubernetes — just packaged better.

## Why k3s?

| Feature | k3s | Full K8s (kubeadm) | EKS |
|---------|-----|-------------------|-----|
| Setup time | 30 seconds | 30+ minutes | 15+ minutes |
| Memory usage | ~512MB | ~2GB | N/A (managed) |
| Single binary | Yes | No | N/A |
| Production ready | Yes | Yes | Yes |
| Cost | Just EC2 | Just EC2 | $75/mo + EC2 |

k3s strips out legacy features, bundles everything, and runs on a single node or scales to clusters.

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
│  │   │  └─────────────┘       └─────────────┘                         │  │ │
│  │   │         │                     │                                │  │ │
│  │   │         ▼                     ▼                                │  │ │
│  │   │     Service               Service                              │  │ │
│  │   │    NodePort              ClusterIP                             │  │ │
│  │   │     :30080                                                     │  │ │
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
                    │
    You access:     │
    ├── App:        http://<EC2-IP>:30080
    ├── Prometheus: http://<EC2-IP>:30090
    └── Grafana:    http://<EC2-IP>:30030
```

## Key Kubernetes Concepts

| Concept | What It Is | Analogy |
|---------|-----------|---------|
| **Pod** | Smallest unit, wraps container(s) | A single running instance |
| **Deployment** | Manages pod replicas | "Run 2 copies of this app" |
| **Service** | Stable network endpoint | DNS name for your pods |
| **Namespace** | Logical isolation | Folders for resources |
| **NodePort** | Exposes service externally | Port on the host machine |
| **ConfigMap** | External configuration | Environment variables |

## How Prometheus Works in Kubernetes

In Docker Compose, you manually configure Prometheus to scrape targets.

In Kubernetes with Prometheus Operator:
1. You create a **ServiceMonitor** (custom resource)
2. ServiceMonitor says "scrape pods with label X on port Y"
3. Prometheus discovers and scrapes automatically

This is **service discovery** — Prometheus finds your app without hardcoded IPs.

## Metric Types (Review)

| Type | What it does | Example | Key property |
|------|--------------|---------|--------------|
| **Counter** | Only goes up | Total requests | Monotonically increasing |
| **Gauge** | Goes up and down | Active connections | Point-in-time value |
| **Histogram** | Buckets values | Request latency | Distribution of values |

## Quiz Yourself Before Starting

1. What's the difference between a Pod and a container?
2. Why would you want 2 replicas of your backend instead of 1?
3. If a Pod crashes, what happens? Who restarts it?
4. Why use NodePort instead of exposing the container port directly?
5. What's the advantage of ServiceMonitor over hardcoded Prometheus config?
6. Your backend runs on 2 pods. How does the frontend know which one to call?

## Your Journey

| Milestone | You'll Learn |
|-----------|--------------|
| M1 | EC2 setup + k3s installation |
| M2 | Backend with metrics + Dockerfile |
| M3 | Frontend + Dockerfile |
| M4 | Pushing images to Docker Hub |
| M5 | Kubernetes manifests (Deployment, Service) |
| M6 | Installing Prometheus + Grafana with Helm |
| M7 | ServiceMonitor — connecting app to Prometheus |
| M8 | Building Grafana dashboards |
| M9 | Chaos engineering — breaking things on purpose |

## Success Criteria

By the end, you should be able to answer:

- "How do I deploy a containerized app to Kubernetes?"
- "How does Prometheus discover what to scrape in K8s?"
- "What happens when a Pod crashes?"
- "How do I see request latency percentiles?"
- "Is my app healthy right now?" (by looking at dashboard, not logs)

---

**Next: [01-ec2-k3s-setup.md](01-ec2-k3s-setup.md)**
