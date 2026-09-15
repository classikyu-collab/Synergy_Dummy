-- 학생/학부모 화면(비로그인, anon)에서도 활성 공지사항을 볼 수 있도록 최소 정보만 반환
create or replace function list_active_announcements()
returns table(id uuid, content text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select id, content, created_at
  from announcements
  where is_active = true
  order by created_at desc
  limit 5;
$$;
grant execute on function list_active_announcements() to anon;
