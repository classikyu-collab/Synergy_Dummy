-- 학생이 직접 OMR을 입력하는 흐름. 정답(answer_key)이 제출 전에 학생 브라우저로 내려가면 안 되므로
-- 채점은 반드시 서버에서 수행한다(기존 온라인_OMR의 submitExam과 같은 구조).

create or replace function mock_exam_question_type(q int)
returns text
language sql
immutable
as $$
  select case
    when q between 1 and 17 then '듣기'
    when q = 18 then '목적'
    when q = 19 then '심경·분위기'
    when q = 20 then '주장'
    when q = 21 then '함축의미'
    when q = 22 then '요지'
    when q = 23 then '주제'
    when q = 24 then '제목'
    when q = 25 then '도표'
    when q = 26 then '내용불일치'
    when q in (27, 28) then '안내문'
    when q = 29 then '어법'
    when q = 30 then '어휘'
    when q between 31 and 34 then '빈칸추론'
    when q = 35 then '무관한문장'
    when q in (36, 37) then '순서배열'
    when q in (38, 39) then '문장삽입'
    when q = 40 then '요약문'
    when q in (41, 42) then '장문(1)'
    when q between 43 and 45 then '장문(2)'
    else '기타'
  end;
$$;

-- 응시 가능한 시험 목록 (정답/배점은 절대 내보내지 않는다)
create or replace function list_active_mock_exams()
returns table(id uuid, title text, grade text, year int, month int, includes_listening boolean)
language sql stable security definer set search_path = public as $$
  select id, title, grade, year, month, includes_listening
  from mock_exams
  where is_active
  order by year desc nulls last, month desc nulls last, title;
$$;
grant execute on function list_active_mock_exams() to anon;

-- 답안 제출 + 채점. 듣기 미포함 시험은 1~17번을 자동 만점 처리하고 유형 통계에서 제외한다.
create or replace function submit_mock_exam(p_student_id uuid, p_exam_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exam         mock_exams%rowtype;
  v_q            int;
  v_type         text;
  v_points       int;
  v_correct      int;
  v_student      int;
  v_auto_full    boolean;
  v_is_correct   boolean;
  v_counted      boolean;
  v_total        int := 0;
  v_max          int := 0;
  v_results      jsonb := '[]'::jsonb;
  v_stats        jsonb := '{}'::jsonb;
  v_attempt_id   uuid;
begin
  select * into v_exam from mock_exams where id = p_exam_id and is_active;
  if not found then
    raise exception '응시할 수 있는 시험이 아닙니다.';
  end if;

  if not exists (select 1 from students where id = p_student_id and status = '재원') then
    raise exception '학생 정보를 찾을 수 없습니다.';
  end if;

  for v_q in 1..45 loop
    v_type := mock_exam_question_type(v_q);
    v_points := coalesce((v_exam.points ->> (v_q - 1))::numeric, 0)::int;
    v_correct := nullif(v_exam.answer_key ->> (v_q - 1), '')::int;
    v_student := nullif(p_answers ->> (v_q - 1), '')::int;
    v_auto_full := (v_q between 1 and 17) and not v_exam.includes_listening;
    v_is_correct := case
                      when v_auto_full then true
                      else (v_student is not null and v_student = v_correct)
                    end;
    v_counted := not v_auto_full;

    v_max := v_max + v_points;
    if v_is_correct then
      v_total := v_total + v_points;
    end if;

    if v_counted then
      if not (v_stats ? v_type) then
        v_stats := v_stats || jsonb_build_object(v_type, jsonb_build_object('correct', 0, 'total', 0));
      end if;
      v_stats := jsonb_set(v_stats, array[v_type, 'total'], to_jsonb(((v_stats #>> array[v_type, 'total'])::int) + 1));
      if v_is_correct then
        v_stats := jsonb_set(v_stats, array[v_type, 'correct'], to_jsonb(((v_stats #>> array[v_type, 'correct'])::int) + 1));
      end if;
    end if;

    v_results := v_results || jsonb_build_object(
      'q', v_q,
      'type', v_type,
      'studentAnswer', case when v_auto_full then null else to_jsonb(v_student) end,
      'correctAnswer', to_jsonb(v_correct),
      'points', v_points,
      'isCorrect', v_is_correct,
      'counted', v_counted
    );
  end loop;

  insert into mock_exam_attempts (exam_id, student_id, answers, total_score, question_results, type_stats)
  values (p_exam_id, p_student_id, p_answers, v_total, v_results, v_stats)
  returning id into v_attempt_id;

  return jsonb_build_object(
    'attempt_id', v_attempt_id,
    'exam_title', v_exam.title,
    'includes_listening', v_exam.includes_listening,
    'total_score', v_total,
    'max_score', v_max,
    'question_results', v_results,
    'type_stats', v_stats
  );
end;
$$;
grant execute on function submit_mock_exam(uuid, uuid, jsonb) to anon;

-- 학생 본인의 응시 이력
create or replace function list_student_mock_exam_attempts(p_student_id uuid)
returns table(
  attempt_id uuid, exam_id uuid, title text, grade text, year int, month int,
  total_score int, max_score int, submitted_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    a.id, e.id, e.title, e.grade, e.year, e.month,
    a.total_score,
    (select coalesce(sum(v::numeric), 0) from jsonb_array_elements_text(e.points) as v)::int,
    a.submitted_at
  from mock_exam_attempts a
  join mock_exams e on e.id = a.exam_id
  where a.student_id = p_student_id
  order by a.submitted_at desc;
$$;
grant execute on function list_student_mock_exam_attempts(uuid) to anon;

-- 채점 결과 상세 (제출 후 결과 화면 / 이력에서 다시 보기)
create or replace function get_mock_exam_attempt(p_attempt_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'attempt_id', a.id,
    'exam_title', e.title,
    'grade', e.grade,
    'year', e.year,
    'month', e.month,
    'includes_listening', e.includes_listening,
    'national_average', e.national_average,
    'total_score', a.total_score,
    'max_score', (select coalesce(sum(v::numeric), 0) from jsonb_array_elements_text(e.points) as v)::int,
    'question_results', a.question_results,
    'type_stats', a.type_stats,
    'submitted_at', a.submitted_at
  )
  from mock_exam_attempts a
  join mock_exams e on e.id = a.exam_id
  where a.id = p_attempt_id;
$$;
grant execute on function get_mock_exam_attempt(uuid) to anon;
