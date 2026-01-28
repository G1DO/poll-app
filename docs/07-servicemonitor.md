# Milestone 7: ServiceMonitor — Connecting App to Prometheus

## Why This Matters

Prometheus is running. Your app exposes `/metrics`. But Prometheus doesn't know your app exists yet.

In Kubernetes with Prometheus Operator, you don't edit config files. You create a **ServiceMonitor** — a custom resource that tells Prometheus "scrape this service."

## Core Concepts

### How Service Discovery Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    Prometheus Operator                          │
│                                                                 │
│  Watches for:                    Creates/Updates:               │
│  ┌─────────────────┐            ┌─────────────────┐            │
│  │ ServiceMonitor  │ ────────►  │ Prometheus      │            │
│  │ resources       │            │ scrape config   │            │
│  └─────────────────┘            └─────────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

You create:                      Prometheus scrapes:
┌─────────────────┐             ┌─────────────────┐
│ ServiceMonitor  │             │ poll-backend    │
│ selector:       │  ────────►  │ pod:3000/metrics│
│   app: backend  │             │ pod:3000/metrics│
└─────────────────┘             └─────────────────┘
```

### ServiceMonitor Anatomy

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: poll-backend
  namespace: poll-app
  labels:
    release: monitoring    # ← Critical: must match Prometheus selector
spec:
  selector:
    matchLabels:
      app: poll-backend    # ← Matches your Service labels
  endpoints:
    - port: http           # ← Matches Service port name
      path: /metrics
      interval: 15s
  namespaceSelector:
    matchNames:
      - poll-app
```

### The Label Gotcha

Prometheus Operator only watches ServiceMonitors with specific labels. The `kube-prometheus-stack` Helm chart uses:

```yaml
serviceMonitorSelector:
  matchLabels:
    release: monitoring
```

**Your ServiceMonitor MUST have `release: monitoring` label** (or whatever your Helm release is named).

### Why Not Just Edit prometheus.yml?

| Approach | Pros | Cons |
|----------|------|------|
| Edit prometheus.yml | Direct, familiar | Manual, error-prone, not K8s-native |
| ServiceMonitor | Declarative, version-controlled, auto-discovered | Learning curve |

ServiceMonitor is the Kubernetes way — your monitoring config lives with your app.

## Quiz Yourself

1. What does Prometheus Operator do when it sees a new ServiceMonitor?
2. Why does ServiceMonitor need `release: monitoring` label?
3. What happens if the Service label doesn't match ServiceMonitor selector?
4. What happens if the port name in ServiceMonitor doesn't match Service?
5. Your app is in `poll-app` namespace, Prometheus is in `monitoring`. How does cross-namespace scraping work?
6. How can you check if Prometheus discovered your target?

## Your Task

### 1. Add Label to Backend Service

Make sure your backend Service has a label that ServiceMonitor can select:

```yaml
# k8s/backend/service.yaml
metadata:
  name: poll-backend
  namespace: poll-app
  labels:
    app: poll-backend  # ← ServiceMonitor will select this
```

### 2. Name the Service Port

ServiceMonitor references ports by name, not number:

```yaml
spec:
  ports:
    - port: 3000
      targetPort: 3000
      name: http          # ← ServiceMonitor uses this name
```

### 3. Create ServiceMonitor

Create `k8s/backend/servicemonitor.yaml`:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: poll-backend
  namespace: poll-app
  labels:
    release: monitoring   # ← Must match Prometheus selector!
spec:
  selector:
    matchLabels:
      app: poll-backend   # ← Must match Service labels
  endpoints:
    - port: http          # ← Must match Service port name
      path: /metrics
      interval: 15s
  namespaceSelector:
    matchNames:
      - poll-app
```

### 4. Apply and Verify

```bash
# Apply updated service and ServiceMonitor
kubectl apply -f k8s/backend/

# Check ServiceMonitor was created
kubectl get servicemonitor -n poll-app

# Check Prometheus targets (in browser)
# http://<EC2-IP>:30090/targets
```

## Hints

<details>
<summary>Target not appearing in Prometheus?</summary>

Checklist:
1. ServiceMonitor has `release: monitoring` label?
2. Service has `app: poll-backend` label?
3. Service port has `name: http`?
4. ServiceMonitor selector matches Service labels?
5. namespaceSelector includes `poll-app`?

Debug commands:
```bash
# Check ServiceMonitor
kubectl get servicemonitor -n poll-app -o yaml

# Check Service labels
kubectl get svc poll-backend -n poll-app --show-labels

# Check Prometheus config was updated
kubectl logs -n monitoring prometheus-monitoring-kube-prometheus-prometheus-0 | grep poll
```

</details>

<details>
<summary>How do I find what label Prometheus looks for?</summary>

```bash
# Check Prometheus spec
kubectl get prometheus -n monitoring -o yaml | grep -A5 serviceMonitorSelector
```

Usually it's `release: monitoring` for Helm installs.

</details>

<details>
<summary>Target shows but metrics are empty?</summary>

Check:
- Is `/metrics` endpoint working?
  ```bash
  kubectl exec -it deploy/poll-frontend -n poll-app -- curl poll-backend:3000/metrics
  ```
- Is the pod healthy and receiving traffic?

</details>

<details>
<summary>Can I have ServiceMonitor in a different namespace?</summary>

Yes, but:
- The `release: monitoring` label is still required
- `namespaceSelector` must specify where the Service is

By convention, keep ServiceMonitor next to your app manifests.

</details>

## Verify

### Check Target in Prometheus

1. Go to `http://<EC2-IP>:30090/targets`
2. Look for `serviceMonitor/poll-app/poll-backend`
3. State should be `UP`

### Query Your Metrics

In Prometheus UI (`http://<EC2-IP>:30090/graph`):

```promql
# Should return your custom metrics
poll_votes_total

# Request rate
rate(http_requests_total[1m])

# If you've voted, you should see data
```

### Generate Some Traffic

```bash
# Vote a few times
for i in {1..10}; do
  curl -X POST http://<EC2-IP>:30080/api/polls/default/vote \
    -H "Content-Type: application/json" \
    -d '{"option": "TypeScript"}'
  sleep 1
done

# Check metrics in Prometheus
# poll_votes_total should show counts
```

### Checklist

- [ ] Can you explain what ServiceMonitor does?
- [ ] Can you explain why the `release: monitoring` label is required?
- [ ] Is your target showing as UP in Prometheus targets page?
- [ ] Can you query `poll_votes_total` in Prometheus?
- [ ] What happens if you delete the ServiceMonitor — does the target disappear?

---

**Previous: [06-prometheus-grafana.md](06-prometheus-grafana.md)** | **Next: [08-grafana-dashboard.md](08-grafana-dashboard.md)**
