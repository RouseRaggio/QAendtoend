-- Migration 001: Add User Story Traceability and Execution Association
-- Reversible migration: See rollback section below.

BEGIN;

-- 1. Add missing columns to user_stories if they do not exist
ALTER TABLE user_stories ADD COLUMN IF NOT EXISTS code VARCHAR;
ALTER TABLE user_stories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE user_stories ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'TODO';
ALTER TABLE user_stories ADD COLUMN IF NOT EXISTS module_id INTEGER REFERENCES modules(id);
ALTER TABLE user_stories ADD COLUMN IF NOT EXISTS assignee_id INTEGER REFERENCES users(id);
ALTER TABLE user_stories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 2. Deterministic backfill of code for existing records ordered by id
DO $$
DECLARE
    r RECORD;
    i INT := 1;
BEGIN
    FOR r IN SELECT id, project_id, story_text FROM user_stories WHERE code IS NULL OR code = '' ORDER BY id ASC LOOP
        UPDATE user_stories 
        SET code = 'HU-' || LPAD(i::text, 3, '0'),
            description = COALESCE(story_text, ''),
            status = COALESCE(status, 'TODO'),
            updated_at = NOW()
        WHERE id = r.id;
        i := i + 1;
    END LOOP;
END $$;

-- 3. Set code NOT NULL and add unique index per project
ALTER TABLE user_stories ALTER COLUMN code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_user_story_code ON user_stories (project_id, code);

-- 4. Create execution_user_stories association table
CREATE TABLE IF NOT EXISTS execution_user_stories (
    execution_id INTEGER NOT NULL REFERENCES test_executions(id) ON DELETE CASCADE,
    user_story_id INTEGER NOT NULL REFERENCES user_stories(id) ON DELETE CASCADE,
    PRIMARY KEY (execution_id, user_story_id)
);

-- 5. Backfill execution_user_stories based on existing test_results (if any have user_story_id)
INSERT INTO execution_user_stories (execution_id, user_story_id)
SELECT DISTINCT tr.execution_id, tc.user_story_id
FROM test_results tr
JOIN test_cases tc ON tr.test_case_id = tc.id
WHERE tc.user_story_id IS NOT NULL
ON CONFLICT DO NOTHING;

COMMIT;

-- Rollback script for reference:
-- DROP TABLE IF EXISTS execution_user_stories;
-- DROP INDEX IF EXISTS uq_project_user_story_code;
-- ALTER TABLE user_stories DROP COLUMN IF EXISTS updated_at;
-- ALTER TABLE user_stories DROP COLUMN IF EXISTS assignee_id;
-- ALTER TABLE user_stories DROP COLUMN IF EXISTS module_id;
-- ALTER TABLE user_stories DROP COLUMN IF EXISTS status;
-- ALTER TABLE user_stories DROP COLUMN IF EXISTS description;
-- ALTER TABLE user_stories DROP COLUMN IF EXISTS code;
