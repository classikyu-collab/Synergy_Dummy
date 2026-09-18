-- 학부모용 숙제 보기 (학생용 get_student_homework_board와 동일 로직, PIN 검증만 추가).
create or replace function get_parent_homework_board(p_student_id uuid, p_pin text)
returns table(item_id uuid, posted_date date, due_date date, name text, page text)
language sql stable security definer set search_path = public as $$
  select ci.id, ci.posted_date, ci.date, ci.name, ci.page
  from coaching_item_targets cit
  join coaching_items ci on ci.id = cit.item_id and ci.deleted_at is null
  where cit.student_id = p_student_id and ci.item_type = '숙제'
    and exists (select 1 from students s where s.id = p_student_id and s.parent_pin = p_pin and s.status = '재원')
  order by ci.posted_date desc, ci.priority asc nulls last
  limit 30;
$$;
grant execute on function get_parent_homework_board(uuid, text) to anon;

-- 학생용과 동일하게: 마감일이 안 된 숙제는 "오늘 결과"(코칭 리스트)에 새지 않도록 필터 추가.
create or replace function get_parent_coaching_items(p_student_id uuid, p_pin text)
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
    and ci.date <= current_date
    and exists (select 1 from students s where s.id = p_student_id and s.parent_pin = p_pin and s.status = '재원')
  order by ci.date desc
  limit 30;
$$;
