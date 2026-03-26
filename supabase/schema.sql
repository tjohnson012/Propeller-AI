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

-- ────────────────────────────────────────
-- Watchlist Entities (compliance monitoring)
-- ────────────────────────────────────────
create table if not exists watchlist_entities (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  entity_name text not null,
  entity_type text not null default 'buyer' check (entity_type in ('buyer', 'supplier', 'intermediary', 'end-user')),
  country text,
  hs_codes text[],
  notes text,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  last_screened_at timestamptz,
  last_result jsonb, -- cached last screening result
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table watchlist_entities enable row level security;
create policy "Users manage own watchlist" on watchlist_entities
  for all using (auth.uid() = user_id);

create trigger watchlist_updated_at
  before update on watchlist_entities
  for each row execute function update_updated_at();

-- ────────────────────────────────────────
-- Monitoring Alerts
-- ────────────────────────────────────────
create table if not exists monitoring_alerts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  watchlist_entity_id uuid references watchlist_entities(id) on delete cascade not null,
  alert_type text not null check (alert_type in ('match_found', 'match_changed', 'match_removed', 'list_updated')),
  severity text not null check (severity in ('info', 'warning', 'critical')),
  title text not null,
  description text not null,
  matched_list text,
  matched_entry jsonb,
  status text not null default 'unread' check (status in ('unread', 'read', 'acknowledged', 'dismissed')),
  created_at timestamptz default now() not null
);

alter table monitoring_alerts enable row level security;
create policy "Users see own alerts" on monitoring_alerts
  for all using (auth.uid() = user_id);

create index if not exists idx_alerts_user_status on monitoring_alerts(user_id, status);

-- ────────────────────────────────────────
-- Monitoring Runs (audit trail)
-- ────────────────────────────────────────
create table if not exists monitoring_runs (
  id uuid primary key default uuid_generate_v4(),
  run_type text not null default 'scheduled' check (run_type in ('scheduled', 'manual')),
  started_at timestamptz default now() not null,
  completed_at timestamptz,
  entities_checked int default 0,
  alerts_generated int default 0,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  error text
);

-- ────────────────────────────────────────
-- Integration Connections (OAuth tokens)
-- ────────────────────────────────────────
create table if not exists integration_connections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  platform text not null check (platform in ('gmail', 'sheets', 'slack', 'quickbooks')),
  access_token text not null,
  refresh_token text,
  token_type text default 'Bearer',
  expires_at timestamptz,
  scopes text,
  metadata jsonb default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  last_used_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, platform)
);

alter table integration_connections enable row level security;
create policy "Users manage own connections" on integration_connections
  for all using (auth.uid() = user_id);

create trigger integration_connections_updated_at
  before update on integration_connections
  for each row execute function update_updated_at();

-- ────────────────────────────────────────
-- Trade Events Directory
-- ────────────────────────────────────────
create table if not exists trade_events (
  id uuid primary key default uuid_generate_v4(),
  external_id text unique not null, -- dedup key, e.g. 'curated-c-imts', '10times-xyz'
  name text not null,
  description text not null default '',
  start_date date not null,
  end_date date,
  location text not null default '',
  city text not null default '',
  country text not null default '',
  region text not null default '',
  industries text[] not null default '{}',
  url text not null default '',
  registration_url text,
  source text not null default '',
  cost text,
  venue text,
  organizer text,
  attendee_count text, -- display string like '100,000+'
  exhibitor_count text,
  is_featured boolean not null default false,
  is_verified boolean not null default false,
  search_vector tsvector,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Full-text search trigger
create or replace function trade_events_search_trigger()
returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.description, '') || ' ' || coalesce(array_to_string(new.industries, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.location, '') || ' ' || coalesce(new.city, '') || ' ' || coalesce(new.country, '') || ' ' || coalesce(new.region, '')), 'C');
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger trade_events_search_update
  before insert or update on trade_events
  for each row execute function trade_events_search_trigger();

-- Indexes
create index if not exists idx_trade_events_search on trade_events using gin(search_vector);
create index if not exists idx_trade_events_start_date on trade_events(start_date);
create index if not exists idx_trade_events_country on trade_events(country);
create index if not exists idx_trade_events_region on trade_events(region);
create index if not exists idx_trade_events_industries on trade_events using gin(industries);

-- RLS: SELECT open to all authenticated, mutations restricted to service_role
alter table trade_events enable row level security;
create policy "Anyone can read trade events" on trade_events
  for select using (true);

-- ────────────────────────────────────────
-- User Bookmarked Events
-- ────────────────────────────────────────
create table if not exists user_bookmarked_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  event_id uuid references trade_events(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique(user_id, event_id)
);

alter table user_bookmarked_events enable row level security;
create policy "Users manage own bookmarks" on user_bookmarked_events
  for all using (auth.uid() = user_id);

create index if not exists idx_bookmarked_events_user on user_bookmarked_events(user_id);

-- ────────────────────────────────────────
-- Filter helper function
-- ────────────────────────────────────────
create or replace function get_trade_event_filters()
returns json as $$
  select json_build_object(
    'industries', (
      select array_agg(distinct unnested order by unnested)
      from trade_events, unnest(industries) as unnested
      where start_date >= current_date
    ),
    'countries', (
      select array_agg(distinct country order by country)
      from trade_events
      where country != '' and start_date >= current_date
    ),
    'regions', (
      select array_agg(distinct region order by region)
      from trade_events
      where region != '' and start_date >= current_date
    ),
    'sources', (
      select array_agg(distinct source order by source)
      from trade_events
      where source != '' and start_date >= current_date
    )
  );
$$ language sql stable;
