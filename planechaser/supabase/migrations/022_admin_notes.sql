-- Admin notes: private notes admins can attach to user profiles
create table if not exists admin_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  admin_id uuid not null references profiles(id),
  note text not null check (char_length(note) >= 1 and char_length(note) <= 1000),
  created_at timestamptz not null default now()
);

-- RLS
alter table admin_notes enable row level security;

-- Admins+ can read all notes
create policy "admin_notes_select" on admin_notes
  for select using (
    get_my_role() in ('owner', 'admin', 'mod')
  );

-- Admins+ can insert notes
create policy "admin_notes_insert" on admin_notes
  for insert with check (
    auth.uid() = admin_id
    and get_my_role() in ('owner', 'admin', 'mod')
  );

-- Only the note author or owner can delete
create policy "admin_notes_delete" on admin_notes
  for delete using (
    auth.uid() = admin_id
    or get_my_role() = 'owner'
  );

-- Index for fast user lookups
create index if not exists idx_admin_notes_user_id on admin_notes(user_id);
