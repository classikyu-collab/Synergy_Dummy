-- 공지사항의 노출 대상(전체/반/개별)과는 별개로, 학생 화면/학부모 화면 중 어디에 노출할지
-- 따로 지정할 수 있게 한다. 기본값은 둘 다 노출(true, true) — 기존 공지사항과 동일하게 동작.
alter table student_announcements
  add column notify_student boolean not null default true,
  add column notify_parent boolean not null default true;

create or replace function list_student_announcements(p_student_id uuid)
returns table(
  id uuid, title text, content text, starts_at date, ends_at date, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select sa.id, sa.title, sa.content, sa.starts_at, sa.ends_at, sa.created_at
  from student_announcements sa
  where sa.is_active
    and sa.notify_student
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

create or replace function list_parent_announcements(p_student_id uuid, p_pin text)
returns table(
  id uuid, title text, content text, starts_at date, ends_at date, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select sa.id, sa.title, sa.content, sa.starts_at, sa.ends_at, sa.created_at
  from student_announcements sa
  where sa.is_active
    and sa.notify_parent
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
