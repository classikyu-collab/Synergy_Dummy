-- 공지사항 등록과 푸시 발송을 분리한다 (관리자가 원하는 시점에 "알림 발송" 버튼으로 따로 보냄).
-- 마지막 발송 시각을 남겨서 관리자 목록에서 발송 여부를 확인할 수 있게 한다.
alter table student_announcements add column last_pushed_at timestamptz;
