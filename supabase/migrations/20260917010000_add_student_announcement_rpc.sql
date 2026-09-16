-- 학생이 직접 볼 수 있는 공지사항 목록. student_announcements/targets 테이블은
-- teacher_has_broad_access() RLS만 있어 익명 학생 접속에서는 읽을 수 없으므로,
-- get_student_profile과 같은 security definer 패턴으로 노출한다.
create or replace function list_student_announcements(p_student_id uuid)
returns table(
  id uuid, title text, content text, starts_at date, ends_at date, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select sa.id, sa.title, sa.content, sa.starts_at, sa.ends_at, sa.created_at
  from student_announcements sa
  where sa.is_active
    and (sa.starts_at is null or sa.starts_at <= current_date)
    and (sa.ends_at is null or sa.ends_at >= current_date)
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
grant execute on function list_student_announcements(uuid) to anon;
