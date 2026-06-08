FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json nest-cli.json ./
COPY src/ src/
RUN npm run build

FROM docker:latest AS docker-cli

FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache tini
COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main"]
