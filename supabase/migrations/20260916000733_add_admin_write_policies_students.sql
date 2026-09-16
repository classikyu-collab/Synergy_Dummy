-- 관리자만 학생 정보를 직접 등록/수정할 수 있도록 (teacher_is_admin()은 이전 마이그레이션에서 정의)
create policy "admin_insert_students" on students
  for insert with check (teacher_is_admin());

create policy "admin_update_students" on students
  for update using (teacher_is_admin()) with check (teacher_is_admin());
