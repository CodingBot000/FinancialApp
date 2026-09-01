FROM node:24.19.0-alpine AS build

WORKDIR /workspace
RUN npm install --global npm@11.17.0

COPY package.json package-lock.json .npmrc ./
COPY apps/mobile/package.json apps/mobile/package.json
COPY services/platform-api/package.json services/platform-api/package.json
COPY services/institution-simulator/package.json services/institution-simulator/package.json
RUN npm ci

COPY tsconfig.base.json ./
COPY services/platform-api services/platform-api
RUN npm run build --workspace @finapp/platform-api

FROM node:24.19.0-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /workspace
RUN npm install --global npm@11.17.0

COPY package.json package-lock.json .npmrc ./
COPY apps/mobile/package.json apps/mobile/package.json
COPY services/platform-api/package.json services/platform-api/package.json
COPY services/institution-simulator/package.json services/institution-simulator/package.json
RUN npm ci --omit=dev --workspace @finapp/platform-api --include-workspace-root=false

COPY --from=build /workspace/services/platform-api/dist services/platform-api/dist
COPY --from=build /workspace/services/platform-api/drizzle services/platform-api/drizzle

USER node
CMD ["node", "services/platform-api/dist/main.js"]
