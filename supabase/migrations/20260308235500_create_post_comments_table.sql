-- 포스트 댓글 저장용 테이블
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 300),
  created_at timestamptz not null default now()
);

create index if not exists post_comments_post_id_created_at_idx
on public.post_comments (post_id, created_at desc);

create index if not exists post_comments_author_id_idx
on public.post_comments (author_id);

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
