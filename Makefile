# Unified Service Scheduler Automation Makefile (scheduler_api_task3)
PORT ?= 3001
HOST ?= 127.0.0.1
LOG_FILE = /private/tmp/scheduler_server_$(PORT).log

.PHONY: help dev restart stop status build test ai-api-restart ai-api-stop ai-api-status

help:
	@echo "Unified Service Scheduler Automation:"
	@echo "  make dev              - Run server in foreground with tsx watch"
	@echo "  make ai-api-restart   - Stop old process, start new server in background"
	@echo "  make ai-api-stop      - Terminate background server on port $(PORT)"
	@echo "  make ai-api-status    - Check server process and open ports"
	@echo "  make build            - Compile TypeScript with tsc"
	@echo "  make test             - Run Vitest acceptance suites"

# Alias for convenience
restart: ai-api-restart
stop: ai-api-stop
status: ai-api-status

ai-api-stop:
	@echo "Stopping server on port $(PORT)..."
	@-lsof -ti:$(PORT) | xargs kill -9 2>/dev/null || true
	@echo "Port $(PORT) is now free."

ai-api-restart: ai-api-stop build
	@echo "Starting scheduler API on port $(PORT)..."
	@PORT=$(PORT) HOST=$(HOST) npx tsx src/server.ts > $(LOG_FILE) 2>&1 &
	@sleep 1
	@echo "Server successfully started!"
	@echo "  Local API:   http://$(HOST):$(PORT)"
	@echo "  Swagger UI:  http://$(HOST):$(PORT)/docs"
	@echo "  OpenAPI Spec: http://$(HOST):$(PORT)/docs/json"
	@echo "  Log output:  $(LOG_FILE)"

ai-api-status:
	@echo "=== Server Status (Port $(PORT)) ==="
	@lsof -i :$(PORT) || echo "No process currently listening on port $(PORT)"
	@echo "=== Recent Log Output ==="
	@tail -n 15 $(LOG_FILE) 2>/dev/null || true

dev:
	PORT=$(PORT) HOST=$(HOST) npm run dev

build:
	npm run build

test:
	npm test
