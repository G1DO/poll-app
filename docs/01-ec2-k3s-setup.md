# Milestone 1: EC2 + k3s Setup

## Why This Matters

Before you can deploy to Kubernetes, you need a Kubernetes cluster. k3s gives you a production-ready cluster in one command.

This milestone sets up your infrastructure:
- EC2 instance (your server)
- k3s (your Kubernetes cluster)
- Security groups (your firewall)

## Core Concepts

### EC2 Instance Types

| Type | vCPU | RAM | Use Case |
|------|------|-----|----------|
| t3.micro | 1 | 1GB | Too small for k3s + monitoring |
| t3.small | 2 | 2GB | Minimum viable |
| t3.medium | 2 | 4GB | Comfortable for this project |

We'll use **t3.medium** — enough headroom for k3s, your app, Prometheus, and Grafana.

### Security Groups = Firewall Rules

By default, EC2 blocks all inbound traffic. You explicitly allow:

| Port | Purpose | Who needs access |
|------|---------|------------------|
| 22 | SSH | Your IP only |
| 30080 | App (NodePort) | Everyone (0.0.0.0/0) |
| 30090 | Prometheus | Your IP only (production) or 0.0.0.0/0 (learning) |
| 30030 | Grafana | Your IP only (production) or 0.0.0.0/0 (learning) |
| 6443 | K8s API | Your IP (optional) |

**Why restrict Prometheus/Grafana?** They expose internal metrics. In production, you'd put them behind authentication. The Terraform config in this project opens these ports to 0.0.0.0/0 for learning convenience — you should restrict them in production.

### k3s Architecture

```
┌─────────────────────────────────────────┐
│              k3s Server                 │
│                                         │
│  ┌─────────────┐  ┌─────────────────┐  │
│  │  API Server │  │    Scheduler    │  │
│  └─────────────┘  └─────────────────┘  │
│                                         │
│  ┌─────────────┐  ┌─────────────────┐  │
│  │ Controller  │  │    etcd/SQLite  │  │
│  │  Manager    │  │   (data store)  │  │
│  └─────────────┘  └─────────────────┘  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │           Kubelet               │   │
│  │     (runs your containers)      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │         containerd              │   │
│  │    (container runtime)          │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

k3s bundles all of this into a single ~50MB binary.

### kubectl

`kubectl` is how you talk to Kubernetes:

```
kubectl get pods          # List pods
kubectl get services      # List services
kubectl apply -f file.yaml # Create/update resources
kubectl logs <pod-name>   # View logs
kubectl delete pod <name> # Delete a pod
```

It reads config from `~/.kube/config` to know which cluster to talk to.

## Quiz Yourself

1. Why use t3.medium instead of t3.micro for this project?
2. What happens if you don't open port 30080 in security groups?
3. Why restrict port 30090 (Prometheus) to your IP instead of 0.0.0.0/0?
4. What does k3s give you that just installing Docker doesn't?
5. If `kubectl` commands don't work, what's the first thing to check?
6. What's the difference between the k3s server and the kubelet?

## Your Task

### 1. Launch EC2 Instance

You have two options:

#### Option A: Using Terraform (Recommended)

The project includes Terraform configuration in `terraform/aws/` that automates EC2 provisioning:

```bash
cd terraform/aws

# Initialize Terraform
terraform init

# Preview what will be created
terraform plan

# Create the infrastructure
terraform apply

# Get the public IP
terraform output server_public_ip

# Get the SSH key (save to a file)
terraform output -raw private_key > poll-app-key.pem
chmod 400 poll-app-key.pem
```

This creates:
- VPC with public subnet
- Internet gateway and routing
- Security group with required ports
- EC2 instance (t3.medium, Ubuntu 22.04)
- SSH key pair (auto-generated)
- k3s installed via user_data

**Note**: The Terraform config opens all ports (30080, 30090, 30030, 6443) to 0.0.0.0/0 for learning convenience. In production, restrict monitoring ports to your IP.

#### Option B: Using AWS Console (Manual)

- **AMI**: Ubuntu 22.04 LTS (ami-0c7217cdde317cfec in us-east-1)
- **Instance type**: t3.medium
- **Key pair**: Create new or use existing (.pem file)
- **Security group**: Create new with rules from table above
- **Storage**: 30GB gp3 (default is fine)

### 2. Connect via SSH

```bash
# Set permissions on key file (required on first use)
chmod 400 your-key.pem

# Connect
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>

# If you used Terraform, the key file is poll-app-key.pem
ssh -i poll-app-key.pem ubuntu@<EC2-PUBLIC-IP>
```

### 3. Install k3s

**If you used Terraform**: k3s is already installed via user_data. Skip to step 4.

On the EC2 instance (manual setup only):

```bash
# One command to install k3s
curl -sfL https://get.k3s.io | sh -

# Verify it's running
sudo systemctl status k3s

# Check the node is ready
sudo kubectl get nodes
```

### 4. Configure kubectl for Your User

By default, k3s config is only readable by root:

```bash
# Create kube config directory
mkdir -p ~/.kube

# Copy config and set ownership
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER:$USER ~/.kube/config

# Now kubectl works without sudo
kubectl get nodes
```

### 5. Verify the Cluster

```bash
# Should show one node with STATUS=Ready
kubectl get nodes

# Should show system pods running
kubectl get pods -A
```

## Hints

<details>
<summary>Can't SSH into EC2?</summary>

Check:
- Did you open port 22 in security group?
- Is the source set to your IP (or 0.0.0.0/0 for testing)?
- Is the key file permissions 400? (`chmod 400 key.pem`)
- Are you using the right username? (Ubuntu AMI = `ubuntu`)

</details>

<details>
<summary>kubectl commands fail with permission denied?</summary>

You probably forgot to copy the config to your user:

```bash
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER:$USER ~/.kube/config
```

</details>

<details>
<summary>How do I use kubectl from my local machine?</summary>

1. Copy the config file from EC2 to your local `~/.kube/config`
2. Replace `127.0.0.1` with your EC2 public IP
3. Make sure port 6443 is open in security group

But for this project, running kubectl on EC2 is simpler.

</details>

<details>
<summary>k3s install failed?</summary>

Check:
- Is the instance type large enough? (t3.micro may struggle)
- Is there enough disk space? (`df -h`)
- Check logs: `sudo journalctl -u k3s`

</details>

<details>
<summary>How do I destroy the Terraform infrastructure?</summary>

When you're done with the project, clean up to avoid charges:

```bash
cd terraform/aws
terraform destroy
```

This removes the EC2 instance, VPC, security group, and all related resources.

</details>

## Verify

```bash
# Node should show Ready
kubectl get nodes
# NAME          STATUS   ROLES                  AGE   VERSION
# ip-xxx        Ready    control-plane,master   1m    v1.28.x+k3s1

# System pods should be Running
kubectl get pods -n kube-system
# Should see coredns, local-path-provisioner, metrics-server, traefik

# Test creating a simple pod
kubectl run test --image=nginx --restart=Never
kubectl get pods
# Should show test pod in Running state

# Clean up test
kubectl delete pod test
```

### Checklist

- [ ] Can you SSH into EC2 without issues?
- [ ] Can you explain what each security group rule does?
- [ ] Does `kubectl get nodes` show Ready?
- [ ] Can you explain what k3s installed (API server, scheduler, kubelet)?
- [ ] Do you understand why kubectl needs the config file?

---

**Previous: [00-overview.md](00-overview.md)** | **Next: [02-backend.md](02-backend.md)**
