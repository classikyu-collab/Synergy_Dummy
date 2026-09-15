-- 시간표: 요일 + 적용기간
create table class_schedules (
  id           uuid primary key default gen_random_uuid(),
  legacy_id    text unique,
  class_id     uuid not null references classes(id) on delete cascade,
  day_of_week  smallint not null check (day_of_week between 0 and 6), -- 0=일
  start_time   time not null,
  end_time     time not null,
  valid_from   date,
  valid_to     date,
  created_at   timestamptz not null default now()
);
create index on class_schedules (class_id, day_of_week);

-- 상태값 정의: 코드 수정 없이 행 추가로 선택지 확장
create table status_options (
  id           uuid primary key default gen_random_uuid(),
  item_type    text not null check (item_type in ('숙제','시험')),
  round        smallint not null check (round in (1,2)),
  label        text not null,
  is_done      boolean not null default false,
  sort_order   int,
  is_active    boolean not null default true,
  unique (item_type, round, label)
);

-- 코칭 항목: 학생 수만큼 복제하지 않고 1행 + target_mode로 대상 결정
create table coaching_items (
  id              uuid primary key default gen_random_uuid(),
  legacy_id       text unique,
  legacy_group_id text,
  class_id        uuid not null references classes(id) on delete cascade,
  date            date not null,
  item_type       text not null check (item_type in ('숙제','시험')),
  name            text not null,
  page            text,
  target_mode     text not null default 'tier' check (target_mode in ('tier', 'explicit')),
  min_difficulty_tier text,
  priority        int,
  display_order   int,
  source          text,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now()
);
create index on coaching_items (class_id, date) where deleted_at is null;

-- target_mode='explicit'일 때만 사용하는 명시적 대상 학생 조인 테이블
create table coaching_item_targets (
  item_id    uuid not null references coaching_items(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  primary key (item_id, student_id)
);

-- 코칭 기록(체크 결과)
create table coaching_records (
  id                     uuid primary key default gen_random_uuid(),
  legacy_id              text unique,
  student_id             uuid not null references students(id) on delete cascade,
  item_id                uuid not null references coaching_items(id) on delete cascade,
  round                  smallint not null check (round in (1,2)),
  status_label           text not null,
  is_done                boolean not null default false,
  recorded_by_teacher_id uuid references teachers(id),
  recorded_by_system     text,
  recorded_at            timestamptz not null default now(),
  memo                   text,
  unique (student_id, item_id, round)
);
create index on coaching_records (student_id, recorded_at desc);

-- 보강 예정
create table makeup_exclusions (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  date       date not null,
  created_at timestamptz not null default now(),
  unique (student_id, date)
);

-- 공지사항
create table announcements (
  id         uuid primary key default gen_random_uuid(),
  content    text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- 좌석구조설정 (강의실배치표/코칭계획은 미사용이라 이관 제외)
create table room_blocks (
  id         uuid primary key default gen_random_uuid(),
  room_name  text not null,
  block_name text not null,
  col_count  int,
  row_count  int,
  seat_count int,
  created_at timestamptz not null default now()
);

-- 신규 테이블도 기존과 동일하게 기본 RLS(로그인 사용자 전체 조회) 적용
alter table class_schedules enable row level security;
alter table status_options enable row level security;
alter table coaching_items enable row level security;
alter table coaching_item_targets enable row level security;
alter table coaching_records enable row level security;
alter table makeup_exclusions enable row level security;
alter table announcements enable row level security;
alter table room_blocks enable row level security;

create policy "authenticated_read_class_schedules" on class_schedules for select using (auth.role() = 'authenticated');
create policy "authenticated_read_status_options" on status_options for select using (auth.role() = 'authenticated');
create policy "authenticated_read_coaching_items" on coaching_items for select using (auth.role() = 'authenticated');
create policy "authenticated_read_coaching_item_targets" on coaching_item_targets for select using (auth.role() = 'authenticated');
create policy "authenticated_read_coaching_records" on coaching_records for select using (auth.role() = 'authenticated');
create policy "authenticated_read_makeup_exclusions" on makeup_exclusions for select using (auth.role() = 'authenticated');
create policy "authenticated_read_announcements" on announcements for select using (auth.role() = 'authenticated');
create policy "authenticated_read_room_blocks" on room_blocks for select using (auth.role() = 'authenticated');
