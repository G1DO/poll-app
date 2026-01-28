# Milestone 8: Grafana Dashboard

## Why This Matters

Prometheus stores data. Grafana makes it visual and actionable.

You already have Grafana running (from M6). Now you'll build a custom dashboard for your poll app — combining your custom metrics with Kubernetes platform metrics.

## Core Concepts

### Dashboards and Panels

```
┌─────────────────────────────────────────────────┐
│                   Dashboard                     │
│  ┌─────────────────┐  ┌─────────────────┐      │
│  │  Panel: Graph   │  │  Panel: Stat    │      │
│  │  (time series)  │  │  (single value) │      │
│  └─────────────────┘  └─────────────────┘      │
│  ┌─────────────────┐  ┌─────────────────┐      │
│  │  Panel: Table   │  │  Panel: Gauge   │      │
│  │                 │  │  (needle meter) │      │
│  └─────────────────┘  └─────────────────┘      │
└─────────────────────────────────────────────────┘
```

**Dashboard**: Collection of panels, saved as JSON
**Panel**: Single visualization with its own query

### Visualization Types

| Type | Use for | Example |
|------|---------|---------|
| Time series | Values over time | Request rate graph |
| Stat | Single big number | Total votes |
| Gauge | Value with thresholds | CPU percentage |
| Bar chart | Comparing categories | Votes per option |
| Table | Detailed data | Top endpoints by latency |

### Combining App + K8s Metrics

With kube-prometheus-stack, you have access to:

| Source | Example Metrics |
|--------|-----------------|
| Your app | `poll_votes_total`, `http_requests_total` |
| cAdvisor | `container_cpu_usage_seconds_total`, `container_memory_usage_bytes` |
| kube-state-metrics | `kube_pod_status_phase`, `kube_deployment_status_replicas` |
| node-exporter | `node_cpu_seconds_total`, `node_memory_MemAvailable_bytes` |

A good dashboard combines business metrics (votes) with infrastructure metrics (CPU, memory).

### PromQL Essentials

```promql
# Rate of a counter (per second)
rate(poll_votes_total[1m])

# Sum across labels
sum(poll_votes_total)
sum by (option) (poll_votes_total)

# Histogram percentile
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Filter by label
http_requests_total{status=~"5.."}

# Pod CPU (specific namespace)
sum by (pod) (rate(container_cpu_usage_seconds_total{namespace="poll-app"}[5m]))
```

## Quiz Yourself

1. Why use `rate()` for a counter instead of showing the raw value?
2. What's the difference between `sum(metric)` and `sum by (label) (metric)`?
3. If your graph shows gaps, what might be causing it?
4. How do you calculate error rate percentage?
5. What does `histogram_quantile(0.95, ...)` tell you that average doesn't?
6. Your dashboard shows "No data" — what are the possible causes?

## Your Task

### 1. Open Grafana

- URL: `http://<EC2-IP>:30030`
- Login: admin / admin (or your password)

### 2. Create New Dashboard

- Click "+" → "New Dashboard"
- Click "Add visualization"

### 3. Build These Panels

| Panel Title | Type | Query |
|-------------|------|-------|
| Votes per Second | Time series | `sum(rate(poll_votes_total[1m]))` |
| Total Votes | Stat | `sum(poll_votes_total)` |
| Votes by Option | Bar chart | `sum by (option) (poll_votes_total)` |
| Request Rate | Time series | `sum(rate(http_requests_total[1m]))` |
| p95 Latency (ms) | Time series | `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) * 1000` |
| Error Rate % | Stat | See hints |
| Pod CPU | Time series | `sum by (pod) (rate(container_cpu_usage_seconds_total{namespace="poll-app"}[5m]))` |
| Pod Memory | Time series | `sum by (pod) (container_memory_usage_bytes{namespace="poll-app"})` |
| Pod Restarts | Stat | `sum(kube_pod_container_status_restarts_total{namespace="poll-app"})` |

### 4. Configure Dashboard Settings

- Set auto-refresh: 5 seconds
- Set time range: Last 15 minutes
- Give it a name: "Poll App"

### 5. Export Dashboard JSON

- Dashboard Settings (gear icon)
- JSON Model
- Copy/save to `grafana/dashboard.json`

This lets you version control your dashboard.

## Hints

<details>
<summary>How do I calculate error rate percentage?</summary>

```promql
sum(rate(http_requests_total{status=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m]))
* 100
```

Handle division by zero with `or vector(0)`:
```promql
(sum(rate(http_requests_total{status=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m]))) * 100
or vector(0)
```

</details>

<details>
<summary>How do I make a bar chart show option labels?</summary>

In panel options:
- Legend: `{{option}}`
- Or use Transform → Organize fields

</details>

<details>
<summary>Panel shows "No data"</summary>

Check:
1. Data source is "Prometheus"
2. Metric exists — try in Prometheus UI first
3. Time range includes data
4. Query syntax is correct (check for typos)

</details>

<details>
<summary>How do I convert latency to milliseconds?</summary>

Multiply by 1000:
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) * 1000
```

Or set panel Unit to "seconds (s)" and Grafana converts automatically.

</details>

<details>
<summary>Pod CPU shows nothing?</summary>

The metric might have different labels. Check available metrics:
```promql
container_cpu_usage_seconds_total{namespace="poll-app"}
```

If using k3s, the container label might be `containerd`.

</details>

## Verify

### Generate Traffic

```bash
# Vote multiple times
for i in {1..30}; do
  curl -X POST http://<EC2-IP>:30080/api/polls/default/vote \
    -H "Content-Type: application/json" \
    -d '{"option": "TypeScript"}'
  sleep 0.5
done
```

### Check Dashboard

1. Open your dashboard in Grafana
2. Votes per Second should show activity
3. Total Votes should increment
4. Votes by Option should show distribution
5. Pod CPU should show usage during load

### Compare with Pre-built Dashboards

Grafana comes with pre-built K8s dashboards:
- "Kubernetes / Compute Resources / Namespace (Pods)"
- Compare your custom panels with these

### Checklist

- [ ] Can you explain what each panel shows and why it matters?
- [ ] Can you add a new panel from scratch?
- [ ] Can you explain every PromQL query?
- [ ] Does the dashboard update in real-time when you vote?
- [ ] Did you export the dashboard JSON?
- [ ] Can you find the queries in the exported JSON?

---

**Previous: [07-servicemonitor.md](07-servicemonitor.md)** | **Next: [09-chaos-learning.md](09-chaos-learning.md)**
