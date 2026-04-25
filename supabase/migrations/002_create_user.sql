create table if not exists public."user" (
  id text primary key
);

insert into public."user" (id)
values
  ('이종욱'),
  ('한민영')
on conflict (id) do nothing;

alter table public."user" enable row level security;

drop policy if exists "Anyone can read user ids" on public."user";

create policy "Anyone can read user ids"
  on public."user"
  for select
  using (true);
