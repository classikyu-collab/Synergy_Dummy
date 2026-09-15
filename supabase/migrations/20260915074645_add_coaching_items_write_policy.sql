-- 담임/coach/admin이 본인 담당 반에 코칭 항목을 등록/수정할 수 있도록 허용
create policy "scoped_write_coaching_items_insert" on coaching_items
  for insert with check (
    teacher_has_broad_access() or teacher_owns_class(class_id)
  );

create policy "scoped_write_coaching_items_update" on coaching_items
  for update using (
    teacher_has_broad_access() or teacher_owns_class(class_id)
  )
  with check (
    teacher_has_broad_access() or teacher_owns_class(class_id)
  );

-- 항목 생성 시 대상 학생을 지정하기 위한 coaching_item_targets 쓰기 권한
create policy "scoped_write_coaching_item_targets_insert" on coaching_item_targets
  for insert with check (
    teacher_has_broad_access()
    or exists (
      select 1 from coaching_items ci
      where ci.id = coaching_item_targets.item_id and teacher_owns_class(ci.class_id)
    )
  );

create policy "scoped_write_coaching_item_targets_delete" on coaching_item_targets
  for delete using (
    teacher_has_broad_access()
    or exists (
      select 1 from coaching_items ci
      where ci.id = coaching_item_targets.item_id and teacher_owns_class(ci.class_id)
    )
  );
