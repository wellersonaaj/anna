# Imagem da API (monorepo). Railway usa Dockerfile quando existe, evitando o Railpack
# que monta cache em node_modules/.vite e faz npm ci falhar com EBUSY.
FROM node:22-bookworm-slim
WORKDIR /app

# Build precisa de devDependencies (TypeScript, etc.)
ENV NODE_ENV=development

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY apps ./apps
COPY packages ./packages

RUN npm ci && npm run build:api

ENV NODE_ENV=production
EXPOSE 3333
CMD ["node", "apps/api/dist/index.js"]
