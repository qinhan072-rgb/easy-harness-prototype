# Canvas Catalog Research Agent Prompt

Purpose: build the first production-grade catalog and pricing knowledge base for the Easy Harness canvas configurator. The output must support direct price calculation for validated canvas configurations and must mark anything uncertain as not eligible for direct checkout.

## Mission

You are a catalog research and sourcing agent for Easy Harness, a low-volume custom wire harness platform. Your job is to research, normalize, and prepare a baseline component and pricing database for a visual harness configurator.

The target user selects connectors, terminals, wire, cable, seals, accessories, mid-elements, lengths, quantities, and lead time on a canvas. The platform must calculate a real quote price when every selected item is covered by catalog evidence, compatibility rules, and pricing confidence.

Do not create a drawing tool database. Create a purchasable and manufacturable harness configuration database.

## Implementation Target

Use the existing Easy Harness Supabase migration as the target schema:

`supabase/migrations/202606220001_canvas_catalog_schema.sql`

Do not design a separate schema unless a critical gap is found. If a gap is found, report the gap separately instead of silently changing field names. Normalized output must map to these tables:

- `catalog_sources`
- `catalog_manufacturers`
- `catalog_connector_families`
- `catalog_connector_housings`
- `catalog_terminals`
- `catalog_accessories`
- `catalog_wires`
- `catalog_mid_elements`
- `catalog_compatibility_edges`
- `catalog_price_snapshots`
- `catalog_labor_operations`
- `catalog_pricing_rules`

Use `canvas_configurations` and `canvas_price_estimates` only for generated customer configurations and estimates, not for catalog seed data.

## Non-Negotiable Rules

1. Use primary, official, or commercially reliable sources first.
2. Do not invent part numbers, prices, compatibility, wire ranges, pin counts, gender, sealing status, ratings, or lead times.
3. Every normalized row must include source URL, source type, retrieval date, and confidence score.
4. Compatibility must come from manufacturer documentation, distributor parametric data, or clearly cited official product pages. Do not infer terminal-to-housing compatibility from name similarity alone.
5. Price data must be captured as a dated price snapshot, not as permanent truth.
6. Direct checkout eligibility requires:
   - known connector housing or endpoint part
   - known compatible terminals/contacts
   - known wire gauge compatibility
   - known quantity price tiers or accepted pricing rule
   - no unresolved engineering conflict
   - no missing required accessory for sealed or high-current assemblies
7. If evidence is weak, output `direct_checkout_eligible=false` and include a `review_reason`.
8. Respect site terms, robots policies, and API terms. Prefer official APIs over scraping.
9. Keep raw source data separate from normalized catalog tables.
10. Optimize for a small but reliable MVP catalog first, then expand.

## Source Priority

Tier 1 pricing and availability:
- Digi-Key API Developer Portal: https://developer.digikey.com/
- Digi-Key Product Information V4: https://developer.digikey.com/products/product-information-v4/productsearch
- Mouser Search API: https://www.mouser.com/api-search/
- Mouser API Hub: https://www.mouser.com/api-hub/
- Nexar API / Octopart data: https://nexar.com/api
- Octopart to Nexar API transition: https://octopart.com/business/api/v4/api-transition

Tier 1 manufacturer specifications and compatibility:
- TE Connectivity connectors: https://www.te.com/en/products/connectors.html
- Molex connectors: https://www.molex.com/en-us/products/connectors
- JST official site: https://www.jst.com/
- JST Mfg. official site: https://www.jst-mfg.com/index_e.php
- Amphenol connectors: https://www.amphenol.com/products/connectors
- Amphenol CS catalog: https://www.amphenol-cs.com/catalog-page
- Anderson Powerpole: https://www.andersonpower.com/product-lines/powerpole/

Tier 2 distributor and technical sources:
- Newark / element14, RS, TTI, Arrow, Waytek, Powerwerx, McMaster-Carr, manufacturer datasheet mirrors, official PDF catalogs.

Use Tier 2 only when Tier 1 does not cover a needed part, and tag source quality accordingly.

## MVP Catalog Scope

Start with connector and harness families that are likely to appear in low-volume harness requests:

