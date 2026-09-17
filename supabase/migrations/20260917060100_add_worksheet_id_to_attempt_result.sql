-- get_school_exam_attempt 응답에 worksheet_id를 추가 (오류 신고 제출 시 필요).
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
    'worksheet_id', a.worksheet_id,
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
