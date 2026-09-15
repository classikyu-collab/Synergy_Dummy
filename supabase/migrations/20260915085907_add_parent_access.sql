-- 재원생 전원에게 학부모 매직링크용 토큰 발급 (문서 4-2 A안: 현행 토큰 방식 유지)
update students set parent_access_token = gen_random_uuid()
where parent_access_token is null and status = '재원';

-- 이후 신규 학생도 자동으로 토큰이 채워지도록 기본값 지정
alter table students alter column parent_access_token set default gen_random_uuid();

-- 토큰 -> student_id 변환만 해주는 함수. 이 결과를 get_student_profile / get_student_coaching_items에
-- 그대로 넘기면 학부모도 학생 화면과 동일한 최소 정보 RPC를 안전하게 재사용할 수 있다.
create or replace function get_student_id_by_parent_token(p_token uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from students where parent_access_token = p_token and status = '재원';
$$;
grant execute on function get_student_id_by_parent_token(uuid) to anon;
