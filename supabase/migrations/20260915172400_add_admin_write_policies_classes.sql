-- 관리자만 반 정보를 직접 등록/수정할 수 있도록 (teacher_is_admin()은 이전 마이그레이션에서 정의)
create policy "admin_insert_classes" on classes
  for insert with check (teacher_is_admin());

create policy "admin_update_classes" on classes
  for update using (teacher_is_admin()) with check (teacher_is_admin());
