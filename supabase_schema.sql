-- FamilyHub Supabase Schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: family
CREATE TABLE IF NOT EXISTS family (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    avatar TEXT,
    color TEXT,
    role TEXT CHECK (role IN ('parent', 'child', 'admin')),
    password TEXT
);

-- Table: events
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    title TEXT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    end_date DATE,
    end_time TIME,
    location TEXT,
    description TEXT,
    assigned_to TEXT[] -- Array of family member IDs
);

-- Table: news
CREATE TABLE IF NOT EXISTS news (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    title TEXT NOT NULL,
    description TEXT,
    image TEXT,
    tag TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    author_id TEXT NOT NULL REFERENCES family(id),
    read_by TEXT[] DEFAULT '{}'
);

-- Table: polls
CREATE TABLE IF NOT EXISTS polls (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    question TEXT NOT NULL,
    description TEXT,
    options JSONB NOT NULL, -- [{id, text, description, votes: []}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    starts_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    author_id TEXT NOT NULL REFERENCES family(id),
    closed BOOLEAN DEFAULT FALSE,
    allow_multiple_selection BOOLEAN DEFAULT FALSE
);

-- Note: To create buckets via SQL in Supabase:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('apps', 'apps', true);
-- Policy setup for public access:
-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'apps');
-- CREATE POLICY "Admin Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'apps' AND auth.role() = 'authenticated');

-- Table: shopping
CREATE TABLE IF NOT EXISTS shopping (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    checked BOOLEAN DEFAULT FALSE,
    category TEXT,
    note TEXT
);

-- Table: tasks (household and personal)
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    title TEXT NOT NULL,
    done BOOLEAN DEFAULT FALSE,
    assigned_to TEXT REFERENCES family(id),
    type TEXT CHECK (type IN ('household', 'personal')),
    priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
    note TEXT
);

-- Table: meal_plans
CREATE TABLE IF NOT EXISTS meal_plans (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    day TEXT NOT NULL,
    meal_name TEXT,
    breakfast TEXT,
    lunch TEXT,
    ingredients TEXT[],
    recipe_hint TEXT,
    instructions TEXT
);

-- Table: meal_requests
CREATE TABLE IF NOT EXISTS meal_requests (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    dish_name TEXT NOT NULL,
    requested_by TEXT NOT NULL REFERENCES family(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: recipes
CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    ingredients TEXT[],
    image TEXT,
    description TEXT
);

-- Table: weather_favs
CREATE TABLE IF NOT EXISTS weather_favs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    user_id TEXT REFERENCES family(id)
);

-- Table: feedback
CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT NOT NULL REFERENCES family(id),
    user_name TEXT,
    text TEXT NOT NULL,
    rating INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE
);

-- Table: notifications
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('info', 'success', 'warning', 'alert')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE
);

-- Enable RLS on all tables (Optional but recommended)
-- ALTER TABLE family ENABLE ROW LEVEL SECURITY;
-- ... etc
