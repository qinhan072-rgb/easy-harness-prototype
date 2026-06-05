# Easy Harness Visual Draft Agent Spec

Status: product contract for Agent Lab and the formal customer Draft UI.

This document exists so the Agent's capability is not stored in a chat memory.
The model may change, prompts may change, and the UI may improve, but the
customer-facing target must not drift.

## North Star

The customer-facing Draft must feel like:

```text
Received, understood, and clear.
```

The Draft is not an internal engineering report. It is not a manufacturing package.
It is not a questionnaire. It is the clear middle object between messy customer
input and Easy Harness review.

## Customer-Facing Output Invariant

Every visual Draft should help the customer see three things quickly:

1. Easy Harness received the material they provided.
2. Easy Harness understood the connection goal and organized it visually.
3. Easy Harness only needs a small number of useful answers, if any.

The visible output should remain intuitive and clear even when the internal
Agent architecture becomes more sophisticated.

Do not let schema, evals, prompt engineering, or model routing change the
customer-facing goal into a technical audit screen.

## Product Object

The target object is an Easy Harness Visual Draft.

It can contain:

- A plain-language customer goal.
- A wiring or harness poster showing devices, boards, ends, wire groups, route
  zones, and open decisions.
- A short "what Easy Harness understood" section.
- Evidence coverage for uploaded files or attachment observations.
- A small set of customer questions only when helpful.
- Easy Harness review items that should not be pushed onto the customer.

It must not claim:

- Final pin-to-pin production correctness.
- Final connector, terminal, crimp, wire gauge, or BOM selection.
- Visual/OCR/document understanding unless the current run has observations
  that support it.

## Required Evidence Model

The Agent output should preserve these structures:

```text
requirement_map.schema_version = easy_harness_requirement_map_v0_1
requirement_map.connection_goal
requirement_map.endpoints
requirement_map.harness_sections
requirement_map.connection_groups
requirement_map.open_items
requirement_map.evidence_refs
understanding.goal
understanding.fact_trace
understanding.evidence_coverage
understanding.question_plan
understanding.draft_readiness
poster.boards
poster.wire_groups
poster.route_zones
poster.unknown_items
```

The purpose of these structures is product trust, not engineering clutter.

`requirement_map` is the standardization layer between messy user input and the
visual Draft. It captures the connection goal, endpoints, route sections,
connection groups, open items, and evidence references before the poster is
drawn.

`fact_trace` tells the customer, "we listened."

`evidence_coverage` tells the customer, "we received your files, and we know
what we can and cannot claim from them."

`question_plan` tells the customer, "we are asking only because this answer
matters."

`draft_readiness` tells the product, "this can proceed to Easy Harness review"
or "one basic connection goal is still missing."

## Question Policy

Questions must be sparse and purposeful.

Default maximum: 2 customer-facing questions.

Ask only if the answer changes one of these:

- Connection goal.
- End/device identity.
- Quantity.
- Length or routing basis.
- Power/load basis when it materially affects review.
- Whether an existing connector/device end must be matched.

Do not ask the customer for manufacturing details when Easy Harness can review
them internally:

- Exact connector part number.
- Terminal or crimp selection.
- Final wire gauge.
- Shield termination method.
- Certification language.
- Full production test plan.

If the customer may not know the answer, the question must say or imply that
unknown is acceptable. The output should not make a non-blocking engineering
detail feel like a blocker.

## Readiness Policy

`ready_for_easy_harness_review` means:

```text
The request is clear enough for Easy Harness to review and prepare the next
quote/manufacturing-readiness step.
```

It does not mean:

```text
Ready for production.
Ready for BOM release.
Ready for cut list.
Ready for final manufacturing package.
```

Use `needs_customer_reply` when a short customer answer would materially improve
the Draft but the connection goal is already recognizable.

Use `connection_goal_missing` when the Agent still cannot tell what the harness
should connect, copy, or replace.

## Visual Standard

The visual should be closer to a customer-facing wiring poster than to a tiny
block diagram:

- Main source/controller/device side.
- Target device/end groups.
- Wire groups by function or route.
- Optional or unknown items as explicit callouts.
- Evidence and boundary notes.
- Route zones if provided or inferable at a high level.

