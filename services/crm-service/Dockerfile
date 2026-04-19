FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY services ./services

RUN npm ci
RUN npm run build -w crm-service
RUN npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/services/crm-service/package.json ./services/crm-service/
COPY --from=build /app/services/crm-service/dist ./services/crm-service/dist

WORKDIR /app/services/crm-service
EXPOSE 3003
CMD ["node", "dist/server.js"]
