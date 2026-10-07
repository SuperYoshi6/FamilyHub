ALTER TABLE public.feedback
ADD COLUMN IF NOT EXISTS category TEXT
CHECK (category IS NULL OR category IN ('bug', 'feedback'));
