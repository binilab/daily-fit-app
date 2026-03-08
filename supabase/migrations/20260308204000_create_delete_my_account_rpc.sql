-- 인증된 사용자가 본인 계정과 연관 데이터를 삭제하기 위한 RPC 함수
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

  -- auth.users 삭제 시 FK ON DELETE CASCADE 설정된 데이터는 함께 삭제된다.
  delete from auth.users
  where id = current_user_id;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
