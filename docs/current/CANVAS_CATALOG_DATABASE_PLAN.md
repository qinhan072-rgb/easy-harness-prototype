# Canvas Catalog Database Plan

This document defines the database boundary for the Easy Harness Canvas Configurator catalog and pricing path.

## Product Boundary

The canvas configurator is a separate request entry path from the AI Agent and Upload Design flows.

It can produce a stronger configured harness item than an AI intake draft because the customer is selecting catalog parts, pin counts, wire options, quantities, and connection structure directly. However, a configured canvas item is not automatically eligible for direct checkout until the system can prove catalog coverage, compatibility, current pricing, and labor pricing.

Until that gate is passed, the canvas item should remain a configured request that is ready for Easy Harness price release.

## Direct Checkout Gate

A canvas configuration can go directly to quote/order only when all of the following are true:

- Every connector, wire, terminal, seal, accessory, and mid element is mapped to a catalog ID.
- Compatibility edges prove that the selected terminals, seals, accessories, wire gauges, and housings work together.
- Every selected part has an active, source-backed price snapshot that is not expired.
- Labor operations required for the configuration are priced and active.
- No unresolved warnings remain in the canvas validation result.
- The generated estimate has `direct_checkout_eligible = true`.

Starter seed rows must not enable direct checkout. They exist only to make the catalog shape usable and to support UI development.

## Upload Design File Boundary

Upload Design is for prepared engineering packages, not early ideas.

Require at least one engineering source file:

- PDF drawing or specification package
- CAD drawing or exchange file such as DXF, DWG, STEP, IGES, or native CAD export
- Spreadsheet pinout, BOM, cut list, or quantity table such as CSV, TSV, XLS, or XLSX
- ZIP package containing one or more of the above

Images, photos, handwritten notes, screenshots, and free text can be attached only as supporting references. If the customer only has a rough idea, they should use the AI Agent entry path.

## Catalog Tables

The first schema migration creates these catalog tables:

- `catalog_sources`: provenance for each curated source, API source, distributor source, or internal source.
- `catalog_manufacturers`: canonical manufacturer records and aliases.
- `catalog_connector_families`: searchable connector families and series-level attributes.
- `catalog_connector_housings`: selectable connector or breakout records shown on the canvas.
- `catalog_terminals`: compatible crimp, solder, IDC, ferrule, or related terminals.
- `catalog_accessories`: seals, wedges, backshells, boots, caps, labels, and similar add-ons.
- `catalog_wires`: wire and cable options with AWG range and rating tags.
- `catalog_mid_elements`: splice, fuse, sleeve, cable, junction, and other inline elements.
- `catalog_compatibility_edges`: typed compatibility assertions between catalog records.
- `catalog_price_snapshots`: source-backed price and lead-time evidence.
- `catalog_labor_operations`: priced manufacturing operations needed by the estimate.
- `catalog_pricing_rules`: versioned pricing rules and eligibility gates.

The customer configuration output is stored separately:

- `canvas_configurations`: customer-owned structured canvas data.
- `canvas_price_estimates`: generated estimates, warnings, blockers, and checkout eligibility.

## Accepted Data Sources

Use these sources for catalog and pricing enrichment:

- Manufacturer part pages and datasheets.
- Authorized distributor APIs such as Digi-Key, Mouser, and Nexar/Octopart.
- Internal Easy Harness curated records based on verified supplier or factory quotes.

Do not use random marketplace pages, competitor UI content, screenshots, or unsourced web snippets as pricing truth.

## Next Implementation Phases

1. Add the schema and RLS foundation.
2. Build importer and curation tooling for authorized manufacturer and distributor data.
3. Map Canvas Configurator selections to catalog IDs rather than front-end-only mock IDs.
4. Add a pricing service or RPC that creates `canvas_price_estimates`.
5. Allow direct checkout only when `direct_checkout_eligible = true`.

## Non-goals

- Do not build a full ERP catalog in the first pass.
- Do not treat the canvas drawing as a final manufacturing drawing.
- Do not expose unverified prices as customer-checkout prices.
- Do not remove the AI Agent or Upload Design entry paths.
