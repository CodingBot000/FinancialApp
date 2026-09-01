FROM node:24.19.0-alpine AS build

WORKDIR /workspace
RUN npm install --global npm@11.17.0

COPY package.json package-lock.json .npmrc ./
COPY apps/mobile/package.json apps/mobile/package.json
COPY services/platform-api/package.json services/platform-api/package.json
COPY services/institution-simulator/package.json services/institution-simulator/package.json
RUN npm ci --workspace @finapp/institution-simulator --include-workspace-root

COPY tsconfig.base.json ./
COPY services/institution-simulator services/institution-simulator
RUN npm run build --workspace @finapp/institution-simulator

FROM node:24.19.0-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /workspace
RUN npm install --global npm@11.17.0

COPY package.json package-lock.json .npmrc ./
COPY apps/mobile/package.json apps/mobile/package.json
COPY services/platform-api/package.json services/platform-api/package.json
COPY services/institution-simulator/package.json services/institution-simulator/package.json
RUN npm ci --omit=dev --workspace @finapp/institution-simulator --include-workspace-root=false

COPY --from=build /workspace/services/institution-simulator/dist services/institution-simulator/dist
COPY --from=build /workspace/services/institution-simulator/drizzle services/institution-simulator/drizzle

USER node
CMD ["node", "services/institution-simulator/dist/main.js"]
