-- 학부모 4자리 PIN: 첫 로그인 후 변경 필요, 이후엔 클라이언트에 저장해서 재로그인 요구 안 함(문서 결정 반영)
alter table students
  add column parent_pin text not null default '0000',
  add column parent_must_change_pin boolean not null default true;
alter table students add constraint students_parent_pin_check check (parent_pin ~ '^[0-9]{4}$');
update students set parent_pin = '0000', parent_must_change_pin = true;

-- PIN 검증 (일치 여부만 반환, 데이터 노출 없음)
create or replace function verify_parent_pin(p_student_id uuid, p_pin text)
returns table(ok boolean, must_change boolean)
language sql stable security definer set search_path = public as $$
  select (parent_pin = p_pin), parent_must_change_pin
  from students where id = p_student_id and status = '재원';
$$;
grant execute on function verify_parent_pin(uuid, text) to anon;

-- PIN 변경: 기존 PIN 확인 후에만 허용
create or replace function set_parent_pin(p_student_id uuid, p_old_pin text, p_new_pin text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_ok boolean;
begin
  if p_new_pin !~ '^[0-9]{4}$' then
    return false;
  end if;
  select (parent_pin = p_old_pin) into v_ok from students where id = p_student_id and status = '재원';
  if not coalesce(v_ok, false) then
    return false;
  end if;
  update students set parent_pin = p_new_pin, parent_must_change_pin = false where id = p_student_id;
  return true;
end;
$$;
grant execute on function set_parent_pin(uuid, text, text) to anon;

-- 아래 3개는 학생 자기 화면용 get_student_* 함수와 동일한 데이터를 반환하지만,
-- 학부모 접근은 PIN 검증을 통과한 경우에만 데이터를 내려준다 (공용 링크 + 이름검색만으로는 접근 불가).
create or replace function get_parent_profile(p_student_id uuid, p_pin text)
returns table(id uuid, name text, difficulty_tier text, class_name text)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.difficulty_tier, c.name
  from students s
  left join classes c on c.id = s.class_id
  where s.id = p_student_id and s.status = '재원' and s.parent_pin = p_pin;
$$;
grant execute on function get_parent_profile(uuid, text) to anon;

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
    and exists (select 1 from students s where s.id = p_student_id and s.parent_pin = p_pin and s.status = '재원')
  order by ci.date desc
  limit 30;
$$;
grant execute on function get_parent_coaching_items(uuid, text) to anon;

create or replace function get_parent_next_makeup(p_student_id uuid, p_pin text)
returns date
language sql stable security definer set search_path = public as $$
  select date from makeup_exclusions
  where student_id = p_student_id and date >= current_date
    and exists (select 1 from students s where s.id = p_student_id and s.parent_pin = p_pin and s.status = '재원')
  order by date asc
  limit 1;
$$;
grant execute on function get_parent_next_makeup(uuid, text) to anon;

-- 관리자: 학부모 PIN 초기화
create or replace function admin_reset_parent_pin(p_student_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not teacher_is_admin() then
    raise exception '관리자 권한이 없습니다.';
  end if;
  update students set parent_pin = '0000', parent_must_change_pin = true where id = p_student_id;
  return true;
end;
$$;
grant execute on function admin_reset_parent_pin(uuid) to authenticated;
