FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY services ./services

RUN npm ci
RUN npm run build -w notification-service
RUN npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/services/notification-service/package.json ./services/notification-service/
COPY --from=build /app/services/notification-service/dist ./services/notification-service/dist

WORKDIR /app/services/notification-service
EXPOSE 3004
CMD ["node", "dist/server.js"]
