-- 숙제 게시일(posted_date)과 마감/체크일(date)을 분리한다.
-- 지금까지 date 컬럼 하나로 "등록일이자 체크일"을 겸했는데, 실제 학원 운영 흐름은:
--   화요일(등록일)에 목요일(마감/체크일)까지 할 숙제를 올림
--   -> "숙제 보기" 게시판은 등록일(posted_date) 기준으로 조회
--   -> "코칭 리스트"는 마감일(date)이 된 순간부터 그 항목을 보여줌 (그 전엔 안 보임)
-- 시험 항목은 등록일=마감일(당일)이라 posted_date=date로 동일하게 채운다.
alter table coaching_items add column if not exists posted_date date;
update coaching_items set posted_date = date where posted_date is null;
alter table coaching_items alter column posted_date set not null;

-- 코칭 리스트: 아직 마감(체크)일이 안 된 숙제는 노출하지 않는다.
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
    and ci.date <= current_date
  order by ci.date desc
  limit 30;
$$;

-- 숙제 게시판: item_type='숙제'인 것만, 게시일(posted_date) 기준으로 보여준다. 마감이 지났어도 게시판에는 계속 남는다.
create or replace function get_student_homework_board(p_student_id uuid)
returns table(item_id uuid, posted_date date, due_date date, name text, page text)
language sql stable security definer set search_path = public as $$
  select ci.id, ci.posted_date, ci.date, ci.name, ci.page
  from coaching_item_targets cit
  join coaching_items ci on ci.id = cit.item_id and ci.deleted_at is null
  where cit.student_id = p_student_id and ci.item_type = '숙제'
  order by ci.posted_date desc
  limit 30;
$$;
grant execute on function get_student_homework_board(uuid) to anon;
