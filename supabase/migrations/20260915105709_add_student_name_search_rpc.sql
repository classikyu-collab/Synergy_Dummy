-- 학부모 화면: 공용 링크 하나 + 자녀 이름 검색으로 진입 (문서 결정: 절충안, PIN 없음)
create or replace function search_students_by_name(p_query text)
returns table(id uuid, name text, class_name text)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.name, c.name
  from students s
  left join classes c on c.id = s.class_id
  where s.status = '재원'
    and length(trim(p_query)) > 0
    and s.name ilike '%' || trim(p_query) || '%'
  order by s.name
  limit 20;
$$;
grant execute on function search_students_by_name(text) to anon;
