-- 학부모 화면의 "보강 예정" 카드용: 오늘 이후 가장 가까운 보강 예정일 하나만 반환
create or replace function get_student_next_makeup(p_student_id uuid)
returns date
language sql
stable
security definer
set search_path = public
as $$
  select date from makeup_exclusions
  where student_id = p_student_id and date >= current_date
  order by date asc
  limit 1;
$$;
grant execute on function get_student_next_makeup(uuid) to anon;
