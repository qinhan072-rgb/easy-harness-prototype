# Easy Harness v0.4 — Electrical Gate Correction

This patch replaces the earlier v0.4 Draft Gate Balance package.
Do not use the previous `easy-harness-v04-draft-gate-balance.zip`.

This corrected v0.4 is based on v0.3 and keeps the core v0.3 principle:
- Do not generate an Easy Harness Draft too early.
- Do not write case-specific scripts for individual tests.
- Do not expose manual/staff/manual review wording to users.
- Do not add quotation, payment, supplier RFQ, connector library, terminal library, production BOM, or schema changes.

## Main correction

Electrical information is not treated as a generic optional engineering detail.
For power-carrying requests, expected voltage and current/power are functional and safety basics.

The Agent should not move maximum current/current/power into Easy Harness review just to generate a Draft faster.
If a request includes a supply pin, battery, motor, heater, actuator, pump, inverter, driver, or other load and current/power is missing, the Agent should ask a concise question before closing the Draft.

## Still preserved

The Agent should not force users to provide factory-production details such as terminal part numbers, exact crimp specs, tooling, IPC class, FAI, packaging, or production BOM.
Those remain Easy Harness review / later engineering items.

## UI polish included

The customer-facing UI now humanizes internal unknown field keys such as:
- power_details
- voltage_current_or_power
- current_or_power
- ip67_method
- terminal_and_crimp_specs
- routing_and_branch_design

These should not appear as raw snake_case labels in the user interface.
