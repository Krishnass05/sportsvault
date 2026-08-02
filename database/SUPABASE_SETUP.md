# Supabase Integration Guide for SportVault

This guide walks through integrating Supabase (PostgreSQL) with the SportVault project.

---

## Prerequisites

1. A [Supabase](https://supabase.com) account
2. Your project's **Database Password** (set during project creation)
3. Node.js installed locally

---

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Fill in:
   - **Name**: `sportvault`
   - **Database Password**: Set a strong password (save it!)
   - **Region**: Closest to your users
4. Wait ~2 minutes for provisioning

---

## Step 2: Run the SQL Schema

### Option A: Supabase Dashboard (Easiest)
1. Open your project in Supabase Dashboard
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the contents of [`supabase_schema.sql`](./supabase_schema.sql)
5. Click **Run** (or `Ctrl+Enter`)

### Option B: Supabase CLI
```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### Option C: psql
```bash
psql "postgresql://postgres.<your-project-ref>@aws-0-<region>.pooler.supabase.com:6543/postgres" -f supabase_schema.sql
```

---

## Step 3: Get Your Connection Credentials

In Supabase Dashboard:
1. Go to **Project Settings** → **Database**
2. Find:
   - **Host**: `db.<your-project-ref>.supabase.co`
   - **Port**: `5432`
   - **User**: `postgres`
   - **Password**: The database password you set
   - **Connection string**: `postgresql://postgres.<your-project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres`

> ⚠️ **Important**: Use the **Transaction pooler** (`6543`) for serverless/edge, and the **Session pooler** (`5432`) for persistent connections.

---

## Step 4: Update Backend Environment Variables

Edit `backend/.env`:

```env
# ========== SUPABASE (PostgreSQL) CONFIGURATION ==========
DB_HOST=<your-supabase-host>          # e.g. db.xyz.supabase.co
DB_PORT=5432                          # or 6543 for transaction pooler
DB_USER=postgres
DB_PASSWORD=<your-database-password>
DB_NAME=postgres                      # Supabase default database

# Optional - Supabase Auth (if using Supabase's built-in auth)
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_ANON_KEY=<your-anon-public-key>
```

---

## Step 5: Install PostgreSQL Driver

The current backend uses `mysql2`. For Supabase, install `pg`:

```bash
cd backend
npm install pg
```

Then update `backend/db.js`:

```javascript
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'postgres',
    max: 10,                    // max pool connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: {
        rejectUnauthorized: false   // required for Supabase
    }
});

// Test connection
pool.query('SELECT NOW()')
    .then(() => console.log('Supabase connected successfully'))
    .catch(err => console.error('Supabase connection failed:', err.message));

module.exports = pool;
```

> ⚠️ **Note**: PostgreSQL uses `$1, $2, ...` for parameterized queries instead of MySQL's `?` placeholder. You will need to update all controllers that use `?` placeholders.

---

## Step 6: Query Placeholder Migration (MySQL `?` → PostgreSQL `$1`)

MySQL and PostgreSQL differ in how parameterized queries are written:

| MySQL | PostgreSQL |
|-------|------------|
| `?` | `$1`, `$2`, ... |
| `LIMIT ?, ?` | `LIMIT $1 OFFSET $2` |
| `` `col` `` | `"col"` |
| `NOW()` | `NOW()` (same) |
| `CURDATE()` | `CURRENT_DATE` |
| `AUTO_INCREMENT` | `BIGSERIAL / GENERATED ALWAYS AS IDENTITY` |
| `ENUM(...)` | `VARCHAR + CHECK` constraint |
| `TINYINT(1)` | `BOOLEAN` |
| `TIMESTAMP` | `TIMESTAMPTZ` |
| `ON DUPLICATE KEY UPDATE` | `ON CONFLICT ... DO UPDATE` |

**Example migration:**

```javascript
// MySQL (old):
await db.execute('SELECT * FROM users WHERE email = ? AND role = ?', [email, role]);

// PostgreSQL (new):
await pool.query('SELECT * FROM users WHERE email = $1 AND role = $2', [email, role]);
```

---

## Step 7: Optional - Supabase Auth Integration

If you want to use Supabase's built-in Auth (email/password, Google, GitHub):

1. **Install**:
   ```bash
   cd frontend
   npm install @supabase/supabase-js
   ```

2. **Initialize** in `frontend/js/supabase.js`:
   ```javascript
   import { createClient } from '@supabase/supabase-js';
   
   const supabase = createClient(
       process.env.SUPABASE_URL,
       process.env.SUPABASE_ANON_KEY
   );
   
   export default supabase;
   ```

3. **Link users to auth**: Store `auth.users.id` (UUID) in your `users` table:
   ```sql
   ALTER TABLE users ADD COLUMN auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
   ```

---

## Row-Level Security (RLS)

The schema enables RLS on all tables. By default, **all access is denied** until policies are added.

Uncomment and customize the example policies in `supabase_schema.sql`:

```sql
-- Allow anyone to view equipment
CREATE POLICY "equipment_public_read" ON equipment FOR SELECT USING (true);

-- Users can read/update their own profile
CREATE POLICY "users_own_row" ON users FOR ALL USING (id = auth.uid()::bigint);

-- Admin full access
CREATE POLICY "admin_all" ON equipment FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()::bigint AND users.role = 'admin'
    )
);
```

---

## Troubleshooting

### SSL/TLS error
**Fix**: Ensure `ssl: { rejectUnauthorized: false }` in `db.js`.

### `password authentication failed`
**Fix**: Verify `DB_PASSWORD` matches the database password set during project creation.

### `relation "users" does not exist`
**Fix**: Run the schema SQL first (Step 2).

### Connection refused / timeout
**Fix**: 
- Check if your IP is allowed in Supabase → **Authentication** → **Policies**
- Use the **Transaction pooler** port `6543` for serverless environments

### `syntax error at or near "$1"`
**Fix**: Ensure all controllers use `$1, $2, ...` placeholders, not `?`.

---

## Migration Checklist

- [ ] Create Supabase project
- [ ] Run `supabase_schema.sql` in SQL Editor
- [ ] Get connection credentials
- [ ] Update `backend/.env` with Supabase credentials
- [ ] Install `pg` driver
- [ ] Update `backend/db.js` to use PostgreSQL
- [ ] Replace `?` placeholders with `$1, $2, ...` in controllers
- [ ] (Optional) Configure Supabase Auth
- [ ] (Optional) Add RLS policies

---

## Useful Links

- [Supabase Dashboard](https://supabase.com/dashboard)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pg (Node.js driver)](https://node-postgres.com/)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/start)

