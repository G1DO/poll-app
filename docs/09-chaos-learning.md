# Milestone 9: Chaos & Learning

## Why This Matters

Metrics are useless if you don't know how to interpret them.

This milestone creates problems on purpose so you learn:
- What healthy metrics look like
- What unhealthy metrics look like
- How Kubernetes self-heals
- How to use dashboards to debug production issues

## Core Concepts

### Kubernetes Self-Healing

When things go wrong, K8s tries to fix them:

| Event | K8s Response |
|-------|--------------|
| Pod crashes | Deployment restarts it |
| Pod fails health check | Removed from Service, restarted |
| Node goes down | Pods rescheduled elsewhere |
| Resource exhaustion | Pod evicted, restarted |

Your metrics should capture both the failure AND the recovery.

### Failure Modes

| Failure | Symptom in Metrics | K8s Response |
|---------|-------------------|--------------|
| Pod killed | Brief spike in errors, then recovery | New pod created |
| Slow responses | p95 latency increases | Readiness probe may fail |
| Random errors | Error rate spikes | No automatic action |
| OOM | Pod restart count increases | Pod killed and restarted |
| Liveness fail | Pod restarts | Container killed and restarted |

### Reading Graphs

```
Latency (ms)
100 ┤                              ← Critical: sustained high
 75 ┤         ╭╮                   ← Warning: spike but recovered
 50 ┤        ╭╯╰╮
 25 ┤───────╯   ╰───────────────   ← Healthy: stable
  0 ┼────────────────────────────
    0    5    10   15   20   25
```

**Healthy**: Flat lines, low latency, zero errors
**Warning**: Trending upward, occasional spikes
**Critical**: Sustained high values, error rates above threshold

### Pod Restart Behavior

When you delete a pod, the Deployment controller:
1. Detects pod is gone
2. Creates new pod to maintain replica count
3. New pod starts and passes readiness probe
4. Service routes traffic to new pod

All of this should be visible in your metrics.

## Quiz Yourself

1. You delete a backend pod. What happens to in-flight requests?
2. Your p95 latency doubled but p50 is unchanged. What does that tell you?
3. Error rate is 5%. Is that bad? What context do you need?
4. Pod restart count is 3. Is that a problem?
5. You see gaps in your graph. What might cause that?
6. CPU is at 90%. Is that a problem?

## Your Task

### 1. Load Test Script

Create `scripts/load-test.sh`:

```bash
#!/bin/bash
EC2_IP="${1:-localhost}"
DURATION="${2:-60}"
RPS="${3:-5}"
OPTIONS=("TypeScript" "Python" "Rust" "Go")

echo "Load testing http://$EC2_IP:30080 for ${DURATION}s at ${RPS} req/s"

end=$((SECONDS + DURATION))
while [ $SECONDS -lt $end ]; do
  OPTION=${OPTIONS[$RANDOM % ${#OPTIONS[@]}]}
  curl -s -X POST "http://$EC2_IP:30080/api/polls/default/vote" \
    -H "Content-Type: application/json" \
    -d "{\"option\": \"$OPTION\"}" > /dev/null &
  sleep $(echo "scale=3; 1/$RPS" | bc)
done
wait
echo "Done"
```

Usage: `./scripts/load-test.sh <EC2-IP> 60 10`

### 2. Chaos Exercise: Kill a Pod

With dashboard visible:

```bash
# Get pod name
kubectl get pods -n poll-app

# Kill a backend pod
kubectl delete pod <backend-pod-name> -n poll-app

# Watch it get recreated
kubectl get pods -n poll-app -w
```

**Observe in dashboard:**
- Brief dip in request rate?
- Error spike?
- Pod restart count increase?
- How quickly did it recover?

### 3. Chaos Exercise: Inject Latency

Add env var to deployment:

```bash
kubectl set env deployment/poll-backend -n poll-app ARTIFICIAL_DELAY_MS=500

# Watch pods restart with new env
kubectl get pods -n poll-app -w
```

**Observe:**
- p95 latency should jump to ~500ms
- What happens to request rate?
- What happens to pod CPU?

Remove:
```bash
kubectl set env deployment/poll-backend -n poll-app ARTIFICIAL_DELAY_MS-
```

### 4. Chaos Exercise: Inject Errors