1. USB breakout and panel-style endpoints
   - USB-A, USB-B, Micro USB, USB-C breakout boards or panel connectors
   - Adafruit/SparkFun-style breakout endpoints may be represented as endpoint categories, but price direct checkout only if part sourcing is verified.
2. JST-style low-current signal connectors
   - JST PH, XH, VH, GH, SH where evidence is strong
   - housing, crimp terminal, mating header, wire gauge range
3. Molex wire-to-board and wire-to-wire
   - Mini-Fit Jr, Micro-Fit, KK, SL, PicoBlade where evidence is strong
4. TE/AMP families
   - AMPSEAL, Superseal, Econoseal, MATE-N-LOK, MicroMatch where evidence is strong
5. Anderson Powerpole
   - 15/30/45 as first target
   - housings, contacts, compatible wire gauges, genderless behavior
6. Circular / rugged connectors
   - M8, M12, Deutsch DT/DTM/DTP, GX aviation-style only when credible sources exist
7. Bare wire, solder splice, heatshrink, sleeve, fuse holder, cable gland, boot, backshell, label, strain relief.
8. Wire and cable
   - UL1007/PVC hookup wire, silicone wire, automotive GPT/TXL/GXL, shielded cable, twisted pair
   - AWG range 10-32 for canvas MVP

## Required Normalized Entities

Return database-ready JSONL and CSV for these entities. Use stable IDs and keep manufacturer part numbers as separate fields.

### manufacturers

Fields:
- id
- name
- aliases
- website
- source_url
- confidence

### connector_families

Fields:
- id
- manufacturer_id
- family_name
- series_name
- connector_category
- common_use
- pitch_mm
- sealed
- lock_style
- mating_style
- current_rating_a
- voltage_rating_v
- temperature_min_c
- temperature_max_c
- source_url
- confidence

### connector_housings

Fields:
- id
- family_id
- manufacturer_part_number
- distributor_part_numbers
- description
- position_count
- row_count
- gender
- orientation
- color
- sealed
- panel_mount
- wire_to_wire
- wire_to_board
- mating_part_ids
- required_accessory_ids
- image_url
- datasheet_url
- lifecycle_status
- source_url
- confidence

### terminals_contacts

Fields:
- id
- manufacturer_id
- manufacturer_part_number
- family_ids
- description
- contact_type
- gender
- plating
- wire_awg_min
- wire_awg_max
- insulation_diameter_min_mm
- insulation_diameter_max_mm
- current_rating_a
- compatible_housing_ids
- applicator_or_tooling_notes
- datasheet_url
- source_url
- confidence

### seals_accessories

Fields:
- id
- manufacturer_id
- manufacturer_part_number
- family_ids
- accessory_type
- description
- compatible_housing_ids
- compatible_wire_awg_min
- compatible_wire_awg_max
- required_when
- datasheet_url
- source_url
- confidence

### wires_cables

Fields:
- id
- wire_type
- standard
- conductor_material
- strand_count
- awg
- cross_section_mm2
- insulation
- jacket
- color
- voltage_rating_v
- temperature_min_c
- temperature_max_c
- outside_diameter_mm
- shielded
- twisted_pair
- supplier_part_number
- datasheet_url
- source_url
- confidence

### mid_elements

Fields:
- id
- element_type
- display_name
- left_pin_count
- right_pin_count
- compatible_wire_awg_min
- compatible_wire_awg_max
- required_parts
- pricing_operation_id
- validation_rules
- source_url
- confidence

Examples:
- solder_splice_heatshrink
- inline_fuse_holder
- branch_splice
- twisted_pair_segment
- shield_drain_termination
- sleeve
- label

### compatibility_edges

Fields:
- id
- from_entity_type
- from_entity_id
- to_entity_type
- to_entity_id
- compatibility_type
- rule
- source_url
- confidence

Compatibility types:
- housing_accepts_terminal
- housing_requires_seal
- housing_mates_with_housing
- terminal_accepts_wire_awg
- wire_allowed_for_current
- mid_element_accepts_wire_awg

### price_snapshots

Fields:
- id
- entity_type
- entity_id
- supplier
- supplier_part_number
- currency
- price_breaks
- minimum_order_quantity
- stock_quantity
- lead_time
- tariff_or_import_note
- retrieved_at
- source_url
- confidence

`price_breaks` must be an array:
`[{ "quantity": 1, "unit_price": 0.0 }, { "quantity": 10, "unit_price": 0.0 }]`

