-- TeachBoard schema (Supabase Postgres)
-- Apply in Supabase SQL editor.
-- Note: this app uses custom username/password auth (no Supabase Auth).

create extension if not exists pgcrypto;

-- Enums
do $$ begin
  create type public.user_role as enum ('teacher','student');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.summary_status as enum ('draft','submitted','reviewed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.assessment_framework as enum ('frameworkA','frameworkB');
exception when duplicate_object then null; end $$;

-- Users (accounts)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  role public.user_role not null default 'student',
  created_at timestamptz not null default now()
);

-- Sessions (cookie-based)
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  active_student_id uuid null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_id_idx on public.sessions(user_id);
create index if not exists sessions_expires_at_idx on public.sessions(expires_at);

-- Classes (start with one class, supports more later)
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists classes_created_by_idx on public.classes(created_by_user_id);

-- Students (roster entries)
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  display_name text not null,
  pin_hash text not null,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (class_id, display_name)
);

create index if not exists students_class_id_idx on public.students(class_id);
create index if not exists students_archived_idx on public.students(archived);

-- Reading sessions
create table if not exists public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  date date not null,
  minutes integer null,
  pages integer null,
  text_title text not null,
  notes_key_ideas text null,
  vocab text null,
  created_at timestamptz not null default now(),
  constraint reading_sessions_minutes_or_pages_chk check (
    (minutes is null or minutes >= 0) and (pages is null or pages >= 0)
  )
);

create index if not exists reading_sessions_student_id_idx on public.reading_sessions(student_id);
create index if not exists reading_sessions_date_idx on public.reading_sessions(date);

-- Summaries
create table if not exists public.summaries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  reading_session_id uuid null references public.reading_sessions(id) on delete set null,
  date date not null,
  status public.summary_status not null default 'draft',
  content text null,         -- written in-app
  external_text text null,   -- paste from elsewhere (or teacher paste)
  word_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists summaries_student_id_idx on public.summaries(student_id);
create index if not exists summaries_status_idx on public.summaries(status);
create index if not exists summaries_date_idx on public.summaries(date);

-- Assessments (teacher review)
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  summary_id uuid not null references public.summaries(id) on delete cascade,
  assessed_by_user_id uuid not null references public.users(id) on delete restrict,
  framework public.assessment_framework not null,
  scores_json jsonb not null default '{}'::jsonb,
  teacher_notes text null,
  created_at timestamptz not null default now(),
  unique (summary_id, framework)
);

create index if not exists assessments_summary_id_idx on public.assessments(summary_id);
create index if not exists assessments_assessed_by_idx on public.assessments(assessed_by_user_id);

-- Optional: board snapshots (class-level)
create table if not exists public.board_snapshots (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null,
  nodes_json jsonb not null default '[]'::jsonb,
  edges_json jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists board_snapshots_class_id_idx on public.board_snapshots(class_id);

-- Basic RLS (defense in depth). We will mainly enforce via server route handlers.
alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.reading_sessions enable row level security;
alter table public.summaries enable row level security;
alter table public.assessments enable row level security;
alter table public.board_snapshots enable row level security;

-- No permissive policies by default. Access is via server using service role.

