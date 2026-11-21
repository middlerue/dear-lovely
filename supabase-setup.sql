-- DEAR LOVELY ♡ — run in Supabase > SQL Editor.
-- IMPORTANT: do not replace this with a client-side password or expose secret/service_role keys.
-- This schema allows public SUBMISSION but only authorized admin REVIEW.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  nickname text not null default 'Anonymous' check (char_length(nickname) between 1 and 45),
  category text not null check (category in ('Love','Healing','Friendship','Confessions')),
  subject text not null check (char_length(subject) between 3 and 110),
  message text not null check (char_length(message) between 12 and 4500),
  reply text check (reply is null or char_length(reply) between 8 and 8000),
  status text not null default 'pending' check (status in ('pending','published')),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  constraint publication_complete check (
    (status = 'pending' and reply is null and published_at is null)
    or (status = 'published' and reply is not null and published_at is not null)
  )
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  letter_id uuid not null references public.letters(id) on delete cascade,
  nickname text not null default 'anonymous reader' check (char_length(nickname) between 1 and 40),
  message text not null check (char_length(message) between 3 and 900),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists ix_letters_published on public.letters(status,published_at desc);
create index if not exists ix_comments_letter_approved on public.comments(letter_id,approved,created_at);

-- Even knowing the admin URL, Supabase data is protected by server-side RLS.
alter table public.admin_users enable row level security;
alter table public.letters enable row level security;
alter table public.comments enable row level security;

-- Least privilege: no admin_users access for visitors.
revoke all on public.admin_users from anon, authenticated;
revoke all on public.letters from anon, authenticated;
revoke all on public.comments from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.admin_users to authenticated;
grant select, insert on public.letters to anon, authenticated;
grant update, delete on public.letters to authenticated;
grant select, insert on public.comments to anon, authenticated;
grant update, delete on public.comments to authenticated;

-- Self-lookup lets a signed-in account check only its own allowlist record.
create policy "allow admin to see own authorization"
  on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()));

-- The public only reads published letters. Admin can read ANY letter.
create policy "public read published letters"
  on public.letters for select to public
  using (status = 'published');
create policy "admin read all letters"
  on public.letters for select to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

-- Anyone can submit a PENDING letter, but cannot set a reply or publish it.
create policy "visitors submit pending letters"
  on public.letters for insert to public
  with check (status = 'pending' and reply is null and published_at is null);
create policy "admin edit letters"
  on public.letters for update to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
create policy "admin delete letters"
  on public.letters for delete to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

-- Public sees only comments that Lovely approved, and only on public letters.
create policy "public read approved comments"
  on public.comments for select to public
  using (approved = true and exists (
    select 1 from public.letters l where l.id = letter_id and l.status = 'published'
  ));
create policy "admin read every comment"
  on public.comments for select to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

-- Anyone can COMMENT on an existing published letter, but only as unapproved.
create policy "visitors submit pending comments"
  on public.comments for insert to public
  with check (approved = false and exists (
    select 1 from public.letters l where l.id = letter_id and l.status = 'published'
  ));
create policy "admin edit comments"
  on public.comments for update to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));
create policy "admin delete comments"
  on public.comments for delete to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

-- AFTER SQL RUNS:
-- 1. Supabase > Authentication > Users: create YOUR email/password user.
-- 2. Copy your user UUID from that screen.
-- 3. Run this command MANUALLY with your real UUID (do not put it in public config.js):
--    insert into public.admin_users(user_id) values ('PASTE-YOUR-AUTH-USER-UUID-HERE');
-- Nobody else can access private data unless you explicitly insert their Auth user ID here.
