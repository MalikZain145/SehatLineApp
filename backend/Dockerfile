# SehatLine backend — portable container (Koyeb / Back4App / Railway / Fly / any).
# No native build deps (uses bcryptjs, jimp, tesseract.js — all pure JS/WASM),
# so a slim Node image is enough.
FROM node:20-slim

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package*.json ./
RUN npm install --no-audit --no-fund

# App source.
COPY . .

# Runtime config. The host injects PORT; the app reads process.env.PORT.
ENV NODE_ENV=production
ENV ML_AUTOSTART=false
EXPOSE 8000

CMD ["node", "server.js"]
