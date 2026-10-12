-- ============================================================
-- Migration: 20241012000000_initial_schema
-- MindTrack complete schema with enums, tables, RLS, indexes,
-- triggers, and RPCs (all in one for speed).
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────
do $$ begin
  create extension if not exists "pg_cron" with schema extensions;
exception when others then null; end $$;
do $$ begin
  create extension if not exists "pg_net" with schema extensions;
exception when others then null; end $$;

-- ─── Shared updated_at trigger ───────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ─── Enums ───────────────────────────────────────────────────────────────────
do $$ begin
  create type public.task_type as enum ('assignment','exam','quiz','reading','project','study');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.task_priority as enum ('low','medium','high');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.task_status as enum ('todo','in_progress','done');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.reminder_status as enum ('pending','sent','dismissed','cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.reminder_source as enum ('rule','custom','class');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.focus_status as enum ('running','completed','abandoned');
exception when duplicate_object then null; end $$;

-- ─── profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  name                  text,
  timezone              text not null default 'Asia/Manila',
  quiet_start           time,
  quiet_end             time,
  focus_minutes         int not null default 25 check (focus_minutes between 1 and 120),
  break_minutes         int not null default 5  check (break_minutes  between 1 and 60),
  long_break_minutes    int not null default 15 check (long_break_minutes between 1 and 120),
  notify_push           bool not null default false,
  default_reminder_rules jsonb not null default '{
    "exam":       [10080,4320,1440,120],
    "quiz":       [1440,120],
    "assignment": [2880,180],
    "project":    [10080,2880,180],
    "reading":    [720],
    "study":      [30]
  }'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint quiet_both_or_neither check (
    (quiet_start is null) = (quiet_end is null)
  )
);
alter table public.profiles enable row level security;
create policy "own profile: select" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "own profile: insert" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "own profile: update" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, timezone)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    coalesce(new.raw_user_meta_data->>'timezone', 'Asia/Manila')
  )
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── courses ─────────────────────────────────────────────────────────────────
create table if not exists public.courses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 100),
  code        text check (char_length(code) <= 20),
  color       text not null default '#6366f1' check (color ~ '^#[0-9a-fA-F]{6}$'),
  term        text check (char_length(term) <= 50),
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists courses_unique_name_term
  on public.courses (user_id, lower(name), term) where archived_at is null;
alter table public.courses enable row level security;
create policy "own courses: select" on public.courses for select to authenticated using ((select auth.uid()) = user_id);
create policy "own courses: insert" on public.courses for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own courses: update" on public.courses for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own courses: delete" on public.courses for delete to authenticated using ((select auth.uid()) = user_id);
create trigger courses_updated_at before update on public.courses for each row execute function public.set_updated_at();

-- ─── class_meetings ──────────────────────────────────────────────────────────
create table if not exists public.class_meetings (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_id             uuid not null references public.courses(id) on delete cascade,
  weekday               int not null check (weekday between 0 and 6),
  start_time            time not null,
  end_time              time not null,
  location              text check (char_length(location) <= 200),
  remind_minutes_before int check (remind_minutes_before between 1 and 1440),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint class_meeting_times_valid check (end_time > start_time)
);
create index if not exists class_meetings_user_weekday on public.class_meetings (user_id, weekday);
alter table public.class_meetings enable row level security;
create policy "own meetings: select" on public.class_meetings for select to authenticated using ((select auth.uid()) = user_id);
create policy "own meetings: insert" on public.class_meetings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own meetings: update" on public.class_meetings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own meetings: delete" on public.class_meetings for delete to authenticated using ((select auth.uid()) = user_id);
create trigger class_meetings_updated_at before update on public.class_meetings for each row execute function public.set_updated_at();

-- ─── tasks ───────────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_id         uuid references public.courses(id) on delete set null,
  title             text not null check (char_length(title) between 1 and 200),
  notes             text check (char_length(notes) <= 5000),
  type              public.task_type not null default 'assignment',
  priority          public.task_priority not null default 'medium',
  due_at            timestamptz,
  estimated_minutes int check (estimated_minutes > 0),
  status            public.task_status not null default 'todo',
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint task_done_requires_completed_at check (
    (status = 'done') = (completed_at is not null)
  )
);
create index if not exists tasks_user_status_due on public.tasks (user_id, status, due_at);
create index if not exists tasks_user_course on public.tasks (user_id, course_id);
alter table public.tasks enable row level security;
create policy "own tasks: select" on public.tasks for select to authenticated using ((select auth.uid()) = user_id);
create policy "own tasks: insert" on public.tasks for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own tasks: update" on public.tasks for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own tasks: delete" on public.tasks for delete to authenticated using ((select auth.uid()) = user_id);
create trigger tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();

