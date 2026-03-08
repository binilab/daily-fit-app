-- 포스트 투표(Like/Pass) 저장용 테이블
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
