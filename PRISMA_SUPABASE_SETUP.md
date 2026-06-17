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

Use `DATABASE_URL` (transaction pooler) with `PrismaPg`:

```ts
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env["DATABASE_URL"],
});

export const prisma = new PrismaClient({ adapter });
```

> **Why `@prisma/adapter-pg`?** Prisma v7 decoupled the database driver from the client. You must provide an adapter that matches your database. Without it, `PrismaClient` won't know how to connect.

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
