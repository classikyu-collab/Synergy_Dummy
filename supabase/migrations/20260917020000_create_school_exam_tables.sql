-- 내신 시험지 채점 시스템 (기존 GAS "내신시험지 채점시스템"을 SYNAPSE 안에 네이티브로 재구현).
-- 원본 시스템은 문제/지문을 화면에 보여주지 않는다 — 학생이 인쇄된 시험지를 풀고 답만 입력해서
-- 채점받는 구조. 객관식은 서버에서 자동채점, 서술형/영작 등은 학생이 정답/해설을 보고 스스로
-- O/X 자가채점한 뒤, 강사가 한번 더 확인(확정)하는 2단계 채점 방식으로 만든다.

create table school_exam_worksheets (
  id                 uuid primary key default gen_random_uuid(),
  grade              text not null,           -- 학년 (예: 중1, 중2, 공통영어2)
  unit_name          text,                     -- 과명 (예: Lesson 3)
  publisher_author   text,                     -- 출판사/저자
  question_start     int,
  question_end       int,
  worksheet_type     text,                     -- 시험지종류 (예: 기본 내용 이해하기)
  series             text,
  is_hidden          boolean not null default false,
  created_at         timestamptz not null default now()
);

create table school_exam_questions (
  id                  uuid primary key default gen_random_uuid(),
  worksheet_id        uuid not null references school_exam_worksheets(id) on delete cascade,
  question_no         int not null,
  question_type       text,       -- 문제유형
  category            text,       -- 대분류
  is_multiple_choice  boolean not null default true,
  answer_text         text not null,
  explanation         text,
  sub_answer_count    int not null default 1,
  unique (worksheet_id, question_no)
);

-- 반(class)마다 사용하는 교과서(학년+출판사/저자)를 지정해두면, 그 반 학생에게는
-- 해당 교과서 시험지만 노출된다. 매핑이 없는 반은 전체 시험지를 볼 수 있게 둔다(안전한 기본값).
create table school_exam_class_textbooks (
  class_id          uuid primary key references classes(id) on delete cascade,
  grade             text not null,
  publisher_author  text not null
);

create table school_exam_attempts (
  id            uuid primary key default gen_random_uuid(),
  worksheet_id  uuid not null references school_exam_worksheets(id),
  student_id    uuid not null references students(id),
  status        text not null default '제출됨' check (status in ('제출됨', '검토완료')),
  submitted_at  timestamptz not null default now(),
  reviewed_at   timestamptz,
  reviewed_by   uuid references teachers(id)
);

create table school_exam_attempt_answers (
  id                  uuid primary key default gen_random_uuid(),
  attempt_id          uuid not null references school_exam_attempts(id) on delete cascade,
  question_no         int not null,
  is_multiple_choice  boolean not null,
  submitted_choice    int,
  submitted_text      text,
  auto_correct        boolean,   -- 객관식: 제출 시점에 서버가 채점
  self_correct        boolean,   -- 서술형: 학생 자가채점
  teacher_correct     boolean,   -- 강사 확인/정정 (있으면 최우선)
  final_correct        boolean generated always as (coalesce(teacher_correct, self_correct, auto_correct)) stored,
  unique (attempt_id, question_no)
);

alter table school_exam_worksheets enable row level security;
alter table school_exam_questions enable row level security;
alter table school_exam_class_textbooks enable row level security;
alter table school_exam_attempts enable row level security;
alter table school_exam_attempt_answers enable row level security;

-- 스태프 읽기 + 관리자 쓰기 (worksheets / questions / class_textbooks)
create policy "scoped_read_school_exam_worksheets" on school_exam_worksheets
  for select using (teacher_has_broad_access());
create policy "admin_insert_school_exam_worksheets" on school_exam_worksheets
  for insert with check (teacher_is_admin());
create policy "admin_update_school_exam_worksheets" on school_exam_worksheets
  for update using (teacher_is_admin()) with check (teacher_is_admin());
create policy "admin_delete_school_exam_worksheets" on school_exam_worksheets
  for delete using (teacher_is_admin());

create policy "scoped_read_school_exam_questions" on school_exam_questions
  for select using (teacher_has_broad_access());
create policy "admin_insert_school_exam_questions" on school_exam_questions
  for insert with check (teacher_is_admin());
create policy "admin_update_school_exam_questions" on school_exam_questions
  for update using (teacher_is_admin()) with check (teacher_is_admin());
create policy "admin_delete_school_exam_questions" on school_exam_questions
  for delete using (teacher_is_admin());

create policy "scoped_read_school_exam_class_textbooks" on school_exam_class_textbooks
  for select using (teacher_has_broad_access());
create policy "admin_insert_school_exam_class_textbooks" on school_exam_class_textbooks
  for insert with check (teacher_is_admin());
