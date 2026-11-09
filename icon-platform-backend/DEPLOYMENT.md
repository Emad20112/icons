# Deployment Guide

The `icon-platform-backend` service is designed as an independent Node.js / Fastify microservice. It can be deployed as a Docker container, on Google Cloud Run, AWS ECS/App Runner, Railway, Render, Fly.io, or any Linux VPS.

---

## 1. Container Deployment (Docker)

### Build the Image
```bash
docker build -t icon-platform-backend:latest .
```

### Run the Container
```bash
docker run -d \
  --name icon-backend \
  -p 4000:4000 \
  -e PORT=4000 \
  -e HOST=0.0.0.0 \
  -e NODE_ENV=production \
  -e FRONTEND_ORIGIN=https://your-frontend-domain.com \
  icon-platform-backend:latest
```

---

## 2. Cloud Run Deployment (GCP)

```bash
gcloud run deploy icon-platform-backend \
  --source . \
  --platform managed \
  --region europe-west3 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,PORT=8080,FRONTEND_ORIGIN=https://your-frontend-domain.com
```

---

## 3. Extracting to a Separate Private GitHub Repository

Because this directory is completely decoupled, you can extract it into a separate repository in minutes:

```bash
# In your terminal:
git subtree split --prefix=icon-platform-backend -b backend-standalone
mkdir ../icon-platform-backend-repo
cd ../icon-platform-backend-repo
git init
git pull ../app/applet backend-standalone
git remote add origin https://github.com/Emad20112/icon-platform-backend.git
git push -u origin main
```
