-- 관리자만 직원 대상 공지사항을 직접 등록/수정/삭제할 수 있도록 (teacher_is_admin()은 이전 마이그레이션에서 정의)
create policy "admin_insert_announcements" on announcements
  for insert with check (teacher_is_admin());

create policy "admin_update_announcements" on announcements
  for update using (teacher_is_admin()) with check (teacher_is_admin());

create policy "admin_delete_announcements" on announcements
  for delete using (teacher_is_admin());
