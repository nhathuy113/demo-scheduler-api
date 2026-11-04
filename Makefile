# Unified Service Scheduler Automation Makefile (scheduler_api_task3)
PORT ?= 3001
HOST ?= 127.0.0.1
TMP_DIR ?= $(shell echo "$${TMPDIR:-/tmp}")
LOG_FILE ?= $(TMP_DIR)/scheduler_server_$(PORT).log
PID_FILE ?= $(TMP_DIR)/scheduler_server_$(PORT).pid

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
	@if [ -f $(PID_FILE) ]; then \
		PID=$$(cat $(PID_FILE)); \
		if kill -0 $$PID 2>/dev/null; then \
			kill -15 $$PID 2>/dev/null || true; \
			sleep 0.5; \
			if kill -0 $$PID 2>/dev/null; then kill -9 $$PID 2>/dev/null || true; fi; \
		fi; \
		rm -f $(PID_FILE); \
	fi
	@-lsof -ti:$(PORT) -sTCP:LISTEN | xargs kill -15 2>/dev/null || true
	@echo "Port $(PORT) is now free."

ai-api-restart: ai-api-stop build
	@echo "Starting scheduler API on port $(PORT)..."
	@PORT=$(PORT) HOST=$(HOST) npx tsx src/server.ts > $(LOG_FILE) 2>&1 & echo $$! > $(PID_FILE)
	@sleep 1
	@if [ -f $(PID_FILE) ] && kill -0 $$(cat $(PID_FILE)) 2>/dev/null; then \
		echo "Server successfully started!"; \
		echo "  Local API:   http://$(HOST):$(PORT)"; \
		echo "  Swagger UI:  http://$(HOST):$(PORT)/docs"; \
		echo "  OpenAPI Spec: http://$(HOST):$(PORT)/docs/json"; \
		echo "  Log output:  $(LOG_FILE)"; \
	else \
		echo "Error: Server failed to start or exited immediately. Check $(LOG_FILE)"; \
		exit 1; \
	fi

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
