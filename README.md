# Frameo POC (Proof of concept)

## A small, Instagram-like web application

Frameo is a proof-of-concept monorepo that lets users upload images anonymously and view newly uploaded images live in a feed.

This repository contains two projects:
- [frameo-api](./frameo-api/README.md)
- [frameo-web-client](./frameo-web-client/README.md)

## Prerequisites

- .NET 10 SDK or later for the API
- Node.js 22+ for the web client
- pnpm 11+ for package management in `frameo-web-client`

## Get started

### Option 1: Docker / Podman (Recommended)

From the project root:

```bash
podman compose up --build
```

Or with Docker:

```bash
docker compose up --build
```

The services will be available at:
- API: http://localhost:5295
- Web client: http://localhost:3000

### Option 2: Local development

1. Start the API:

```bash
cd frameo-api
dotnet restore
dotnet run
```

The API listens by default on:
- http://localhost:5295
- https://localhost:7276

2. Start the web client in a separate terminal:

```bash
cd frameo-web-client
pnpm install
pnpm run dev
```

The web client should be available at:
- http://localhost:3000

3. Open the web client in your browser and verify the feed loads.

## Notes

- The web client expects the API to be running at `http://localhost:5295` by default.
- Image uploads are stored in the API `uploads/` folder automatically.
- Both the API and web client have Dockerfiles for containerized deployment.
- When running via `podman compose` or `docker compose`, the API is automatically accessible to the web client via the service name.