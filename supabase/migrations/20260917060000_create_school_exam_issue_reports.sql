-- 내신 시험지 오류 신고 + 정답/해설 정정 (원본 GAS 시스템의 IssueReports/QuestionCorrections 재구현).
-- 학생이 자가채점 화면에서 "이 문항 정답이 이상해요" 신고 → 강사가 검토 화면에서 확인 → 필요하면
-- (관리자 권한으로) 정답/해설 자체를 수정. 정답 수정은 이후 모든 학생에게 영향을 주므로 기존
-- school_exam_questions 쓰기 정책(admin만 가능)을 그대로 따른다 — 이 마이그레이션에서 새로 열지 않는다.

create table school_exam_issue_reports (
  id            uuid primary key default gen_random_uuid(),
  worksheet_id  uuid not null references school_exam_worksheets(id) on delete cascade,
  question_no   int not null,
  student_id    uuid not null references students(id),
  attempt_id    uuid references school_exam_attempts(id) on delete set null,
  reason        text not null,
  detail        text,
  status        text not null default '접수' check (status in ('접수', '처리완료')),
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz,
  resolved_by   uuid references teachers(id)
);

alter table school_exam_issue_reports enable row level security;

create policy "scoped_read_school_exam_issue_reports" on school_exam_issue_reports
  for select using (
    teacher_has_broad_access()
    or exists (select 1 from students s where s.id = school_exam_issue_reports.student_id and s.class_id is not null and teacher_owns_class(s.class_id))
  );

create policy "scoped_update_school_exam_issue_reports" on school_exam_issue_reports
  for update using (
    teacher_has_broad_access()
    or exists (select 1 from students s where s.id = school_exam_issue_reports.student_id and s.class_id is not null and teacher_owns_class(s.class_id))
  )
  with check (
    teacher_has_broad_access()
    or exists (select 1 from students s where s.id = school_exam_issue_reports.student_id and s.class_id is not null and teacher_owns_class(s.class_id))
  );

create or replace function submit_school_exam_issue_report(
  p_student_id uuid, p_pin text, p_worksheet_id uuid, p_question_no int, p_attempt_id uuid, p_reason text, p_detail text
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_pin text;
begin
  select student_pin into v_pin from students where id = p_student_id;
  if v_pin is null or v_pin != p_pin then
    raise exception 'PIN이 올바르지 않습니다.';
  end if;

  insert into school_exam_issue_reports (worksheet_id, question_no, student_id, attempt_id, reason, detail)
  values (p_worksheet_id, p_question_no, p_student_id, p_attempt_id, p_reason, nullif(p_detail, ''));
end;
$$;
grant execute on function submit_school_exam_issue_report(uuid, text, uuid, int, uuid, text, text) to anon;
