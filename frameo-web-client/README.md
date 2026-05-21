# Frameo web-client

## Prerequisite

- Node.js 22 or later
- pnpm 11 or later
- The Frameo API running at `http://localhost:5295`

## Setup

From the `frameo-web-client` folder, install dependencies:

```bash
pnpm install
```

## Get started

### Option 1: Docker / Podman

From the project root:

```bash
podman compose up --build web
```

Or with Docker:

```bash
docker compose up --build web
```

The web client will be available at:
- http://localhost:3000

### Option 2: Local development

Start the development server:

```bash
pnpm run dev
```

Open the app at:

- http://localhost:3000

The app loads images from the API and connects to the websocket at `/ws` for live updates.

## Build / Preview

Build the production bundle:

```bash
pnpm run build
```

Preview the production build:

```bash
pnpm run preview
```

## Docker build arguments

When building with Docker/Podman, you can customize the API base URL:

```bash
podman build --build-arg API_BASE="http://api.example.com:5295" -t frameo-web .
```

The `API_BASE` defaults to `http://localhost:5295` if not specified.
