# `make up` is the single command (ADR-0004 decision 8).
#
# Every target here is convenience over Compose. The Makefile is never a hiding
# place for required setup: bare `docker compose up --build` must also work.

COMPOSE      := docker compose
COMPOSE_FILE := compose.yaml
DEV_OVERLAY  := compose.dev.yaml

.PHONY: up dev down wipe seed test logs env

## up — boot the whole stack
up: env
	$(COMPOSE) up --build

## dev — boot with the dev overlay
dev: env
	$(COMPOSE) -f $(COMPOSE_FILE) -f $(DEV_OVERLAY) up --build

## down — stop the stack, keep the volume
down:
	$(COMPOSE) down

## wipe — stop the stack and drop the database volume
wipe:
	$(COMPOSE) down --volumes --remove-orphans

## seed — re-run the seed against a running stack
seed:
	$(COMPOSE) exec api npx prisma db seed --config prisma.config.ts

## test — run the suite in a fresh dev overlay container
test:
	$(COMPOSE) -f $(COMPOSE_FILE) -f $(DEV_OVERLAY) run --rm api npx vitest run

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
