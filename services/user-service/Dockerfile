FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY services ./services

RUN npm ci
RUN npm run build -w user-service
RUN npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/services/user-service/package.json ./services/user-service/
COPY --from=build /app/services/user-service/dist ./services/user-service/dist

WORKDIR /app/services/user-service
EXPOSE 3002
CMD ["node", "dist/server.js"]
