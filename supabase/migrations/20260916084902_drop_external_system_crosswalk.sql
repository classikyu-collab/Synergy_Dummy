-- 통합 방향 전환: 외부 시스템(온라인_OMR/내신시험지/빠른해석녹음실)을 "연결"하는 게 아니라
-- 시냅스 안에 네이티브 기능으로 다시 만들어 흡수하고, 기존 GAS 시스템은 완성 후 폐기하기로 결정.
-- 학생 테이블이 하나뿐이 되므로 외부 ID를 연결할 크로스워크 자체가 필요 없어진다.
drop table if exists student_external_ids;
drop table if exists external_students;
