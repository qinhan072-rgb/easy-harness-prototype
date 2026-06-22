-- Easy Harness canvas direct pricing.
-- Adds the internal price book used by the canvas configurator and a narrow
-- RPC for converting a priced canvas request into a released quote.

insert into public.catalog_sources (id, source_type, name, base_url, api_docs_url, notes, active)
values (
  'easy-harness-internal-price-book',
  'internal_curated',
  'Easy Harness internal price book',
  null,
  null,
  'Deterministic internal catalog price book for canvas checkout. Not a live external market feed.',
  true
)
on conflict (id) do update set
  source_type = excluded.source_type,
  name = excluded.name,
  notes = excluded.notes,
  active = true,
  updated_at = now();

insert into public.catalog_price_snapshots (
  entity_type,
  entity_id,
  source_id,
  supplier_name,
  supplier_part_number,
  manufacturer_part_number,
  currency,
  price_breaks,
  visibility,
  confidence,
  direct_checkout_allowed,
  active
)
values
  ('connector_housing', 'adafruit-5978', 'easy-harness-internal-price-book', 'Easy Harness internal catalog', 'adafruit-5978', '5978', 'USD', '[{"min_qty":1,"unit_cents":495}]'::jsonb, 'public_catalog', 0.950, true, true),
  ('connector_housing', 'adafruit-5180', 'easy-harness-internal-price-book', 'Easy Harness internal catalog', 'adafruit-5180', '5180', 'USD', '[{"min_qty":1,"unit_cents":695}]'::jsonb, 'public_catalog', 0.950, true, true),
  ('connector_housing', 'adafruit-6050', 'easy-harness-internal-price-book', 'Easy Harness internal catalog', 'adafruit-6050', '6050', 'USD', '[{"min_qty":1,"unit_cents":450}]'::jsonb, 'public_catalog', 0.950, true, true),
  ('connector_housing', 'anderson-1327g6-bk', 'easy-harness-internal-price-book', 'Easy Harness internal catalog', 'anderson-1327g6-bk', '1327G6-BK', 'USD', '[{"min_qty":1,"unit_cents":85}]'::jsonb, 'public_catalog', 0.950, true, true),
  ('connector_housing', 'anderson-1327g6-red', 'easy-harness-internal-price-book', 'Easy Harness internal catalog', 'anderson-1327g6-red', '1327G6-RED', 'USD', '[{"min_qty":1,"unit_cents":85}]'::jsonb, 'public_catalog', 0.950, true, true),
  ('connector_housing', 'harwin-m20-1060600', 'easy-harness-internal-price-book', 'Easy Harness internal catalog', 'harwin-m20-1060600', 'M20-1060600', 'USD', '[{"min_qty":1,"unit_cents":36}]'::jsonb, 'public_catalog', 0.950, true, true),
  ('connector_housing', 'jst-b6b-xh-a', 'easy-harness-internal-price-book', 'Easy Harness internal catalog', 'jst-b6b-xh-a', 'B6B-XH-A(LF)(SN)', 'USD', '[{"min_qty":1,"unit_cents":22}]'::jsonb, 'public_catalog', 0.950, true, true),
  ('connector_housing', 'molex-43025-0400', 'easy-harness-internal-price-book', 'Easy Harness internal catalog', 'molex-43025-0400', '43025-0400', 'USD', '[{"min_qty":1,"unit_cents":48}]'::jsonb, 'public_catalog', 0.950, true, true),
  ('connector_housing', 'deutsch-dt04-2p', 'easy-harness-internal-price-book', 'Easy Harness internal catalog', 'deutsch-dt04-2p', 'DT04-2P', 'USD', '[{"min_qty":1,"unit_cents":185}]'::jsonb, 'public_catalog', 0.950, true, true),
  ('terminal', 'terminal-usb-breakout', 'easy-harness-internal-price-book', 'Easy Harness internal catalog', 'terminal-usb-breakout', 'solder-pad-standard', 'USD', '[{"min_qty":1,"unit_cents":12}]'::jsonb, 'public_catalog', 0.950, true, true),
  ('terminal', 'terminal-anderson-powerpole-15-45', 'easy-harness-internal-price-book', 'Easy Harness internal catalog', 'terminal-anderson-powerpole-15-45', 'powerpole-contact-standard', 'USD', '[{"min_qty":1,"unit_cents":110}]'::jsonb, 'public_catalog', 0.950, true, true),
  ('terminal', 'terminal-harwin-m20', 'easy-harness-internal-price-book', 'Easy Harness internal catalog', 'terminal-harwin-m20', 'm20-contact-standard', 'USD', '[{"min_qty":1,"unit_cents":14}]'::jsonb, 'public_catalog', 0.950, true, true),
  ('terminal', 'terminal-jst-xh', 'easy-harness-internal-price-book', 'Easy Harness internal catalog', 'terminal-jst-xh', 'sxh-contact-standard', 'USD', '[{"min_qty":1,"unit_cents":7}]'::jsonb, 'public_catalog', 0.950, true, true),
  ('terminal', 'terminal-molex-microfit-3', 'easy-harness-internal-price-book', 'Easy Harness internal catalog', 'terminal-molex-microfit-3', 'microfit-contact-standard', 'USD', '[{"min_qty":1,"unit_cents":18}]'::jsonb, 'public_catalog', 0.950, true, true),
  ('terminal', 'terminal-deutsch-dt', 'easy-harness-internal-price-book', 'Easy Harness internal catalog', 'terminal-deutsch-dt', 'size-16-contact-standard', 'USD', '[{"min_qty":1,"unit_cents":95}]'::jsonb, 'public_catalog', 0.950, true, true),
  ('wire', 'silicone-hookup-generic', 'easy-harness-internal-price-book', 'Easy Harness internal catalog', 'silicone-hookup-generic', 'silicone-hookup-generic', 'USD', '[{"awg":10,"meter_cents":410},{"awg":12,"meter_cents":318},{"awg":14,"meter_cents":232},{"awg":16,"meter_cents":168},{"awg":18,"meter_cents":126},{"awg":20,"meter_cents":96},{"awg":22,"meter_cents":72},{"awg":24,"meter_cents":54},{"awg":26,"meter_cents":44},{"awg":28,"meter_cents":36},{"awg":30,"meter_cents":30}]'::jsonb, 'public_catalog', 0.950, true, true),
  ('wire', 'ul1007-hookup-generic', 'easy-harness-internal-price-book', 'Easy Harness internal catalog', 'ul1007-hookup-generic', 'ul1007-hookup-generic', 'USD', '[{"awg":16,"meter_cents":72},{"awg":18,"meter_cents":56},{"awg":20,"meter_cents":44},{"awg":22,"meter_cents":34},{"awg":24,"meter_cents":28},{"awg":26,"meter_cents":24},{"awg":28,"meter_cents":20}]'::jsonb, 'public_catalog', 0.950, true, true),
  ('wire', 'txl-gxl-automotive-generic', 'easy-harness-internal-price-book', 'Easy Harness internal catalog', 'txl-gxl-automotive-generic', 'txl-gxl-automotive-generic', 'USD', '[{"awg":12,"meter_cents":118},{"awg":14,"meter_cents":92},{"awg":16,"meter_cents":70},{"awg":18,"meter_cents":52},{"awg":20,"meter_cents":42},{"awg":22,"meter_cents":34}]'::jsonb, 'public_catalog', 0.950, true, true),
  ('wire', 'ptfe-high-temp-generic', 'easy-harness-internal-price-book', 'Easy Harness internal catalog', 'ptfe-high-temp-generic', 'ptfe-high-temp-generic', 'USD', '[{"awg":18,"meter_cents":188},{"awg":20,"meter_cents":148},{"awg":22,"meter_cents":112},{"awg":24,"meter_cents":88},{"awg":26,"meter_cents":72},{"awg":28,"meter_cents":58},{"awg":30,"meter_cents":48}]'::jsonb, 'public_catalog', 0.950, true, true),
  ('mid_element', 'splice', 'easy-harness-internal-price-book', 'Easy Harness internal catalog', 'splice', 'splice-standard', 'USD', '[{"min_qty":1,"unit_cents":60}]'::jsonb, 'public_catalog', 0.950, true, true),
  ('mid_element', 'cable', 'easy-harness-internal-price-book', 'Easy Harness internal catalog', 'cable', 'cable-breakout-standard', 'USD', '[{"min_qty":1,"unit_cents":180}]'::jsonb, 'public_catalog', 0.950, true, true),
  ('mid_element', 'fuse', 'easy-harness-internal-price-book', 'Easy Harness internal catalog', 'fuse', 'inline-fuse-standard', 'USD', '[{"min_qty":1,"unit_cents":325}]'::jsonb, 'public_catalog', 0.950, true, true),
  ('mid_element', 'sleeve', 'easy-harness-internal-price-book', 'Easy Harness internal catalog', 'sleeve', 'sleeve-standard', 'USD', '[{"min_qty":1,"unit_cents":120}]'::jsonb, 'public_catalog', 0.950, true, true),
  ('labor_operation', 'cut_wire', 'easy-harness-internal-price-book', 'Easy Harness internal catalog', 'cut_wire', 'cut_wire', 'USD', '[{"unit":"per_wire","unit_cents":40}]'::jsonb, 'public_catalog', 0.950, true, true),
  ('labor_operation', 'crimp_terminal', 'easy-harness-internal-price-book', 'Easy Harness internal catalog', 'crimp_terminal', 'crimp_terminal', 'USD', '[{"unit":"per_pin","unit_cents":85}]'::jsonb, 'public_catalog', 0.950, true, true),
  ('labor_operation', 'solder_terminal', 'easy-harness-internal-price-book', 'Easy Harness internal catalog', 'solder_terminal', 'solder_terminal', 'USD', '[{"unit":"per_pin","unit_cents":120}]'::jsonb, 'public_catalog', 0.950, true, true),
  ('labor_operation', 'continuity_test', 'easy-harness-internal-price-book', 'Easy Harness internal catalog', 'continuity_test', 'continuity_test', 'USD', '[{"unit":"per_harness","unit_cents":250}]'::jsonb, 'public_catalog', 0.950, true, true);

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
  direct_checkout_allowed,
  active
)
values
  ('cut_wire', 'cut_wire', 'Cut and strip wire', 'Cut wire to length and strip both ends.', 'per_wire', 0, 72, 40, '{}'::jsonb, 0.950, true, true),
  ('crimp_terminal', 'crimp_terminal', 'Crimp terminal', 'Crimp selected contact onto wire.', 'per_pin', 0, 55, 85, '{}'::jsonb, 0.950, true, true),
  ('solder_terminal', 'solder_terminal', 'Solder breakout pad', 'Solder lead to board breakout pad.', 'per_pin', 0, 85, 120, '{}'::jsonb, 0.950, true, true),
  ('mid_element_assembly', 'mid_element_assembly', 'Mid element assembly', 'Assemble splice, cable, fuse, or sleeve node.', 'each', 0, 120, 160, '{"splice":160,"cable":220,"fuse":180,"sleeve":110}'::jsonb, 0.950, true, true),
  ('continuity_test', 'continuity_test', 'Continuity test', 'Electrical continuity check for configured circuits.', 'per_harness', 0, 180, 250, '{}'::jsonb, 0.950, true, true),
  ('circuit_label', 'label', 'Circuit label', 'Apply circuit label to configured wire.', 'per_wire', 0, 20, 18, '{}'::jsonb, 0.950, true, true),
  ('pack_harness', 'pack', 'Pack harness', 'Pack harness for checkout shipment.', 'per_harness', 0, 90, 125, '{}'::jsonb, 0.950, true, true),
  ('order_handling', 'order_handling', 'Order handling', 'Checkout handling for a priced canvas order.', 'per_harness', 0, 300, 500, '{}'::jsonb, 0.950, true, true)
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
  direct_checkout_allowed = true,
  active = true,
  updated_at = now();

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
  ('canvas_material_markup_2026_06', 'material_markup', 'Canvas material markup', '{"basis":"internal_catalog_material_total"}'::jsonb, 2800, 20, true),
  ('canvas_labor_markup_2026_06', 'labor_markup', 'Canvas labor markup', '{"basis":"internal_operation_labor_total"}'::jsonb, 1800, 30, true),
  ('canvas_minimum_harness_2026_06', 'minimum_order', 'Canvas minimum harness price', '{"minimum_harness_price_cents":1250}'::jsonb, null, 40, true),
  ('canvas_quantity_discount_2026_06', 'material_markup', 'Canvas quantity discount', '{"discount_bps":[{"min_qty":10,"bps":500},{"min_qty":25,"bps":800},{"min_qty":100,"bps":1200}]}'::jsonb, null, 50, true)
