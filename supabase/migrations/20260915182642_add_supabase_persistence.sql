create schema if not exists private;

create type public.photo_analysis_status as enum (
  'not_analyzed',
  'queued',
  'analyzing',
  'completed',
  'failed'
);

create type public.analysis_job_status as enum (
  'queued',
  'analyzing',
  'generating',
  'completed',
  'failed'
);

create type public.component_evidence_status as enum (
  'identified',
  'inferred',
  'unknown'
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id text not null,
  original_path text not null,
  thumbnail_path text not null,
  width integer not null,
  height integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  analysis_status public.photo_analysis_status not null default 'not_analyzed',
  constraint photos_user_client_unique unique (user_id, client_id),
  constraint photos_id_user_unique unique (id, user_id),
  constraint photos_client_id_not_blank check (length(btrim(client_id)) between 1 and 256),
  constraint photos_original_path_not_blank check (length(btrim(original_path)) between 1 and 1024),
  constraint photos_thumbnail_path_not_blank check (length(btrim(thumbnail_path)) between 1 and 1024),
  constraint photos_width_valid check (width between 1 and 100000),
  constraint photos_height_valid check (height between 1 and 100000)
);

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  photo_id uuid not null,
  status public.analysis_job_status not null default 'queued',
  object_name text,
  confidence numeric,
  raw_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint analyses_id_user_unique unique (id, user_id),
  constraint analyses_photo_owner_fk
    foreign key (photo_id, user_id)
    references public.photos (id, user_id)
    on delete cascade,
  constraint analyses_object_name_not_blank
    check (object_name is null or length(btrim(object_name)) between 1 and 256),
  constraint analyses_confidence_valid
    check (confidence is null or confidence between 0 and 1)
);

create table public.components (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  analysis_id uuid not null,
  name text not null,
  evidence_status public.component_evidence_status not null default 'unknown',
  confidence numeric,
  position jsonb,
  dimensions jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint components_analysis_owner_fk
    foreign key (analysis_id, user_id)
    references public.analyses (id, user_id)
    on delete cascade,
  constraint components_name_not_blank check (length(btrim(name)) between 1 and 256),
  constraint components_confidence_valid
    check (confidence is null or confidence between 0 and 1),
  constraint components_position_object
    check (position is null or jsonb_typeof(position) = 'object'),
  constraint components_dimensions_object
    check (dimensions is null or jsonb_typeof(dimensions) = 'object'),
  constraint components_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index photos_user_id_idx on public.photos (user_id);
create index photos_created_at_idx on public.photos (created_at desc);
create index photos_analysis_status_idx on public.photos (analysis_status);
create index analyses_user_photo_idx on public.analyses (user_id, photo_id);
create index analyses_status_idx on public.analyses (status);
create index analyses_created_at_idx on public.analyses (created_at desc);
create index components_user_analysis_idx on public.components (user_id, analysis_id);
create index components_evidence_status_idx on public.components (evidence_status);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger photos_set_updated_at
before update on public.photos
for each row execute function private.set_updated_at();

create trigger analyses_set_updated_at
before update on public.analyses
for each row execute function private.set_updated_at();

create trigger components_set_updated_at
before update on public.components
for each row execute function private.set_updated_at();

alter table public.photos enable row level security;
alter table public.analyses enable row level security;
alter table public.components enable row level security;

create policy "photos_select_own"
on public.photos
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "photos_insert_own"
on public.photos
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "photos_update_own"
on public.photos
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "photos_delete_own"
on public.photos
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "analyses_select_own"
on public.analyses
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "analyses_insert_own"
on public.analyses
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "analyses_update_own"
on public.analyses
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "analyses_delete_own"
on public.analyses
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "components_select_own"
on public.components
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "components_insert_own"
on public.components
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "components_update_own"
on public.components
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "components_delete_own"
on public.components
for delete
to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.photos to authenticated;
grant select, insert, update, delete on public.analyses to authenticated;
grant select, insert, update, delete on public.components to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  false,
  26214400,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "photos_storage_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'photos'
  and cardinality(storage.foldername(name)) = 2
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and storage.filename(name) in ('original', 'thumbnail')
);

create policy "photos_storage_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'photos'
  and cardinality(storage.foldername(name)) = 2
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and storage.filename(name) in ('original', 'thumbnail')
);

create policy "photos_storage_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'photos'
  and cardinality(storage.foldername(name)) = 2
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and storage.filename(name) in ('original', 'thumbnail')
)
with check (
  bucket_id = 'photos'
  and cardinality(storage.foldername(name)) = 2
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and storage.filename(name) in ('original', 'thumbnail')
);

create policy "photos_storage_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'photos'
  and cardinality(storage.foldername(name)) = 2
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and storage.filename(name) in ('original', 'thumbnail')
);
