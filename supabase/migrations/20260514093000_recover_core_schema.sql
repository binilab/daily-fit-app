-- DailyFit recovery migration
-- Source of truth: current Expo app Supabase usage

-- 1) profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_created_at_idx on public.profiles (created_at desc);

alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select_own'
  ) then
    create policy profiles_select_own
      on public.profiles
      for select
      using (auth.uid() = id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_insert_own'
  ) then
    create policy profiles_insert_own
      on public.profiles
      for insert
      with check (auth.uid() = id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_update_own'
  ) then
    create policy profiles_update_own
      on public.profiles
      for update
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_delete_own'
  ) then
    create policy profiles_delete_own
      on public.profiles
      for delete
      using (auth.uid() = id);
  end if;
end;
$$;

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_profiles_updated_at();

-- 2) posts
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  image_paths text[] not null check (array_length(image_paths, 1) between 1 and 3),
  image_urls text[] not null check (array_length(image_urls, 1) between 1 and 3),
  image_count integer not null check (image_count between 1 and 3),
  created_at timestamptz not null default now(),
  check (image_count = array_length(image_paths, 1)),
  check (image_count = array_length(image_urls, 1))
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_author_id_idx on public.posts (author_id);

alter table public.posts enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'posts'
      and policyname = 'posts_select_authenticated'
  ) then
    create policy posts_select_authenticated
      on public.posts
      for select
      using (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'posts'
      and policyname = 'posts_insert_own'
  ) then
    create policy posts_insert_own
      on public.posts
      for insert
      with check (auth.uid() = author_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'posts'
      and policyname = 'posts_update_own'
  ) then
    create policy posts_update_own
      on public.posts
      for update
      using (auth.uid() = author_id)
      with check (auth.uid() = author_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'posts'
      and policyname = 'posts_delete_own'
  ) then
    create policy posts_delete_own
      on public.posts
      for delete
      using (auth.uid() = author_id);
  end if;
end;
$$;

-- 3) user_blocks
create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocker_id_idx on public.user_blocks (blocker_id);
create index if not exists user_blocks_blocked_id_idx on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_blocks'
      and policyname = 'user_blocks_select_own'
  ) then
    create policy user_blocks_select_own
      on public.user_blocks
      for select
      using (auth.uid() = blocker_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_blocks'
      and policyname = 'user_blocks_insert_own'
  ) then
    create policy user_blocks_insert_own
      on public.user_blocks
      for insert
      with check (auth.uid() = blocker_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_blocks'
      and policyname = 'user_blocks_delete_own'
  ) then
    create policy user_blocks_delete_own
      on public.user_blocks
      for delete
      using (auth.uid() = blocker_id);
  end if;
end;
$$;

-- 4) post_votes
create table if not exists public.post_votes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  voter_id uuid not null references auth.users(id) on delete cascade,
  vote_type text not null check (vote_type in ('like', 'pass')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id, voter_id)
);

create index if not exists post_votes_post_id_idx on public.post_votes (post_id);
create index if not exists post_votes_voter_id_idx on public.post_votes (voter_id);
create index if not exists post_votes_post_id_vote_type_idx on public.post_votes (post_id, vote_type);

alter table public.post_votes enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'post_votes'
      and policyname = 'post_votes_select_authenticated'
  ) then
    create policy post_votes_select_authenticated
      on public.post_votes
      for select
      using (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'post_votes'
      and policyname = 'post_votes_insert_own'
  ) then
    create policy post_votes_insert_own
      on public.post_votes
      for insert
      with check (auth.uid() = voter_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'post_votes'
      and policyname = 'post_votes_update_own'
  ) then
    create policy post_votes_update_own
      on public.post_votes
      for update
      using (auth.uid() = voter_id)
      with check (auth.uid() = voter_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'post_votes'
      and policyname = 'post_votes_delete_own'
  ) then
    create policy post_votes_delete_own
      on public.post_votes
      for delete
      using (auth.uid() = voter_id);
  end if;
end;
$$;

create or replace function public.set_post_votes_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_post_votes_updated_at on public.post_votes;

create trigger set_post_votes_updated_at
before update on public.post_votes
for each row
execute function public.set_post_votes_updated_at();

-- 5) post_comments
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 300),
  created_at timestamptz not null default now()
);

create index if not exists post_comments_post_id_created_at_idx
on public.post_comments (post_id, created_at desc);
create index if not exists post_comments_author_id_idx on public.post_comments (author_id);

alter table public.post_comments enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'post_comments'
      and policyname = 'post_comments_select_authenticated'
  ) then
    create policy post_comments_select_authenticated
      on public.post_comments
      for select
      using (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'post_comments'
      and policyname = 'post_comments_insert_own'
  ) then
    create policy post_comments_insert_own
      on public.post_comments
      for insert
      with check (auth.uid() = author_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'post_comments'
      and policyname = 'post_comments_delete_own'
  ) then
    create policy post_comments_delete_own
      on public.post_comments
      for delete
      using (auth.uid() = author_id);
  end if;
end;
$$;

-- 6) storage bucket and policies (outfits)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'outfits',
  'outfits',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'outfits_select_public'
  ) then
    create policy outfits_select_public
      on storage.objects
      for select
      using (bucket_id = 'outfits');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'outfits_insert_own_folder'
  ) then
    create policy outfits_insert_own_folder
      on storage.objects
      for insert
      with check (
        bucket_id = 'outfits'
        and auth.role() = 'authenticated'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'outfits_update_own_folder'
  ) then
    create policy outfits_update_own_folder
      on storage.objects
      for update
      using (
        bucket_id = 'outfits'
        and auth.role() = 'authenticated'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
      with check (
        bucket_id = 'outfits'
        and auth.role() = 'authenticated'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'outfits_delete_own_folder'
  ) then
    create policy outfits_delete_own_folder
      on storage.objects
      for delete
      using (
        bucket_id = 'outfits'
        and auth.role() = 'authenticated'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end;
$$;

-- 7) account deletion RPC used by app
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  delete from auth.users
  where id = current_user_id;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
