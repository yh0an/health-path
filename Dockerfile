# Stage 1 : dépendances server
FROM node:20-alpine AS server-deps
WORKDIR /app
COPY server/package*.json ./
RUN npm ci

# Stage 2 : dépendances client
FROM node:20-alpine AS client-deps
WORKDIR /app
COPY client/package*.json ./
RUN npm ci --legacy-peer-deps

# Stage 3 : build client
FROM node:20-alpine AS client-builder
WORKDIR /app
COPY --from=client-deps /app/node_modules ./node_modules
COPY client/ .
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Stage 4 : build server
FROM node:20-alpine AS server-builder
WORKDIR /app
COPY --from=server-deps /app/node_modules ./node_modules
COPY server/prisma ./prisma
COPY server/prisma.config.ts ./prisma.config.ts
COPY server/tsconfig.json ./tsconfig.json
COPY server/src ./src
RUN npx prisma generate
RUN npx tsc

# Stage 5 : production
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=server-builder /app/dist ./dist
COPY --from=server-builder /app/node_modules ./node_modules
COPY --from=server-builder /app/prisma ./prisma
COPY --from=server-builder /app/prisma.config.ts ./prisma.config.ts
COPY server/package.json ./package.json
COPY --from=client-builder /app/dist ./public
EXPOSE 4800
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
