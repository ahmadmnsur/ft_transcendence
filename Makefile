COMPOSE       := docker compose
COMPOSE_FILE  := compose.yaml
DEV_OVERLAY   := compose.dev.yaml
LOCAL_OVERLAY := compose.local.yaml
LOCAL_COMPOSE := $(COMPOSE) --env-file .env.example -f $(COMPOSE_FILE) -f $(LOCAL_OVERLAY)
DEV_COMPOSE   := $(COMPOSE) --env-file .env.example -f $(COMPOSE_FILE) -f $(DEV_OVERLAY) -f $(LOCAL_OVERLAY)
TEST_COMPOSE  := $(COMPOSE) -p peerconnect-test --env-file .env.example -f $(COMPOSE_FILE) -f $(DEV_OVERLAY) -f $(LOCAL_OVERLAY)
RESET         := node dist/prisma/reset/main.js

.PHONY: up local dev down wipe seed test logs env reset-team reset-local

up: env
	$(COMPOSE) up --build

local:
	$(LOCAL_COMPOSE) up --build

dev:
	$(DEV_COMPOSE) up --build

down:
	$(COMPOSE) down

wipe:
	$(COMPOSE) down --volumes --remove-orphans

seed:
	$(COMPOSE) exec api npx prisma db seed --config prisma.config.ts

reset-team:
	@sh prisma/reset/require-main.sh
	$(COMPOSE) run --rm --build --no-deps api $(RESET) team

reset-local:
	$(LOCAL_COMPOSE) run --rm --build api $(RESET) local

test:
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
		test -f .env.example || { \
			echo "missing .env.example"; exit 1; }; \
		cp .env.example .env; \
		echo "created .env from .env.example"; \
	}
