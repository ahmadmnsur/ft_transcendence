COMPOSE       := docker compose
COMPOSE_FILE  := compose.yaml
DEV_OVERLAY   := compose.dev.yaml
LOCAL_OVERLAY := compose.local.yaml
LOCAL_COMPOSE := $(COMPOSE) --env-file .env --profile local -f $(COMPOSE_FILE) -f $(LOCAL_OVERLAY)
DEV_COMPOSE   := $(COMPOSE) --env-file .env --profile local -f $(COMPOSE_FILE) -f $(LOCAL_OVERLAY) -f $(DEV_OVERLAY)
TEST_COMPOSE  := $(COMPOSE) -p peerconnect-test --env-file .env --profile local -f $(COMPOSE_FILE) -f $(LOCAL_OVERLAY) -f $(DEV_OVERLAY)
LOCAL_KEYS    := POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB NODE_ENV HTTPS_PORT HTTP_PORT ADMIN_EMAIL MODERATOR_EMAIL \
                 ANON_KEY SERVICE_ROLE_KEY GOTRUE_JWT_KEYS JWT_JWKS GOTRUE_JWT_SECRET AUTH_JWT_SECRET SERVICE_KEY \
                 ANON_KEY_ASYMMETRIC SERVICE_ROLE_KEY_ASYMMETRIC LOCAL_DATABASE_URL LOCAL_PUBLIC_ORIGIN LOCAL_BIND_ADDRESS \
                 LOCAL_ADMIN_PASSWORD LOCAL_MODERATOR_PASSWORD LOCAL_SEED_STUDENT_PASSWORD LOCAL_SUPABASE_URL \
                 LOCAL_SUPABASE_PUBLISHABLE_KEY LOCAL_SUPABASE_SECRET_KEY
DEV_KEYS      := $(LOCAL_KEYS) LOCAL_DEV_PUBLIC_ORIGIN
RESET         := node dist/prisma/reset/main.js

.PHONY: up local dev down wipe seed test logs env local-env dev-env reset-team reset-local

up: env
	$(COMPOSE) up --build

local: local-env
	$(LOCAL_COMPOSE) up --build

dev: dev-env
	$(DEV_COMPOSE) up --build

down: env
	$(COMPOSE) --profile local down

wipe: env
	$(COMPOSE) --profile local down --volumes --remove-orphans

seed: env
	$(COMPOSE) exec api npx prisma db seed --config prisma.config.ts

reset-team: env
	@sh prisma/reset/require-main.sh
	$(COMPOSE) run --rm --build --no-deps api $(RESET) team

reset-local: local-env
	$(LOCAL_COMPOSE) run --rm --build api $(RESET) local

test: dev-env
	@set -e; \
		trap 'status=$$?; $(TEST_COMPOSE) down --volumes --remove-orphans || { if [ $$status -eq 0 ]; then status=1; fi; }; exit $$status' EXIT; \
		$(TEST_COMPOSE) down --volumes --remove-orphans; \
		$(TEST_COMPOSE) build api; \
		$(TEST_COMPOSE) up -d db auth storage api-gw; \
		$(TEST_COMPOSE) run --rm api npx vitest run

logs:
	$(COMPOSE) logs -f

env:
	@test -f .env || { \
		echo "missing .env: copy .env.example to .env and fill in every value"; exit 1; }

local-env: ENV_KEYS = $(LOCAL_KEYS)
dev-env: ENV_KEYS = $(DEV_KEYS)

local-env dev-env: env
	@vars=$$($(COMPOSE) --env-file .env -f $(COMPOSE_FILE) config --environment) || exit 1; \
	value() { printf '%s\n' "$$vars" | sed -n "s/^$$1=//p" | tail -n 1; }; \
	missing=""; \
	for key in $(ENV_KEYS); do \
		test -n "$$(value $$key)" || missing="$$missing $$key"; \
	done; \
	test -z "$$missing" || { echo "missing in .env:$$missing"; exit 1; }; \
	value POSTGRES_PASSWORD | grep -Eq '^[A-Za-z0-9._~-]+$$' || { \
		echo "POSTGRES_PASSWORD in .env may hold only letters, digits and . _ ~ -, since Compose writes it into database URLs"; exit 1; }
