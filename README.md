# Unified Service Scheduler API

A resource-constrained service appointment scheduling platform (Scenario A: The Unified Service Scheduler).

## Tech Stack
- **Runtime:** Node.js (v22 LTS)
- **Language:** TypeScript 5.x
- **Framework:** Fastify 5.x
- **Documentation:** Fastify Swagger + Swagger UI (OpenAPI 3.0)
- **Database:** PostgreSQL 16 + Drizzle ORM
- **Validation:** Zod
- **Testing:** Vitest

## Quick Start & Server Management

Dự án đã tích hợp sẵn **Makefile** để quản lý server nhanh gọn:

```bash
# Khởi động lại Server sạch (tự kill port cũ, build tsc và chạy ngầm)
make ai-api-restart

# Kiểm tra trạng thái tiến trình và log mới nhất
make ai-api-status

# Tắt server
make ai-api-stop

# Chạy trực tiếp foreground (hot reload)
make dev
```

### URLs & Documentation
- **API Base:** `http://127.0.0.1:3001`
- **Swagger UI (Interactive):** `http://127.0.0.1:3001/docs`
- **OpenAPI 3.0 Spec:** `http://127.0.0.1:3001/docs/json`
- **Health Check:** `http://127.0.0.1:3001/health`

## Core API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/availability` | Query real-time available time slots (bay + technician) |
| `GET` | `/api/v1/availabilities` | Overview of dealership available schedule |
| `POST` | `/api/v1/appointments/book` | Atomically book appointment with dual-resource allocation |
| `GET` | `/api/v1/vehicles/:vehicleVin/appointments` | List confirmed appointments for a vehicle VIN |
| `GET` | `/health` | Liveness and DB connectivity health check |
