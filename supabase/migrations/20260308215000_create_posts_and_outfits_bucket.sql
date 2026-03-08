-- 코디 업로드 게시글 저장용 posts 테이블
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  image_paths text[] not null check (array_length(image_paths, 1) between 1 and 3),
  image_urls text[] not null check (array_length(image_urls, 1) between 1 and 3),
  image_count integer not null check (image_count between 1 and 3),
  created_at timestamptz not null default now()
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

-- 코디 이미지 업로드용 public 버킷
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
