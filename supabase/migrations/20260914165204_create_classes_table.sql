create table classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grade_level text,
  homeroom_teacher_id uuid references teachers(id),
  created_at timestamptz default now()
);
