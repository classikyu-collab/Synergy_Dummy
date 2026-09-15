-- 여러 시스템(빠른 해석 녹음실, 온라인_OMR 등)의 학생 계정을 synergy-dummy의 students(기준 마스터)에
-- 연결하는 크로스워크 테이블. 이름만으로 자동 병합하지 않고, 사람이 확인한 연결만 저장한다.
create table student_external_ids (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references students(id) on delete cascade,
  source_system       text not null check (source_system in ('빠른해석녹음실', '온라인_OMR', '내신시험지')),
  external_id         text not null,
  external_name       text,        -- 매칭 당시 외부 시스템의 이름 (참고용 스냅샷)
  external_class_name text,        -- 매칭 당시 외부 시스템의 반 이름 (참고용 스냅샷)
  matched_by          text,        -- 매칭을 확인한 관리자 (선택)
  matched_at          timestamptz not null default now(),
  unique (source_system, external_id)
);
create index on student_external_ids (student_id);

alter table student_external_ids enable row level security;

-- 조회/관리는 admin만 (여러 시스템의 학생 개인정보를 잇는 민감한 연결 정보)
create policy "admin_read_student_external_ids" on student_external_ids
  for select using (
    exists (select 1 from teachers t where t.auth_user_id = auth.uid() and t.role = 'admin')
  );
create policy "admin_write_student_external_ids_insert" on student_external_ids
  for insert with check (
    exists (select 1 from teachers t where t.auth_user_id = auth.uid() and t.role = 'admin')
  );
create policy "admin_write_student_external_ids_delete" on student_external_ids
  for delete using (
    exists (select 1 from teachers t where t.auth_user_id = auth.uid() and t.role = 'admin')
  );
