-- 학생 로그인은 비밀번호 없이 "반 선택 -> 이름 선택" 방식(공용 태블릿 전제, 문서 4-3 현행 유지 결정).
-- classes/students 테이블 자체는 teachers RLS로 막혀있으므로, 필요한 최소 정보만 반환하는
-- security definer 함수를 만들어 익명(anon) 접속에서도 호출할 수 있게 한다.

create or replace function list_active_classes()
returns table(id uuid, name text)
language sql stable security definer set search_path = public as $$
  select id, name from classes where status = '운영중' order by name;
$$;
grant execute on function list_active_classes() to anon;

create or replace function list_students_in_class(p_class_id uuid)
returns table(id uuid, name text)
language sql stable security definer set search_path = public as $$
  select id, name from students where class_id = p_class_id and status = '재원' order by name;
$$;
grant execute on function list_students_in_class(uuid) to anon;

create or replace function get_student_profile(p_student_id uuid)
returns table(id uuid, name text, difficulty_tier text, class_name text)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.difficulty_tier, c.name
  from students s
  left join classes c on c.id = s.class_id
  where s.id = p_student_id and s.status = '재원';
$$;
grant execute on function get_student_profile(uuid) to anon;

create or replace function get_student_coaching_items(p_student_id uuid)
returns table(
  item_id uuid, date date, item_type text, name text, page text,
  status_label text, is_done boolean
)
language sql stable security definer set search_path = public as $$
  select ci.id, ci.date, ci.item_type, ci.name, ci.page, cr.status_label, cr.is_done
  from coaching_item_targets cit
  join coaching_items ci on ci.id = cit.item_id and ci.deleted_at is null
  left join coaching_records cr on cr.item_id = ci.id and cr.student_id = p_student_id and cr.round = 1
  where cit.student_id = p_student_id
  order by ci.date desc
  limit 30;
$$;
grant execute on function get_student_coaching_items(uuid) to anon;
