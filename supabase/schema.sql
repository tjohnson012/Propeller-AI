-- Propeller AI Database Schema
-- Run this in Supabase SQL editor to set up the database

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────
-- Conversations
-- ────────────────────────────────────────
create table if not exists conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'New Analysis',
  product_profile jsonb, -- company name, category, products, target markets
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- RLS: users can only see their own conversations
alter table conversations enable row level security;
create policy "Users can CRUD own conversations" on conversations
  for all using (auth.uid() = user_id);

-- ────────────────────────────────────────
-- Messages
-- ────────────────────────────────────────
create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'agent', 'system')),
  agent_id text, -- 'market', 'compliance', 'outreach', 'finance'
  content text not null,
  metadata jsonb, -- artifacts, action cards, etc.
  created_at timestamptz default now() not null
);

alter table messages enable row level security;
create policy "Users can CRUD own messages" on messages
  for all using (
    conversation_id in (select id from conversations where user_id = auth.uid())
  );

-- Index for fast message retrieval
create index if not exists idx_messages_conversation on messages(conversation_id, created_at);

-- ────────────────────────────────────────
-- Screening Records (audit trail)
-- ────────────────────────────────────────
create table if not exists screenings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  conversation_id uuid references conversations(id) on delete set null,
  entity_name text not null,
  result text not null check (result in ('CLEAR', 'FLAGGED')),
  match_score integer default 0,
  lists_checked integer default 13,
  details jsonb,
  created_at timestamptz default now() not null
);

alter table screenings enable row level security;
create policy "Users can CRUD own screenings" on screenings
  for all using (auth.uid() = user_id);

-- ────────────────────────────────────────
-- Documents (generated reports, invoices)
-- ────────────────────────────────────────
create table if not exists documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  conversation_id uuid references conversations(id) on delete set null,
  type text not null, -- 'market_report', 'screening_report', 'outreach_package', 'commercial_invoice'
  title text not null,
  content text not null,
  created_at timestamptz default now() not null
);

alter table documents enable row level security;
create policy "Users can CRUD own documents" on documents
  for all using (auth.uid() = user_id);

-- ────────────────────────────────────────
-- Auto-update updated_at on conversations
-- ────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger conversations_updated_at
  before update on conversations
  for each row execute function update_updated_at();
