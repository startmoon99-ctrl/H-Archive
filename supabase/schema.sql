-- H Archive: Supabase 준비 스크립트
-- Supabase 대시보드 → SQL Editor에 전체를 붙여 넣고 한 번 실행한다. 다시 실행해도 안전하다.
-- 테이블 · 버킷 이름은 src/config/app.ts의 REMOTE와 같아야 한다.

-- 1. 테이블 ------------------------------------------------------------------

create table if not exists public.categories (
  id text primary key,
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  description text not null default '',
  hue real not null,
  created_at timestamptz not null default now()
);

-- 프로젝트는 타임라인 · 메모 · 미디어 정보를 포함한 문서 전체를 data에 둔다.
create table if not exists public.projects (
  id text primary key,
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_idx on public.projects (owner);
create index if not exists categories_owner_idx on public.categories (owner);

-- 2. 본인 행만 읽고 쓰는 규칙 (RLS) -------------------------------------------

alter table public.categories enable row level security;
alter table public.projects enable row level security;

drop policy if exists "own categories" on public.categories;
create policy "own categories" on public.categories
  for all to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

drop policy if exists "own projects" on public.projects;
create policy "own projects" on public.projects
  for all to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

-- 3. 파일 버킷: 비공개. 파일은 "사용자 id/…" 아래에만 둘 수 있다. ---------------

insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

drop policy if exists "own media read" on storage.objects;
create policy "own media read" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own media insert" on storage.objects;
create policy "own media insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own media update" on storage.objects;
create policy "own media update" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own media delete" on storage.objects;
create policy "own media delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
