FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY services ./services

RUN npm ci
RUN npm run build -w auth-service
RUN npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/services/auth-service/package.json ./services/auth-service/
COPY --from=build /app/services/auth-service/dist ./services/auth-service/dist

WORKDIR /app/services/auth-service
EXPOSE 3001
CMD ["node", "dist/server.js"]