-- ─── reminders ───────────────────────────────────────────────────────────────
create table if not exists public.reminders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id          uuid references public.tasks(id) on delete cascade,
  class_meeting_id uuid references public.class_meetings(id) on delete cascade,
  remind_at        timestamptz not null,
  source           public.reminder_source not null default 'rule',
  status           public.reminder_status not null default 'pending',
  snoozed_until    timestamptz,
  sent_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint reminder_one_owner check (
    (task_id is null) != (class_meeting_id is null)
    or (task_id is not null and class_meeting_id is null)
    or (task_id is null and class_meeting_id is not null)
  )
);
alter table public.reminders add constraint reminders_task_remind_source_key unique (task_id, remind_at, source);
create unique index if not exists reminders_task_unique on public.reminders (task_id, remind_at, source) where task_id is not null;
create unique index if not exists reminders_class_unique on public.reminders (class_meeting_id, remind_at) where class_meeting_id is not null;
create index if not exists reminders_pending_hot on public.reminders (status, remind_at) where status = 'pending';
create index if not exists reminders_user_status on public.reminders (user_id, status);
alter table public.reminders enable row level security;
create policy "own reminders: select" on public.reminders for select to authenticated using ((select auth.uid()) = user_id);
create policy "own reminders: insert custom" on public.reminders for insert to authenticated
  with check ((select auth.uid()) = user_id and source = 'custom');
create policy "own reminders: update" on public.reminders for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create trigger reminders_updated_at before update on public.reminders for each row execute function public.set_updated_at();

-- ─── notifications ───────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  reminder_id uuid not null unique references public.reminders(id) on delete cascade,
  title       text not null,
  body        text not null,
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);
create index if not exists notifications_user_unread on public.notifications (user_id, read_at, created_at desc);
alter table public.notifications enable row level security;
create policy "own notifications: select" on public.notifications for select to authenticated using ((select auth.uid()) = user_id);
create policy "own notifications: update" on public.notifications for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- inserts from service_role (dispatcher) only; no client insert policy

-- ─── push_subscriptions ──────────────────────────────────────────────────────
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "own push: select" on public.push_subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy "own push: insert" on public.push_subscriptions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own push: delete" on public.push_subscriptions for delete to authenticated using ((select auth.uid()) = user_id);

-- ─── focus_sessions ──────────────────────────────────────────────────────────
create table if not exists public.focus_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id         uuid references public.tasks(id) on delete set null,
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  planned_minutes int not null check (planned_minutes between 1 and 180),
  actual_minutes  int,
  status          public.focus_status not null default 'running',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint focus_session_ended_valid check (
    ended_at is null or ended_at >= started_at
  )
);
create unique index if not exists focus_sessions_one_running
  on public.focus_sessions (user_id) where status = 'running';
create index if not exists focus_sessions_user_started on public.focus_sessions (user_id, started_at desc);
alter table public.focus_sessions enable row level security;
create policy "own focus: select" on public.focus_sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy "own focus: insert" on public.focus_sessions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own focus: update" on public.focus_sessions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create trigger focus_sessions_updated_at before update on public.focus_sessions for each row execute function public.set_updated_at();

-- ─── RPCs ────────────────────────────────────────────────────────────────────

-- complete_task
create or replace function public.complete_task(task_id uuid)
returns public.tasks language plpgsql security invoker as $$
declare v_task public.tasks;
begin
  update public.tasks set status = 'done', completed_at = now()
  where id = task_id and user_id = (select auth.uid()) and status <> 'done'
  returning * into v_task;
  if not found then raise exception 'task_not_found' using errcode = 'P0001'; end if;
  update public.reminders set status = 'cancelled'
  where task_id = task_id and status = 'pending' and user_id = (select auth.uid());
  return v_task;
end; $$;

-- snooze_reminder
create or replace function public.snooze_reminder(reminder_id uuid, minutes int)
returns public.reminders language plpgsql security invoker as $$
declare v_r public.reminders;
begin
  if minutes not in (10, 60, 480) then
    raise exception 'invalid_snooze' using errcode = 'P0002';
  end if;
  update public.reminders
    set status = 'pending', snoozed_until = now() + (minutes || ' minutes')::interval, updated_at = now()
  where id = reminder_id and user_id = (select auth.uid())
  returning * into v_r;
  if not found then raise exception 'reminder_not_found' using errcode = 'P0003'; end if;
  return v_r;
