-- 학생 대상 공지사항. 직원 대상 announcements 테이블(admin->강사)과는 완전히 별개 채널이다
-- (학생/학부모 화면에는 강사용 공지가 절대 노출되면 안 된다는 기존 결정과 분리하기 위함).
-- 학생 화면에 실제로 어디에 노출할지는 아직 미정이라, 이번엔 관리자 쪽 등록/관리 기능만 만든다.
create table student_announcements (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  content      text not null,
  audience_type text not null default '전체' check (audience_type in ('전체', '반', '개별')),
  class_id     uuid references classes(id) on delete cascade,
  starts_at    date,
  ends_at      date,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create table student_announcement_targets (
  announcement_id uuid not null references student_announcements(id) on delete cascade,
  student_id      uuid not null references students(id) on delete cascade,
  primary key (announcement_id, student_id)
);

alter table student_announcements enable row level security;
alter table student_announcement_targets enable row level security;

create policy "scoped_read_student_announcements" on student_announcements
  for select using (teacher_has_broad_access());

create policy "admin_insert_student_announcements" on student_announcements
  for insert with check (teacher_is_admin());
create policy "admin_update_student_announcements" on student_announcements
  for update using (teacher_is_admin()) with check (teacher_is_admin());
create policy "admin_delete_student_announcements" on student_announcements
  for delete using (teacher_is_admin());

create policy "scoped_read_student_announcement_targets" on student_announcement_targets
  for select using (teacher_has_broad_access());

create policy "admin_insert_student_announcement_targets" on student_announcement_targets
  for insert with check (teacher_is_admin());
create policy "admin_delete_student_announcement_targets" on student_announcement_targets
  for delete using (teacher_is_admin());
