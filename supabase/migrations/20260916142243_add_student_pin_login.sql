-- 학생 로그인: 반/이름 선택 흐름은 그대로 두고, 이름 선택 직후 4자리 PIN 검증을 추가한다
-- (학부모 PIN과 동일한 패턴). 이게 없으면 URL의 studentId만 바꿔서 다른 학생 행세가 가능했다.
alter table students
  add column student_pin text not null default '0000',
  add column student_must_change_pin boolean not null default true;
alter table students add constraint students_student_pin_check check (student_pin ~ '^[0-9]{4}$');

create or replace function verify_student_pin(p_student_id uuid, p_pin text)
returns table(ok boolean, must_change boolean)
language sql stable security definer set search_path = public as $$
  select (student_pin = p_pin), student_must_change_pin
  from students where id = p_student_id and status = '재원';
$$;
grant execute on function verify_student_pin(uuid, text) to anon;

create or replace function set_student_pin(p_student_id uuid, p_old_pin text, p_new_pin text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_ok boolean;
begin
  if p_new_pin !~ '^[0-9]{4}$' then
    return false;
  end if;
  select (student_pin = p_old_pin) into v_ok from students where id = p_student_id and status = '재원';
  if not coalesce(v_ok, false) then
    return false;
  end if;
  update students set student_pin = p_new_pin, student_must_change_pin = false where id = p_student_id;
  return true;
end;
$$;
grant execute on function set_student_pin(uuid, text, text) to anon;

-- 관리자: 학생 PIN 초기화
create or replace function admin_reset_student_pin(p_student_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not teacher_is_admin() then
    raise exception '관리자 권한이 없습니다.';
  end if;
  update students set student_pin = '0000', student_must_change_pin = true where id = p_student_id;
  return true;
end;
$$;
grant execute on function admin_reset_student_pin(uuid) to authenticated;

-- 모의고사 제출은 PIN 검증까지 통과해야 처리되도록 한 번 더 강화 (URL 조작만으로 남의 답안 제출 방지).
create or replace function submit_mock_exam(p_student_id uuid, p_pin text, p_exam_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exam         mock_exams%rowtype;
  v_student      students%rowtype;
  v_visible      boolean;
  v_q            int;
  v_type         text;
  v_points       int;
  v_correct      int;
  v_answer       int;
  v_auto_full    boolean;
  v_is_correct   boolean;
  v_counted      boolean;
  v_total        int := 0;
  v_max          int := 0;
  v_results      jsonb := '[]'::jsonb;
  v_stats        jsonb := '{}'::jsonb;
  v_attempt_id   uuid;
begin
  select * into v_student from students where id = p_student_id and status = '재원';
  if not found then
    raise exception '학생 정보를 찾을 수 없습니다.';
  end if;
  if v_student.student_pin != p_pin then
    raise exception 'PIN이 올바르지 않습니다.';
  end if;

  select * into v_exam from mock_exams where id = p_exam_id and is_active;
  if not found then
    raise exception '응시할 수 있는 시험이 아닙니다.';
  end if;

  v_visible := v_exam.audience_type = '전체'
    or exists (select 1 from mock_exam_classes mc where mc.exam_id = v_exam.id and mc.class_id = v_student.class_id);
  if not v_visible then
    raise exception '이 학생에게 배정되지 않은 시험입니다.';
  end if;

  for v_q in 1..45 loop
    v_type := mock_exam_question_type(v_q);
    v_points := coalesce((v_exam.points ->> (v_q - 1))::numeric, 0)::int;
    v_correct := nullif(v_exam.answer_key ->> (v_q - 1), '')::int;
    v_answer := nullif(p_answers ->> (v_q - 1), '')::int;
    v_auto_full := (v_q between 1 and 17) and not v_exam.includes_listening;
    v_is_correct := case
                      when v_auto_full then true
                      else (v_answer is not null and v_answer = v_correct)
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
      'studentAnswer', case when v_auto_full then null else to_jsonb(v_answer) end,
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
grant execute on function submit_mock_exam(uuid, text, uuid, jsonb) to anon;
drop function if exists submit_mock_exam(uuid, uuid, jsonb);
