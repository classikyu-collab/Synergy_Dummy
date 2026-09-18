-- coaching_items.priority(기존 컬럼, 지금까지 미사용)를 숙제 게시판 정렬에 활용한다.
-- "1. 3강 변형문제 2 풀기+채점 (p.25~42)"처럼 앞의 번호가 우선순위였던 원본 관행을 되살림.
create or replace function get_student_homework_board(p_student_id uuid)
returns table(item_id uuid, posted_date date, due_date date, name text, page text)
language sql stable security definer set search_path = public as $$
  select ci.id, ci.posted_date, ci.date, ci.name, ci.page
  from coaching_item_targets cit
  join coaching_items ci on ci.id = cit.item_id and ci.deleted_at is null
  where cit.student_id = p_student_id and ci.item_type = '숙제'
  order by ci.posted_date desc, ci.priority asc nulls last
  limit 30;
$$;
