-- 학생/학부모 웹 푸시 구독 정보. RLS만 켜두고 정책은 만들지 않는다(익명 접근 전면 차단) —
-- anon은 아래 security definer RPC로만 등록/해지하고, 발송은 서비스 롤(Edge Function)에서만 조회한다.
create table push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('student', 'parent')),
  subject_id   uuid not null references students(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  created_at   timestamptz not null default now()
);
alter table push_subscriptions enable row level security;

create index push_subscriptions_subject_idx on push_subscriptions (subject_id);

-- 학생 PIN(student_pin) 또는 학부모 PIN(parent_pin)을 검증한 뒤에만 구독을 등록/갱신한다.
create or replace function upsert_push_subscription(
  p_subject_type text, p_subject_id uuid, p_pin text,
  p_endpoint text, p_p256dh text, p_auth text
) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_ok boolean;
begin
  if p_subject_type = 'student' then
    select (student_pin = p_pin) into v_ok from students where id = p_subject_id and status = '재원';
  elsif p_subject_type = 'parent' then
    select (parent_pin = p_pin) into v_ok from students where id = p_subject_id and status = '재원';
  else
    return false;
  end if;

  if not coalesce(v_ok, false) then
    return false;
  end if;

  insert into push_subscriptions (subject_type, subject_id, endpoint, p256dh, auth)
  values (p_subject_type, p_subject_id, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set subject_type = excluded.subject_type,
        subject_id = excluded.subject_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth;

  return true;
end;
$$;
grant execute on function upsert_push_subscription(text, uuid, text, text, text, text) to anon;

-- 해지는 PIN 검증 없이 endpoint만으로 허용한다 (브라우저가 알림 권한을 회수했을 때도 정리할 수 있어야 함).
create or replace function delete_push_subscription(p_endpoint text) returns void
language sql security definer set search_path = public as $$
  delete from push_subscriptions where endpoint = p_endpoint;
$$;
grant execute on function delete_push_subscription(text) to anon;
