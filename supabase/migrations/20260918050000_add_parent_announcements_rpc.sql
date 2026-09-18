-- 학부모용 공지사항 (학생용 list_student_announcements와 동일 로직, PIN 검증만 추가).
create or replace function list_parent_announcements(p_student_id uuid, p_pin text)
returns table(
  id uuid, title text, content text, starts_at date, ends_at date, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select sa.id, sa.title, sa.content, sa.starts_at, sa.ends_at, sa.created_at
  from student_announcements sa
  where sa.is_active
    and (sa.starts_at is null or sa.starts_at <= current_date)
    and (sa.ends_at is null or sa.ends_at >= current_date)
    and exists (select 1 from students s where s.id = p_student_id and s.parent_pin = p_pin and s.status = '재원')
    and (
      sa.audience_type = '전체'
      or (sa.audience_type = '반' and sa.class_id = (select class_id from students where id = p_student_id))
      or (sa.audience_type = '개별' and exists (
        select 1 from student_announcement_targets t
        where t.announcement_id = sa.id and t.student_id = p_student_id
      ))
    )
  order by sa.created_at desc;
$$;
grant execute on function list_parent_announcements(uuid, text) to anon;