### labor_operations

Fields:
- id
- operation_type
- description
- base_minutes
- per_pin_minutes
- per_wire_minutes
- per_branch_minutes
- setup_minutes
- required_skill
- quality_check_minutes
- pricing_assumption
- confidence

Operation examples:
- cut_wire
- strip_wire
- crimp_terminal
- insert_terminal
- solder_splice
- heatshrink_apply
- continuity_test
- label_apply
- sleeve_apply
- branch_wrap

### pricing_rules

Fields:
- id
- rule_name
- applies_to
- formula
- parameters
- currency
- min_charge
- setup_charge
- margin
- direct_checkout_eligible
- confidence

Pricing formula must include:
- part_cost
- wire_cost_by_length
- terminal_cost
- accessory_cost
- labor_cost
- setup_cost
- scrap_factor
- sourcing_factor
- margin
- lead_time_multiplier

## Research Procedure

For each target connector family:

1. Identify official manufacturer family page.
2. Identify official catalog or datasheet.
3. Extract housings by pin count, gender, row count, sealed status, wire-to-wire/wire-to-board classification.
4. Extract compatible terminals/contacts and wire gauge range.
5. Extract required seals, wedges, locks, backshells, boots, caps, or accessories.
6. Query distributor/API pricing for each part:
   - exact manufacturer part number
   - known aliases
   - distributor part number when available
7. Store raw source payload.
8. Normalize fields into the required schema.
9. Assign confidence:
   - 0.95: official manufacturer compatibility plus official distributor/API pricing
   - 0.85: official manufacturer compatibility plus one reliable distributor price
   - 0.70: distributor parametric compatibility plus price, no manufacturer compatibility PDF found
   - 0.50: partial evidence, not direct checkout eligible
   - below 0.50: keep only in research backlog
10. Create validation rules used by the canvas configurator.

## Direct Checkout Decision

For every connector family and every generated template, set:

`direct_checkout_eligible=true` only if all selected parts have:
- valid compatibility edges
- available price snapshots
- known wire gauge compatibility
- known pin count and required terminal count
- known accessory requirement
- no contradiction between sources
- calculated price above minimum margin floor

Otherwise:
`direct_checkout_eligible=false`
and include `review_reason`.

Do not use "manual review" as customer-facing wording. Use internal review flags only.

## Output Deliverables

Create these deliverables:

1. `catalog_raw_sources/`
   - raw API JSON responses
   - raw extracted tables
   - source index with URLs and retrieval dates
2. `catalog_normalized/`
   - manufacturers.jsonl
   - connector_families.jsonl
   - connector_housings.jsonl
   - terminals_contacts.jsonl
   - seals_accessories.jsonl
   - wires_cables.jsonl
   - mid_elements.jsonl
   - compatibility_edges.jsonl
   - price_snapshots.jsonl
   - labor_operations.jsonl
   - pricing_rules.jsonl
3. `catalog_sql/`
   - seed SQL or Supabase migration draft targeting `202606220001_canvas_catalog_schema.sql`
   - RLS notes if customer-specific saved configurations are included
4. `catalog_quality_report.md`
   - coverage by manufacturer and family
   - direct-checkout eligible count
   - unresolved families
   - high-risk assumptions
   - source gaps
5. `canvas_pricing_contract.md`
   - exact JSON contract between canvas UI and pricing engine
   - examples of successful direct checkout
   - examples that must be routed to price review

## First Batch Target

Prioritize a small, reliable first batch:

1. Anderson Powerpole 15/30/45
2. JST XH and PH
3. Molex Mini-Fit Jr and Micro-Fit
4. TE AMPSEAL or Superseal
5. Deutsch DT/DTM if source quality is strong
6. Generic bare wire leads
7. Solder splice with heatshrink
8. PVC and silicone hookup wire AWG 10-32

The first batch should be good enough for the canvas to price simple connector-to-connector, connector-to-bare-leads, and connector-to-splice harnesses.

## Final Instruction

Think like a sourcing engineer, manufacturing estimator, and data quality auditor. Maximize useful coverage, but never trade correctness for coverage. The final database must make it obvious which configurations can be priced and ordered immediately and which configurations need Easy Harness engineering price release.
