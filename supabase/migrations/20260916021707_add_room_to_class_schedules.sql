-- 같은 요일·같은 시간대에도 강의실이 다르면 여러 반이 동시에 수업할 수 있어 강의실 구분이 필요함
alter table class_schedules add column room text;
