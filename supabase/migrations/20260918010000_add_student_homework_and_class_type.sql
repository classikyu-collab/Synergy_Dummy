-- 1) get_student_profile에 class_type 추가 (학생 메뉴가 반 유형에 따라 내신반/정규반 메뉴를 분기하기 위함)
drop function if exists get_student_profile(uuid);
create or replace function get_student_profile(p_student_id uuid)
returns table(id uuid, name text, difficulty_tier text, class_name text, class_type text)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.difficulty_tier, c.name, c.class_type
  from students s
  left join classes c on c.id = s.class_id
  where s.id = p_student_id and s.status = '재원';
$$;
grant execute on function get_student_profile(uuid) to anon;

-- 2) "다음 시간까지 해야 할 숙제 / 오늘 확인하는 시험" — 반 전체 기준으로 아직 다 체크되지 않은 항목만
-- (date <= 오늘 이면서, 대상 학생 중 한 명이라도 아직 코칭 기록이 없는 항목). 학생 개인 완료 여부와 무관하게
-- 반 전체가 다 체크될 때까지 계속 노출된다 — 담임강사가 다음 숙제를 먼저 올려도 이전 항목이 묻히지 않게 하기 위함.
create or replace function get_student_active_coaching_items(p_student_id uuid)
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
    and exists (
      select 1 from coaching_item_targets cit2
      where cit2.item_id = ci.id
        and not exists (
          select 1 from coaching_records cr2
          where cr2.item_id = ci.id and cr2.student_id = cit2.student_id and cr2.round = 1
        )
    )
  order by ci.date desc;
$$;
grant execute on function get_student_active_coaching_items(uuid) to anon;
