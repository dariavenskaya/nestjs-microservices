FROM node:24-alpine AS deps
WORKDIR /services/lib
COPY lib/package.json lib/package-lock.json ./
RUN npm ci

WORKDIR /services/service-a
COPY service-a/package.json service-a/package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /services/service-a
COPY --from=deps /services/service-a/node_modules ./node_modules
COPY --from=deps /services/lib/node_modules /services/lib/node_modules
COPY service-a/ ./
COPY lib/ /services/lib/
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache su-exec
COPY --from=build /services/service-a/package.json ./package.json
COPY --from=build /services/service-a/node_modules ./node_modules
COPY --from=build /services/service-a/dist ./dist
COPY service-a/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
