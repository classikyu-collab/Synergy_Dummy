-- 이전 마이그레이션이 PUBLIC에서만 회수하고 anon에 직접 부여된 권한은 남아있었음 (보완)
revoke execute on function list_active_announcements() from anon;
