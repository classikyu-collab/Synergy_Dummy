-- 시험지 공개 범위: 전체 공개 / 특정 반에만 배정 / (is_active=false로) 비공개.
-- 코칭항목(coaching_items.target_mode)과 같은 패턴 — 반 배정일 때만 조인 테이블을 쓴다.
alter table mock_exams
  add column audience_type text not null default '전체' check (audience_type in ('전체', '반'));

create table mock_exam_classes (
  exam_id  uuid not null references mock_exams(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  primary key (exam_id, class_id)
);

alter table mock_exam_classes enable row level security;
create policy "broad_read_mock_exam_classes" on mock_exam_classes
  for select using (teacher_has_broad_access());
create policy "admin_insert_mock_exam_classes" on mock_exam_classes
  for insert with check (teacher_is_admin());
create policy "admin_delete_mock_exam_classes" on mock_exam_classes
  for delete using (teacher_is_admin());

-- 학생 본인의 반 기준으로 보이는 시험만 반환 (전체공개 또는 자기 반에 배정된 것).
create or replace function list_active_mock_exams(p_student_id uuid)
returns table(id uuid, title text, grade text, year int, month int, includes_listening boolean)
language sql stable security definer set search_path = public as $$
  select e.id, e.title, e.grade, e.year, e.month, e.includes_listening
  from mock_exams e
  join students s on s.id = p_student_id
  where e.is_active
    and (
      e.audience_type = '전체'
      or exists (
        select 1 from mock_exam_classes mc
        where mc.exam_id = e.id and mc.class_id = s.class_id
      )
    )
  order by e.year desc nulls last, e.month desc nulls last, e.title;
$$;
grant execute on function list_active_mock_exams(uuid) to anon;

-- 기존 시그니처(학생ID 없이 전체 목록)는 관리자 화면에서 쓰던 것과 겹치지 않도록 제거.
drop function if exists list_active_mock_exams();

-- 제출 시에도 같은 공개범위 검증을 한 번 더 한다 — URL을 직접 조작해 자기 반에 배정 안 된
-- 시험이나 비활성 시험을 제출하는 것을 막기 위한 방어선.
create or replace function submit_mock_exam(p_student_id uuid, p_exam_id uuid, p_answers jsonb)
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
grant execute on function submit_mock_exam(uuid, uuid, jsonb) to anon;
