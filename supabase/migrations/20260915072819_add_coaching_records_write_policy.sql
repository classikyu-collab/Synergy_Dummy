-- 담임/coach/admin이 본인 담당 반의 코칭 기록을 체크(입력/수정)할 수 있도록 허용
create policy "scoped_write_coaching_records_insert" on coaching_records
  for insert with check (
    teacher_has_broad_access()
    or exists (
      select 1 from coaching_items ci
      where ci.id = coaching_records.item_id and teacher_owns_class(ci.class_id)
    )
  );

create policy "scoped_write_coaching_records_update" on coaching_records
  for update using (
    teacher_has_broad_access()
    or exists (
      select 1 from coaching_items ci
      where ci.id = coaching_records.item_id and teacher_owns_class(ci.class_id)
    )
  )
  with check (
    teacher_has_broad_access()
    or exists (
      select 1 from coaching_items ci
      where ci.id = coaching_records.item_id and teacher_owns_class(ci.class_id)
    )
  );
