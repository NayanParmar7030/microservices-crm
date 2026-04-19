FROM node:20-alpine AS build
WORKDIR /app
COPY services/user-service/package.json ./
RUN npm install
COPY services/user-service/ ./
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY services/user-service/package.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 3002
CMD ["node", "dist/server.js"]