create policy "admin_update_school_exam_class_textbooks" on school_exam_class_textbooks
  for update using (teacher_is_admin()) with check (teacher_is_admin());
create policy "admin_delete_school_exam_class_textbooks" on school_exam_class_textbooks
  for delete using (teacher_is_admin());

-- attempts / attempt_answers: 담임/코치/관리자가 본인 담당 반 학생 것을 읽고 검토(update)할 수 있음
create policy "scoped_read_school_exam_attempts" on school_exam_attempts
  for select using (
    teacher_has_broad_access()
    or exists (select 1 from students s where s.id = school_exam_attempts.student_id and s.class_id is not null and teacher_owns_class(s.class_id))
  );
create policy "scoped_update_school_exam_attempts" on school_exam_attempts
  for update using (
    teacher_has_broad_access()
    or exists (select 1 from students s where s.id = school_exam_attempts.student_id and s.class_id is not null and teacher_owns_class(s.class_id))
  )
  with check (
    teacher_has_broad_access()
    or exists (select 1 from students s where s.id = school_exam_attempts.student_id and s.class_id is not null and teacher_owns_class(s.class_id))
  );

create policy "scoped_read_school_exam_attempt_answers" on school_exam_attempt_answers
  for select using (
    teacher_has_broad_access()
    or exists (
      select 1 from school_exam_attempts a
      join students s on s.id = a.student_id
      where a.id = school_exam_attempt_answers.attempt_id and s.class_id is not null and teacher_owns_class(s.class_id)
    )
  );
create policy "scoped_update_school_exam_attempt_answers" on school_exam_attempt_answers
  for update using (
    teacher_has_broad_access()
    or exists (
      select 1 from school_exam_attempts a
      join students s on s.id = a.student_id
      where a.id = school_exam_attempt_answers.attempt_id and s.class_id is not null and teacher_owns_class(s.class_id)
    )
  )
  with check (
    teacher_has_broad_access()
    or exists (
      select 1 from school_exam_attempts a
      join students s on s.id = a.student_id
      where a.id = school_exam_attempt_answers.attempt_id and s.class_id is not null and teacher_owns_class(s.class_id)
    )
  );

