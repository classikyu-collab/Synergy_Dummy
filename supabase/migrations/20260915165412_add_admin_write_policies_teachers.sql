-- 관리자(admin role 또는 마스터)만 직원 계정 정보를 직접 수정할 수 있도록
create or replace function teacher_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from teachers t
    where t.auth_user_id = auth.uid()
      and (t.role = 'admin' or t.is_master)
  );
$$;

grant execute on function teacher_is_admin() to authenticated;

create policy "admin_update_teachers" on teachers
  for update using (teacher_is_admin()) with check (teacher_is_admin());
