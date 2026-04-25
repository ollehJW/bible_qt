create table if not exists public.history_like (
  "user" text not null references public."user" (id) on update cascade on delete cascade,
  target_user text not null references public."user" (id) on update cascade on delete cascade,
  step integer not null,
  created_at timestamp with time zone not null default now(),
  primary key ("user", target_user, step)
);

alter table public.history_like enable row level security;

drop policy if exists "Anyone can read history likes" on public.history_like;
drop policy if exists "Anyone can insert history likes" on public.history_like;
drop policy if exists "Anyone can delete history likes" on public.history_like;

create policy "Anyone can read history likes"
  on public.history_like
  for select
  using (true);

create policy "Anyone can insert history likes"
  on public.history_like
  for insert
  with check (true);

create policy "Anyone can delete history likes"
  on public.history_like
  for delete
  using (true);
