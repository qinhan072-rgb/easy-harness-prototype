-- Easy Harness canvas catalog and pricing foundation.
-- This migration creates a curated component database for the canvas configurator.
-- Starter rows are catalog candidates only; direct checkout remains disabled
-- until compatibility, price snapshots, and labor pricing are validated.

create table if not exists public.catalog_sources (
  id text primary key,
  source_type text not null check (
    source_type in (
      'manufacturer',
      'distributor',
      'authorized_api',
      'internal_curated',
      'engineering_document'
    )
  ),
  name text not null,
  base_url text,
  api_docs_url text,
  notes text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_manufacturers (
  id text primary key,
  name text not null unique,
  aliases text[] not null default '{}',
  website_url text,
  source_id text references public.catalog_sources(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_connector_families (
  id text primary key,
  manufacturer_id text references public.catalog_manufacturers(id) on delete set null,
  name text not null,
  series text,
  category text not null default '',
  common_use text not null default '',
  pitch_mm numeric(8,3),
  sealed boolean not null default false,
  lock_style text,
  mating_style text,
  current_rating_a numeric(10,3),
  voltage_rating_v numeric(10,3),
  temperature_min_c numeric(8,2),
  temperature_max_c numeric(8,2),
  attributes jsonb not null default '{}'::jsonb,
  source_id text references public.catalog_sources(id) on delete set null,
  source_url text,
  confidence numeric(4,3) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_connector_housings (
  id text primary key,
  family_id text references public.catalog_connector_families(id) on delete set null,
  manufacturer_id text references public.catalog_manufacturers(id) on delete set null,
  mpn text not null,
  display_name text not null,
  description text not null default '',
  housing_type text not null default '',
  gender text,
  orientation text,
  pin_count integer check (pin_count is null or pin_count > 0),
  pin_count_options integer[] not null default '{}',
  row_count integer check (row_count is null or row_count > 0),
  pitch_mm numeric(8,3),
  color text,
  sealed boolean not null default false,
  ip_rating text,
  panel_mount boolean not null default false,
  wire_to_wire boolean not null default false,
  wire_to_board boolean not null default false,
  awg_min integer,
  awg_max integer,
  current_rating_a numeric(10,3),
  voltage_rating_v numeric(10,3),
  compatible_terminal_notes text not null default '',
  required_accessory_notes text not null default '',
  lifecycle_status text not null default 'unknown',
  image_url text,
  datasheet_url text,
  attributes jsonb not null default '{}'::jsonb,
  source_id text references public.catalog_sources(id) on delete set null,
  source_url text,
  confidence numeric(4,3) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  direct_checkout_enabled boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (manufacturer_id, mpn),
  check (awg_min is null or awg_max is null or awg_min <= awg_max)
);

create table if not exists public.catalog_terminals (
  id text primary key,
  manufacturer_id text references public.catalog_manufacturers(id) on delete set null,
  family_id text references public.catalog_connector_families(id) on delete set null,
  mpn text,
  display_name text not null,
  description text not null default '',
  terminal_type text not null default '',
  gender text,
  plating text,
  wire_awg_min integer,
  wire_awg_max integer,
  insulation_diameter_min_mm numeric(8,3),
  insulation_diameter_max_mm numeric(8,3),
  current_rating_a numeric(10,3),
  material text,
  tooling_notes text not null default '',
  datasheet_url text,
  attributes jsonb not null default '{}'::jsonb,
  source_id text references public.catalog_sources(id) on delete set null,
  source_url text,
  confidence numeric(4,3) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  direct_checkout_enabled boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (manufacturer_id, mpn),
  check (wire_awg_min is null or wire_awg_max is null or wire_awg_min <= wire_awg_max)
);

create table if not exists public.catalog_accessories (
  id text primary key,
  manufacturer_id text references public.catalog_manufacturers(id) on delete set null,
  family_id text references public.catalog_connector_families(id) on delete set null,
  mpn text,
  display_name text not null,
  description text not null default '',
  accessory_type text not null check (
    accessory_type in (
      'seal',
      'wedge',
      'backshell',
      'boot',
      'clip',
      'cap',
      'strain_relief',
      'label',
      'other'
    )
  ),
  color text,
  compatible_wire_awg_min integer,
  compatible_wire_awg_max integer,
  required_when text not null default '',
  datasheet_url text,
  attributes jsonb not null default '{}'::jsonb,
  source_id text references public.catalog_sources(id) on delete set null,
  source_url text,
  confidence numeric(4,3) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  direct_checkout_enabled boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (manufacturer_id, mpn),
  check (
    compatible_wire_awg_min is null
    or compatible_wire_awg_max is null
    or compatible_wire_awg_min <= compatible_wire_awg_max
  )
);

create table if not exists public.catalog_wires (
  id text primary key,
  manufacturer_id text references public.catalog_manufacturers(id) on delete set null,
  spec text not null,
  display_name text not null,
  wire_type text not null,
  conductor_material text not null default 'copper',
  strand_count text,
  insulation text,
  jacket text,
  color text,
  awg integer check (awg is null or awg > 0),
  cross_section_mm2 numeric(10,4),
  conductor_count integer not null default 1 check (conductor_count > 0),
  stranded boolean not null default true,
  shielded boolean not null default false,
  twisted_pair boolean not null default false,
  voltage_rating_v numeric(10,3),
  current_rating_a numeric(10,3),
  temperature_min_c numeric(8,2),
  temperature_max_c numeric(8,2),
  outside_diameter_mm numeric(8,3),
  supplier_part_number text,
  datasheet_url text,
  attributes jsonb not null default '{}'::jsonb,
  source_id text references public.catalog_sources(id) on delete set null,
  source_url text,
  confidence numeric(4,3) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  direct_checkout_enabled boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_mid_elements (
  id text primary key,
  element_type text not null check (
    element_type in (
      'splice',
      'sleeve',
      'fuse',
      'cable',
      'label',
      'shield_drain',
      'branch_point',
      'other'
    )
  ),
  display_name text not null,
  description text not null default '',
  left_pin_count_min integer check (left_pin_count_min is null or left_pin_count_min > 0),
  left_pin_count_max integer check (left_pin_count_max is null or left_pin_count_max > 0),
  right_pin_count_min integer check (right_pin_count_min is null or right_pin_count_min > 0),
  right_pin_count_max integer check (right_pin_count_max is null or right_pin_count_max > 0),
  supported_awg_min integer,
  supported_awg_max integer,
  validation_rules jsonb not null default '{}'::jsonb,
  required_parts jsonb not null default '[]'::jsonb,
  attributes jsonb not null default '{}'::jsonb,
  source_id text references public.catalog_sources(id) on delete set null,
  source_url text,
  confidence numeric(4,3) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  direct_checkout_enabled boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (left_pin_count_min is null or left_pin_count_max is null or left_pin_count_min <= left_pin_count_max),
  check (right_pin_count_min is null or right_pin_count_max is null or right_pin_count_min <= right_pin_count_max),
  check (supported_awg_min is null or supported_awg_max is null or supported_awg_min <= supported_awg_max)
);

create table if not exists public.catalog_compatibility_edges (
  id uuid primary key default gen_random_uuid(),
  left_entity_type text not null check (
    left_entity_type in (
      'connector_housing',
      'connector_family',
      'terminal',
      'accessory',
      'wire',
      'mid_element'
    )
  ),
  left_entity_id text not null,
  right_entity_type text not null check (
    right_entity_type in (
      'connector_housing',
      'connector_family',
      'terminal',
      'accessory',
      'wire',
      'mid_element'
    )
  ),
  right_entity_id text not null,
  relationship_type text not null check (
    relationship_type in (
      'compatible_with',
      'requires',
      'mates_with',
      'uses_terminal',
      'uses_accessory',
      'supports_wire',
      'excludes'
    )
  ),
  conditions jsonb not null default '{}'::jsonb,
  source_id text references public.catalog_sources(id) on delete set null,
  source_url text,
  confidence numeric(4,3) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_price_snapshots (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (
    entity_type in (
      'connector_housing',
      'connector_family',
      'terminal',
      'accessory',
      'wire',
      'mid_element',
      'labor_operation'
    )
  ),
  entity_id text not null,
  source_id text references public.catalog_sources(id) on delete set null,
  supplier_name text not null,
  supplier_part_number text,
  manufacturer_part_number text,
  currency char(3) not null default 'USD',
  price_breaks jsonb not null default '[]'::jsonb check (jsonb_typeof(price_breaks) = 'array'),
  minimum_order_quantity integer check (minimum_order_quantity is null or minimum_order_quantity > 0),
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  lead_time_days_min integer check (lead_time_days_min is null or lead_time_days_min >= 0),
  lead_time_days_max integer check (lead_time_days_max is null or lead_time_days_max >= 0),
  tariff_rate numeric(8,5),
  retrieved_at timestamptz not null default now(),
  expires_at timestamptz,
  source_url text,
  visibility text not null default 'internal' check (visibility in ('internal', 'public_catalog')),
  confidence numeric(4,3) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  direct_checkout_allowed boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    lead_time_days_min is null
    or lead_time_days_max is null
    or lead_time_days_min <= lead_time_days_max
  )
);

create table if not exists public.catalog_labor_operations (
  id text primary key,
  operation_type text not null,
  display_name text not null,
  description text not null default '',
  unit text not null check (unit in ('each', 'per_pin', 'per_wire', 'per_mm', 'per_harness', 'per_branch')),
  setup_seconds integer not null default 0 check (setup_seconds >= 0),
  run_seconds integer not null default 0 check (run_seconds >= 0),
  cost_cents integer check (cost_cents is null or cost_cents >= 0),
  currency char(3) not null default 'USD',
  conditions jsonb not null default '{}'::jsonb,
  confidence numeric(4,3) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  direct_checkout_allowed boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_pricing_rules (
  id text primary key,
  rule_type text not null check (
    rule_type in (
      'material_markup',
      'labor_markup',
      'minimum_order',
      'tariff',
      'shipping_buffer',
      'direct_checkout_gate'
    )
  ),
  display_name text not null,
  rule jsonb not null default '{}'::jsonb,
  margin_bps integer check (margin_bps is null or margin_bps >= 0),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.canvas_configurations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.profiles(id) on delete set null,
  request_id uuid references public.requests(id) on delete set null,
  title text not null,
  quantity integer not null default 1 check (quantity > 0),
  status text not null default 'draft' check (
    status in ('draft', 'needs_price_release', 'priced', 'ordered', 'archived')
  ),
  source text not null default 'canvas_configurator' check (source = 'canvas_configurator'),
  catalog_version text not null default '',
  configuration jsonb not null default '{}'::jsonb,
  pricing_summary jsonb not null default '{}'::jsonb,
  direct_checkout_eligible boolean not null default false,
  quote_currency char(3) not null default 'USD',
  quote_subtotal_cents integer check (quote_subtotal_cents is null or quote_subtotal_cents >= 0),
  quote_total_cents integer check (quote_total_cents is null or quote_total_cents >= 0),
  price_expires_at timestamptz,
  blockers text[] not null default '{}',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.canvas_price_estimates (
  id uuid primary key default gen_random_uuid(),
  canvas_configuration_id uuid not null references public.canvas_configurations(id) on delete cascade,
  status text not null default 'needs_price_release' check (
    status in ('eligible', 'needs_price_release', 'expired')
  ),
  quantity integer not null check (quantity > 0),
  currency char(3) not null default 'USD',
  material_total_cents integer check (material_total_cents is null or material_total_cents >= 0),
  labor_total_cents integer check (labor_total_cents is null or labor_total_cents >= 0),
  margin_total_cents integer check (margin_total_cents is null or margin_total_cents >= 0),
  total_cents integer check (total_cents is null or total_cents >= 0),
  line_items jsonb not null default '[]'::jsonb check (jsonb_typeof(line_items) = 'array'),
  blockers text[] not null default '{}',
  source_snapshot_ids uuid[] not null default '{}',
  calculated_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists catalog_connector_families_active_idx
  on public.catalog_connector_families (active, manufacturer_id, name);

create index if not exists catalog_connector_housings_family_idx
  on public.catalog_connector_housings (active, family_id, pin_count);

create index if not exists catalog_connector_housings_mpn_idx
  on public.catalog_connector_housings (mpn);

create index if not exists catalog_terminals_family_idx
  on public.catalog_terminals (active, family_id);

create index if not exists catalog_accessories_family_idx
  on public.catalog_accessories (active, family_id);

create index if not exists catalog_wires_lookup_idx
  on public.catalog_wires (active, wire_type, awg, color);

create index if not exists catalog_mid_elements_type_idx
  on public.catalog_mid_elements (active, element_type);

create index if not exists catalog_compatibility_edges_left_idx
  on public.catalog_compatibility_edges (active, left_entity_type, left_entity_id);

create index if not exists catalog_compatibility_edges_right_idx
  on public.catalog_compatibility_edges (active, right_entity_type, right_entity_id);

create index if not exists catalog_price_snapshots_entity_idx
  on public.catalog_price_snapshots (active, entity_type, entity_id, expires_at);

create index if not exists canvas_configurations_customer_idx
  on public.canvas_configurations (customer_id, status, created_at desc);

create index if not exists canvas_configurations_request_idx
  on public.canvas_configurations (request_id);

create index if not exists canvas_price_estimates_configuration_idx
  on public.canvas_price_estimates (canvas_configuration_id, calculated_at desc);

drop trigger if exists catalog_sources_updated_at on public.catalog_sources;
create trigger catalog_sources_updated_at
  before update on public.catalog_sources
  for each row execute function public.set_updated_at();

drop trigger if exists catalog_manufacturers_updated_at on public.catalog_manufacturers;
create trigger catalog_manufacturers_updated_at
  before update on public.catalog_manufacturers
  for each row execute function public.set_updated_at();

drop trigger if exists catalog_connector_families_updated_at on public.catalog_connector_families;
create trigger catalog_connector_families_updated_at
  before update on public.catalog_connector_families
  for each row execute function public.set_updated_at();

drop trigger if exists catalog_connector_housings_updated_at on public.catalog_connector_housings;
create trigger catalog_connector_housings_updated_at
  before update on public.catalog_connector_housings
  for each row execute function public.set_updated_at();

drop trigger if exists catalog_terminals_updated_at on public.catalog_terminals;
create trigger catalog_terminals_updated_at
  before update on public.catalog_terminals
  for each row execute function public.set_updated_at();

drop trigger if exists catalog_accessories_updated_at on public.catalog_accessories;
create trigger catalog_accessories_updated_at
  before update on public.catalog_accessories
  for each row execute function public.set_updated_at();

drop trigger if exists catalog_wires_updated_at on public.catalog_wires;
create trigger catalog_wires_updated_at
  before update on public.catalog_wires
  for each row execute function public.set_updated_at();

drop trigger if exists catalog_mid_elements_updated_at on public.catalog_mid_elements;
create trigger catalog_mid_elements_updated_at
  before update on public.catalog_mid_elements
  for each row execute function public.set_updated_at();

drop trigger if exists catalog_compatibility_edges_updated_at on public.catalog_compatibility_edges;
create trigger catalog_compatibility_edges_updated_at
  before update on public.catalog_compatibility_edges
  for each row execute function public.set_updated_at();

drop trigger if exists catalog_price_snapshots_updated_at on public.catalog_price_snapshots;
create trigger catalog_price_snapshots_updated_at
  before update on public.catalog_price_snapshots
  for each row execute function public.set_updated_at();

drop trigger if exists catalog_labor_operations_updated_at on public.catalog_labor_operations;
create trigger catalog_labor_operations_updated_at
  before update on public.catalog_labor_operations
  for each row execute function public.set_updated_at();

drop trigger if exists catalog_pricing_rules_updated_at on public.catalog_pricing_rules;
create trigger catalog_pricing_rules_updated_at
  before update on public.catalog_pricing_rules
  for each row execute function public.set_updated_at();

drop trigger if exists canvas_configurations_updated_at on public.canvas_configurations;
create trigger canvas_configurations_updated_at
  before update on public.canvas_configurations
  for each row execute function public.set_updated_at();

alter table public.catalog_sources enable row level security;
alter table public.catalog_manufacturers enable row level security;
alter table public.catalog_connector_families enable row level security;
alter table public.catalog_connector_housings enable row level security;
alter table public.catalog_terminals enable row level security;
alter table public.catalog_accessories enable row level security;
alter table public.catalog_wires enable row level security;
alter table public.catalog_mid_elements enable row level security;
alter table public.catalog_compatibility_edges enable row level security;
alter table public.catalog_price_snapshots enable row level security;
alter table public.catalog_labor_operations enable row level security;
alter table public.catalog_pricing_rules enable row level security;
alter table public.canvas_configurations enable row level security;
alter table public.canvas_price_estimates enable row level security;

drop policy if exists catalog_sources_select_active on public.catalog_sources;
create policy catalog_sources_select_active
on public.catalog_sources for select
to anon, authenticated
using (active);

drop policy if exists catalog_manufacturers_select_active on public.catalog_manufacturers;
create policy catalog_manufacturers_select_active
on public.catalog_manufacturers for select
to anon, authenticated
using (active);

drop policy if exists catalog_connector_families_select_active on public.catalog_connector_families;
create policy catalog_connector_families_select_active
on public.catalog_connector_families for select
to anon, authenticated
using (active);

drop policy if exists catalog_connector_housings_select_active on public.catalog_connector_housings;
create policy catalog_connector_housings_select_active
on public.catalog_connector_housings for select
to anon, authenticated
using (active);

drop policy if exists catalog_terminals_select_active on public.catalog_terminals;
create policy catalog_terminals_select_active
on public.catalog_terminals for select
to anon, authenticated
using (active);

drop policy if exists catalog_accessories_select_active on public.catalog_accessories;
create policy catalog_accessories_select_active
on public.catalog_accessories for select
to anon, authenticated
using (active);

drop policy if exists catalog_wires_select_active on public.catalog_wires;
create policy catalog_wires_select_active
on public.catalog_wires for select
to anon, authenticated
using (active);

drop policy if exists catalog_mid_elements_select_active on public.catalog_mid_elements;
create policy catalog_mid_elements_select_active
on public.catalog_mid_elements for select
to anon, authenticated
using (active);

drop policy if exists catalog_compatibility_edges_select_active on public.catalog_compatibility_edges;
create policy catalog_compatibility_edges_select_active
on public.catalog_compatibility_edges for select
to anon, authenticated
using (active);

drop policy if exists catalog_price_snapshots_select_public_active on public.catalog_price_snapshots;
create policy catalog_price_snapshots_select_public_active
on public.catalog_price_snapshots for select
to anon, authenticated
using (active and visibility = 'public_catalog');

drop policy if exists catalog_labor_operations_staff_all on public.catalog_labor_operations;
create policy catalog_labor_operations_staff_all
on public.catalog_labor_operations for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists catalog_pricing_rules_staff_all on public.catalog_pricing_rules;
create policy catalog_pricing_rules_staff_all
on public.catalog_pricing_rules for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists catalog_sources_staff_all on public.catalog_sources;
create policy catalog_sources_staff_all
on public.catalog_sources for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists catalog_manufacturers_staff_all on public.catalog_manufacturers;
create policy catalog_manufacturers_staff_all
on public.catalog_manufacturers for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists catalog_connector_families_staff_all on public.catalog_connector_families;
create policy catalog_connector_families_staff_all
on public.catalog_connector_families for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists catalog_connector_housings_staff_all on public.catalog_connector_housings;
create policy catalog_connector_housings_staff_all
on public.catalog_connector_housings for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists catalog_terminals_staff_all on public.catalog_terminals;
create policy catalog_terminals_staff_all
on public.catalog_terminals for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists catalog_accessories_staff_all on public.catalog_accessories;
create policy catalog_accessories_staff_all
on public.catalog_accessories for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists catalog_wires_staff_all on public.catalog_wires;
create policy catalog_wires_staff_all
on public.catalog_wires for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists catalog_mid_elements_staff_all on public.catalog_mid_elements;
create policy catalog_mid_elements_staff_all
on public.catalog_mid_elements for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists catalog_compatibility_edges_staff_all on public.catalog_compatibility_edges;
create policy catalog_compatibility_edges_staff_all
on public.catalog_compatibility_edges for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists catalog_price_snapshots_staff_all on public.catalog_price_snapshots;
create policy catalog_price_snapshots_staff_all
on public.catalog_price_snapshots for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists canvas_configurations_select_owner_or_staff on public.canvas_configurations;
create policy canvas_configurations_select_owner_or_staff
on public.canvas_configurations for select
to authenticated
using (customer_id = auth.uid() or public.is_staff_or_admin());

drop policy if exists canvas_configurations_insert_owner on public.canvas_configurations;
create policy canvas_configurations_insert_owner
on public.canvas_configurations for insert
to authenticated
with check (customer_id = auth.uid());

drop policy if exists canvas_configurations_update_owner_open on public.canvas_configurations;
create policy canvas_configurations_update_owner_open
on public.canvas_configurations for update
to authenticated
using (
  customer_id = auth.uid()
  and status in ('draft', 'needs_price_release', 'priced')
)
with check (customer_id = auth.uid());

drop policy if exists canvas_configurations_staff_all on public.canvas_configurations;
create policy canvas_configurations_staff_all
on public.canvas_configurations for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

drop policy if exists canvas_price_estimates_select_owner_or_staff on public.canvas_price_estimates;
create policy canvas_price_estimates_select_owner_or_staff
on public.canvas_price_estimates for select
to authenticated
using (
  exists (
    select 1
    from public.canvas_configurations c
    where c.id = canvas_price_estimates.canvas_configuration_id
      and (c.customer_id = auth.uid() or public.is_staff_or_admin())
  )
);

drop policy if exists canvas_price_estimates_staff_all on public.canvas_price_estimates;
create policy canvas_price_estimates_staff_all
on public.canvas_price_estimates for all
to authenticated
using (public.is_staff_or_admin())
with check (public.is_staff_or_admin());

grant select on
  public.catalog_sources,
  public.catalog_manufacturers,
  public.catalog_connector_families,
  public.catalog_connector_housings,
  public.catalog_terminals,
  public.catalog_accessories,
  public.catalog_wires,
  public.catalog_mid_elements,
  public.catalog_compatibility_edges,
  public.catalog_price_snapshots
to anon, authenticated;

grant select, insert, update on public.canvas_configurations to authenticated;
grant select on public.canvas_price_estimates to authenticated;

grant all on
  public.catalog_sources,
  public.catalog_manufacturers,
  public.catalog_connector_families,
  public.catalog_connector_housings,
  public.catalog_terminals,
  public.catalog_accessories,
  public.catalog_wires,
  public.catalog_mid_elements,
  public.catalog_compatibility_edges,
  public.catalog_price_snapshots,
  public.catalog_labor_operations,
  public.catalog_pricing_rules,
  public.canvas_configurations,
  public.canvas_price_estimates
to service_role;

insert into public.catalog_sources (id, source_type, name, base_url, api_docs_url, notes)
values
  (
    'easy-harness-starter-catalog',
    'internal_curated',
    'Easy Harness starter catalog',
    null,
    null,
    'Initial canvas catalog bridge from the frontend starter list. Not production-pricing evidence.'
  ),
  (
    'digikey-api',
    'authorized_api',
    'Digi-Key Product Information API',
    'https://www.digikey.com/',
    'https://developer.digikey.com/products/product-information-v4/productsearch',
    'Preferred source for dated distributor price and availability snapshots.'
  ),
  (
    'mouser-api',
    'authorized_api',
    'Mouser Search API',
    'https://www.mouser.com/',
    'https://www.mouser.com/api-search/',
    'Preferred source for dated distributor price and availability snapshots.'
  ),
  (
    'nexar-api',
    'authorized_api',
    'Nexar / Octopart API',
    'https://nexar.com/',
    'https://nexar.com/api',
    'Cross-check source for part availability and distributor data.'
  )
on conflict (id) do update set
  source_type = excluded.source_type,
  name = excluded.name,
  base_url = excluded.base_url,
  api_docs_url = excluded.api_docs_url,
  notes = excluded.notes,
  active = true;

insert into public.catalog_manufacturers (id, name, aliases, website_url, source_id)
values
  ('adafruit', 'Adafruit', array['Adafruit Industries'], 'https://www.adafruit.com/', 'easy-harness-starter-catalog'),
  ('anderson-power', 'Anderson Power', array['Anderson Power Products'], 'https://www.andersonpower.com/', 'easy-harness-starter-catalog'),
  ('harwin', 'Harwin', array[]::text[], 'https://www.harwin.com/', 'easy-harness-starter-catalog'),
  ('jst', 'JST', array['J.S.T.', 'JST Mfg.'], 'https://www.jst.com/', 'easy-harness-starter-catalog'),
  ('molex', 'Molex', array[]::text[], 'https://www.molex.com/', 'easy-harness-starter-catalog'),
  ('te-connectivity', 'TE Connectivity', array['TE', 'Deutsch'], 'https://www.te.com/', 'easy-harness-starter-catalog'),
  ('easy-harness', 'Easy Harness', array[]::text[], null, 'easy-harness-starter-catalog')
on conflict (id) do update set
  name = excluded.name,
  aliases = excluded.aliases,
  website_url = excluded.website_url,
  source_id = excluded.source_id,
  active = true;

insert into public.catalog_connector_families (
  id,
  manufacturer_id,
  name,
  series,
  category,
  common_use,
  pitch_mm,
  sealed,
  current_rating_a,
  voltage_rating_v,
  source_id,
  confidence
)
values
  ('usb-breakout', 'adafruit', 'USB Breakout', 'USB breakout', 'Board / breakout', 'Low-volume USB pigtails and board breakout leads', null, false, 1, 5, 'easy-harness-starter-catalog', 0.650),
  ('anderson-powerpole-15-45', 'anderson-power', 'Powerpole 15/45', 'Powerpole 15/30/45', 'Power connector', 'Low-voltage DC power leads', null, false, 45, 600, 'easy-harness-starter-catalog', 0.700),
  ('harwin-m20', 'harwin', 'DuPont / M20', 'M20', 'Board-to-wire', '2.54 mm board and signal harnesses', 2.540, false, 3, 250, 'easy-harness-starter-catalog', 0.650),
  ('jst-xh', 'jst', 'XH', 'XH', 'Wire-to-board', 'Low-current wire-to-board signal harnesses', 2.500, false, 3, 250, 'easy-harness-starter-catalog', 0.650),
  ('molex-microfit-3', 'molex', 'Micro-Fit 3.0', 'Micro-Fit 3.0', 'Wire-to-wire', 'Compact power and signal harnesses', 3.000, false, 5, 600, 'easy-harness-starter-catalog', 0.650),
  ('deutsch-dt', 'te-connectivity', 'DT sealed', 'Deutsch DT', 'Sealed connector', 'Outdoor and vehicle harnesses', null, true, 13, 250, 'easy-harness-starter-catalog', 0.650)
on conflict (id) do update set
  manufacturer_id = excluded.manufacturer_id,
  name = excluded.name,
  series = excluded.series,
  category = excluded.category,
  common_use = excluded.common_use,
  pitch_mm = excluded.pitch_mm,
  sealed = excluded.sealed,
  current_rating_a = excluded.current_rating_a,
  voltage_rating_v = excluded.voltage_rating_v,
  source_id = excluded.source_id,
  confidence = excluded.confidence,
  active = true;

insert into public.catalog_connector_housings (
  id,
  family_id,
  manufacturer_id,
  mpn,
  display_name,
  description,
  housing_type,
  gender,
  pin_count,
  pin_count_options,
  row_count,
  color,
  sealed,
  wire_to_wire,
  wire_to_board,
  awg_min,
  awg_max,
  current_rating_a,
  voltage_rating_v,
  compatible_terminal_notes,
  required_accessory_notes,
  attributes,
  source_id,
  confidence,
  direct_checkout_enabled
)
values
  (
    'adafruit-5978',
    'usb-breakout',
    'adafruit',
    '5978',
    'USB Type-C breakout',
    'Breakout board endpoint for soldered leads.',
    'breakout_board',
    null,
    5,
    array[5],
    1,
    null,
    false,
    false,
    true,
    22,
    28,
    1,
    5,
    'Soldered leads; terminal compatibility not applicable.',
    '',
    '{"options":["USB Type-C breakout","USB 2.0 signal pads"],"visual":"usb-board"}'::jsonb,
    'easy-harness-starter-catalog',
    0.600,
    false
  ),
  (
    'adafruit-5180',
    'usb-breakout',
    'adafruit',
    '5180',
    'USB-C plug breakout',
    'USB-C plug breakout endpoint for soldered leads.',
    'breakout_board',
    null,
    6,
    array[6],
    1,
    null,
    false,
    false,
    true,
    24,
    30,
    1,
    5,
    'Soldered leads; terminal compatibility not applicable.',
    '',
    '{"options":["USB-C plug breakout","Signal pads"],"visual":"usb-board"}'::jsonb,
    'easy-harness-starter-catalog',
    0.600,
    false
  ),
  (
    'adafruit-6050',
    'usb-breakout',
    'adafruit',
    '6050',
    'USB-C receptacle breakout',
    'USB-C receptacle breakout endpoint for soldered leads.',
    'breakout_board',
    null,
    6,
    array[6,12],
    1,
    null,
    false,
    false,
    true,
    24,
    30,
    1,
    5,
    'Soldered leads; terminal compatibility not applicable.',
    '',
    '{"options":["USB-C receptacle breakout","Power-only pads"],"visual":"usb-board"}'::jsonb,
    'easy-harness-starter-catalog',
    0.600,
    false
  ),
  (
    'anderson-1327g6-bk',
    'anderson-powerpole-15-45',
    'anderson-power',
    '1327G6-BK',
    'Powerpole 15/45 housing, black',
    'Single-position Powerpole housing candidate.',
    'crimp_housing',
    'genderless',
    1,
    array[1],
    1,
    'black',
    false,
    true,
    false,
    10,
    20,
    45,
    600,
    'Powerpole 15/30/45 contacts; contact size depends on wire gauge.',
    '',
    '{"options":["1 row, neutral, black"],"visual":"powerpole"}'::jsonb,
    'easy-harness-starter-catalog',
    0.650,
    false
  ),
  (
    'anderson-1327g6-red',
    'anderson-powerpole-15-45',
    'anderson-power',
    '1327G6-RED',
    'Powerpole 15/45 housing, red',
    'Single-position Powerpole housing candidate.',
    'crimp_housing',
    'genderless',
    1,
    array[1],
    1,
    'red',
    false,
    true,
    false,
    10,
    20,
    45,
    600,
    'Powerpole 15/30/45 contacts; contact size depends on wire gauge.',
    '',
    '{"options":["1 row, neutral, red"],"visual":"powerpole"}'::jsonb,
    'easy-harness-starter-catalog',
    0.650,
    false
  ),
  (
    'harwin-m20-1060600',
    'harwin-m20',
    'harwin',
    'M20-1060600',
    'M20 1-row female crimp housing',
    '2.54 mm pitch female crimp housing candidate.',
    'crimp_housing',
    'female',
    6,
    array[6],
    1,
    'black',
    false,
    false,
    true,
    22,
    30,
    3,
    250,
    'M20 crimp socket contacts.',
    'Mating header must be confirmed.',
    '{"options":["1 row, female crimp, black"],"visual":"rect-housing"}'::jsonb,
    'easy-harness-starter-catalog',
    0.600,
    false
  ),
  (
    'jst-b6b-xh-a',
    'jst-xh',
    'jst',
    'B6B-XH-A(LF)(SN)',
    'XH top-entry header',
    'JST XH top-entry header candidate.',
    'header',
    'male',
    6,
    array[2,3,4,5,6,7,8],
    1,
    'natural',
    false,
    false,
    true,
    22,
    28,
    3,
    250,
    'SXH-001T-P0.6 contacts for mating housing; verify selected mate.',
    'Mating housing and terminal direction must be confirmed.',
    '{"options":["Top-entry header","Natural housing mate"],"visual":"rect-housing"}'::jsonb,
    'easy-harness-starter-catalog',
    0.600,
    false
  ),
  (
    'molex-43025-0400',
    'molex-microfit-3',
    'molex',
    '43025-0400',
    'Micro-Fit 3.0 receptacle housing',
    'Micro-Fit 3.0 receptacle housing candidate.',
    'crimp_housing',
    'female',
    4,
    array[2,4,6,8],
    2,
    'black',
    false,
    true,
    false,
    20,
    30,
    5,
    600,
    'Micro-Fit 3.0 crimp terminals; plating and keying must be confirmed.',
    '',
    '{"options":["Dual row receptacle housing","Black"],"visual":"microfit"}'::jsonb,
    'easy-harness-starter-catalog',
    0.600,
    false
  ),
  (
    'deutsch-dt04-2p',
    'deutsch-dt',
    'te-connectivity',
    'DT04-2P',
    'DT 2-pin receptacle housing',
    'Deutsch DT 2-position sealed receptacle housing candidate.',
    'sealed_crimp_housing',
    'receptacle',
    2,
    array[2],
    1,
    'gray',
    true,
    true,
    false,
    14,
    20,
    13,
    250,
    'Size 16 solid contacts; exact terminal and seal selection required.',
    'Wedge lock and seals required for sealed assembly.',
    '{"options":["Receptacle, 2 pin, gray","Wedge lock needed"],"visual":"sealed-dt"}'::jsonb,
    'easy-harness-starter-catalog',
    0.600,
    false
  )
on conflict (id) do update set
  family_id = excluded.family_id,
  manufacturer_id = excluded.manufacturer_id,
  mpn = excluded.mpn,
  display_name = excluded.display_name,
  description = excluded.description,
  housing_type = excluded.housing_type,
  gender = excluded.gender,
  pin_count = excluded.pin_count,
  pin_count_options = excluded.pin_count_options,
  row_count = excluded.row_count,
  color = excluded.color,
  sealed = excluded.sealed,
  wire_to_wire = excluded.wire_to_wire,
  wire_to_board = excluded.wire_to_board,
  awg_min = excluded.awg_min,
  awg_max = excluded.awg_max,
  current_rating_a = excluded.current_rating_a,
  voltage_rating_v = excluded.voltage_rating_v,
  compatible_terminal_notes = excluded.compatible_terminal_notes,
  required_accessory_notes = excluded.required_accessory_notes,
  attributes = excluded.attributes,
  source_id = excluded.source_id,
  confidence = excluded.confidence,
  direct_checkout_enabled = false,
  active = true;

insert into public.catalog_mid_elements (
  id,
  element_type,
  display_name,
  description,
  left_pin_count_min,
  left_pin_count_max,
  right_pin_count_min,
  right_pin_count_max,
  supported_awg_min,
  supported_awg_max,
  validation_rules,
  attributes,
  source_id,
  confidence,
  direct_checkout_enabled
)
values
  (
    'splice',
    'splice',
    'Solder splice with heatshrink',
    'Canvas splice node for joining one or more wires.',
    1,
    4,
    1,
    4,
    10,
    32,
    '{"requires_wire_configuration":true}'::jsonb,
    '{"options":["Black heatshrink","Clear heatshrink","Adhesive-lined heatshrink"]}'::jsonb,
    'easy-harness-starter-catalog',
    0.550,
    false
  ),
  (
    'cable',
    'cable',
    'Cable breakout',
    'Canvas cable or jacketed lead grouping node.',
    1,
    6,
    1,
    6,
    18,
    30,
    '{"requires_cable_type":true}'::jsonb,
    '{"options":["Jacketed cable","Shielded cable","Twisted pair"]}'::jsonb,
    'easy-harness-starter-catalog',
    0.550,
    false
  ),
  (
    'fuse',
    'fuse',
    'Inline fuse holder',
    'Canvas inline fuse holder node.',
    1,
    1,
    1,
    1,
    12,
    20,
    '{"requires_fuse_rating":true}'::jsonb,
    '{"options":["ATO/ATC fuse holder","Mini blade fuse holder"]}'::jsonb,
    'easy-harness-starter-catalog',
    0.550,
    false
  ),
  (
    'sleeve',
    'sleeve',
    'Protective sleeve',
    'Canvas sleeve or jacket node for routing protection.',
    1,
    6,
    1,
    6,
    10,
    32,
    '{"requires_length":true}'::jsonb,
    '{"options":["PET braided sleeve","Split loom","Heatshrink sleeve"]}'::jsonb,
    'easy-harness-starter-catalog',
    0.550,
    false
  )
on conflict (id) do update set
  element_type = excluded.element_type,
  display_name = excluded.display_name,
  description = excluded.description,
  left_pin_count_min = excluded.left_pin_count_min,
  left_pin_count_max = excluded.left_pin_count_max,
  right_pin_count_min = excluded.right_pin_count_min,
  right_pin_count_max = excluded.right_pin_count_max,
  supported_awg_min = excluded.supported_awg_min,
  supported_awg_max = excluded.supported_awg_max,
  validation_rules = excluded.validation_rules,
  attributes = excluded.attributes,
  source_id = excluded.source_id,
  confidence = excluded.confidence,
  direct_checkout_enabled = false,
  active = true;

insert into public.catalog_wires (
  id,
  manufacturer_id,
  spec,
  display_name,
  wire_type,
  insulation,
  color,
  conductor_count,
  stranded,
  shielded,
  twisted_pair,
  voltage_rating_v,
  attributes,
  source_id,
  confidence,
  direct_checkout_enabled
)
values
  (
    'silicone-hookup-generic',
    'easy-harness',
    'Generic silicone hookup wire',
    'Silicone hookup wire',
    'silicone',
    'silicone',
    null,
    1,
    true,
    false,
    false,
    null,
    '{"supported_awg":[10,12,14,16,18,20,22,24,26,28,30],"colors":["Black","Red","White","Blue","Yellow","Green"]}'::jsonb,
    'easy-harness-starter-catalog',
    0.500,
    false
  ),
  (
    'ul1007-hookup-generic',
    'easy-harness',
    'Generic UL1007 PVC hook-up wire',
    'UL1007 PVC hook-up wire',
    'ul1007',
    'PVC',
    null,
    1,
    true,
    false,
    false,
    null,
    '{"supported_awg":[16,18,20,22,24,26,28],"colors":["Black","Red","White","Blue","Yellow","Green","Orange"]}'::jsonb,
    'easy-harness-starter-catalog',
    0.500,
    false
  ),
  (
    'txl-gxl-automotive-generic',
    'easy-harness',
    'Generic TXL/GXL automotive wire',
    'TXL / GXL automotive wire',
    'txl',
    'XLPE',
    null,
    1,
    true,
    false,
    false,
    null,
    '{"supported_awg":[12,14,16,18,20,22],"colors":["Black","Red","White","Blue","Yellow","Green","Brown"]}'::jsonb,
    'easy-harness-starter-catalog',
    0.500,
    false
  ),
  (
    'ptfe-high-temp-generic',
    'easy-harness',
    'Generic PTFE high-temperature wire',
    'PTFE high-temp wire',
    'ptfe',
    'PTFE',
    null,
    1,
    true,
    false,
    false,
    null,
    '{"supported_awg":[18,20,22,24,26,28,30],"colors":["Black","Red","White","Blue","Yellow"]}'::jsonb,
    'easy-harness-starter-catalog',
    0.500,
    false
  )
on conflict (id) do update set
  manufacturer_id = excluded.manufacturer_id,
  spec = excluded.spec,
  display_name = excluded.display_name,
  wire_type = excluded.wire_type,
  insulation = excluded.insulation,
  color = excluded.color,
  conductor_count = excluded.conductor_count,
  stranded = excluded.stranded,
  shielded = excluded.shielded,
  twisted_pair = excluded.twisted_pair,
  voltage_rating_v = excluded.voltage_rating_v,
  attributes = excluded.attributes,
  source_id = excluded.source_id,
  confidence = excluded.confidence,
  direct_checkout_enabled = false,
  active = true;

insert into public.catalog_labor_operations (
  id,
  operation_type,
  display_name,
  description,
  unit,
  setup_seconds,
  run_seconds,
  cost_cents,
  conditions,
  confidence,
  direct_checkout_allowed
)
values
  ('cut_wire', 'cut_wire', 'Cut wire', 'Cut a wire to configured length.', 'per_wire', 0, 0, null, '{}'::jsonb, 0.400, false),
  ('strip_wire', 'strip_wire', 'Strip wire', 'Strip wire ends for termination.', 'per_wire', 0, 0, null, '{}'::jsonb, 0.400, false),
  ('crimp_terminal', 'crimp_terminal', 'Crimp terminal', 'Crimp a selected terminal onto a wire.', 'per_pin', 0, 0, null, '{}'::jsonb, 0.400, false),
  ('insert_terminal', 'insert_terminal', 'Insert terminal', 'Insert terminal into connector housing.', 'per_pin', 0, 0, null, '{}'::jsonb, 0.400, false),
  ('solder_splice', 'solder_splice', 'Solder splice', 'Join wires through solder splice and insulation.', 'per_branch', 0, 0, null, '{}'::jsonb, 0.400, false),
  ('continuity_test', 'continuity_test', 'Continuity test', 'Electrical continuity check for configured circuits.', 'per_harness', 0, 0, null, '{}'::jsonb, 0.400, false)
on conflict (id) do update set
  operation_type = excluded.operation_type,
  display_name = excluded.display_name,
  description = excluded.description,
  unit = excluded.unit,
  setup_seconds = excluded.setup_seconds,
  run_seconds = excluded.run_seconds,
  cost_cents = excluded.cost_cents,
  conditions = excluded.conditions,
  confidence = excluded.confidence,
  direct_checkout_allowed = false,
  active = true;

insert into public.catalog_pricing_rules (
  id,
  rule_type,
  display_name,
  rule,
  margin_bps,
  sort_order,
  active
)
values
  (
    'direct_checkout_gate_v1',
    'direct_checkout_gate',
    'Direct checkout eligibility gate',
    '{
      "requires": [
        "all_canvas_entities_mapped_to_catalog",
        "compatibility_edges_present",
        "wire_gauge_within_component_range",
        "required_terminals_and_accessories_resolved",
        "active_public_price_snapshots_present",
        "price_snapshots_not_expired",
        "labor_operations_priced",
        "no_configuration_blockers"
      ],
      "failure_status": "needs_price_release"
    }'::jsonb,
    null,
    10,
    true
  )
on conflict (id) do update set
  rule_type = excluded.rule_type,
  display_name = excluded.display_name,
  rule = excluded.rule,
  margin_bps = excluded.margin_bps,
  sort_order = excluded.sort_order,
  active = excluded.active;
