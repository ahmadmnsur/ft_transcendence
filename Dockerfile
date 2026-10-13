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
COPY supabase/prod-ca-2021.crt ./supabase/
EXPOSE 3000
CMD ["sh", "-c", "node dist/src/core/check-env.js && npx prisma migrate deploy --config prisma.config.ts && npx prisma db seed --config prisma.config.ts && exec node dist/src/main.js"]

FROM base AS dev
RUN --mount=type=cache,target=/root/.npm npm ci
# The test harness starts this binary for the upload category (§16.2); the
# runtime image never needs it.
RUN apk add --no-cache nginx
COPY --from=build /app/dist/src/core/check-env.js /opt/peerconnect/check-env.js
COPY --from=build /app/dist/src/core/env.js /opt/peerconnect/env.js
COPY --from=build /app/dist/src/core/supabase-check.js /opt/peerconnect/supabase-check.js
COPY --from=build /app/dist/src/core/database-connection.js /opt/peerconnect/database-connection.js
# The copy sits outside /app, so steps 3 and 4 reach pg through this link to the
# image's modules, which the overlay keeps in its anonymous /app/node_modules.
RUN ln -s /app/node_modules /opt/peerconnect/node_modules
CMD ["sh", "-c", "node /opt/peerconnect/check-env.js && npx prisma generate --config prisma.config.ts && npx nest build && npx prisma migrate deploy --config prisma.config.ts && npx prisma db seed --config prisma.config.ts && exec npx nest start --watch"]
