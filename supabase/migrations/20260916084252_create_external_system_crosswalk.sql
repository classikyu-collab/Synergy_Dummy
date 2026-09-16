-- 3개 형제 시스템(온라인_OMR / 내신시험지 / 빠른해석녹음실)과의 통합 1단계: 학생 신원 연결.
-- 각 시스템이 독자적으로 학생 ID를 발급해왔고(S_a1b2c3d4 / S001 / S1) 공통 키가 없어서,
-- 이름만으로 자동 병합하면 동명이인 오매칭 위험이 있다. 그래서 사람이 확인한 매칭만 기록한다.

-- 외부 시스템의 학생 명단 미러. students 본체와 합치지 않고 매칭 대상 목록으로만 쓴다.
create table external_students (
  source_system text not null check (source_system in ('온라인_OMR', '내신시험지', '빠른해석녹음실')),
  external_id   text not null,
  name          text not null,
  class_label   text,
  status        text,
  synced_at     timestamptz not null default now(),
  primary key (source_system, external_id)
);

-- 크로스워크: "이 Supabase 학생 = 저 시스템의 S001"
create table student_external_ids (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references students(id) on delete cascade,
  source_system text not null check (source_system in ('온라인_OMR', '내신시험지', '빠른해석녹음실')),
  external_id   text not null,
  matched_by    text not null default 'manual' check (matched_by in ('manual', 'auto')),
  created_at    timestamptz not null default now(),
  unique (source_system, external_id),
  foreign key (source_system, external_id) references external_students (source_system, external_id) on delete cascade
);
create index on student_external_ids (student_id);

alter table external_students enable row level security;
alter table student_external_ids enable row level security;

create policy "broad_read_external_students" on external_students
  for select using (teacher_has_broad_access());
create policy "admin_write_external_students_insert" on external_students
  for insert with check (teacher_is_admin());
create policy "admin_write_external_students_update" on external_students
  for update using (teacher_is_admin()) with check (teacher_is_admin());
create policy "admin_write_external_students_delete" on external_students
  for delete using (teacher_is_admin());

create policy "broad_read_student_external_ids" on student_external_ids
  for select using (teacher_has_broad_access());
create policy "admin_write_student_external_ids_insert" on student_external_ids
  for insert with check (teacher_is_admin());
create policy "admin_write_student_external_ids_delete" on student_external_ids
  for delete using (teacher_is_admin());
