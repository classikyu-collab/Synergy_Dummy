-- 빠른 해석 녹음실 보관기간 자동삭제 (원본 GAS 시스템의 runRetentionCleanup 매일 새벽 3시 트리거를 재현).
-- 정책(설정 CSV 실측값과 동일): 진행중/폐기 상태는 3일, 제출완료(채점 여부 무관)는 90일 지나면 삭제.
--
-- 주의: storage.objects 행을 SQL로 직접 지우면 메타데이터는 확실히 제거되지만, 실제 파일 바이트가
-- 스토리지 사용량에서 즉시 반영되는지는 Supabase 버전에 따라 다를 수 있다. 실행 후 대시보드의
-- Storage 사용량이 줄어드는지 한 번 확인해보고, 안 줄어들면 Edge Function 기반으로 교체해야 한다.

create or replace function purge_expired_reading_data()
returns void
language plpgsql security definer set search_path = public as $$
begin
  -- 진행중/폐기: 3일 경과 (started_at 기준)
  delete from reading_attempts
  where status in ('진행중', '폐기')
    and started_at < now() - interval '3 days';

  -- 제출완료: 90일 경과 (submitted_at 기준) — 음원 파일도 함께 삭제
  delete from storage.objects
  where bucket_id = 'reading-audio'
    and name in (
      select audio_path from reading_attempts
      where status = '제출완료' and submitted_at < now() - interval '90 days' and audio_path is not null
    );

  delete from reading_attempts
  where status = '제출완료' and submitted_at < now() - interval '90 days';
end;
$$;

create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'reading-retention-cleanup',
  '0 18 * * *', -- UTC 18:00 = KST 03:00 (원본 시스템과 동일한 시각)
  $$select purge_expired_reading_data()$$
);
