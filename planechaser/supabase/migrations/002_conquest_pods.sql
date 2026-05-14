-- pods: playgroups that track conquest standings
CREATE TABLE IF NOT EXISTS pods (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  invite_code      TEXT        NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  archenemy_threshold INT      NOT NULL DEFAULT 5,
  created_by       UUID        NOT NULL REFERENCES auth.users,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- pod_members: many-to-many between users and pods
CREATE TABLE IF NOT EXISTS pod_members (
  pod_id     UUID NOT NULL REFERENCES pods ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (pod_id, user_id)
);

-- conquered_planes: append-only event log of plane conquests
CREATE TABLE IF NOT EXISTS conquered_planes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users,
  pod_id          UUID        NOT NULL REFERENCES pods ON DELETE CASCADE,
  plane_scryfall_id TEXT      NOT NULL,
  plane_name      TEXT        NOT NULL,
  plane_image_uri TEXT        NOT NULL,
  conquered_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  game_session_id UUID        REFERENCES game_sessions
);

-- Index for fast leaderboard queries
CREATE INDEX IF NOT EXISTS idx_conquered_planes_pod_user
  ON conquered_planes (pod_id, user_id);

-- Add pod_id to game_sessions so games can be associated with a pod
ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS pod_id UUID REFERENCES pods;

-- RLS policies

-- Pods: anyone authenticated can read, only creator can update/delete
ALTER TABLE pods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pods are viewable by authenticated users"
  ON pods FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create pods"
  ON pods FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Pod owners can update their pods"
  ON pods FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Pod members: viewable by pod members, users can join/leave
ALTER TABLE pod_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pod members are viewable by authenticated users"
  ON pod_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can join pods"
  ON pod_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave pods"
  ON pod_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Conquered planes: viewable by all authenticated, insertable by the conquering user
ALTER TABLE conquered_planes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conquered planes are viewable by authenticated users"
  ON conquered_planes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can conquer planes"
  ON conquered_planes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Profiles: viewable by all authenticated
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Card cache: readable by all authenticated, writable by all (server-side only)
ALTER TABLE card_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Card cache is readable by authenticated users"
  ON card_cache FOR SELECT TO authenticated USING (true);

CREATE POLICY "Card cache is writable by authenticated users"
  ON card_cache FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Card cache is updatable by authenticated users"
  ON card_cache FOR UPDATE TO authenticated USING (true);
