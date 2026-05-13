ifneq (,$(wildcard .env))
include .env
export
endif

-include Makefile.local

DEPLOY_HOST ?=
DEPLOY_USER ?=
DEPLOY_DIR ?=
SSH ?= ssh
RSYNC ?= rsync
COMPOSE_REMOTE ?= docker-compose

FLOWLENS_BACKEND_PORT ?= 8081
FLOWLENS_HTTP_PORT ?= 5173
FLOWLENS_PROJECT_KEYS ?= pk_demo
POSTGRES_USER ?= user
POSTGRES_PASSWORD ?= password
POSTGRES_DB ?= monitoring
REDIS_ADDR ?= redis:6379
DATABASE_URL ?= postgres://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@postgres:5432/$(POSTGRES_DB)?sslmode=disable
VITE_API_URL ?=
FLOWLENS_DASHBOARD_PASSWORD ?=
FLOWLENS_DASHBOARD_USER ?= admin

.PHONY: deploy sync remote-env remote-up ps logs down check-deploy-config

deploy: sync remote-env remote-up

check-deploy-config:
	@test -n "$(DEPLOY_HOST)" || (echo "DEPLOY_HOST is required. Put it in Makefile.local or pass DEPLOY_HOST=..." >&2; exit 1)
	@test -n "$(DEPLOY_USER)" || (echo "DEPLOY_USER is required. Put it in Makefile.local or pass DEPLOY_USER=..." >&2; exit 1)
	@test -n "$(DEPLOY_DIR)" || (echo "DEPLOY_DIR is required. Put it in Makefile.local or pass DEPLOY_DIR=..." >&2; exit 1)

sync: check-deploy-config
	$(RSYNC) -az --delete \
		--exclude '.git' \
		--exclude '.env' \
		--exclude 'Makefile.local' \
		--exclude 'frontend/node_modules' \
		--exclude 'frontend/dist' \
		./ $(DEPLOY_USER)@$(DEPLOY_HOST):$(DEPLOY_DIR)/

remote-env: check-deploy-config
	$(SSH) $(DEPLOY_USER)@$(DEPLOY_HOST) "mkdir -p '$(DEPLOY_DIR)' && printf '%s\n' \
		'REDIS_ADDR=$(REDIS_ADDR)' \
		'POSTGRES_USER=$(POSTGRES_USER)' \
		'POSTGRES_PASSWORD=$(POSTGRES_PASSWORD)' \
		'POSTGRES_DB=$(POSTGRES_DB)' \
		'DATABASE_URL=$(DATABASE_URL)' \
		'FLOWLENS_BACKEND_PORT=$(FLOWLENS_BACKEND_PORT)' \
		'FLOWLENS_HTTP_PORT=$(FLOWLENS_HTTP_PORT)' \
		'FLOWLENS_PROJECT_KEYS=$(FLOWLENS_PROJECT_KEYS)' \
		'VITE_API_URL=$(VITE_API_URL)' \
		'FLOWLENS_DASHBOARD_PASSWORD=$(FLOWLENS_DASHBOARD_PASSWORD)' \
		'FLOWLENS_DASHBOARD_USER=$(FLOWLENS_DASHBOARD_USER)' \
		> '$(DEPLOY_DIR)/.env'"

remote-up: check-deploy-config
	$(SSH) $(DEPLOY_USER)@$(DEPLOY_HOST) "cd '$(DEPLOY_DIR)' && $(COMPOSE_REMOTE) down --remove-orphans && $(COMPOSE_REMOTE) up -d --build"

ps: check-deploy-config
	$(SSH) $(DEPLOY_USER)@$(DEPLOY_HOST) "cd '$(DEPLOY_DIR)' && $(COMPOSE_REMOTE) ps"

logs: check-deploy-config
	$(SSH) $(DEPLOY_USER)@$(DEPLOY_HOST) "cd '$(DEPLOY_DIR)' && $(COMPOSE_REMOTE) logs --tail=100"

down: check-deploy-config
	$(SSH) $(DEPLOY_USER)@$(DEPLOY_HOST) "cd '$(DEPLOY_DIR)' && $(COMPOSE_REMOTE) down"
