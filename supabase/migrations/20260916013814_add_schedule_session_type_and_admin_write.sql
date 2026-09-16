-- 등원 시 티칭/코칭으로 나뉘는 실제 운영 방식 반영 (기존 데이터는 전부 코칭이었음)
alter table class_schedules add column session_type text not null default '코칭';
alter table class_schedules add constraint class_schedules_session_type_check check (session_type in ('코칭', '티칭'));

-- 관리자만 시간표를 직접 등록/수정/삭제할 수 있도록 (teacher_is_admin()은 이전 마이그레이션에서 정의)
create policy "admin_insert_class_schedules" on class_schedules
  for insert with check (teacher_is_admin());

create policy "admin_update_class_schedules" on class_schedules
  for update using (teacher_is_admin()) with check (teacher_is_admin());

create policy "admin_delete_class_schedules" on class_schedules
  for delete using (teacher_is_admin());
