# Root Dockerfile so hosts that build from the repo ROOT (Back4App buildpacks,
# Koyeb, Railway, etc.) find it automatically and build the backend, which lives
# in backend/. (There's also backend/Dockerfile for hosts where you set the root
# directory to backend — either path produces the same image.)
FROM node:20-slim

WORKDIR /app

# Install backend dependencies first for better layer caching.
COPY backend/package*.json ./
RUN npm install --no-audit --no-fund

# Backend source.
COPY backend/ ./

# Runtime config. The host injects PORT; the app reads process.env.PORT.
ENV NODE_ENV=production
ENV ML_AUTOSTART=false
EXPOSE 8000

CMD ["node", "server.js"]
