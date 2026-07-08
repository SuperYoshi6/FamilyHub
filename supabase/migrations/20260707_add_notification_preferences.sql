-- Create notification_preferences table for per-user push notification toggles
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id TEXT PRIMARY KEY REFERENCES family(id),
    events BOOLEAN DEFAULT TRUE,
    shopping BOOLEAN DEFAULT TRUE,
    household_tasks BOOLEAN DEFAULT TRUE,
    personal_tasks BOOLEAN DEFAULT TRUE,
    news BOOLEAN DEFAULT TRUE,
    polls BOOLEAN DEFAULT TRUE,
    meal_requests BOOLEAN DEFAULT TRUE,
    weather BOOLEAN DEFAULT TRUE
);

-- Insert default preferences for existing family members
INSERT INTO notification_preferences (user_id)
SELECT id FROM family
WHERE NOT EXISTS (
    SELECT 1 FROM notification_preferences WHERE notification_preferences.user_id = family.id
);
