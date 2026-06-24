# SentinelBoard

SentinelBoard is risk-enforcement middleware for autonomous trading agents. Most agents have no independent check on their behavior — if their logic misfires, oversizes a position, or continues re-entering after a loss, nothing stops the order before it reaches the exchange. SentinelBoard sits between the agent and the exchange: every proposed order is evaluated against configurable hard limits (position size, drawdown, correlation exposure, cooldown after loss, and order rate) before it is allowed through, with every decision permanently logged.

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd sentinel-board
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Set up Supabase**:
   - Create a new project on [Supabase](https://supabase.com).
   - Go to **Project Settings** -> **Database** -> **Connection String**.
   - Copy the **Transaction** (pooled) connection string and set it as `DATABASE_URL` in `.env` (append `?pgbouncer=true`).
   - Copy the **Session** (direct) connection string and set it as `DIRECT_URL` in `.env`.

4. **Run migrations**:
   ```bash
   pnpm prisma migrate dev --name init
   ```

5. **Seed the database**:
   ```bash
   pnpm prisma db seed
   ```

6. **Start the development server**:
   ```bash
   pnpm dev
   ```

## Running the Demo
Generate a verifiable audit log by running the rogue agent simulator:
```bash
pnpm demo
```
This script exercises every risk rule (normal orders, oversized orders, cooldown blocks, and rate limits) against the live API. It writes a reproducible, timestamped JSON log to `logs/demo-run-*.json`. You can view the activity updating in real-time on the dashboard at: `http://localhost:3000/dashboard/clv_rogue_agent_01`

## Integration Guide
Point your trading agent at SentinelBoard to enforce risk limits before execution:

1. **Register Agent**: `POST /api/agents` with `{ "name": "my-agent" }` to receive an `agentId`.
2. **Configure Rules**: `PATCH /api/agents/{id}/rules` to set limits (e.g., `maxPositionSizeUsd`, `maxOrdersPerMinute`).
3. **Interrogate Every Order**: Before calling your exchange, send order details to `POST /api/orders`.
4. **Enforce Decision**: 
   - If `decision` is `"ALLOWED"`, proceed with execution. 
   - If `decision` is `"BLOCKED"`, halt and surface the `reason` field.

## Usage Examples

### 1. Allowed Order
**Request:**
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "clv_rogue_agent_01",
    "symbol": "BTCUSDT",
    "side": "LONG",
    "quantity": 0.01,
    "priceUsd": 65000
  }'
```
**Response:**
```json
{
  "decision": "ALLOWED",
  "ruleFired": null,
  "reason": "Order within all risk parameters.",
  "orderEventId": "evt_01abc..."
}
```

### 2. Blocked Order (Size Limit)
**Request:**
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "clv_rogue_agent_01",
    "symbol": "BTCUSDT",
    "side": "LONG",
    "quantity": 100.0,
    "priceUsd": 65000
  }'
```
**Response:**
```json
{
  "decision": "BLOCKED",
  "ruleFired": "MAX_POSITION_SIZE",
  "reason": "Order size 6500000.0 USD exceeds maximum allowed 1000.0 USD",
  "orderEventId": "evt_02xyz..."
}
```

## Infrastructure (Optional Local Development)
For offline development, you can still use the local PostgreSQL setup:
```bash
docker compose up -d
```
(Note: You will need to update `.env` to point to `localhost:5432`)

