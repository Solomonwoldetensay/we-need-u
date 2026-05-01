# WE-NEED-U

Static PWA frontend for WE-NEED-U.

The app is served with Nginx in Docker and reads its backend service URL from `.env` at container startup.

## Requirements

- Docker
- Docker Compose

## Setup

1. Copy the example environment file if `.env` does not already exist:

   ```sh
   cp .env.example .env
   ```

2. Edit `.env`:

   ```env
   BACKEND_URL=https://workmatch-backend.onrender.com
   APP_PORT=8080
   ```

   `BACKEND_URL` should be the backend origin only, without `/api` at the end. The frontend adds `/api` automatically.

3. Build and start the app:

   ```sh
   docker compose up -d --build
   ```

4. Open the app:

   ```text
   http://localhost:8080
   ```

## Changing The Backend

Update `BACKEND_URL` in `.env`, then restart the container:

```sh
docker compose up -d --build
```

At startup, Docker writes `/env.js` inside the container with the configured backend URL. The browser app loads that file before `core.js`.

## Port Conflicts

If port `8080` is already in use, change `APP_PORT` in `.env`:

```env
APP_PORT=8081
```

Then restart:

```sh
docker compose up -d
```

## Stop The App

```sh
docker compose down
```

## Local Files

- `docker-compose.yml` defines the app service.
- `Dockerfile` builds the Nginx image.
- `nginx.conf` serves the static app and disables caching for `env.js`.
- `docker-entrypoint.d/99-write-env.sh` writes runtime environment config.
- `.env` controls the backend endpoint and exposed local port.
