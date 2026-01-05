# Docker Development Environment

The Personal Assistant can be run in a Docker container for consistent development environments.

## Quick Start

```bash
# Build the development image
docker build -f Dockerfile.dev -t personal-assistant:dev .

# Run REPL in container
docker run -it --rm \
  -v ~/.assistant-data:/root/.assistant-data \
  -v ~/.assistant:/root/.assistant \
  -e GROQ_API_KEY=$GROQ_API_KEY \
  personal-assistant:dev

# Or use docker-compose
docker-compose up
```

## Docker Compose

The `docker-compose.yml` file provides a convenient way to run the assistant:

```bash
# Start REPL
docker-compose up

# Start web dashboard
docker-compose run assistant npm run web

# Run tests
docker-compose run assistant npm test
```

## Volumes

The Docker setup mounts:
- `~/.assistant-data` → `/root/.assistant-data` (data storage)
- `~/.assistant` → `/root/.assistant` (configuration)

## Environment Variables

Set via `-e` flag or in `docker-compose.yml`:
- `GROQ_API_KEY` - Groq API key
- `OPENROUTER_API_KEY` - OpenRouter API key
- `ASSISTANT_DATA_DIR` - Override data directory (default: `/root/.assistant-data`)
- `ASSISTANT_CONFIG_DIR` - Override config directory (default: `/root/.assistant`)

## Development Workflow

For active development with hot reload:

```bash
# Mount source code
docker run -it --rm \
  -v $(pwd)/src:/app/src \
  -v $(pwd)/dist:/app/dist \
  -v ~/.assistant-data:/root/.assistant-data \
  -e GROQ_API_KEY=$GROQ_API_KEY \
  personal-assistant:dev npm run dev:watch
```

## Building for Production

```dockerfile
# Production Dockerfile (example)
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
CMD ["node", "dist/app/cli.js"]
```

## Troubleshooting

### Permission Issues

If you encounter permission issues with mounted volumes:

```bash
# Fix ownership
sudo chown -R $USER:$USER ~/.assistant-data
sudo chown -R $USER:$USER ~/.assistant
```

### Port Conflicts

Change the port mapping in `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"  # Use port 3001 on host
```

