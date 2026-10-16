# TaskBoard Cloud — DevOps Capstone Project

A cloud-native SaaS Task Management application built from the ground up to demonstrate modern DevOps engineering practices.

This repository demonstrates the end-to-end journey of an application from a developer's local environment through automated testing, containerization, DevSecOps vulnerability scanning, automated CI/CD deployment, AWS infrastructure provisioning via Terraform, Kubernetes orchestration with Helm, and live Prometheus/Grafana observability.

---

## 🏗️ Architecture Overview

```text
Developer Laptop
   │ (git commit & push)
   ▼
GitHub Repository
   │
   ▼
GitHub Actions CI/CD Pipeline (.github/workflows/ci-cd.yml)
   ├── 1. Pytest Unit Tests & Code Quality Gate
   ├── 2. Frontend React / Vite Build
   ├── 3. Docker Image Build (Multi-stage & Non-root)
   ├── 4. Trivy Container Vulnerability Scan (Fail on HIGH/CRITICAL)
   └── 5. Publish SHA-tagged images to GitHub Container Registry (GHCR)
              │
              ▼
   Terraform Infrastructure as Code (terraform/)
              ├── AWS VPC + 2 Public Subnets + 2 Private Subnets + NAT Gateway
              └── AWS EKS Managed Kubernetes Cluster & Worker Node Groups
              │
              ▼
   Kubernetes & Helm Deployment (helm/taskboard/)
              ├── React Frontend (2 replicas, Nginx non-root)
              ├── FastAPI Backend (2 replicas, HPA autoscaling 2–5 pods)
              ├── PostgreSQL Database (StatefulSet/Deployment with PVC)
              ├── Kubernetes Ingress Controller Routing
              └── Observability (Prometheus /metrics + Grafana Dashboard)
```

---

## 📋 Project Modules & Capabilities

| Module | Topic | Implementation in Repository |
| :--- | :--- | :--- |
| **M1** | **Application** | FastAPI backend (`/health`, `/ready`, `/metrics`, CRUD `/api/tasks`), PostgreSQL with Alembic migrations (`backend/alembic/versions/`), React + Vite responsive UI. |
| **M2** | **Testing** | Pytest suite (`backend/tests/`) with comprehensive test cases covering all endpoints using an isolated SQLite in-memory test DB via `conftest.py`. |
| **M3** | **Git & GitHub** | Clean Git history, conventional commits, comprehensive `.gitignore` excluding `.env`, `node_modules`, `__pycache__`, `.venv`, and `*.tfstate`. |
| **M4** | **Docker** | Backend `Dockerfile` and Frontend multi-stage `Dockerfile` (Node build + unprivileged Nginx runtime) running as non-root users (`appuser`). Complete `docker-compose.yml`. |
| **M5** | **CI/CD** | GitHub Actions (`.github/workflows/ci-cd.yml`) executing Pytest, frontend build, Docker container builds, Trivy scan, and pushing to GHCR with Git SHA tags (`${{ github.sha }}`). |
| **M6** | **DevSecOps** | Trivy container security scans embedded directly in CI/CD pipeline configured to fail on `HIGH` or `CRITICAL` CVEs. |
| **M7** | **Terraform** | Full AWS IaC (`terraform/`): VPC, 2 public subnets, 2 private subnets, NAT gateway, IAM roles, and EKS managed node group. Includes `terraform.tfvars.example`. |
| **M8** | **Kubernetes + Helm**| `k8s/namespace.yaml`, complete Helm chart (`helm/taskboard/`), 2+ replicas per deployment, ClusterIP services, Horizontal Pod Autoscaler (HPA), and Ingress. |
| **M9** | **Observability** | FastAPI `/metrics` endpoint using `prometheus-fastapi-instrumentator`, `ServiceMonitor` manifest, and custom Grafana dashboard configuration (`monitoring/`). |
| **M10**| **Documentation** | Comprehensive documentation, architecture breakdown, and troubleshooting walkthroughs (`troubleshooting/broken-image.yaml` & `troubleshooting/broken-service.yaml`). |

---

## 🚀 Quickstart Guide

### 1. Run the Entire Stack Locally (Docker Compose)
Run with one single command:
```bash
docker compose up --build
```
Access the application:
- **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
- **FastAPI Interactive Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check Endpoint:** [http://localhost:8000/health](http://localhost:8000/health)
- **Prometheus Metrics:** [http://localhost:8000/metrics](http://localhost:8000/metrics)

To shut down and wipe database volumes:
```bash
docker compose down -v
```

---

### 2. Running Automated Tests (Pytest)
```bash
cd backend
python -m venv .venv
# Linux/macOS: source .venv/bin/activate
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
pytest -v
```

---

### 3. Deploying AWS Infrastructure (Terraform)
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply --auto-approve
```
After provisioning completes, connect `kubectl` to the EKS cluster:
```bash
aws eks update-kubeconfig --region ap-south-1 --name taskboard-eks
```
When finished evaluating, tear down AWS infrastructure cleanly to prevent runaway costs:
```bash
terraform destroy --auto-approve
```

---

### 4. Deploying to Kubernetes via Helm
```bash
# 1. Apply namespace
kubectl apply -f k8s/namespace.yaml

# 2. Deploy TaskBoard with Helm
helm upgrade --install taskboard ./helm/taskboard \
  --namespace taskboard \
  --create-namespace

# 3. Verify pods and services
kubectl get pods -n taskboard
kubectl get svc -n taskboard
kubectl get ingress -n taskboard
```

---

### 5. Troubleshooting Labs
The repository includes deliberately broken scenarios for live demonstration:
1. **Broken Image Tag (ImagePullBackOff):**
   ```bash
   kubectl apply -f troubleshooting/broken-image.yaml
   kubectl describe pod -l app=broken-image-demo -n taskboard
   ```
2. **Broken Service Selector (Endpoints empty):**
   ```bash
   kubectl apply -f troubleshooting/broken-service.yaml
   kubectl get endpoints broken-backend-service -n taskboard
   ```

---

## 🔒 Security & Trivy Explanation (Module M6)
Container vulnerability scanning is implemented via Trivy in `.github/workflows/ci-cd.yml`:
- **What was scanned:** The Docker images for both FastAPI backend and React frontend (including base OS packages and application dependencies).
- **Security Policy:** Fails pipeline execution upon detecting any unfixed `HIGH` or `CRITICAL` Common Vulnerabilities and Exposures (CVEs).
- **Clean Scan Rationale:** The images utilize minimal, hardened base images (`python:3.12-slim` and `nginxinc/nginx-unprivileged:alpine-slim`), which reduce the attack surface and eliminate unnecessary OS utilities.
