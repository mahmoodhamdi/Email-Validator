# Docker Deployment Guide

## Quick Start

### Production Build & Run

```bash
# Build the image
npm run docker:build

# Run the container
npm run docker:run

# Or use docker-compose
npm run docker:prod
```

### Development with Hot Reload

```bash
npm run docker:dev
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `3000` |
| `API_KEY_REQUIRED` | Require API key | `false` |
| `API_KEYS` | Comma-separated API keys | - |
| `ALLOWED_ORIGINS` | CORS allowed origins | `*` |

### Health Check

The container includes a health check that pings `/api/health` every 30 seconds.

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' email-validator
```

## Docker Commands

```bash
# Build image
docker build -t email-validator .

# Run container
docker run -p 3000:3000 -e API_KEY_REQUIRED=true email-validator

# Run with custom port
docker run -p 8080:3000 email-validator

# View logs
docker logs -f email-validator

# Stop container
docker stop email-validator

# Remove container
docker rm email-validator
```

## Docker Compose

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild
docker-compose up -d --build
```

## Image Size Optimization

The multi-stage build produces an optimized image:

- Stage 1: Install dependencies (~500MB)
- Stage 2: Build application
- Stage 3: Production runner (~150MB final)

## Security

- Runs as non-root user (`nextjs`)
- Only production dependencies included
- No source code in production image
- Health checks enabled

## Troubleshooting

### Container won't start

```bash
# Check logs
docker logs email-validator

# Check health
docker inspect email-validator | grep -A 10 Health
```

### Port already in use

```bash
# Use different port
docker run -p 8080:3000 email-validator
```
