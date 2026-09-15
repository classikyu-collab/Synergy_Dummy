-- students: 레벨(공통/발전/상위)은 '학년'과 다른 개념이므로 이름 충돌 방지 위해 rename
alter table students rename column grade_level to difficulty_tier;
alter table students alter column difficulty_tier set default '공통';
update students set difficulty_tier = '공통' where difficulty_tier is null;
alter table students
  add constraint students_difficulty_tier_check check (difficulty_tier in ('공통','발전','상위')),
  add constraint students_status_check check (status in ('재원','휴원','퇴원'));
alter table students
  add column legacy_id text unique,
  add column enrolled_at date,
  add column parent_access_token uuid;

-- classes: 반유형(정규반/내신반)은 '학년'과 다른 개념이므로 이름 충돌 방지 위해 rename
alter table classes rename column grade_level to class_type;
alter table classes alter column class_type set default '정규반';
update classes set class_type = '정규반' where class_type is null;
alter table classes
  add column legacy_id text unique,
  add column status text not null default '운영중' check (status in ('운영중','폐강'));
alter table classes add constraint classes_name_unique unique (name);

-- teachers: 이관 검증용 legacy_id, Auth 연결, 마스터 플래그, status 한글 통일
update teachers set status = '재직' where status = 'active';
alter table teachers
  add column legacy_id text unique,
  add column auth_user_id uuid unique references auth.users(id) on delete set null,
  add column is_master boolean not null default false;
alter table teachers alter column status set default '재직';
alter table teachers add constraint teachers_status_check check (status in ('재직','퇴사'));
