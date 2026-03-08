-- post_votes 트리거 함수의 search_path를 고정해 보안 경고를 해소한다.
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
