delete from public.history older
using public.history newer
where older."user" = newer."user"
  and older.step = newer.step
  and older.id < newer.id;

create unique index if not exists history_user_step_unique_idx
  on public.history ("user", step);

alter table public.history enable row level security;

drop policy if exists "Anyone can update history" on public.history;

create policy "Anyone can update history"
  on public.history
  for update
  using (true)
  with check (true);
