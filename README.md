# SentinelBoard

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

## Infrastructure (Optional Local Development)
For offline development, you can still use the local PostgreSQL setup:
```bash
docker compose up -d
```
(Note: You will need to update `.env` to point to `localhost:5432`)

