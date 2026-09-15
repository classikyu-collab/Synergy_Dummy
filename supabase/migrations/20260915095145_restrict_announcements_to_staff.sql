-- 공지사항(announcements)은 관리자/학원장이 강사에게 보내는 내부 공지이며,
-- 학생/학부모 화면에는 노출되어서는 안 된다. anon(비로그인 학생/학부모) 접근을 막고
-- 로그인한 직원(authenticated)만 호출 가능하도록 좁힌다.
revoke execute on function list_active_announcements() from public;
revoke execute on function list_active_announcements() from anon;
grant execute on function list_active_announcements() to authenticated;
