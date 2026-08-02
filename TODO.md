# SportVault - Supabase (PostgreSQL) Migration TODO

## Progress: Backend Migration Complete ✅

### ✅ Completed
- [x] Created Supabase PostgreSQL schema (`database/supabase_schema.sql`)
- [x] Created Supabase integration guide (`database/SUPABASE_SETUP.md`)
- [x] Pushed to GitHub

### ✅ Completed: Backend Migration (MySQL → PostgreSQL)

- [x] Update `backend/package.json` - swap `mysql2` for `pg`
- [x] Rewrite `backend/db.js` - use `pg` Pool with SSL
- [x] Rewrite `backend/setup-db.js` - PostgreSQL seed script
- [x] Migrate `backend/controllers/authController.js`
- [x] Migrate `backend/controllers/adminController.js`
- [x] Migrate `backend/controllers/bookingController.js`
- [x] Migrate `backend/controllers/equipmentController.js`
- [x] Migrate `backend/controllers/maintenanceController.js`
- [x] Migrate `backend/controllers/venueController.js`
- [x] Install `pg` dependency, remove `mysql2`
- [x] Syntax check all backend files
- [x] Update `database/SUPABASE_SETUP.md` with `DB_SSL=true`
- [ ] Test server startup with Supabase credentials
- [ ] Push to GitHub

### 📝 Key Syntax Conversions Applied
- `?` placeholders → `$1, $2, ...`
- `const [rows] = await db.execute(q, p)` → `const { rows } = await db.query(q, p)`
- `result.insertId` → `result.rows[0].id` (with `RETURNING id`)
- `COUNT(*)` returns string in pg → wrap with `Number()`
- `DATE_FORMAT(col, '%Y-%m')` → `TO_CHAR(col, 'YYYY-MM')`
- `CURDATE()` → `CURRENT_DATE`, `CURTIME()` → `CURRENT_TIME`
- `DATE_SUB(NOW(), INTERVAL 30 DAY)` → `NOW() - INTERVAL '30 days'`
- `db.getConnection()` + `beginTransaction()` → `pg Client` + `BEGIN/COMMIT/ROLLBACK`

