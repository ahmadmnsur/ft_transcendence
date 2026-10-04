# `make up` is the single command (ADR-0004 decision 8).
#
# Every target here is convenience over Compose. The Makefile is never a hiding
# place for required setup: bare `docker compose up --build` must also work.

COMPOSE       := docker compose
COMPOSE_FILE  := compose.yaml
DEV_OVERLAY   := compose.dev.yaml
LOCAL_OVERLAY := compose.local.yaml
LOCAL_COMPOSE := $(COMPOSE) --env-file .env.example -f $(COMPOSE_FILE) -f $(LOCAL_OVERLAY)
DEV_COMPOSE   := $(COMPOSE) --env-file .env.example -f $(COMPOSE_FILE) -f $(DEV_OVERLAY) -f $(LOCAL_OVERLAY)
TEST_COMPOSE  := $(COMPOSE) -p peerconnect-test --env-file .env.example -f $(COMPOSE_FILE) -f $(DEV_OVERLAY) -f $(LOCAL_OVERLAY)

.PHONY: up local dev down wipe seed test logs env

## up — boot the whole stack
up: env
	$(COMPOSE) up --build

## local — boot the production image on the fallback
local:
	$(LOCAL_COMPOSE) up --build

## dev — boot the dev image on the fallback
dev:
	$(DEV_COMPOSE) up --build

## down — stop the stack, keep the volume
down:
	$(COMPOSE) down

## wipe — stop the stack and drop the database and Storage volumes
wipe:
	$(COMPOSE) down --volumes --remove-orphans

## seed — re-run the seed against a running stack
seed:
	$(COMPOSE) exec api npx prisma db seed --config prisma.config.ts

## test — run the suite in an isolated fallback copy
test:
	@set -e; \
		trap 'status=$$?; $(TEST_COMPOSE) down --volumes --remove-orphans || { if [ $$status -eq 0 ]; then status=1; fi; }; exit $$status' EXIT; \
		$(TEST_COMPOSE) down --volumes --remove-orphans; \
		$(TEST_COMPOSE) build api; \
		$(TEST_COMPOSE) up -d db auth storage api-gw; \
		$(TEST_COMPOSE) run --rm api npx vitest run

## logs — follow every service
logs:
	$(COMPOSE) logs -f

## env — copy .env.example into place when .env is absent
env:
	@test -f .env || { \
		test -f .env.example || { \
			echo "missing .env.example"; exit 1; }; \
		cp .env.example .env; \
		echo "created .env from .env.example"; \
	}