end; $$;

-- dismiss_reminder
create or replace function public.dismiss_reminder(reminder_id uuid)
returns public.reminders language plpgsql security invoker as $$
declare v_r public.reminders;
begin
  update public.reminders set status = 'dismissed', updated_at = now()
  where id = reminder_id and user_id = (select auth.uid())
  returning * into v_r;
  if not found then raise exception 'reminder_not_found' using errcode = 'P0003'; end if;
  return v_r;
end; $$;

-- start_focus
create or replace function public.start_focus(task_id uuid default null, planned_minutes int default 25)
returns public.focus_sessions language plpgsql security invoker as $$
declare v_s public.focus_sessions;
begin
  -- Enforce one running session
  if exists (select 1 from public.focus_sessions where user_id = (select auth.uid()) and status = 'running') then
    raise exception 'focus_already_running' using errcode = 'P0004';
  end if;
  insert into public.focus_sessions (user_id, task_id, planned_minutes, status)
  values ((select auth.uid()), task_id, planned_minutes, 'running')
  returning * into v_s;
  -- Set task in_progress
  if task_id is not null then
    update public.tasks set status = 'in_progress'
    where id = task_id and user_id = (select auth.uid()) and status = 'todo';
  end if;
  return v_s;
end; $$;

-- finish_focus
create or replace function public.finish_focus(session_id uuid, status public.focus_status)
returns public.focus_sessions language plpgsql security invoker as $$
declare v_s public.focus_sessions; v_actual int;
begin
  select * into v_s from public.focus_sessions
  where id = session_id and user_id = (select auth.uid()) and focus_sessions.status = 'running';
  if not found then raise exception 'session_not_found' using errcode = 'P0005'; end if;
  v_actual := least(
    extract(epoch from (now() - v_s.started_at)) / 60,
    v_s.planned_minutes + 5
  );
  update public.focus_sessions
    set status = finish_focus.status, ended_at = now(), actual_minutes = greatest(0, v_actual), updated_at = now()
  where id = session_id
  returning * into v_s;
  return v_s;
end; $$;

-- get_dashboard_summary
create or replace function public.get_dashboard_summary()
returns json language plpgsql security invoker as $$
declare
  v_tz text; v_now date; v_week_start date;
  v_tasks_done int; v_focus_min int; v_streak int; v_deadlines json;
begin
  select timezone into v_tz from public.profiles where id = (select auth.uid());
  v_tz := coalesce(v_tz, 'UTC');
  v_now := (now() at time zone v_tz)::date;
  v_week_start := v_now - extract(dow from v_now)::int;

  -- Tasks completed this week
  select count(*) into v_tasks_done from public.tasks
  where user_id = (select auth.uid()) and status = 'done'
    and (completed_at at time zone v_tz)::date >= v_week_start;

  -- Focus minutes this week
  select coalesce(sum(actual_minutes), 0) into v_focus_min from public.focus_sessions
  where user_id = (select auth.uid()) and status = 'completed'
    and (ended_at at time zone v_tz)::date >= v_week_start;

  -- Streak: consecutive local days with activity
  with activity_days as (
    select (completed_at at time zone v_tz)::date as day from public.tasks
    where user_id = (select auth.uid()) and status = 'done' and completed_at is not null
    union
    select (ended_at at time zone v_tz)::date from public.focus_sessions
    where user_id = (select auth.uid()) and status = 'completed' and ended_at is not null
  ),
  distinct_days as (select distinct day from activity_days order by day desc),
  numbered as (
    select day, row_number() over (order by day desc) as rn from distinct_days
  ),
  streak_calc as (
    select day, rn, (v_now - day::date) as offset from numbered
    where (v_now - day::date) = rn - 1
  )
  select count(*) into v_streak from streak_calc;

  -- Next deadlines
  select json_agg(row_to_json(t)) into v_deadlines from (
    select id, title, due_at, type, priority,
      (select name from public.courses where id = tasks.course_id) as course_name
    from public.tasks
    where user_id = (select auth.uid()) and status <> 'done' and due_at is not null
    order by due_at asc limit 5
  ) t;

  return json_build_object(
    'tasks_completed_this_week', v_tasks_done,
    'focus_minutes_this_week', v_focus_min,
    'current_streak', v_streak,
    'next_deadlines', coalesce(v_deadlines, '[]'::json)
  );
end; $$;

