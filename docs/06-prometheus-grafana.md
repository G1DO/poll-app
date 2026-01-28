# Milestone 6: Prometheus + Grafana with Helm

## Why This Matters

Setting up Prometheus and Grafana manually involves many moving parts:
- Prometheus server
- Alertmanager
- Grafana
- Node exporter (host metrics)
- kube-state-metrics (K8s metrics)
- Configuration for each

**Helm** packages all of this into one command. The `kube-prometheus-stack` chart is production-ready and battle-tested.

## Core Concepts

### What is Helm?

Helm is a package manager for Kubernetes — like apt/brew, but for K8s applications.

```
Helm Chart = Package of K8s manifests + templating + configuration
```

Instead of writing 20 YAML files, you run:
```bash
helm install monitoring prometheus-community/kube-prometheus-stack
```

### kube-prometheus-stack Components

| Component | Purpose |
|-----------|---------|
| Prometheus Operator | Manages Prometheus instances |
| Prometheus | Metrics collection and storage |
| Alertmanager | Alert routing and silencing |
| Grafana | Visualization dashboards |
| node-exporter | Host-level metrics (CPU, memory, disk) |
| kube-state-metrics | K8s object metrics (pods, deployments) |

### Prometheus Operator

Instead of editing prometheus.yml directly, you create custom resources:

| Resource | Purpose |
|----------|---------|
| `ServiceMonitor` | "Scrape services matching this selector" |
| `PodMonitor` | "Scrape pods matching this selector" |
| `PrometheusRule` | "Alert when this condition is true" |

The Operator watches these resources and configures Prometheus automatically.

### Values Override

Helm charts have default configuration. You override with `--set` flags or a values file:

```bash
# Using --set
helm install monitoring prometheus-community/kube-prometheus-stack \
  --set grafana.service.type=NodePort

# Using values file
helm install monitoring prometheus-community/kube-prometheus-stack \
  -f my-values.yaml
```

## Quiz Yourself

1. What's the advantage of Helm over raw YAML manifests?
2. What does the Prometheus Operator do?
3. Why use ServiceMonitor instead of editing prometheus.yml?
4. What metrics does node-exporter provide?
5. What metrics does kube-state-metrics provide?
6. If you want to change Grafana's admin password, how would you do it?

## Your Task

### 1. Install Helm

On EC2:
```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### 2. Add Prometheus Community Repo

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

### 3. Install kube-prometheus-stack

```bash
helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.service.type=NodePort \
  --set prometheus.service.nodePort=30090 \
  --set grafana.service.type=NodePort \
  --set grafana.service.nodePort=30030 \
  --set grafana.adminPassword=admin
```

Key settings:
- `--namespace monitoring`: Install in dedicated namespace
- `--create-namespace`: Create namespace if it doesn't exist
- NodePort settings: Expose Prometheus and Grafana externally

### 4. Wait for Pods

```bash
kubectl get pods -n monitoring -w
```

Wait until all pods show `Running` and `1/1` or `2/2` Ready.

### 5. Access Prometheus

- URL: `http://<EC2-IP>:30090`
- Go to Status → Targets
- You should see various targets (kubelet, node-exporter, etc.)

### 6. Access Grafana

- URL: `http://<EC2-IP>:30030`
- Username: `admin`
- Password: `admin` (or what you set)
- Explore pre-built dashboards (Dashboards → Browse)

## Hints

<details>
<summary>Helm install fails?</summary>

Check:
- Is the repo added? `helm repo list`
- Update repos: `helm repo update`
- Check k3s is running: `kubectl get nodes`

</details>

<details>
<summary>Pods stuck in Pending?</summary>

Check resources:
```bash
kubectl describe pod <pod-name> -n monitoring
```

Common issues:
- Not enough memory (t3.micro too small)
- PVC can't be provisioned (k3s uses local-path by default, should work)

</details>

<details>
<summary>Can't access NodePort from browser?</summary>

Check:
- Security group allows port 30090 and 30030
- Service is NodePort type: `kubectl get svc -n monitoring`
- Use EC2 public IP, not private IP

</details>

<details>
<summary>How do I see what the Helm chart installed?</summary>

```bash
# List installed releases
helm list -n monitoring

# See all resources created
kubectl get all -n monitoring

# See the values used
helm get values monitoring -n monitoring
```

</details>

<details>
<summary>How do I uninstall?</summary>

```bash
helm uninstall monitoring -n monitoring
kubectl delete namespace monitoring
```

</details>

## Verify

```bash
# All pods running
kubectl get pods -n monitoring
# Should show ~8-10 pods, all Running

# Services with NodePorts
kubectl get svc -n monitoring | grep NodePort
# prometheus-kube-prometheus-prometheus   NodePort   ...   9090:30090/TCP
# monitoring-grafana                      NodePort   ...   80:30030/TCP

# Prometheus accessible
curl http://<EC2-IP>:30090/-/healthy
# Should return: Prometheus Server is Healthy.

# Grafana accessible
curl -I http://<EC2-IP>:30030
# Should return: HTTP/1.1 302 Found (redirect to login)
```

### Explore Grafana

1. Login to Grafana
2. Go to Dashboards → Browse
3. Check out pre-built dashboards:
   - "Kubernetes / Compute Resources / Cluster"
   - "Kubernetes / Compute Resources / Namespace (Pods)"
   - "Node Exporter / Nodes"

These show cluster health **before** you even add your app metrics.

### Checklist

- [ ] Can you explain what Helm does?
- [ ] Can you explain what Prometheus Operator does?
- [ ] All monitoring pods Running?
- [ ] Can you access Prometheus UI and see targets?
- [ ] Can you access Grafana and see pre-built dashboards?
- [ ] What happens if you run `helm install` again with same name?

---

**Previous: [05-kubernetes-manifests.md](05-kubernetes-manifests.md)** | **Next: [07-servicemonitor.md](07-servicemonitor.md)**