```bash
kubectl set env deployment/poll-backend -n poll-app ERROR_RATE=0.2

# 20% of requests will return 500
```

**Observe:**
- Error rate panel should show ~20%
- Total votes still increasing (80% succeed)
- Does retry logic in frontend help?

Remove:
```bash
kubectl set env deployment/poll-backend -n poll-app ERROR_RATE-
```

### 5. Chaos Exercise: Scale Down

```bash
# Scale to 1 replica
kubectl scale deployment/poll-backend -n poll-app --replicas=1

# Run load test - what happens?

# Scale back up
kubectl scale deployment/poll-backend -n poll-app --replicas=2
```

**Observe:**
- Does latency increase with fewer replicas?
- Does CPU per pod increase?

### 6. Chaos Exercise: Resource Pressure

Run heavy load:
```bash
./scripts/load-test.sh <EC2-IP> 120 50  # 50 req/s for 2 min
```

**Observe:**
- CPU usage climbing
- Memory usage
- Does latency degrade under load?
- At what point does the system struggle?

## Hints

<details>
<summary>How do I implement ARTIFICIAL_DELAY_MS in backend?</summary>

In your vote endpoint:
```typescript
const delay = parseInt(process.env.ARTIFICIAL_DELAY_MS || '0');
if (delay > 0) {
  await new Promise(resolve => setTimeout(resolve, delay));
}
```

Rebuild and push new image, then restart pods.

</details>

<details>
<summary>How do I implement ERROR_RATE in backend?</summary>

In your vote endpoint:
```typescript
const errorRate = parseFloat(process.env.ERROR_RATE || '0');
if (Math.random() < errorRate) {
  return res.status(500).json({ error: 'Injected failure' });
}
```

</details>

<details>
<summary>Graphs look weird — how do I interpret them?</summary>

Common patterns:
- **Gaps**: App was down, Prometheus couldn't scrape
- **Flat lines at zero**: Counter reset (pod restarted)
- **Sudden drops**: Time range changed
- **Stair-steps**: Scrape interval visible (normal)

</details>

<details>
<summary>How do I check pod restart count?</summary>

```bash
kubectl get pods -n poll-app
# RESTARTS column shows count

# Or via metrics
kube_pod_container_status_restarts_total{namespace="poll-app"}
```

</details>

## Verify

### Document Your Findings

After each chaos experiment, note:
1. What did you do?
2. What did you see in the dashboard?
3. How long until recovery?
4. What metric was most useful for detecting the problem?

### Baseline vs Chaos

Take screenshots of your dashboard:
1. **Baseline**: Normal operation, steady load
2. **Pod kill**: During and after pod deletion
3. **High latency**: With 500ms delay injected
4. **Errors**: With 20% error rate
5. **High load**: During 50 req/s test

Can you tell which is which just by looking at the graphs?

### Checklist

- [ ] Can you explain what p50/p95/p99 latencies mean?
- [ ] Can you predict what will happen BEFORE you inject failure?
- [ ] Can you identify a problem just by looking at the dashboard?
- [ ] Can you explain the difference between "slow" and "failing"?
- [ ] Did you see K8s self-healing in action (pod restart)?
- [ ] What metric would you alert on for this app?

## Success Criteria (Full Project)

You've truly learned observability when you can:

1. **Deploy** containerized apps to Kubernetes
2. **Instrument** any app with Prometheus metrics
3. **Explain** K8s primitives (Pod, Deployment, Service, ServiceMonitor)
4. **Query** metrics with PromQL
5. **Build** Grafana dashboards
6. **Diagnose** problems using metrics, not just logs
7. **Explain** how Prometheus discovers targets in K8s

## What's Next?

This project covered the fundamentals. To go deeper:

- **Alerting**: Prometheus AlertManager + Grafana alerts
- **Tracing**: Distributed tracing with Jaeger or Tempo
- **Logging**: Structured logging with Loki
- **SLOs**: Service Level Objectives and error budgets
- **GitOps**: ArgoCD for continuous deployment
- **Service Mesh**: Istio or Linkerd for advanced traffic management

---

**Previous: [08-grafana-dashboard.md](08-grafana-dashboard.md)** | **Back to: [00-overview.md](00-overview.md)**
