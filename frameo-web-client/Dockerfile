## BUILD STAGE ####################################################################
# This runs when the image is created to build binaries and dependencies

FROM node:24-alpine AS build
WORKDIR /app

# Install pnpm (lockfile-first: deps cached when only source changes)
RUN npm install -g pnpm@11.0.0

ARG API_BASE="http://localhost:5295"
ENV API_BASE=${API_BASE}

# Copy dependency manifests first for layer caching
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy remaining source and build
COPY . .
RUN pnpm run build

## RUN STAGE ######################################################################
# This is the actual execution environment for the app

FROM nginx:alpine AS runtime

RUN apk add --no-cache nginx-module-njs

# Replace main nginx.conf to include load_module directive
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
