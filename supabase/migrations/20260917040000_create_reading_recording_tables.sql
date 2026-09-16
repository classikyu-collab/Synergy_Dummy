-- 빠른 해석 녹음실 (기존 GAS 시스템을 SYNAPSE 안에 네이티브로 재구현).
-- 원본은 Google Drive에 음원을 저장했지만, 여기서는 Supabase Storage(private bucket 'reading-audio')를 쓴다.
-- MVP 범위: 전체 지문 읽기 모드만 지원(셔플/발췌 모드, 무음 자동감지·화면이탈 감지, 보관기간 자동삭제는 이후 단계).

create table reading_passages (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  body                text not null,
  audience_type       text not null default '전체' check (audience_type in ('전체', '반')),
  word_count          int,
  recommended_seconds int,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now()
);

create table reading_passage_classes (
  passage_id uuid not null references reading_passages(id) on delete cascade,
  class_id   uuid not null references classes(id) on delete cascade,
  primary key (passage_id, class_id)
);

create table reading_attempts (
  id                uuid primary key default gen_random_uuid(),
  passage_id        uuid not null references reading_passages(id),
  student_id        uuid not null references students(id),
  attempt_no        int not null,          -- 당일 몇 번째 시도인지 (일일 시도제한 계산용)
  presented_text    text not null,          -- 시작 시점에 공개된 지문 스냅샷 (MVP: 항상 전체 본문)
  audio_path        text,                   -- storage object path (reading-audio 버킷)
  duration_sec      int,
  recommended_pct   int,                    -- 권장시간 대비 실제 녹음시간 비율(%)
  status            text not null default '진행중' check (status in ('진행중', '제출완료', '폐기')),
  started_at        timestamptz not null default now(),
  submitted_at      timestamptz,
  score             int check (score in (100, 90, 80, 70)),
  comment           text,
  graded_at         timestamptz,
  graded_by         uuid references teachers(id)
);

alter table reading_passages enable row level security;
alter table reading_passage_classes enable row level security;
alter table reading_attempts enable row level security;

create policy "scoped_read_reading_passages" on reading_passages
  for select using (teacher_has_broad_access());
create policy "admin_insert_reading_passages" on reading_passages
  for insert with check (teacher_is_admin());
create policy "admin_update_reading_passages" on reading_passages
  for update using (teacher_is_admin()) with check (teacher_is_admin());
create policy "admin_delete_reading_passages" on reading_passages
  for delete using (teacher_is_admin());

create policy "scoped_read_reading_passage_classes" on reading_passage_classes
  for select using (teacher_has_broad_access());
create policy "admin_insert_reading_passage_classes" on reading_passage_classes
  for insert with check (teacher_is_admin());
create policy "admin_delete_reading_passage_classes" on reading_passage_classes
  for delete using (teacher_is_admin());

create policy "scoped_read_reading_attempts" on reading_attempts
  for select using (
    teacher_has_broad_access()
    or exists (select 1 from students s where s.id = reading_attempts.student_id and s.class_id is not null and teacher_owns_class(s.class_id))
  );
-- 강사가 채점(score/comment/graded_at/graded_by)할 때 쓰는 update 정책. 컬럼 단위 제한은 없지만
-- 화면(ReadingReview.jsx)에서 채점 필드만 업데이트하도록 통제한다.
create policy "scoped_update_reading_attempts" on reading_attempts
  for update using (
    teacher_has_broad_access()
    or exists (select 1 from students s where s.id = reading_attempts.student_id and s.class_id is not null and teacher_owns_class(s.class_id))
  )
  with check (
    teacher_has_broad_access()
    or exists (select 1 from students s where s.id = reading_attempts.student_id and s.class_id is not null and teacher_owns_class(s.class_id))
  );

-- ===== 학생용 (익명 PIN 로그인) RPC =====

