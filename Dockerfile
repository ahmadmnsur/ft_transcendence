FROM node:22-alpine AS base
WORKDIR /app
ENV CHECKPOINT_DISABLE=1
COPY package.json package-lock.json ./

FROM base AS build
RUN --mount=type=cache,target=/root/.npm npm ci
COPY tsconfig.json tsconfig.build.json nest-cli.json prisma.config.ts ./
COPY src ./src
COPY prisma ./prisma
RUN npx prisma generate --config prisma.config.ts
RUN npx nest build

FROM base AS runtime
ENV NODE_ENV=production
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
COPY prisma.config.ts ./
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy --config prisma.config.ts && npx prisma db seed --config prisma.config.ts && exec node dist/src/main.js"]

FROM base AS dev
RUN --mount=type=cache,target=/root/.npm npm ci
CMD ["sh", "-c", "npx prisma generate --config prisma.config.ts && npx nest build && npx prisma migrate deploy --config prisma.config.ts && npx prisma db seed --config prisma.config.ts && exec npx nest start --watch"]
