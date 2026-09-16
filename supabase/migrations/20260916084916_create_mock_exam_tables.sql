-- 모의고사(구 온라인_OMR) 시냅스 네이티브 구현.
-- 평가원 영어 기준 45문항 고정, 1~17번은 듣기 영역. 듣기 미포함 시험은 채점 시 1~17번을 자동 만점 처리하고
-- 유형별 통계에서는 제외한다(기존 시스템 Grading.gs 동작을 그대로 옮김).

create table mock_exams (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  grade              text not null,
  year               int,
  month              int,
  includes_listening boolean not null default true,
  answer_key         jsonb not null,   -- 45개 정답 배열 (1번 문항 = index 0)
  points             jsonb not null,   -- 45개 배점 배열
  national_average   numeric,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now()
);

-- 응시 + 채점 결과. 원본 시스템은 응시기록/채점결과 2개 시트였지만 1:1 관계라 한 테이블로 합친다.
create table mock_exam_attempts (
  id               uuid primary key default gen_random_uuid(),
  exam_id          uuid not null references mock_exams(id) on delete cascade,
  student_id       uuid not null references students(id) on delete cascade,
  answers          jsonb not null,          -- 제출 답안 45개 (무응답은 null)
  total_score      int not null,
  question_results jsonb not null,          -- 문항별 {q,type,studentAnswer,correctAnswer,points,isCorrect,counted}
  type_stats       jsonb not null,          -- 유형별 {correct,total}
  submitted_at     timestamptz not null default now(),
  graded_at        timestamptz not null default now()
);
create index on mock_exam_attempts (student_id);
create index on mock_exam_attempts (exam_id);

-- 등급 컷 참고용 누적비율 (학년도/월/학년별)
create table mock_exam_grade_ratios (
  year         int not null,
  month        int not null,
  grade        text not null,
  grade1_ratio numeric,
  grade2_ratio numeric,
  grade3_ratio numeric,
  grade4_ratio numeric,
  primary key (year, month, grade)
);

alter table mock_exams enable row level security;
alter table mock_exam_attempts enable row level security;
alter table mock_exam_grade_ratios enable row level security;

-- 시험 정의: 직원은 조회, 관리자만 등록/수정/삭제
create policy "broad_read_mock_exams" on mock_exams
  for select using (teacher_has_broad_access());
create policy "admin_insert_mock_exams" on mock_exams
  for insert with check (teacher_is_admin());
create policy "admin_update_mock_exams" on mock_exams
  for update using (teacher_is_admin()) with check (teacher_is_admin());
create policy "admin_delete_mock_exams" on mock_exams
  for delete using (teacher_is_admin());

-- 응시 기록: 전체 접근 강사는 전부, 담임은 자기 반 학생 것만 (students 정책과 동일한 기준)
create policy "scoped_read_mock_exam_attempts" on mock_exam_attempts
  for select using (
    teacher_has_broad_access()
    or exists (
      select 1 from students s
      where s.id = mock_exam_attempts.student_id
        and s.class_id is not null
        and teacher_owns_class(s.class_id)
    )
  );
create policy "admin_delete_mock_exam_attempts" on mock_exam_attempts
  for delete using (teacher_is_admin());

create policy "broad_read_mock_exam_grade_ratios" on mock_exam_grade_ratios
  for select using (teacher_has_broad_access());
create policy "admin_write_mock_exam_grade_ratios_insert" on mock_exam_grade_ratios
  for insert with check (teacher_is_admin());
create policy "admin_write_mock_exam_grade_ratios_update" on mock_exam_grade_ratios
  for update using (teacher_is_admin()) with check (teacher_is_admin());
create policy "admin_write_mock_exam_grade_ratios_delete" on mock_exam_grade_ratios
  for delete using (teacher_is_admin());
