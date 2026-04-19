FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY services ./services

RUN npm ci
RUN npm run build -w api-gateway
RUN npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/services/api-gateway/package.json ./services/api-gateway/
COPY --from=build /app/services/api-gateway/dist ./services/api-gateway/dist

WORKDIR /app/services/api-gateway
EXPOSE 3000
CMD ["node", "dist/server.js"]
