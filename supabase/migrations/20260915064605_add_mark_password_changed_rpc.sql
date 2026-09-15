-- 로그인한 강사 본인의 must_change_password만 false로 바꾸는 안전한 함수.
-- 일반 UPDATE 정책 대신 RPC로 제한해 role/name 등 다른 컬럼 변조를 막는다.
create or replace function mark_password_changed()
returns void
language sql
security definer
set search_path = public
as $$
  update teachers set must_change_password = false where auth_user_id = auth.uid();
$$;

grant execute on function mark_password_changed() to authenticated;