on conflict (id) do update set
  rule_type = excluded.rule_type,
  display_name = excluded.display_name,
  rule = excluded.rule,
  margin_bps = excluded.margin_bps,
  sort_order = excluded.sort_order,
  active = excluded.active,
  updated_at = now();

create or replace function public.release_canvas_configuration_quote(
  p_request_id uuid,
  p_title text,
  p_quantity integer,
  p_catalog_version text,
  p_configuration jsonb,
  p_pricing_summary jsonb,
  p_basis_message_ids uuid[] default '{}'
)
returns public.quotes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.requests%rowtype;
  v_canvas public.canvas_configurations%rowtype;
  v_quote public.quotes%rowtype;
  v_next_version integer;
  v_total_cents integer;
  v_subtotal_cents integer;
  v_material_cents integer;
  v_labor_cents integer;
  v_blockers text[];
begin
  select *
  into v_request
  from public.requests
  where id = p_request_id
    and customer_id = auth.uid()
  for update;

  if not found then
    raise exception 'Request not found';
  end if;

  v_total_cents := coalesce((p_pricing_summary->>'totalCents')::integer, 0);
  v_subtotal_cents := coalesce((p_pricing_summary->>'subtotalCents')::integer, v_total_cents);
  v_material_cents := coalesce((p_pricing_summary->>'materialTotalCents')::integer, 0);
  v_labor_cents := coalesce((p_pricing_summary->>'laborTotalCents')::integer, 0);
  v_blockers := coalesce(
    array(select jsonb_array_elements_text(coalesce(p_pricing_summary->'blockers', '[]'::jsonb))),
    '{}'
  );

  if coalesce((p_pricing_summary->>'directCheckoutEligible')::boolean, false) is not true then
    raise exception 'Canvas configuration is not eligible for checkout';
  end if;

  if v_total_cents <= 0 then
    raise exception 'Canvas price is missing';
  end if;

  insert into public.canvas_configurations (
    customer_id,
    request_id,
    title,
    quantity,
    status,
    source,
    catalog_version,
    configuration,
    pricing_summary,
    direct_checkout_eligible,
    quote_currency,
    quote_subtotal_cents,
    quote_total_cents,
    price_expires_at,
    blockers,
    submitted_at
  )
  values (
    auth.uid(),
    p_request_id,
    coalesce(nullif(p_title, ''), v_request.title),
    greatest(coalesce(p_quantity, 1), 1),
    'priced',
    'canvas_configurator',
    coalesce(p_catalog_version, ''),
    coalesce(p_configuration, '{}'::jsonb),
    coalesce(p_pricing_summary, '{}'::jsonb),
    true,
    coalesce(p_pricing_summary->>'currency', 'USD'),
    v_subtotal_cents,
    v_total_cents,
    current_date + 14,
    v_blockers,
    now()
  )
  returning * into v_canvas;

  insert into public.canvas_price_estimates (
    canvas_configuration_id,
    status,
    quantity,
    currency,
    material_total_cents,
    labor_total_cents,
    margin_total_cents,
    total_cents,
    line_items,
    blockers,
    source_snapshot_ids,
    expires_at,
    created_by
  )
  values (
    v_canvas.id,
    'eligible',
    greatest(coalesce(p_quantity, 1), 1),
    coalesce(p_pricing_summary->>'currency', 'USD'),
    v_material_cents,
    v_labor_cents,
    greatest(v_total_cents - v_material_cents - v_labor_cents, 0),
    v_total_cents,
    coalesce(p_pricing_summary->'lineItems', '[]'::jsonb),
    v_blockers,
    '{}',
    current_date + 14,
    auth.uid()
  );

  select coalesce(max(version), 0) + 1
  into v_next_version
  from public.quotes
  where request_id = p_request_id;

  insert into public.quotes (
    request_id,
    version,
    amount,
    currency,
    basis_message_ids,
    status,
    released_by,
    valid_until
  )
  values (
    p_request_id,
    v_next_version,
    round(v_total_cents::numeric / 100, 2),
    coalesce(p_pricing_summary->>'currency', 'USD'),
    coalesce(p_basis_message_ids, '{}'),
    'released',
    null,
    current_date + 14
  )
  returning * into v_quote;

  update public.requests
  set
    status = 'ready_to_confirm',
    active_quote_id = v_quote.id,
    check_status = 'accepted',
    check_result = jsonb_set(
      coalesce(check_result, '{}'::jsonb),
      '{pricing}',
      jsonb_build_object(
        'source', 'canvas_configurator',
        'pricingBookVersion', p_pricing_summary->>'pricingBookVersion',
        'totalCents', v_total_cents,
        'currency', coalesce(p_pricing_summary->>'currency', 'USD')
      ),
      true
    ),
    updated_at = now()
  where id = p_request_id;

  return v_quote;
end;
$$;

grant execute on function public.release_canvas_configuration_quote(
  uuid,
  text,
  integer,
  text,
  jsonb,
  jsonb,
  uuid[]
) to authenticated;