-- 강사가 검토를 마칠 때 상태를 확정하는 RPC (reviewed_by를 서버에서 본인 teacher id로 채움)
create or replace function finalize_school_exam_review(p_attempt_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_teacher_id uuid;
begin
  select id into v_teacher_id from teachers where auth_user_id = auth.uid();
  if v_teacher_id is null then
    raise exception '권한이 없습니다.';
  end if;
  update school_exam_attempts
  set status = '검토완료', reviewed_at = now(), reviewed_by = v_teacher_id
  where id = p_attempt_id;
end;
$$;
grant execute on function finalize_school_exam_review(uuid) to authenticated;

-- ===== 학생용 (익명 PIN 로그인) RPC =====

-- 학생이 볼 수 있는 시험지 목록: 본인 반에 매핑된 교과서와 일치하는 것만 (매핑이 없으면 전체 노출)
create or replace function list_school_exam_worksheets(p_student_id uuid)
returns table(
  id uuid, grade text, unit_name text, publisher_author text,
  worksheet_type text, series text, question_count bigint, attempted boolean
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_class_id uuid;
  v_grade text;
  v_pub text;
begin
  select class_id into v_class_id from students where id = p_student_id;
  select grade, publisher_author into v_grade, v_pub from school_exam_class_textbooks where class_id = v_class_id;

  return query
    select w.id, w.grade, w.unit_name, w.publisher_author, w.worksheet_type, w.series,
           count(q.id) as question_count,
           exists (select 1 from school_exam_attempts a where a.worksheet_id = w.id and a.student_id = p_student_id) as attempted
    from school_exam_worksheets w
    left join school_exam_questions q on q.worksheet_id = w.id
    where not w.is_hidden
      and (v_grade is null or (w.grade = v_grade and w.publisher_author = v_pub))
    group by w.id
    order by w.grade, w.unit_name, w.worksheet_type;
end;
$$;
grant execute on function list_school_exam_worksheets(uuid) to anon;

-- 응시할 문항 목록 (정답/해설은 숨김 — 제출 전에는 노출되면 안 됨)
create or replace function get_school_exam_worksheet_questions(p_worksheet_id uuid)
returns table(question_no int, question_type text, category text, is_multiple_choice boolean, sub_answer_count int)
language sql stable security definer set search_path = public as $$
  select question_no, question_type, category, is_multiple_choice, sub_answer_count
  from school_exam_questions
  where worksheet_id = p_worksheet_id
  order by question_no;
$$;
grant execute on function get_school_exam_worksheet_questions(uuid) to anon;

-- 답안 제출: 객관식은 즉시 자동채점, 서술형은 자가채점 전까지 null
create or replace function submit_school_exam_attempt(p_student_id uuid, p_pin text, p_worksheet_id uuid, p_answers jsonb)
returns table(attempt_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_pin text;
  v_attempt_id uuid;
  v_ans jsonb;
  v_q record;
begin
  select student_pin into v_pin from students where id = p_student_id;
  if v_pin is null or v_pin != p_pin then
    raise exception 'PIN이 올바르지 않습니다.';
  end if;

  insert into school_exam_attempts (worksheet_id, student_id) values (p_worksheet_id, p_student_id)
  returning id into v_attempt_id;

  for v_ans in select * from jsonb_array_elements(p_answers) loop
    select * into v_q from school_exam_questions
      where worksheet_id = p_worksheet_id and question_no = (v_ans->>'question_no')::int;
    if v_q.id is null then
      continue;
    end if;
    insert into school_exam_attempt_answers (
      attempt_id, question_no, is_multiple_choice, submitted_choice, submitted_text, auto_correct
    ) values (
      v_attempt_id,
      v_q.question_no,
      v_q.is_multiple_choice,
      case when v_q.is_multiple_choice then nullif(v_ans->>'choice', '')::int else null end,
      case when not v_q.is_multiple_choice then v_ans->>'text' else null end,
      case when v_q.is_multiple_choice then (nullif(v_ans->>'choice', '')::text = trim(v_q.answer_text)) else null end
    );
  end loop;

  return query select v_attempt_id;
end;
$$;
grant execute on function submit_school_exam_attempt(uuid, text, uuid, jsonb) to anon;

-- 제출 후 결과+자가채점 화면: 정답/해설을 이제 공개한다
create or replace function get_school_exam_attempt(p_student_id uuid, p_pin text, p_attempt_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_pin text;
  v_result jsonb;
begin
  select student_pin into v_pin from students where id = p_student_id;
  if v_pin is null or v_pin != p_pin then
    raise exception 'PIN이 올바르지 않습니다.';
  end if;

  select jsonb_build_object(
    'attempt_id', a.id,
    'status', a.status,
    'worksheet_title', concat_ws(' · ', w.grade, w.unit_name, w.worksheet_type),
    'questions', (
      select jsonb_agg(jsonb_build_object(
        'question_no', aa.question_no,
        'is_multiple_choice', aa.is_multiple_choice,
        'submitted_choice', aa.submitted_choice,
        'submitted_text', aa.submitted_text,
        'answer_text', q.answer_text,
        'explanation', q.explanation,
        'question_type', q.question_type,
        'category', q.category,
        'auto_correct', aa.auto_correct,
        'self_correct', aa.self_correct,
        'teacher_correct', aa.teacher_correct,
        'final_correct', aa.final_correct
      ) order by aa.question_no)
      from school_exam_attempt_answers aa
      join school_exam_questions q on q.worksheet_id = a.worksheet_id and q.question_no = aa.question_no
      where aa.attempt_id = a.id
    )
  ) into v_result
  from school_exam_attempts a
  join school_exam_worksheets w on w.id = a.worksheet_id
  where a.id = p_attempt_id and a.student_id = p_student_id;

  if v_result is null then
    raise exception '결과를 찾을 수 없습니다.';
  end if;
  return v_result;
end;
$$;
grant execute on function get_school_exam_attempt(uuid, text, uuid) to anon;

create or replace function set_school_exam_self_check(p_student_id uuid, p_pin text, p_attempt_id uuid, p_question_no int, p_is_correct boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_pin text;
begin
  select student_pin into v_pin from students where id = p_student_id;
  if v_pin is null or v_pin != p_pin then
    raise exception 'PIN이 올바르지 않습니다.';
  end if;

  update school_exam_attempt_answers aa
  set self_correct = p_is_correct
  from school_exam_attempts a
  where aa.attempt_id = a.id
    and a.id = p_attempt_id
    and a.student_id = p_student_id
    and aa.question_no = p_question_no
    and aa.is_multiple_choice = false;
end;
$$;
grant execute on function set_school_exam_self_check(uuid, text, uuid, int, boolean) to anon;

create or replace function list_student_school_exam_attempts(p_student_id uuid)
returns table(attempt_id uuid, worksheet_title text, status text, submitted_at timestamptz, correct_count bigint, total_count bigint)
language sql stable security definer set search_path = public as $$
  select a.id, concat_ws(' · ', w.grade, w.unit_name, w.worksheet_type), a.status, a.submitted_at,
         count(aa.id) filter (where aa.final_correct), count(aa.id)
  from school_exam_attempts a
  join school_exam_worksheets w on w.id = a.worksheet_id
  left join school_exam_attempt_answers aa on aa.attempt_id = a.id
  where a.student_id = p_student_id
  group by a.id, w.grade, w.unit_name, w.worksheet_type, a.status, a.submitted_at
  order by a.submitted_at desc
  limit 30;
$$;
grant execute on function list_student_school_exam_attempts(uuid) to anon;