The visual should be honest. It can be simplified, but it must not invent
precision.

The visual should be derived from `requirement_map`, not directly from a free
model drawing instruction. If a device, wire group, route zone, or open item is
not represented in the map, it should not appear as a confident element in the
poster.

Renderer responsibility:

- Use `requirement_map.endpoints` as the primary visual device/end list.
- Use `requirement_map.connection_groups` as the primary wire-group list.
- Use `requirement_map.harness_sections` as the primary route-zone basis.
- Use `requirement_map.open_items` for unknowns and reply-needed callouts.
- Use `requirement_map.evidence_refs` for the visible evidence summary.
- Use `poster.*` only as presentation hints or fallback when a current map is
  unavailable.

If the model output does not contain an evidence-supported topology,
deterministic post-processing must leave endpoints and connection groups empty.
The customer view should acknowledge receipt and show that the connection
layout is not confirmed yet. It must not draw a placeholder connection merely
to make the Draft look complete.

## Current Iteration Route

The current experimental route is:

```text
customer input + attachment observations
  -> model-interpreted requirement_map_v0_1
  -> formal run-checking AI evidence audit
  -> deterministic evidence/closure reconciliation
  -> easy_harness_visual_draft_spec_v0_1
  -> deterministic visual renderer
```

The formal evidence audit is a second semantic pass. It removes unsupported
topology, repeated questions, and nonblocking customer questions without
selecting a workflow from product names, file types, or test phrases. It
increases latency and model cost, but it protects the customer-facing Draft from
looking complete before the connection basis is actually supported.

This route is intentionally narrower than a full manufacturing engineering
pipeline. It is meant to reduce repeated work and improve Draft clarity, not to
release BOM, cut list, or final build instructions.

## Local Eval

The hidden Agent Lab has a local model eval command:

```powershell
npm.cmd run agent:eval
```

By default this runs the full checked-in regression set. Individual cases can
still be selected for debugging, but no small group of familiar cases is
treated as proof of general Agent capability.

The eval calls the local Agent Lab API and may depend on Qwen latency. It is not
part of ordinary `npm.cmd run test`; smoke tests only verify that the eval
harness and cases exist.

## Formal Intake Alignment

The formal `run-checking` Edge Function uses the same closure principles for
the customer-facing Easy Harness Draft:

- A Draft requires an evidence-supported connection, copy, replacement, or
  adaptation goal. A filename, file type, connector name, or pin table is not
  automatically a connection goal.
- There is no universal list of customer blockers. Quantity, length,
  environment, electrical ratings, and other details are asked only when the
  specific Draft cannot be represented honestly without them.
- The Draft model must output `requirement_map` as its semantic connection
  interpretation. Deterministic post-processing validates its topology, owns
  current customer questions and evidence boundaries, and supplies an honest
  minimal fallback when the model map is incomplete.
- The second evidence-audit pass checks the first Draft against the same request
  evidence before the Draft is persisted. It should preserve supplied facts,
  remove unsupported topology, and move supplier/manufacturing details to Easy
  Harness review when they do not require another customer reply.
- `check_result.requirement_map` is the reconciled map used for formal visual
  Draft rendering.
- The customer thread renders the visual Draft from `requirement_map` for both
  incomplete and review-ready requests. Unknown endpoints and incomplete
  connections stay visibly uncertain.
- The detailed known-requirements table remains available as supporting detail,
  but the visual Draft is the primary customer-facing representation.
- Customer questions are deduplicated by meaning, and known-detail aliases are
  normalized before they are shown so one Draft does not display conflicting
  known/unknown values.

Changing `supabase/functions/run-checking/index.ts` requires redeploying the
Supabase Edge Function; a Vercel frontend deployment alone does not update the
formal intake Agent.

## Non-Goals

This spec does not require model fine-tuning.

This spec does not require open-source model training.

This spec does not replace attachment parsing. File understanding still comes
from attachment observations, vision, OCR, document parsing, spreadsheet
parsing, or CAD metadata probes.

The immediate goal is durable product behavior:

```text
reasoning instructions + schema + diverse evals + evidence-bound validation
```

Fine-tuning can be considered later if there are enough high-quality labeled
Draft examples.
