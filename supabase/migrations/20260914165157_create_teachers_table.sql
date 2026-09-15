create table teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique,
  role text not null check (role in ('coach', 'homeroom_teacher', 'admin')),
  status text default 'active',
  created_at timestamptz default now()
);
