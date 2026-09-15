-- 헬퍼 함수: coach/admin/마스터여부=Y 인 강사는 전체 조회 가능
create or replace function teacher_has_broad_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from teachers t
    where t.auth_user_id = auth.uid()
      and (t.role in ('coach', 'admin') or t.is_master)
  );
$$;

-- 헬퍼 함수: 로그인한 강사가 해당 반의 담임인지
create or replace function teacher_owns_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from teachers t
    join classes c on c.id = p_class_id
    where t.auth_user_id = auth.uid() and c.homeroom_teacher_id = t.id
  );
$$;

grant execute on function teacher_has_broad_access() to authenticated;
grant execute on function teacher_owns_class(uuid) to authenticated;

-- classes
drop policy if exists "authenticated_read_classes" on classes;
create policy "scoped_read_classes" on classes
  for select using (teacher_has_broad_access() or teacher_owns_class(id));

-- students
drop policy if exists "authenticated_read_students" on students;
create policy "scoped_read_students" on students
  for select using (
    teacher_has_broad_access()
    or (class_id is not null and teacher_owns_class(class_id))
  );

-- class_schedules
drop policy if exists "authenticated_read_class_schedules" on class_schedules;
create policy "scoped_read_class_schedules" on class_schedules
  for select using (teacher_has_broad_access() or teacher_owns_class(class_id));

-- coaching_items
drop policy if exists "authenticated_read_coaching_items" on coaching_items;
create policy "scoped_read_coaching_items" on coaching_items
  for select using (teacher_has_broad_access() or teacher_owns_class(class_id));

-- coaching_item_targets
drop policy if exists "authenticated_read_coaching_item_targets" on coaching_item_targets;
create policy "scoped_read_coaching_item_targets" on coaching_item_targets
  for select using (
    teacher_has_broad_access()
    or exists (
      select 1 from coaching_items ci
      where ci.id = coaching_item_targets.item_id and teacher_owns_class(ci.class_id)
    )
  );

-- coaching_records
drop policy if exists "authenticated_read_coaching_records" on coaching_records;
create policy "scoped_read_coaching_records" on coaching_records
  for select using (
    teacher_has_broad_access()
    or exists (
      select 1 from coaching_items ci
      where ci.id = coaching_records.item_id and teacher_owns_class(ci.class_id)
    )
  );

-- makeup_exclusions
drop policy if exists "authenticated_read_makeup_exclusions" on makeup_exclusions;
create policy "scoped_read_makeup_exclusions" on makeup_exclusions
  for select using (
    teacher_has_broad_access()
    or exists (
      select 1 from students s
      where s.id = makeup_exclusions.student_id
        and s.class_id is not null
        and teacher_owns_class(s.class_id)
    )
  );
