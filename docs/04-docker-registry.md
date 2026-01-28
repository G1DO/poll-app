# Milestone 4: Push to Docker Registry

## Why This Matters

Your EC2 k3s cluster needs to pull your container images from somewhere. Options:

| Registry | Cost | Use Case |
|----------|------|----------|
| Docker Hub | Free (public) | Learning, open source |
| Amazon ECR | ~$0.10/GB/mo | Production on AWS |
| GitHub Container Registry | Free (public) | GitHub-integrated projects |

For this project, **Docker Hub** is simplest — free for public images.

## Core Concepts

### Image Tags

An image reference has three parts:

```
registry/username/repository:tag
```

Examples:
- `nginx:latest` → defaults to `docker.io/library/nginx:latest`
- `yourusername/poll-backend:v1`
- `ghcr.io/yourusername/poll-backend:v1`

### Tagging Strategy

| Tag | Meaning | When to use |
|-----|---------|-------------|
| `latest` | Most recent | Avoid in production (ambiguous) |
| `v1`, `v2` | Version numbers | Releases |
| `v1.2.3` | Semantic version | Precise releases |
| `abc123` | Git commit SHA | CI/CD pipelines |

For learning, simple version tags (`v1`, `v2`) work fine.

### Image Layers

Docker images are built in layers. When you push:
- Only new/changed layers upload
- Shared base layers (like `node:20-alpine`) don't re-upload

This makes subsequent pushes fast.

### Pull Policies in Kubernetes

```yaml
containers:
  - name: backend
    image: yourusername/poll-backend:v1
    imagePullPolicy: Always  # or IfNotPresent, Never
```

| Policy | Behavior |
|--------|----------|
| `Always` | Pull every time pod starts |
| `IfNotPresent` | Only pull if not cached locally |
| `Never` | Only use local images |

For learning with versioned tags, `IfNotPresent` is fine.

## Quiz Yourself

1. Why not use `latest` tag in Kubernetes deployments?
2. If you push `poll-backend:v1` twice (with different code), what happens?
3. What's the difference between `docker build` and `docker push`?
4. If your image is 500MB, do you upload 500MB every time you push?
5. Why might you want `imagePullPolicy: Always` with `latest` tag?
6. What happens if Kubernetes can't pull your image?

## Your Task

### 1. Create Docker Hub Account

- Go to hub.docker.com
- Sign up (free)
- Remember your username — you'll use it in image names

### 2. Login to Docker Hub

```bash
docker login
# Enter username and password
```

### 3. Build Images with Proper Tags

```bash
# Backend
cd backend
docker build -t yourusername/poll-backend:v1 .

# Frontend
cd ../frontend
docker build -t yourusername/poll-frontend:v1 .
```

Replace `yourusername` with your Docker Hub username.

### 4. Push Images

```bash
docker push yourusername/poll-backend:v1
docker push yourusername/poll-frontend:v1
```

### 5. Verify on Docker Hub

- Go to hub.docker.com
- Check your repositories
- You should see both images

### 6. Test Pull (Optional)

```bash
# Remove local image
docker rmi yourusername/poll-backend:v1

# Pull from registry
docker pull yourusername/poll-backend:v1

# Run to verify it works
docker run -p 3000:3000 yourusername/poll-backend:v1
```

## Hints

<details>
<summary>docker login fails?</summary>

Check:
- Username/password correct?
- Try creating an access token at hub.docker.com → Account Settings → Security
- Use token as password

</details>

<details>
<summary>Push is denied or forbidden?</summary>

The image name must match your Docker Hub username:

```bash
# Wrong (if your username isn't "myapp")
docker push myapp/poll-backend:v1

# Right (use YOUR username)
docker push youractualusername/poll-backend:v1
```

</details>

<details>
<summary>How do I update an image?</summary>

Build with same tag and push again:

```bash
# After code changes
docker build -t yourusername/poll-backend:v1 .
docker push yourusername/poll-backend:v1
```

Or use a new version tag:

```bash
docker build -t yourusername/poll-backend:v2 .
docker push yourusername/poll-backend:v2
```

</details>

<details>
<summary>Push is slow?</summary>

First push uploads all layers. Subsequent pushes only upload changed layers.

If using Alpine base image, it's smaller and faster.

</details>

## Verify

```bash
# List local images
docker images | grep poll

# Should show:
# yourusername/poll-backend    v1    abc123   1 minute ago   150MB
# yourusername/poll-frontend   v1    def456   2 minutes ago  25MB

# Check Docker Hub (in browser)
# https://hub.docker.com/r/yourusername/poll-backend
# https://hub.docker.com/r/yourusername/poll-frontend

# Test that k3s can pull (on EC2)
sudo k3s crictl pull yourusername/poll-backend:v1
sudo k3s crictl pull yourusername/poll-frontend:v1
```

### Checklist

- [ ] Can you explain the image naming convention?
- [ ] Can you explain why versioned tags are better than `latest`?
- [ ] Are both images visible on Docker Hub?
- [ ] Can your EC2 instance pull the images?
- [ ] What would happen if your Docker Hub repo was private?

---

**Previous: [03-frontend.md](03-frontend.md)** | **Next: [05-kubernetes-manifests.md](05-kubernetes-manifests.md)**