-- claim_due_reminders (service role only)
create or replace function public.claim_due_reminders(batch_size int default 50)
returns setof public.reminders language plpgsql security definer set search_path = ''
as $$
begin
  return query
    update public.reminders r set status = 'sent', sent_at = now()
    where r.id in (
      select id from public.reminders
      where status = 'pending'
        and remind_at <= now()
        and (snoozed_until is null or snoozed_until <= now())
      order by remind_at
      limit batch_size
      for update skip locked
    )
    returning r.*;
end; $$;
revoke execute on function public.claim_due_reminders from public, anon, authenticated;

-- ─── Reminder generation trigger ─────────────────────────────────────────────
create or replace function public.generate_task_reminders()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles;
  v_rules jsonb; v_offsets jsonb; v_offset int;
  v_remind_at timestamptz; v_qs time; v_qe time;
  v_quiet_end_ts timestamptz;
begin
  -- Cancel reminders for done/no-due tasks
  if new.status = 'done' or new.due_at is null then
    update public.reminders set status = 'cancelled'
    where task_id = new.id and status = 'pending' and source = 'rule';
    return new;
  end if;

  select * into v_profile from public.profiles where id = new.user_id;
  v_rules := coalesce(v_profile.default_reminder_rules, '{}'::jsonb);
  v_offsets := coalesce(v_rules->new.type::text,
    case new.type::text
      when 'exam'       then '[10080,4320,1440,120]'::jsonb
      when 'quiz'       then '[1440,120]'::jsonb
      when 'assignment' then '[2880,180]'::jsonb
      when 'project'    then '[10080,2880,180]'::jsonb
      when 'reading'    then '[720]'::jsonb
      else '[30]'::jsonb
    end);
  v_qs := v_profile.quiet_start;
  v_qe := v_profile.quiet_end;

  -- Remove stale rule reminders that no longer match
  delete from public.reminders
  where task_id = new.id and source = 'rule' and status = 'pending'
    and remind_at not in (
      select new.due_at - ((elem::text)::int || ' minutes')::interval
      from jsonb_array_elements(v_offsets) elem
    );

  -- Insert/upsert new rule reminders
  for v_offset in select elem::text::int from jsonb_array_elements(v_offsets) elem loop
    v_remind_at := new.due_at - (v_offset || ' minutes')::interval;

    -- Skip past times unless it's a fresh insert with no future reminders
    if v_remind_at <= now() then
      if tg_op = 'INSERT' then
        v_remind_at := now() + interval '1 minute';
      else
        continue;
      end if;
    end if;

    -- Shift out of quiet hours (handles overnight windows)
    if v_qs is not null and v_qe is not null then
      declare
        local_ts timestamptz := v_remind_at at time zone coalesce(v_profile.timezone, 'UTC');
        local_mins int := extract(hour from local_ts)::int * 60 + extract(minute from local_ts)::int;
        qs_mins int := extract(hour from v_qs)::int * 60 + extract(minute from v_qs)::int;
        qe_mins int := extract(hour from v_qe)::int * 60 + extract(minute from v_qe)::int;
        in_quiet bool;
      begin
        in_quiet := case
          when qs_mins <= qe_mins then local_mins >= qs_mins and local_mins < qe_mins
          else local_mins >= qs_mins or local_mins < qe_mins
        end;
        if in_quiet then
          v_remind_at := (date_trunc('day', local_ts) + v_qe) at time zone coalesce(v_profile.timezone, 'UTC');
          if v_remind_at <= now() then v_remind_at := v_remind_at + interval '1 day'; end if;
        end if;
      end;
    end if;

    insert into public.reminders (user_id, task_id, remind_at, source, status)
    values (new.user_id, new.id, v_remind_at, 'rule', 'pending')
    on conflict (task_id, remind_at, source)
    do update set status = 'pending', updated_at = now()
    where public.reminders.status not in ('dismissed', 'sent');
  end loop;

  return new;
end; $$;

drop trigger if exists task_reminders_generate on public.tasks;
create trigger task_reminders_generate
  after insert or update of due_at, type, status on public.tasks
  for each row execute function public.generate_task_reminders();

-- ─── Sync due notifications for active user ─────────────────────────────────
create or replace function public.sync_due_notifications()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_profile record;
  v_tz text := 'Asia/Manila';
  v_created_count int := 0;
  r record;
  t_task record;
  t_meeting record;
  t_due record;
  v_reminder_id uuid;
  v_title text;
  v_body text;
  v_due_formatted text;
