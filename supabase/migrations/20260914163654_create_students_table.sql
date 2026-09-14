create table students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  class_name text,
  grade_level text,       -- 예: '중1', '고3' 등
  status text default '재원',  -- 재원 / 휴원 / 퇴원
  created_at timestamptz default now()
);
