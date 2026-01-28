# Milestone 5: Kubernetes Manifests

## Why This Matters

Kubernetes doesn't know about your Docker images automatically. You need to tell it:
- What containers to run (Deployment)
- How to reach them (Service)
- How to organize them (Namespace)

This is done through YAML manifests — declarative configuration that describes your desired state.

## Core Concepts

### Declarative vs Imperative

**Imperative** (telling K8s what to do):
```bash
kubectl run backend --image=myapp/backend:v1
kubectl expose pod backend --port=3000
```

**Declarative** (telling K8s what you want):
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 2
  ...
```

Declarative is better — it's version-controlled, reproducible, and self-documenting.

### The Big Three Resources

```
┌─────────────────────────────────────────────────────────┐
│                      Namespace                          │
│  (logical isolation - like folders)                     │
│                                                         │
│   ┌─────────────────────────────────────────────────┐  │
│   │                  Deployment                      │  │
│   │  (manages replica pods)                          │  │
│   │                                                  │  │
│   │   ┌─────────┐  ┌─────────┐  ┌─────────┐        │  │
│   │   │  Pod 1  │  │  Pod 2  │  │  Pod 3  │        │  │
│   │   └─────────┘  └─────────┘  └─────────┘        │  │
│   └─────────────────────────────────────────────────┘  │
│                          │                              │
│                          ▼                              │
│   ┌─────────────────────────────────────────────────┐  │
│   │                   Service                        │  │
│   │  (stable endpoint, load balances across pods)    │  │
│   │  DNS: backend.poll-app.svc.cluster.local        │  │
│   └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Labels and Selectors

Labels are key-value pairs attached to resources:

```yaml
metadata:
  labels:
    app: poll-backend
    version: v1
```

Selectors match labels:

```yaml
selector:
  matchLabels:
    app: poll-backend
```

This is how Services find Pods, and Deployments manage Pods.

### Service Types

| Type | Access | Use Case |
|------|--------|----------|
| **ClusterIP** | Internal only | Backend services |
| **NodePort** | External via node IP:port | Direct external access |
| **LoadBalancer** | External via cloud LB | Production (costs $) |

For this project:
- Backend: ClusterIP (frontend talks to it internally)
- Frontend: NodePort (users access from browser)

### Health Probes in Deployment

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Quiz Yourself

1. What's the difference between a Deployment and a Pod?
2. If you delete a Pod managed by a Deployment, what happens?
3. Why use ClusterIP for backend instead of NodePort?
4. How does a Service know which Pods to send traffic to?
5. What happens if readiness probe fails? What about liveness?
6. You have 2 backend replicas. Frontend calls `http://backend:3000`. Which pod receives the request?

## Your Task

### 1. Create Namespace

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: poll-app
```

### 2. Backend Deployment

Create `k8s/backend/deployment.yaml`:
- 2 replicas
- Image: `yourusername/poll-backend:v1`
- Container port: 3000
- Liveness probe: `/health`
- Readiness probe: `/ready`
- Resource limits (optional but good practice)

### 3. Backend Service

Create `k8s/backend/service.yaml`:
- Type: ClusterIP
- Port: 3000
- Selector matches backend pods

### 4. Frontend Deployment

Create `k8s/frontend/deployment.yaml`:
- 2 replicas
- Image: `yourusername/poll-frontend:v1`
- Container port: 80

### 5. Frontend Service

Create `k8s/frontend/service.yaml`:
- Type: NodePort
- Port: 80
- NodePort: 30080
- Selector matches frontend pods

### 6. Folder Structure

```
k8s/
├── namespace.yaml
├── backend/
│   ├── deployment.yaml
│   └── service.yaml
└── frontend/
    ├── deployment.yaml
    └── service.yaml
```

### 7. Apply Manifests

```bash
# On EC2 with k3s
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/backend/
kubectl apply -f k8s/frontend/

# Or all at once
kubectl apply -f k8s/ --recursive
```

## Hints

<details>
<summary>Backend Deployment template?</summary>

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: poll-backend
  namespace: poll-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: poll-backend
  template:
    metadata:
      labels:
        app: poll-backend
    spec:
      containers:
        - name: backend
          image: yourusername/poll-backend:v1
          ports:
            - containerPort: 3000
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
```

</details>

<details>
<summary>Backend Service template?</summary>

```yaml
apiVersion: v1
kind: Service
metadata:
  name: poll-backend
  namespace: poll-app
  labels:
    app: poll-backend
spec:
  type: ClusterIP
  ports:
    - port: 3000
      targetPort: 3000
      name: http
  selector:
    app: poll-backend
```

</details>

<details>
<summary>Frontend Service with NodePort?</summary>

```yaml
apiVersion: v1
kind: Service
metadata:
  name: poll-frontend
  namespace: poll-app
spec:
  type: NodePort
  ports:
    - port: 80
      targetPort: 80
      nodePort: 30080
  selector:
    app: poll-frontend
```

</details>

<details>
<summary>Pods are stuck in ImagePullBackOff?</summary>

Check:
- Is image name correct? (including your Docker Hub username)
- Is image public on Docker Hub?
- Run `kubectl describe pod <pod-name> -n poll-app` for details

</details>

<details>
<summary>Frontend can't reach backend?</summary>

Check:
- Is backend Service named `poll-backend`? (must match nginx.conf)
- Are backend pods Running and Ready?
- Test from frontend pod: `kubectl exec -it <frontend-pod> -n poll-app -- curl poll-backend:3000/health`

</details>

## Verify

```bash
# Check pods are running
kubectl get pods -n poll-app
# NAME                            READY   STATUS    RESTARTS   AGE
# poll-backend-xxx-yyy            1/1     Running   0          1m
# poll-backend-xxx-zzz            1/1     Running   0          1m
# poll-frontend-xxx-aaa           1/1     Running   0          1m
# poll-frontend-xxx-bbb           1/1     Running   0          1m

# Check services
kubectl get svc -n poll-app
# NAME            TYPE        CLUSTER-IP      PORT(S)        AGE
# poll-backend    ClusterIP   10.43.x.x       3000/TCP       1m
# poll-frontend   NodePort    10.43.x.x       80:30080/TCP   1m

# Test backend internally
kubectl exec -it deploy/poll-frontend -n poll-app -- curl poll-backend:3000/health

# Test frontend externally (from your laptop)
curl http://<EC2-PUBLIC-IP>:30080

# Open in browser
open http://<EC2-PUBLIC-IP>:30080
```

### Checklist

- [ ] Can you explain what each field in the Deployment YAML does?
- [ ] Can you explain how the Service selector works?
- [ ] All pods showing 1/1 Ready?
- [ ] Can you access the app from your browser?
- [ ] Delete a pod — does K8s recreate it automatically?

---

**Previous: [04-docker-registry.md](04-docker-registry.md)** | **Next: [06-prometheus-grafana.md](06-prometheus-grafana.md)**
