-- 관리자가 대시보드에서 즉시 정리를 실행해볼 수 있는 수동 트리거 (crontab 실행을 기다리지 않고 확인용).
create or replace function admin_run_reading_retention_cleanup()
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not teacher_is_admin() then
    raise exception '관리자 권한이 없습니다.';
  end if;
  perform purge_expired_reading_data();
end;
$$;
grant execute on function admin_run_reading_retention_cleanup() to authenticated;
