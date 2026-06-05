create table if not exists houses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name in ('Lumina', 'Voltus', 'Nexus')),
  created_at timestamptz default now()
);

insert into houses (name) values ('Lumina'), ('Voltus'), ('Nexus')
on conflict (name) do nothing;

insert into storage.buckets (id, name, public)
values ('gamification-proofs', 'gamification-proofs', false)
on conflict (id) do nothing;

CREATE POLICY "Users can upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'gamification-proofs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
