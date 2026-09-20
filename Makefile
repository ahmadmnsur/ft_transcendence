# `make up` is the single command (ADR-0004 decision 8).
#
# Every target here is convenience over Compose. The Makefile is **never a hiding place for
# required setup**: bare `docker compose up --build` must also work end-to-end, which is why the
# base Compose file carries a default name and `up` passes no `-f`.

COMPOSE      := docker compose
COMPOSE_FILE := compose.yaml
DEV_OVERLAY  := compose.dev.yaml

.PHONY: up dev down seed logs env

## up — the single command: boot the whole stack from a clean clone
up: env
	$(COMPOSE) up --build

## dev — the dev overlay: proxy plus Vite HMR, still single-origin (ADR-0004 decision 4)
dev: env
	$(COMPOSE) -f $(COMPOSE_FILE) -f $(DEV_OVERLAY) up --build

## down — stop the stack and remove its containers
down:
	$(COMPOSE) down

## seed — re-run the seed against a running stack (it also runs on every boot, ADR-0004 d11)
seed:
	$(COMPOSE) exec api npx prisma db seed

## logs — follow every service
logs:
	$(COMPOSE) logs -f

## env — copy .env.example into place when .env is absent (ADR-0004 decision 8)
env:
	@test -f .env || { \
		test -f .env.example || { \
			echo "missing .env.example — see ADR-0004 decision 9 for its contents"; exit 1; }; \
		cp .env.example .env; \
		echo "created .env from .env.example"; \
	}
