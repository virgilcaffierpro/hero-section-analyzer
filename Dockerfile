FROM node:22-slim

# Install Chromium system dependencies
RUN apt-get update && apt-get install -y \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libxshmfence1 \
    fonts-liberation libappindicator3-1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Install Playwright Chromium (no --with-deps, system deps already installed)
RUN npx playwright install chromium

# Copy source and build
COPY . .
RUN npm run build

EXPOSE 10000
ENV PORT=10000
CMD ["npm", "start"]