create or replace function list_reading_passages(p_student_id uuid)
returns table(id uuid, title text, word_count int, recommended_seconds int, attempts_today bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  v_class_id uuid;
begin
  select class_id into v_class_id from students where id = p_student_id;
  return query
    select p.id, p.title, p.word_count, p.recommended_seconds,
           (select count(*) from reading_attempts ra
            where ra.passage_id = p.id and ra.student_id = p_student_id
              and ra.started_at::date = current_date) as attempts_today
    from reading_passages p
    where p.is_active
      and (p.audience_type = '전체' or exists (
        select 1 from reading_passage_classes pc where pc.passage_id = p.id and pc.class_id = v_class_id
      ))
    order by p.created_at desc;
end;
$$;
grant execute on function list_reading_passages(uuid) to anon;

create or replace function start_reading_attempt(p_student_id uuid, p_pin text, p_passage_id uuid)
returns table(attempt_id uuid, presented_text text, recommended_seconds int, max_seconds int)
language plpgsql security definer set search_path = public as $$
declare
  v_pin text;
  v_passage record;
  v_today_count int;
  v_attempt_id uuid;
begin
  select student_pin into v_pin from students where id = p_student_id;
  if v_pin is null or v_pin != p_pin then
    raise exception 'PIN이 올바르지 않습니다.';
  end if;

  select * into v_passage from reading_passages where id = p_passage_id and is_active;
  if v_passage.id is null then
    raise exception '지문을 찾을 수 없습니다.';
  end if;

  select count(*) into v_today_count from reading_attempts
    where passage_id = p_passage_id and student_id = p_student_id and started_at::date = current_date;
  if v_today_count >= 6 then
    raise exception '오늘 이 지문의 시도 횟수(6회)를 모두 사용했습니다.';
  end if;

  insert into reading_attempts (passage_id, student_id, attempt_no, presented_text)
  values (p_passage_id, p_student_id, v_today_count + 1, v_passage.body)
  returning id into v_attempt_id;

  return query select v_attempt_id, v_passage.body, v_passage.recommended_seconds, 360;
end;
$$;
grant execute on function start_reading_attempt(uuid, text, uuid) to anon;

create or replace function submit_reading_attempt(p_student_id uuid, p_pin text, p_attempt_id uuid, p_audio_path text, p_duration_sec int)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_pin text;
  v_rec_sec int;
begin
  select student_pin into v_pin from students where id = p_student_id;
  if v_pin is null or v_pin != p_pin then
    raise exception 'PIN이 올바르지 않습니다.';
  end if;

  select p.recommended_seconds into v_rec_sec
  from reading_attempts a join reading_passages p on p.id = a.passage_id
  where a.id = p_attempt_id and a.student_id = p_student_id;

  update reading_attempts
  set audio_path = p_audio_path,
      duration_sec = p_duration_sec,
      recommended_pct = case when v_rec_sec is null or v_rec_sec = 0 then null else round(p_duration_sec::numeric / v_rec_sec * 100) end,
      status = '제출완료',
      submitted_at = now()
  where id = p_attempt_id and student_id = p_student_id;
end;
$$;
grant execute on function submit_reading_attempt(uuid, text, uuid, text, int) to anon;

create or replace function discard_reading_attempt(p_student_id uuid, p_pin text, p_attempt_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_pin text;
begin
  select student_pin into v_pin from students where id = p_student_id;
  if v_pin is null or v_pin != p_pin then
    raise exception 'PIN이 올바르지 않습니다.';
  end if;

  update reading_attempts set status = '폐기'
  where id = p_attempt_id and student_id = p_student_id and status = '진행중';
end;
$$;
grant execute on function discard_reading_attempt(uuid, text, uuid) to anon;

create or replace function list_student_reading_attempts(p_student_id uuid)
returns table(attempt_id uuid, passage_title text, status text, submitted_at timestamptz, duration_sec int, recommended_seconds int, score int, comment text)
language sql stable security definer set search_path = public as $$
  select a.id, p.title, a.status, a.submitted_at, a.duration_sec, p.recommended_seconds, a.score, a.comment
  from reading_attempts a
  join reading_passages p on p.id = a.passage_id
  where a.student_id = p_student_id and a.status <> '진행중'
  order by a.started_at desc
  limit 30;
$$;
grant execute on function list_student_reading_attempts(uuid) to anon;

-- ===== Storage: 음원 전용 private 버킷 =====
insert into storage.buckets (id, name, public)
values ('reading-audio', 'reading-audio', false)
on conflict (id) do nothing;

-- 학생(anon)은 이 버킷에 업로드만 가능(다운로드/목록 불가) — 실제 소유권 검증은 submit_reading_attempt RPC의 PIN 체크가 담당.
create policy "anon_upload_reading_audio" on storage.objects
  for insert to anon
  with check (bucket_id = 'reading-audio');

-- 강사는 본인 담당 반(또는 전체 권한)의 제출 음원만 재생 가능
create policy "staff_read_reading_audio" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'reading-audio'
    and exists (
      select 1 from reading_attempts ra
      join students s on s.id = ra.student_id
      where ra.audio_path = storage.objects.name
        and (teacher_has_broad_access() or (s.class_id is not null and teacher_owns_class(s.class_id)))
    )
  );