begin
  if v_uid is null then
    return jsonb_build_object('status', 'no_user', 'synced', 0);
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if found and v_profile.timezone is not null and v_profile.timezone <> '' then
    v_tz := v_profile.timezone;
  end if;

  -- A) Claim and convert any pending reminders that have arrived
  for r in
    update public.reminders rem
    set status = 'sent', sent_at = now()
    where rem.user_id = v_uid
      and rem.status = 'pending'
      and rem.remind_at <= now()
      and (rem.snoozed_until is null or rem.snoozed_until <= now())
    returning rem.*
  loop
    v_title := 'Reminder';
    v_body := 'You have a reminder';

    if r.task_id is not null then
      select tsk.id, tsk.title, tsk.type, tsk.due_at, c.name as course_name
      into t_task
      from public.tasks tsk
      left join public.courses c on c.id = tsk.course_id
      where tsk.id = r.task_id;

      if found and t_task.due_at is not null then
        v_due_formatted := to_char(t_task.due_at at time zone v_tz, 'Mon DD, YYYY "at" HH12:MI AM');
        if t_task.due_at < now() then
          v_title := '🚨 Overdue: ' || t_task.title;
          v_body := initcap(t_task.type::text) || ' was due on ' || v_due_formatted || coalesce(' · ' || t_task.course_name, '');
        else
          v_title := '⏰ Reminder: ' || t_task.title;
          v_body := initcap(t_task.type::text) || ' is due ' || v_due_formatted || coalesce(' · ' || t_task.course_name, '');
        end if;
      end if;
    elsif r.class_meeting_id is not null then
      select cm.id, cm.start_time, c.name as course_name
      into t_meeting
      from public.class_meetings cm
      left join public.courses c on c.id = cm.course_id
      where cm.id = r.class_meeting_id;

      if found then
        v_title := '🎓 Class starting soon';
        v_body := coalesce(t_meeting.course_name, 'Class') || ' at ' || to_char(t_meeting.start_time, 'HH12:MI AM');
      end if;
    end if;

    insert into public.notifications (user_id, reminder_id, title, body)
    values (v_uid, r.id, v_title, v_body)
    on conflict (reminder_id) do update set title = excluded.title, body = excluded.body
    where public.notifications.read_at is null;

    v_created_count := v_created_count + 1;
  end loop;

  -- B) For any active task that is OVERDUE or DUE SOON (within 24h) and has no notification yet:
  for t_due in
    select task.id, task.title, task.type, task.due_at, c.name as course_name
    from public.tasks task
    left join public.courses c on c.id = task.course_id
    where task.user_id = v_uid
      and task.status <> 'done'
      and task.due_at is not null
      and task.due_at <= (now() + interval '24 hours')
    order by task.due_at asc
  loop
    select id into v_reminder_id
    from public.reminders
    where task_id = t_due.id and user_id = v_uid
    order by remind_at desc
    limit 1;

    if v_reminder_id is null then
      insert into public.reminders (user_id, task_id, remind_at, source, status, sent_at)
      values (v_uid, t_due.id, now(), 'rule', 'sent', now())
      returning id into v_reminder_id;
    end if;

    v_due_formatted := to_char(t_due.due_at at time zone v_tz, 'Mon DD, YYYY "at" HH12:MI AM');

    if t_due.due_at < now() then
      v_title := '🚨 Overdue: ' || t_due.title;
      v_body := initcap(t_due.type::text) || ' was due on ' || v_due_formatted || coalesce(' · ' || t_due.course_name, '') || '. Please complete or reschedule.';
    else
      v_title := '⏰ Due Today: ' || t_due.title;
      v_body := initcap(t_due.type::text) || ' is due today at ' || to_char(t_due.due_at at time zone v_tz, 'HH12:MI AM') || coalesce(' · ' || t_due.course_name, '') || '.';
    end if;

    insert into public.notifications (user_id, reminder_id, title, body)
    values (v_uid, v_reminder_id, v_title, v_body)
    on conflict (reminder_id) do update
      set title = excluded.title, body = excluded.body
      where public.notifications.read_at is null;

    v_created_count := v_created_count + 1;
  end loop;

  -- C) Mark notifications as read if their associated task is done
  update public.notifications n
  set read_at = now()
  from public.reminders rm
  join public.tasks tsk on tsk.id = rm.task_id
  where n.reminder_id = rm.id
    and n.user_id = v_uid
    and n.read_at is null
    and tsk.status = 'done';

  return jsonb_build_object('status', 'ok', 'synced', v_created_count, 'timezone', v_tz);
end; $$;

grant execute on function public.sync_due_notifications() to authenticated;

