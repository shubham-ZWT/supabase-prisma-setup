# Prisma v7 + Supabase Setup Guide

## Connection Strings

From your Supabase project dashboard → **Connect** → **ORM** → **Select Prisma**:

| Purpose | Port | Parameter | Usage |
|---------|------|-----------|-------|
| **Session pooler** (migrations) | `5432` | none | Used in `prisma.config.ts` for running migrations |
| **Transaction pooler** (app runtime) | `6543` | `?pgbouncer=true` | Used at runtime via PrismaClient |

### `.env`

```env
# Transaction pooler — for app runtime queries
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Session pooler — for migrations only
DIRECT_URL="postgresql://postgres.<project-ref>:<password>@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"
```

> **Why two URLs?** The transaction pooler (6543 + `pgbouncer=true`) doesn't support DDL (CREATE TABLE, ALTER, etc.). Migrations must run through the session pooler (5432) or a direct connection. The session pooler preserves prepared statements and schema changes.

---

## Installation

```bash
npm install prisma @prisma/client @prisma/adapter-pg pg
```

---

## `prisma.config.ts`

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DIRECT_URL"),  // always DIRECT_URL for migrations
  },
});
```

> Use `env("DIRECT_URL")` — NOT `env("DATABASE_URL")`. Otherwise migrations will fail silently because the transaction pooler blocks DDL.

---

## `prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
```

- The `datasource` block does **not** contain a `url` field in Prisma v7 — the URL comes from `prisma.config.ts`.
- `output` is set to `../src/generated/prisma` to keep generated code inside the source tree.

---

## Runtime Client Initialization

Prisma v7 requires a **driver adapter** for PostgreSQL (already included in the install command above).

Create an explicit `pg.Pool` and pass it to `PrismaPg` — this is more reliable than passing a config object:

```ts
import "dotenv/config";
import pg from "pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new pg.Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
```

> **Why `@prisma/adapter-pg`?** Prisma v7 decoupled the database driver from the client. You must provide an adapter that matches your database. Without it, `PrismaClient` won't know how to connect.
>
> **Why explicit `pg.Pool`?** The `PrismaPg({ connectionString })` shorthand can have issues creating the internal pool. Creating the pool explicitly and passing it to `PrismaPg(pool)` avoids those problems.

### Supabase Client

The Supabase SDK also needs env vars loaded at module evaluation time:

```ts
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env["SUPABASE_URL"]!,
  process.env["SUPABASE_ANON_KEY"]!
);
```

Add the corresponding env vars to `.env`:

```env
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_ANON_KEY="<your-anon-key>"
```

---

## Key Commands

```bash
npx prisma generate        # regenerate client after schema changes
npx prisma db push         # push schema directly (no migration history)
npx prisma migrate dev     # create + apply a migration
npx prisma migrate status  # check migration state
```

---

## Prisma v7 Breaking Changes (from v5/v6)

| v5/v6 | v7 |
|-------|----|
| `url` in `datasource db {}` | URL in `prisma.config.ts` only |
| `datasource.url` + `datasource.directUrl` in config | Single `datasource.url` in config |
| `generator client { provider = "prisma-client-js" }` | `provider = "prisma-client"` (new name) |
| Generated client auto-detected | Explicit `output` required for custom path |

Make sure you have `prisma` v7 installed, not v5/v6.
