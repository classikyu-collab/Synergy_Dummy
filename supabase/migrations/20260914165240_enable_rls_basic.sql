alter table students enable row level security;
alter table teachers enable row level security;
alter table classes enable row level security;

-- 최소 정책: 로그인한 사용자만 조회 가능 (세부 역할별 정책은 Auth 설계 후 추가)
create policy "authenticated_read_students" on students
  for select using (auth.role() = 'authenticated');
create policy "authenticated_read_teachers" on teachers
  for select using (auth.role() = 'authenticated');
create policy "authenticated_read_classes" on classes
  for select using (auth.role() = 'authenticated');
