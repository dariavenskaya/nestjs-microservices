FROM node:24-alpine AS deps
WORKDIR /services/lib
COPY lib/package.json lib/package-lock.json ./
RUN npm ci

WORKDIR /services/service-b
COPY service-b/package.json service-b/package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /services/service-b
COPY --from=deps /services/service-b/node_modules ./node_modules
COPY --from=deps /services/lib/node_modules /services/lib/node_modules
COPY service-b/ ./
COPY lib/ /services/lib/
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /services/service-b/package.json ./package.json
COPY --from=build /services/service-b/node_modules ./node_modules
COPY --from=build /services/service-b/dist ./dist
EXPOSE 3000
USER node
CMD ["node", "dist/service-b/src/main.js"]
