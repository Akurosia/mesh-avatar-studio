FROM ghcr.io/astral-sh/uv:latest AS uv

FROM node:22-bookworm-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_CACHE_DIR=/home/node/.cache/uv

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates python3 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=uv /uv /uvx /usr/local/bin/

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY --chown=node:node . .
RUN mkdir -p projects /home/node/.cache/uv \
    && npm run build \
    && chown -R node:node node_modules projects /home/node/.cache/uv

USER node

# Cache the Python packages used when the editor rebuilds avatar layers.
RUN uv run --no-project --python ">=3.10" \
    --with numpy --with pillow --with opencv-python-headless \
    python -c "import cv2, numpy, PIL"

EXPOSE 5173

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:5173/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
