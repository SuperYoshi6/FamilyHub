ALTER TABLE household_tasks DROP CONSTRAINT IF EXISTS household_tasks_assigned_to_fkey;

ALTER TABLE household_tasks ALTER COLUMN assigned_to TYPE TEXT[] USING CASE WHEN assigned_to IS NULL THEN '{}'::TEXT[] ELSE ARRAY[assigned_to] END;
