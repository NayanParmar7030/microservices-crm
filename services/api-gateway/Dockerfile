FROM node:20-alpine AS build
WORKDIR /app
COPY services/api-gateway/package.json ./
RUN npm install
COPY services/api-gateway/ ./
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY services/api-gateway/package.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.js"]
