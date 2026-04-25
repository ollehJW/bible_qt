# Backend Data Setup

## Supabase table

Run this SQL in the Supabase SQL Editor:

```sql
-- supabase/migrations/001_create_bible.sql
```

The table shape is:

- `book`: book name, e.g. `창세기`
- `chapter`: chapter number
- `verse`: verse number
- `text`: verse text
- `step`: reading step from `bible_300_reading_plan.csv`

## Seed CSV

Generate the import CSV:

```powershell
node backend/scripts/build_bible_seed.mjs
```

Then import `backend/seed/bible.csv` into the Supabase `bible` table.

`backend/seed/bible_skipped.json` contains source rows that could not be converted to a single `(book, chapter, verse)` record, such as range-style keys.
