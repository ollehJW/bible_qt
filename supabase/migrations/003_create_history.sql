create table if not exists public.history (
  id bigserial primary key,
  "user" text not null references public."user" (id) on update cascade on delete cascade,
  step integer not null,
  "date" text not null,
  qt text not null
);

create index if not exists history_user_step_idx
  on public.history ("user", step);

alter table public.history
  add constraint history_user_step_key unique ("user", step);

alter table public.history enable row level security;

drop policy if exists "Anyone can read history" on public.history;
drop policy if exists "Anyone can insert history" on public.history;
drop policy if exists "Anyone can update history" on public.history;

create policy "Anyone can read history"
  on public.history
  for select
  using (true);

create policy "Anyone can insert history"
  on public.history
  for insert
  with check (true);

create policy "Anyone can update history"
  on public.history
  for update
  using (true)
  with check (true);
