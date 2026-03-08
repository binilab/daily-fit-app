-- 홈 피드 차단 필터링을 위한 사용자 차단 관계 테이블
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
