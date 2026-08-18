-- ValetFlow production service-proof schema.
-- Apply with Supabase migrations after reviewing with your database owner.
-- This migration intentionally does not create public/demo credentials.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id),
  full_name text not null,
  role text not null check (role in ('owner','admin','supervisor','porter','client')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  name text not null,
  address text,
  region_id text,
  total_units integer not null default 0 check (total_units >= 0),
  timezone text not null default 'America/New_York',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  profile_id uuid references public.profiles(id),
  name text not null,
  status text not null default 'active' check (status in ('active','inactive','suspended')),
  created_at timestamptz not null default now()
);

create table if not exists public.service_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  property_id uuid not null references public.properties(id),
  driver_id uuid references public.drivers(id),
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','started','arrived','in_progress','completed','late','missed','cancelled')),
  started_at timestamptz,
  arrived_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scheduled_end > scheduled_start)
);

create table if not exists public.service_events (
  id uuid primary key default gen_random_uuid(),
  client_event_id text not null unique,
  organization_id uuid not null references public.organizations(id),
  service_run_id uuid not null references public.service_runs(id),
  property_id uuid not null references public.properties(id),
  actor_id uuid not null references auth.users(id),
  event_type text not null check (event_type in ('shift_started','property_arrived','building_started','pickup_completed','pickup_exception','building_completed','shift_completed','reviewed','corrected')),
  building_ref text,
  unit_ref text,
  occurred_at timestamptz not null,
  location_status text check (location_status in ('captured','unavailable','denied','simulated')),
  location_accuracy_meters numeric check (location_accuracy_meters is null or location_accuracy_meters >= 0),
  evidence_status text not null default 'not_required' check (evidence_status in ('not_required','pending','attached','reviewed','rejected','simulated')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  service_event_id uuid not null references public.service_events(id),
  storage_path text not null,
  sha256 text not null,
  captured_at timestamptz not null,
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected','deleted')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  service_run_id uuid references public.service_runs(id),
  service_event_id uuid references public.service_events(id),
  property_id uuid not null references public.properties(id),
  reported_by uuid not null references auth.users(id),
  exception_type text not null,
  severity text not null default 'warning' check (severity in ('info','warning','critical')),
  description text not null,
  status text not null default 'open' check (status in ('open','in_progress','resolved','disputed')),
  resolution text,
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists service_runs_org_schedule_idx on public.service_runs (organization_id, scheduled_start);
create index if not exists service_events_run_time_idx on public.service_events (service_run_id, occurred_at);
create index if not exists exceptions_org_status_idx on public.exceptions (organization_id, status, created_at desc);
create index if not exists audit_log_entity_idx on public.audit_log (organization_id, entity_type, entity_id, created_at desc);

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and organization_id = target_org and active = true
  );
$$;

create or replace function public.is_org_role(target_org uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and organization_id = target_org and active = true and role = any(allowed_roles)
  );
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.drivers enable row level security;
alter table public.service_runs enable row level security;
alter table public.service_events enable row level security;
alter table public.evidence enable row level security;
alter table public.exceptions enable row level security;
alter table public.audit_log enable row level security;

create policy "members can view their organization" on public.organizations for select using (public.is_org_member(id));
create policy "members can view profiles in their organization" on public.profiles for select using (public.is_org_member(organization_id));
create policy "members can view properties" on public.properties for select using (public.is_org_member(organization_id));
create policy "members can view drivers" on public.drivers for select using (public.is_org_member(organization_id));
create policy "members can view service runs" on public.service_runs for select using (public.is_org_member(organization_id));
create policy "members can create service runs" on public.service_runs for insert with check (public.is_org_member(organization_id));
create policy "members can update service runs" on public.service_runs for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members can view service events" on public.service_events for select using (public.is_org_member(organization_id));
create policy "authenticated members can append service events" on public.service_events for insert with check (public.is_org_member(organization_id) and actor_id = auth.uid());
create policy "members can view evidence metadata" on public.evidence for select using (public.is_org_member(organization_id));
create policy "members can append evidence metadata" on public.evidence for insert with check (public.is_org_member(organization_id));
create policy "supervisors can review evidence" on public.evidence for update using (public.is_org_role(organization_id, array['owner','admin','supervisor'])) with check (public.is_org_role(organization_id, array['owner','admin','supervisor']));
create policy "members can view exceptions" on public.exceptions for select using (public.is_org_member(organization_id));
create policy "members can create exceptions" on public.exceptions for insert with check (public.is_org_member(organization_id) and reported_by = auth.uid());
create policy "authorized members can update exceptions" on public.exceptions for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members can view audit records" on public.audit_log for select using (public.is_org_member(organization_id));

-- There are intentionally no DELETE policies for service events, evidence, or audit records.

-- Evidence files are private. The first path segment must be the organization UUID.
insert into storage.buckets (id, name, public)
values ('service-evidence', 'service-evidence', false)
on conflict (id) do nothing;

create policy "members can upload organization evidence" on storage.objects
for insert to authenticated
with check (bucket_id = 'service-evidence' and public.is_org_member(((storage.foldername(name))[1])::uuid));

create policy "members can view organization evidence" on storage.objects
for select to authenticated
using (bucket_id = 'service-evidence' and public.is_org_member(((storage.foldername(name))[1])::uuid));
