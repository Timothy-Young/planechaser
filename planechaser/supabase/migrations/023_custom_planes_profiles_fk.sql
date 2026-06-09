-- Add FK from custom_planes.user_id to profiles.id for PostgREST join support
-- (Already applied live; this migration file ensures consistency)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'custom_planes_user_id_profiles_fkey'
  ) then
    alter table custom_planes
      add constraint custom_planes_user_id_profiles_fkey
      foreign key (user_id) references profiles(id);
  end if;
end $$;
