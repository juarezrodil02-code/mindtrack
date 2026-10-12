-- Seed data for MindTrack (safe to re-run after db reset)
-- Demo users are created via Supabase Auth; we only seed app data here.
-- In local dev, run: supabase auth create-user --email demo@mindtrack.app --password password123
-- Then update the UUIDs below to match.

-- NOTE: Replace 'DEMO_USER_ID' with the actual auth.users id after creating the user.
-- Example: '00000000-0000-0000-0000-000000000001'

do $$
declare
  v_user_id uuid;
  v_course1 uuid := gen_random_uuid();
  v_course2 uuid := gen_random_uuid();
  v_course3 uuid := gen_random_uuid();
  v_course4 uuid := gen_random_uuid();
begin
  -- Get the first user (demo user)
  select id into v_user_id from auth.users limit 1;
  if v_user_id is null then
    raise notice 'No users found. Create a user via Supabase Auth first, then run seed.';
    return;
  end if;

  -- Update profile
  update public.profiles set
    name = 'Alex Student',
    timezone = 'America/New_York',
    quiet_start = '22:00',
    quiet_end = '08:00',
    focus_minutes = 25,
    break_minutes = 5,
    long_break_minutes = 15
  where id = v_user_id;

  -- Courses
  insert into public.courses (id, user_id, name, code, color, term) values
    (v_course1, v_user_id, 'Linear Algebra', 'MATH201', '#6366f1', 'Fall 2026'),
    (v_course2, v_user_id, 'Computer Science', 'CS101', '#8b5cf6', 'Fall 2026'),
    (v_course3, v_user_id, 'Physics', 'PHYS101', '#06b6d4', 'Fall 2026'),
    (v_course4, v_user_id, 'English Literature', 'ENG301', '#10b981', 'Fall 2026')
  on conflict do nothing;

  -- Class meetings
  insert into public.class_meetings (user_id, course_id, weekday, start_time, end_time, location, remind_minutes_before) values
    (v_user_id, v_course1, 1, '09:00', '10:30', 'Room 204', 15),
    (v_user_id, v_course1, 3, '09:00', '10:30', 'Room 204', 15),
    (v_user_id, v_course2, 2, '13:00', '14:30', 'Tech Lab 1', 10),
    (v_user_id, v_course2, 4, '13:00', '14:30', 'Tech Lab 1', 10),
    (v_user_id, v_course3, 1, '11:00', '12:00', 'Science Hall B', 15),
    (v_user_id, v_course3, 3, '11:00', '12:00', 'Science Hall B', 15),
    (v_user_id, v_course4, 5, '14:00', '15:30', 'Humanities 302', null)
  on conflict do nothing;

  -- Tasks (various types, statuses, priorities)
  insert into public.tasks (user_id, course_id, title, type, priority, due_at, estimated_minutes, status) values
    (v_user_id, v_course1, 'Problem Set 3', 'assignment', 'high', now() + interval '2 days', 120, 'todo'),
    (v_user_id, v_course1, 'Midterm Exam', 'exam', 'high', now() + interval '7 days', 180, 'todo'),
    (v_user_id, v_course2, 'Binary Search Tree Project', 'project', 'high', now() + interval '14 days', 360, 'in_progress'),
    (v_user_id, v_course2, 'Quiz: Recursion', 'quiz', 'medium', now() + interval '3 days', 60, 'todo'),
    (v_user_id, v_course3, 'Lab Report: Pendulum', 'assignment', 'medium', now() + interval '5 days', 90, 'todo'),
    (v_user_id, v_course4, 'Read Chapters 4-6', 'reading', 'low', now() + interval '4 days', 60, 'todo'),
    (v_user_id, v_course4, 'Essay Outline', 'assignment', 'medium', now() - interval '1 day', 45, 'todo'),
    (v_user_id, v_course1, 'Completed Homework 2', 'assignment', 'low', now() - interval '5 days', 60, 'done'),
    (v_user_id, null, 'Study for finals', 'study', 'high', now() + interval '21 days', 240, 'todo')
  on conflict do nothing;

  -- Mark the done task with completed_at
  update public.tasks set completed_at = now() - interval '5 days'
  where user_id = v_user_id and title = 'Completed Homework 2' and completed_at is null;

  raise notice 'Seed data inserted for user %', v_user_id;
end; $$;
