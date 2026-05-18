# Frameo API

## Prerequisites

- .NET 10 SDK or later
- A terminal with `dotnet` available on the PATH

## Setup

From the `frameo-api` folder:

```bash
dotnet restore
```

## Get started

Run the API from the `frameo-api` folder:

```bash
dotnet run
```

By default, the app is available at:

- http://localhost:5295
- https://localhost:7276

Useful endpoints:

- `GET /` — service status
- `GET /api/images` — get all images
- `POST /uploads` — upload a new image (multipart/form-data)

The `uploads/` folder is created automatically when the API starts.
