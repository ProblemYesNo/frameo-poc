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
