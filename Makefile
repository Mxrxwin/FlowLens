ifneq (,$(wildcard .env))
include .env
export
endif

DEPLOY_HOST ?= 87.242.117.157
DEPLOY_USER ?= user1
DEPLOY_DIR ?= /home/$(DEPLOY_USER)/FlowLens
SSH ?= ssh
RSYNC ?= rsync
COMPOSE_REMOTE ?= docker-compose

FLOWLENS_BACKEND_PORT ?= 8081
FLOWLENS_HTTP_PORT ?= 5173
POSTGRES_USER ?= user
POSTGRES_PASSWORD ?= password
POSTGRES_DB ?= monitoring
REDIS_ADDR ?= redis:6379
DATABASE_URL ?= postgres://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@postgres:5432/$(POSTGRES_DB)?sslmode=disable
VITE_API_URL ?=

.PHONY: deploy sync remote-env remote-up ps logs down

deploy: sync remote-env remote-up

sync:
	$(RSYNC) -az --delete \
		--exclude '.git' \
		--exclude '.env' \
		--exclude 'frontend/node_modules' \
		--exclude 'frontend/dist' \
		./ $(DEPLOY_USER)@$(DEPLOY_HOST):$(DEPLOY_DIR)/

remote-env:
	$(SSH) $(DEPLOY_USER)@$(DEPLOY_HOST) "mkdir -p '$(DEPLOY_DIR)' && printf '%s\n' \
		'REDIS_ADDR=$(REDIS_ADDR)' \
		'POSTGRES_USER=$(POSTGRES_USER)' \
		'POSTGRES_PASSWORD=$(POSTGRES_PASSWORD)' \
		'POSTGRES_DB=$(POSTGRES_DB)' \
		'DATABASE_URL=$(DATABASE_URL)' \
		'FLOWLENS_BACKEND_PORT=$(FLOWLENS_BACKEND_PORT)' \
		'FLOWLENS_HTTP_PORT=$(FLOWLENS_HTTP_PORT)' \
		'VITE_API_URL=$(VITE_API_URL)' \
		> '$(DEPLOY_DIR)/.env'"

remote-up:
	$(SSH) $(DEPLOY_USER)@$(DEPLOY_HOST) "cd '$(DEPLOY_DIR)' && $(COMPOSE_REMOTE) down --remove-orphans && $(COMPOSE_REMOTE) up -d --build"

ps:
	$(SSH) $(DEPLOY_USER)@$(DEPLOY_HOST) "cd '$(DEPLOY_DIR)' && $(COMPOSE_REMOTE) ps"

logs:
	$(SSH) $(DEPLOY_USER)@$(DEPLOY_HOST) "cd '$(DEPLOY_DIR)' && $(COMPOSE_REMOTE) logs --tail=100"

down:
	$(SSH) $(DEPLOY_USER)@$(DEPLOY_HOST) "cd '$(DEPLOY_DIR)' && $(COMPOSE_REMOTE) down"
