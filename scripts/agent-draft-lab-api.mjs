import http from "node:http";
import { readFileSync, existsSync } from "node:fs";

const defaultSecretPath =
  "D:\\Harness\\easy-harness-project-materials\\secrets\\qwen.local.env";
const secretPath = process.env.QWEN_LOCAL_ENV_PATH || defaultSecretPath;
const port = Number(process.env.AGENT_DRAFT_LAB_PORT || 8787);

function readLocalEnv(path) {
  if (!existsSync(path)) {
    throw new Error(`Secret file not found: ${path}`);
  }
  const env = {};
  const text = readFileSync(path, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const separator = line.indexOf("=");
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key) env[key] = value;
  }
  return env;
}

function jsonResponse(response, status, body) {
  response.writeHead(status, {
    "Access-Control-Allow-Origin": "http://127.0.0.1:5173",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Request body too large."));
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function extractJsonObject(text = "") {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Qwen returned an empty response.");
  if (trimmed.startsWith("```")) {
    const withoutFence = trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    if (withoutFence) return withoutFence;
  }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

function safeString(value, fallback = "", limit = 1200) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, limit)
    : fallback;
}

function safeStringArray(value, limit = 8) {
  return Array.isArray(value)
    ? value
        .map((item) => safeString(item, "", 300))
        .filter(Boolean)
        .slice(0, limit)
    : [];
}

function uniqueStrings(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function pickField(object, ...keys) {
  if (!object || typeof object !== "object" || Array.isArray(object)) return undefined;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(object, key)) return object[key];
  }
  return undefined;
}

function pickArray(object, ...keys) {
  const value = pickField(object, ...keys);
  return Array.isArray(value) ? value : [];
}

function pickObject(object, ...keys) {
  const value = pickField(object, ...keys);
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function pickString(object, keys, fallback = "", limit = 1200) {
  return safeString(pickField(object, ...keys), fallback, limit);
}

function pickBoolean(object, ...keys) {
  const value = pickField(object, ...keys);
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return /^(true|yes|1)$/i.test(value.trim());
  return Boolean(value);
}

function powerLoadPhrase(input) {
  const lower = safeString(input, "", 4000).toLowerCase();
  const detected = [];
  if (/\bpump\b|pump relay/.test(lower)) detected.push("pump relay");
  if (/\bheater\b|hotend|heated/.test(lower)) detected.push("heater");
  if (/\bfan\b|cooling/.test(lower)) detected.push("fan");
  if (/\bmotor\b|actuator|servo/.test(lower)) detected.push("motor or actuator");
  if (/\brelay\b/.test(lower) && !detected.includes("pump relay")) detected.push("relay load");
  return detected.length
    ? `${uniqueStrings(detected).slice(0, 3).join(", ")} or any other power load`
    : "any heater, fan, motor, relay, or other power load";
}

function softenCustomerQuestion(question, fallbackInput = "") {
  const value = safeString(question, "", 260);
  const lower = value.toLowerCase();
  if (!value) return "";
  if (/(2-wire|3-wire|rtd|thermistor|temperature sensor|temp sensor)/.test(lower)) {
    return "If you know it, what type or model are the temperature sensors, or should Easy Harness identify them from the photos/sample?";
  }
  if (/(current|voltage|power|heater|fan|motor)/.test(lower)) {
    return `For the ${powerLoadPhrase(fallbackInput)}, what voltage/current or device model should Easy Harness use if you know it?`;
  }
  if (/(drag chain|cable carrier|routing|route|loom path|flex)/.test(lower)) {
    return "Should the harness move through a cable carrier/drag chain, or is it mostly fixed routing?";
  }
  if (/(connector|housing|mate|mating|terminal|crimp)/.test(lower)) {
    return "Do any device ends already have fixed connectors we must match, or should Easy Harness identify them from photos/samples?";
  }
  if (/(datasheet|exact model|part number|pn)/.test(lower)) {
    return "If available, please share the device model or a clearer photo for the unclear end.";
  }
  return value.replace(/\?*$/, "?");
}

function questionReason(question, modelReason = "") {
  const lower = question.toLowerCase();
  if (/(other end|far end|end b|connector b)/.test(lower)) {
    return "This defines what the known connector or pinout should connect to, so Easy Harness does not organize the wrong harness scope.";
  }
  if (/(quantity|approximate length|length)/.test(lower)) {
    return "This sets the quote scope and the basic route scale for the visual draft.";
  }
  if (/(current|voltage|power load|fan|heater|pump|motor|relay)/.test(lower)) {
    return "This helps Easy Harness review the load, wire gauge, connector rating, and protection approach without guessing.";
  }
  if (/(temperature sensor|temp sensor|rtd|thermistor)/.test(lower)) {
    return "This helps Easy Harness organize the sensor wire group and conductor count without pretending the sensor type is already confirmed.";
  }
  if (/(drag chain|cable carrier|routing|route|fixed routing)/.test(lower)) {
    return "This affects how the draft shows the trunk, branch routing, flex area, and strain-relief needs.";
  }
  if (/(connector|photo|sample|fixed connectors|match)/.test(lower)) {
    return "This tells Easy Harness whether an end is fixed by an existing device or should be identified from photos/samples.";
  }
  return safeString(
    modelReason,
    "This answer affects the visual draft scope or review basis.",
    220,
  );
}

function questionIfUnknown(question, modelFallback = "") {
  const lower = question.toLowerCase();
  if (/(other end|far end|end b|connector b)/.test(lower)) {
    return "If unknown, Easy Harness can keep the other end open and continue from the connector, pinout, photos, and files already received.";
  }
  if (/(quantity|approximate length|length)/.test(lower)) {
    return "If unknown, give an estimate or mark it unknown; Easy Harness can keep it as a review item.";
  }
  if (/(current|voltage|power load|fan|heater|pump|motor|relay)/.test(lower)) {
    return "If unknown, Easy Harness can keep it as a review item and continue from the device model, photos, or sample.";
  }
  if (/(temperature sensor|temp sensor|rtd|thermistor)/.test(lower)) {
    return "If unknown, Easy Harness can keep the sensor type open and confirm it from photos, samples, or later review.";
  }
  if (/(drag chain|cable carrier|routing|route|fixed routing)/.test(lower)) {
    return "If unknown, Easy Harness can mark routing as tentative and confirm it during review.";
  }
  if (/(connector|photo|sample|fixed connectors|match)/.test(lower)) {
    return "If unknown, Easy Harness can identify the connector family from clearer photos, samples, or later review.";
  }
  return safeString(
    modelFallback,
    "Customer can mark this unknown and Easy Harness will continue from photos, samples, or review.",
    220,
  );
}

function normalizeCustomerQuestions(value, fallbackInput = "") {
  const softened = safeStringArray(value, 5)
    .map((item) => softenCustomerQuestion(item, fallbackInput))
    .filter(Boolean);
  return uniqueStrings(softened).slice(0, 2);
}

function normalizeQuestionPlan(value, fallbackQuestions, fallbackInput = "") {
  const rawItems = Array.isArray(value) ? value : [];
  const planned = rawItems
    .filter((item) => item && typeof item === "object")
    .slice(0, 4)
    .map((item) => {
      const question = softenCustomerQuestion(item.question, fallbackInput);
      if (!question) return null;
      return {
        question,
        whyNeeded: questionReason(question, item.why_needed),
        ifUnknown: questionIfUnknown(question, item.if_unknown),
        blocksReview:
          Boolean(item.blocks_review) &&
          !/(if you know it|if available|identify them from photos|mark this unknown)/i.test(question),
      };
    })
    .filter(Boolean);

  const fallback = fallbackQuestions.map((question) => ({
    question,
    whyNeeded: "This answer helps Easy Harness avoid organizing the wrong harness scope.",
    ifUnknown: "If unknown, Easy Harness can keep it as a review item and continue with the available evidence.",
    blocksReview: false,
  }));

  const combined = [...planned, ...fallback];
  const seen = new Set();
  return combined
    .filter((item) => {
      const key = item.question.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 2);
}

function normalizeEvidenceItems(value, fallbackFiles) {
  const rawItems = Array.isArray(value) ? value : [];
  const items = rawItems
    .filter((item) => item && typeof item === "object")
    .slice(0, 10)
    .map((item, index) => ({
      source: safeString(item.source, fallbackFiles[index] || `Source ${index + 1}`, 120),
      understood: safeString(item.understood, "Received as customer-provided material.", 220),
      boundary: safeString(item.boundary, "Use as draft evidence, not final production proof.", 220),
      confidence: safeString(item.confidence, "draft", 40),
    }))
    .filter((item) => item.source || item.understood);

  if (items.length) return items;
  return safeStringArray(fallbackFiles, 8).map((file) => ({
    source: file,
    understood: "Received as customer-provided material.",
    boundary: "Content has not been fully interpreted in this lab unless described in the customer text.",
    confidence: "received",
  }));
}

function normalizeFactTrace(value, fallbackFacts) {
  const rawItems = Array.isArray(value) ? value : [];
  const traced = rawItems
    .filter((item) => item && typeof item === "object")
    .slice(0, 12)
    .map((item, index) => ({
      fact: safeString(item.fact, fallbackFacts[index] || "", 220),
      source: safeString(item.source, "Customer message", 120),
      status: safeString(item.status, "understood", 40),
    }))
    .filter((item) => item.fact);

  if (traced.length) return traced;
  return safeStringArray(fallbackFacts, 10).map((fact) => ({
    fact,
    source: "Customer message or listed file",
    status: "understood",
  }));
}

function normalizeRequirementMap(rawValue, context) {
  const value =
    rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)
      ? rawValue
      : {};
  const boards = context.boards || [];
  const wireGroups = context.wireGroups || [];
  const evidenceCoverage = context.evidenceCoverage || [];
  const knownFacts = context.understoodItems || [];
  const unknownItems = context.unknownItems || [];
  const customerQuestions = context.customerQuestions || [];
  const easyHarnessReview = context.easyHarnessReview || [];

  const rawEndpoints = pickArray(value, "endpoints", "endpoint_list", "endpointList");
  const endpoints = (rawEndpoints.length
    ? rawEndpoints
    : boards.map((board, index) => ({
        id: board.id || `endpoint_${index + 1}`,
        label: board.title,
        role: index === 0 ? "source" : "target",
        known_from: board.subtitle || "Visual draft device grouping",
        status: board.role === "unknown" ? "unknown" : "identified",
      }))
  )
    .filter((item) => item && typeof item === "object")
    .slice(0, 10)
    .map((endpoint, index) => ({
      id: pickString(endpoint, ["id"], `endpoint_${index + 1}`, 80),
      label: pickString(endpoint, ["label", "title", "name"], `Endpoint ${index + 1}`, 100),
      role: pickString(endpoint, ["role"], index === 0 ? "source" : "target", 40),
      knownFrom: pickString(endpoint, ["known_from", "knownFrom", "basis"], "Customer-provided material", 180),
      status: pickString(endpoint, ["status"], "identified", 40),
      evidenceRefs: safeStringArray(pickField(endpoint, "evidence_refs", "evidenceRefs", "sources"), 4),
    }));
  if (!endpoints.length) {
    endpoints.push(
      {
        id: "customer_request_basis",
        label: "Customer request basis",
        role: "source_or_reference",
        knownFrom: "Customer message or supplied files",
        status: "partially_identified",
        evidenceRefs: [],
      },
      {
        id: "unknown_other_end",
        label: "Other end or target to confirm",
        role: "unknown_target",
        knownFrom: "Not yet clear from current input",
        status: "unknown",
        evidenceRefs: [],
      },
    );
  }

  const rawSections = pickArray(value, "harness_sections", "harnessSections", "sections");
  const harnessSections = (rawSections.length
    ? rawSections
    : safeStringArray(context.routeZones, 6).map((zone, index) => ({
        id: `section_${index + 1}`,
        label: zone,
        type: index === 0 ? "trunk_or_main_route" : "branch_or_route_zone",
        length_basis: "",
        status: "draft",
      }))
  )
    .filter((item) => item && typeof item === "object")
    .slice(0, 8)
    .map((section, index) => ({
      id: pickString(section, ["id"], `section_${index + 1}`, 80),
      label: pickString(section, ["label", "title", "name"], `Harness section ${index + 1}`, 100),
      type: pickString(section, ["type"], "route_section", 60),
      lengthBasis: pickString(section, ["length_basis", "lengthBasis"], "", 120),
      routeBasis: pickString(section, ["route_basis", "routeBasis"], "", 140),
      status: pickString(section, ["status"], "draft", 40),
    }));
  if (!harnessSections.length) {
    harnessSections.push({
      id: "route_basis_to_review",
      label: "Route basis to review",
      type: "route_section",
      lengthBasis: "",
      routeBasis: "Not yet clear from current input",
      status: "unknown",
    });
  }

  const rawGroups = pickArray(value, "connection_groups", "connectionGroups", "wire_groups", "wireGroups");
  const connectionGroups = (rawGroups.length
    ? rawGroups
    : wireGroups.map((group, index) => ({
        id: group.id || `connection_group_${index + 1}`,
        label: group.label,
        from: group.from,
        to: group.to,
        function: group.purpose || "unknown",
        known_signals: group.signals || [],
        status: group.confidence || "draft",
        evidence_refs: [],
      }))
  )
    .filter((item) => item && typeof item === "object")
    .slice(0, 14)
    .map((group, index) => ({
      id: pickString(group, ["id"], `connection_group_${index + 1}`, 80),
      label: pickString(group, ["label", "title", "name"], `Connection group ${index + 1}`, 100),
      from: pickString(group, ["from", "source"], endpoints[0]?.id || "source", 80),
      to: pickString(group, ["to", "target"], endpoints[Math.min(index + 1, endpoints.length - 1)]?.id || "target", 80),
      function: pickString(group, ["function", "purpose"], "unknown", 80),
      knownSignals: safeStringArray(pickField(group, "known_signals", "knownSignals", "signals"), 12),
      status: pickString(group, ["status", "confidence"], "draft", 40),
      evidenceRefs: safeStringArray(pickField(group, "evidence_refs", "evidenceRefs", "sources"), 5),
      reviewNeeded: safeStringArray(pickField(group, "review_needed", "reviewNeeded"), 4),
    }));
  if (!connectionGroups.length && endpoints.length > 1) {
    connectionGroups.push({
      id: "draft_connection_basis",
      label: "Draft connection basis",
      from: endpoints[0].id,
      to: endpoints[1].id,
      function: "connection goal or target still needs confirmation",
      knownSignals: [],
      status: "unknown",
      evidenceRefs: [],
      reviewNeeded: ["Confirm what the harness should connect, copy, or replace."],
    });
  }

  const rawOpenItems = pickArray(value, "open_items", "openItems", "unknown_items", "unknownItems");
  const openItems = (rawOpenItems.length
    ? rawOpenItems
    : uniqueStrings([...unknownItems, ...customerQuestions]).map((item) => ({
        item,
        owner: "customer_or_easy_harness",
        why_it_matters: "This affects review confidence or final build preparation.",
        blocks_review: false,
      }))
  )
    .filter((item) => item && typeof item === "object")
    .slice(0, 8)
    .map((item) => ({
      item: pickString(item, ["item", "label", "question"], "", 180),
      owner: pickString(item, ["owner"], "easy_harness_review", 60),
      whyItMatters: pickString(item, ["why_it_matters", "whyItMatters"], "This affects review confidence or final build preparation.", 220),
      blocksReview: pickBoolean(item, "blocks_review", "blocksReview"),
    }))
    .filter((item) => item.item);

  const rawEvidenceRefs = pickArray(value, "evidence_refs", "evidenceRefs", "evidence");
  const evidenceRefs = (rawEvidenceRefs.length
    ? rawEvidenceRefs
    : evidenceCoverage.map((item) => ({
        source: item.source,
        supports: item.understood,
        boundary: item.boundary,
      }))
  )
    .filter((item) => item && typeof item === "object")
    .slice(0, 10)
    .map((item) => ({
      source: pickString(item, ["source", "file"], "Customer-provided material", 120),
      supports: pickString(item, ["supports", "understood"], "Draft evidence", 220),
      boundary: pickString(item, ["boundary"], "Use as draft evidence until Easy Harness confirms the details.", 220),
    }));

  return {
    schemaVersion: "easy_harness_requirement_map_v0_1",
    connectionGoal:
      pickString(value, ["connection_goal", "connectionGoal"], "", 260) ||
      context.goal ||
      "Customer wiring harness request",
    endpoints,
    harnessSections,
    connectionGroups,
    knownFacts: safeStringArray(pickField(value, "known_facts", "knownFacts"), 10).length
      ? safeStringArray(pickField(value, "known_facts", "knownFacts"), 10)
      : safeStringArray(knownFacts, 10),
    openItems,
    easyHarnessReviewItems: safeStringArray(
      pickField(value, "easy_harness_review_items", "easyHarnessReviewItems"),
      8,
    ).length
      ? safeStringArray(pickField(value, "easy_harness_review_items", "easyHarnessReviewItems"), 8)
      : safeStringArray(easyHarnessReview, 8),
    evidenceRefs,
  };
}

function softenUnknownItem(item) {
  const value = safeString(item, "", 220);
  const lower = value.toLowerCase();
  if (!value) return "";
  if (/(exact voltage|exact current|current rating|voltage rating|operating current|load rating|load ratings)/.test(lower)) {
    return "Power-load voltage/current or device model still needs confirmation if known.";
  }
  if (/(dynamic flex|flex section|drag chain|cable carrier)/.test(lower)) {
    return "Routing through cable carriers, drag chains, or mostly fixed loom still needs confirmation.";
  }
  if (/(crimp|terminal|wire gauge|fuse|thermal|shield)/.test(lower)) {
    return "Engineering details will be confirmed during Easy Harness review.";
  }
  return value;
}

function normalizeDraftReadinessState(rawState, fallbackInput, requirementMap, customerQuestions) {
  const allowed = new Set([
    "ready_for_easy_harness_review",
    "needs_customer_reply",
    "connection_goal_missing",
  ]);
  const raw = safeString(rawState, "", 60);
  const input = safeString(fallbackInput, "", 12000).toLowerCase();
  const mapText = JSON.stringify({
    goal: requirementMap.connectionGoal,
    endpoints: requirementMap.endpoints,
    openItems: requirementMap.openItems,
    groups: requirementMap.connectionGroups,
  }).toLowerCase();
  const hasConnectionAction =
    /(\bconnects?\b|\bcopy\b|\breplace\b|harness from|from .{1,80} to |between |end a|end b|other end|connector a|controller|ecu|sensor|fan|motor)/.test(input);
  const cadReferenceOnly =
    /(cad-style|cad reference|step|dxf|stl|dimensional\/context|not final manufacturing drawings)/.test(input) &&
    !hasConnectionAction;
  const connectorAOnly =
    /(connector a|end a)/.test(input) &&
    !/(connector b|end b|other end|bare wire|flying lead|wire lead|labeled lead|connects? .{1,80} to )/.test(input);

  if (
    cadReferenceOnly ||
    (/connection goal missing|unknown source|unknown target/.test(mapText) && !hasConnectionAction)
  ) {
    return "connection_goal_missing";
  }
  if (
    connectorAOnly ||
    /other end|target to confirm|unknown other end|quantity missing|length missing/.test(mapText)
  ) {
    return "needs_customer_reply";
  }
  if (allowed.has(raw)) return raw;
  return customerQuestions.length
    ? "needs_customer_reply"
    : "ready_for_easy_harness_review";
}

function hasExplicitOtherEnd(input) {
  return /(other end|end b|connector b|bare wire|flying lead|wire lead|labeled lead|pigtail|to two|to three|to four|connects? .{1,80} to |from .{1,80} to |between .{1,80} and )/i.test(input);
}

function hasQuantity(input) {
  return /(\bqty\b|quantity|\b\d+\s*(pcs|pieces|sets|units)\b)/i.test(input);
}

function hasLength(input) {
  return /(length|about\s*\d+(?:\.\d+)?\s*(mm|cm|m)\b|\b\d+(?:\.\d+)?\s*(mm|cm|m)\b)/i.test(input);
}

function isSingleConnectorBasis(input) {
  return /(connector a|end a|dt06|deutsch|pinout|pin mapping|spreadsheet|csv|xlsx)/i.test(input) &&
    !hasExplicitOtherEnd(input);
}

function includesMeaning(items, pattern) {
  const text = flattenForGuard(items);
  return pattern.test(text);
}

function flattenForGuard(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.toLowerCase();
  if (Array.isArray(value)) return value.map(flattenForGuard).join(" ");
  if (typeof value === "object") return Object.values(value).map(flattenForGuard).join(" ");
  return `${value}`.toLowerCase();
}

function appendUniqueOpenItem(items, nextItem) {
  const text = `${nextItem.item} ${nextItem.whyItMatters}`.toLowerCase();
  if (items.some((item) => `${item.item} ${item.whyItMatters}`.toLowerCase().includes(nextItem.item.toLowerCase()))) {
    return items;
  }
  if (items.some((item) => text.includes(`${item.item || ""}`.toLowerCase()) && `${item.item || ""}`.length > 4)) {
    return items;
  }
  return [...items, nextItem];
}

function appendUniqueQuestion(questions, nextQuestion) {
  const next = nextQuestion.toLowerCase();
  if (questions.some((question) => question.toLowerCase() === next)) return questions;
  if (questions.some((question) => /other end|quantity|length/i.test(question) && /other end|quantity|length/i.test(nextQuestion))) {
    return questions;
  }
  return [...questions, nextQuestion];
}

function prependUniqueQuestion(questions, nextQuestion) {
  const next = nextQuestion.toLowerCase();
  const filtered = questions.filter((question) => question.toLowerCase() !== next);
  return [nextQuestion, ...filtered];
}

function isCadReferenceOnly(input) {
  const lower = safeString(input, "", 12000).toLowerCase();
  const hasCadReference = /(cad-style|cad reference|cad files|step|dxf|stl|dimensional\/context|dimensional context|not final manufacturing drawings)/.test(lower);
  const hasAction = /(\bconnects?\b|\bcopy\b|\breplace\b|harness from|from .{1,80} to |between |end a|end b|other end|controller|ecu|sensor|fan|motor)/.test(lower);
  return hasCadReference && !hasAction;
}

function refineRequirementMapForClosure(requirementMap, fallbackInput) {
  const input = safeString(fallbackInput, "", 12000);
  const refined = {
    ...requirementMap,
    endpoints: [...(requirementMap.endpoints || [])],
    harnessSections: [...(requirementMap.harnessSections || [])],
    openItems: [...(requirementMap.openItems || [])],
  };
  const inputLower = input.toLowerCase();

  if (isCadReferenceOnly(input)) {
    refined.endpoints = [
      {
        id: "unknown_source",
        label: "Unknown source",
        role: "unknown_source",
        knownFrom: "CAD reference files received, connection source not stated",
        status: "unknown",
        evidenceRefs: [],
      },
      {
        id: "unknown_target",
        label: "Unknown target",
        role: "unknown_target",
        knownFrom: "CAD reference files received, connection target not stated",
        status: "unknown",
        evidenceRefs: [],
      },
    ];
    refined.openItems = appendUniqueOpenItem(refined.openItems, {
      item: "Connection goal missing",
      owner: "customer",
      whyItMatters: "Easy Harness needs to know what the harness should connect, copy, or replace before creating a review-ready Draft.",
      blocksReview: true,
    });
  }

  if (isSingleConnectorBasis(input)) {
    const otherEndEndpoint = refined.endpoints.find((endpoint) =>
      /unknown.*target|target.*unknown|connector b|end b|other end|far end/i.test(
        `${endpoint.id || ""} ${endpoint.label || ""} ${endpoint.role || ""} ${endpoint.status || ""}`,
      ),
    );
    if (otherEndEndpoint) {
      otherEndEndpoint.id = "unknown_other_end";
      otherEndEndpoint.label = "Unknown other end";
      otherEndEndpoint.role = "unknown_target";
      otherEndEndpoint.knownFrom = otherEndEndpoint.knownFrom || "Not stated in current customer input";
      otherEndEndpoint.status = "unknown";
    } else {
      refined.endpoints.push({
        id: "unknown_other_end",
        label: "Unknown other end",
        role: "unknown_target",
        knownFrom: "Not stated in current customer input",
        status: "unknown",
        evidenceRefs: [],
      });
    }
  }

  const lengthMatch = input.match(/(?:target\s*)?length(?:\s+is)?\s*(?:about\s*)?(\d+(?:\.\d+)?\s*(?:mm|cm|m)\b)|\babout\s+(\d+(?:\.\d+)?\s*(?:mm|cm|m)\b)/i);
  const lengthValue = lengthMatch?.[1] || lengthMatch?.[2] || "";
  if (lengthValue && !includesMeaning(refined.harnessSections, /target length/i)) {
    refined.harnessSections.push({
      id: "target_length_basis",
      label: `Target length about ${lengthValue}`,
      type: "length_basis",
      lengthBasis: `about ${lengthValue}`,
      routeBasis: "Customer text",
      status: "approximate",
    });
  }

  if (/12\s*v/.test(inputLower) && /automotive/.test(inputLower) && /sensor branch/.test(inputLower) && !includesMeaning(refined.harnessSections, /12\s*v automotive sensor branch/)) {
    refined.harnessSections.push({
      id: "application_basis",
      label: "12V automotive sensor branch",
      type: "application_context",
      lengthBasis: "",
      routeBasis: "Customer text",
      status: "provided",
    });
  }

  if (isSingleConnectorBasis(input)) {
    refined.openItems = appendUniqueOpenItem(refined.openItems, {
      item: "Other end missing",
      owner: "customer",
      whyItMatters: "Easy Harness needs to know the far end, termination, or device side before the request can be treated as review-ready.",
      blocksReview: true,
    });
  }
  if (!hasQuantity(input)) {
    refined.openItems = appendUniqueOpenItem(refined.openItems, {
      item: "Quantity missing",
      owner: "customer",
      whyItMatters: "Quantity changes quote scope and preparation.",
      blocksReview: false,
    });
  }
  if (isSingleConnectorBasis(input) && !hasLength(input)) {
    refined.openItems = appendUniqueOpenItem(refined.openItems, {
      item: "Length missing",
      owner: "customer",
      whyItMatters: "Approximate length is needed to scale the visual draft and quote basis.",
      blocksReview: false,
    });
  }

  return refined;
}

function refineQuestionsForClosure(questions, fallbackInput, requirementMap) {
  const input = safeString(fallbackInput, "", 12000);
  let refined = [...questions];
  const mapText = flattenForGuard(requirementMap);
  if (isCadReferenceOnly(input) || /connection goal missing/.test(mapText)) {
    return ["What should this harness or cable connect, copy, or replace?"];
  }
  if (isSingleConnectorBasis(input) || /other end missing|unknown other end|target to confirm/.test(mapText)) {
    refined = prependUniqueQuestion(refined, "What is the other end of the harness, or should Easy Harness treat it as unknown for now?");
  }
  const needsQuantity = !hasQuantity(input) || /quantity missing/.test(mapText);
  const needsLength = !hasLength(input) || /length missing/.test(mapText);
  if (needsQuantity && needsLength) {
    refined = prependUniqueQuestion(refined, "What quantity and approximate length are needed, if known?");
  } else if (needsQuantity) {
    refined = prependUniqueQuestion(refined, "What quantity is needed, if known?");
  } else if (needsLength) {
    refined = prependUniqueQuestion(refined, "What approximate length is needed, if known?");
  }
  return refined.slice(0, 2);
}

function refineQuestionPlanForClosure(questionPlan, customerQuestions, fallbackInput) {
  const existingByQuestion = new Map(questionPlan.map((item) => [item.question, item]));
  return customerQuestions.map((question) => {
    if (existingByQuestion.has(question)) return existingByQuestion.get(question);
    return {
      question,
      whyNeeded: questionReason(question),
      ifUnknown: questionIfUnknown(question),
      blocksReview: /other end/i.test(question),
    };
  });
}

function readinessReasonForState(state, rawReadiness, customerQuestions) {
  const rawState = safeString(rawReadiness.state, "", 60);
  const rawReason = safeString(rawReadiness.reason, "", 260);
  if (rawState === state && rawReason) return rawReason;
  if (state === "connection_goal_missing") {
    return "Easy Harness received the supplied material, but the current input does not yet say what the harness should connect, copy, or replace.";
  }
  if (state === "needs_customer_reply") {
    return customerQuestions.length
      ? "A short customer reply would materially improve the draft before Easy Harness review."
      : "One basic request detail is still needed before the visual draft should be treated as review-ready.";
  }
  return rawReason || "The connection basis is clear enough for Easy Harness review.";
}

function customerNextStepForState(state, rawReadiness, customerQuestions) {
  const rawState = safeString(rawReadiness.state, "", 60);
  const rawNextStep = safeString(rawReadiness.customer_next_step || rawReadiness.customerNextStep, "", 180);
  if (rawState === state && rawNextStep) return rawNextStep;
  if (state === "connection_goal_missing") {
    return "Tell Easy Harness what this harness should connect, copy, or replace.";
  }
  if (state === "needs_customer_reply") {
    return customerQuestions.length
      ? "Reply to the listed questions, or mark unknown."
      : "Add the missing end, quantity, length, or mark it unknown.";
  }
  return rawNextStep || "No immediate customer reply is required before review.";
}

function normalizeVisualDraftSpec(raw, fallbackInput, fallbackFiles) {
  const value =
    raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const poster = pickObject(value, "poster");
  const rawPosterBoards = pickArray(poster, "boards", "endpoints");
  const boards = rawPosterBoards.length
    ? rawPosterBoards
        .filter((item) => item && typeof item === "object")
        .slice(0, 8)
        .map((board, index) => ({
          id: pickString(board, ["id"], `board_${index + 1}`, 80),
          title: pickString(board, ["title", "label", "name"], `Device ${index + 1}`, 80),
          subtitle: pickString(board, ["subtitle", "known_from", "knownFrom"], "", 120),
          role: pickString(board, ["role"], index === 0 ? "source" : "target", 40),
          tone: pickString(board, ["tone"], index === 0 ? "dark" : "teal", 20),
          ports: safeStringArray(pickField(board, "ports", "signals"), 10),
        }))
    : [];
  const rawPosterWireGroups = pickArray(poster, "wire_groups", "wireGroups", "connection_groups", "connectionGroups");
  const wireGroups = rawPosterWireGroups.length
    ? rawPosterWireGroups
        .filter((item) => item && typeof item === "object")
        .slice(0, 14)
        .map((group, index) => ({
          id: pickString(group, ["id"], `wire_group_${index + 1}`, 80),
          label: pickString(group, ["label", "title", "name"], `Wire group ${index + 1}`, 80),
          from: pickString(group, ["from", "source"], boards[0]?.id || "source", 80),
          to: pickString(group, ["to", "target"], boards[Math.min(index + 1, boards.length - 1)]?.id || "target", 80),
          route_zone: pickString(group, ["route_zone", "routeZone"], "", 80),
          purpose: pickString(group, ["purpose", "function"], "", 160),
          signals: safeStringArray(pickField(group, "signals", "known_signals", "knownSignals"), 12),
          optional: pickBoolean(group, "optional"),
          confidence: pickString(group, ["confidence", "status"], "draft", 40),
        }))
    : [];
  const rawCallouts = pickArray(poster, "callouts");
  const callouts = rawCallouts.length
    ? rawCallouts
        .filter((item) => item && typeof item === "object")
        .slice(0, 6)
        .map((callout, index) => ({
          title: pickString(callout, ["title", "label"], `Callout ${index + 1}`, 80),
          body: pickString(callout, ["body", "text"], "", 260),
          tone: pickString(callout, ["tone"], index === 0 ? "warning" : "info", 20),
        }))
    : [];

  let customerQuestions = normalizeCustomerQuestions(
    pickField(value, "customer_questions", "customerQuestions"),
    fallbackInput,
  );
  const unknownItems = uniqueStrings(
    safeStringArray(pickField(poster, "unknown_items", "unknownItems"), 8)
      .map(softenUnknownItem)
      .filter(Boolean),
  );
  const understanding = pickObject(value, "understanding");
  const evidenceCoverage = normalizeEvidenceItems(
    pickField(understanding, "evidence_coverage", "evidenceCoverage"),
    fallbackFiles,
  );
  const understoodFromCustomer = safeStringArray(
    pickField(understanding, "understood_from_customer", "understoodFromCustomer"),
    8,
  );
  const understoodFromFiles = safeStringArray(
    pickField(understanding, "understood_from_files", "understoodFromFiles"),
    8,
  );
  const understoodItems = uniqueStrings([
    ...understoodFromCustomer,
    ...understoodFromFiles,
    ...safeStringArray(pickField(value, "summary_points", "summaryPoints"), 6),
  ]).slice(0, 10);
  let questionPlan = normalizeQuestionPlan(
    pickField(understanding, "question_plan", "questionPlan"),
    customerQuestions,
    fallbackInput,
  );
  const factTrace = normalizeFactTrace(
    pickField(understanding, "fact_trace", "factTrace"),
    understoodItems,
  );
  const rawReadiness = pickObject(understanding, "draft_readiness", "draftReadiness");
  const goal =
    pickString(understanding, ["customer_goal", "customerGoal"], "", 260) ||
    pickString(value, ["title"], "Customer wiring harness request", 180);
  const easyHarnessReview = safeStringArray(pickField(value, "easy_harness_review", "easyHarnessReview"), 8);
  let requirementMap = normalizeRequirementMap(pickField(value, "requirement_map", "requirementMap"), {
    boards,
    wireGroups,
    evidenceCoverage,
    understoodItems,
    unknownItems,
    customerQuestions,
    easyHarnessReview,
    routeZones: pickField(poster, "route_zones", "routeZones"),
    goal,
  });
  requirementMap = refineRequirementMapForClosure(requirementMap, fallbackInput);
  customerQuestions = refineQuestionsForClosure(customerQuestions, fallbackInput, requirementMap);
  questionPlan = refineQuestionPlanForClosure(questionPlan, customerQuestions, fallbackInput);
  const readinessState = normalizeDraftReadinessState(
    pickField(rawReadiness, "state"),
    fallbackInput,
    requirementMap,
    customerQuestions,
  );

  return {
    schema_version: "easy_harness_visual_draft_spec_v0_1",
    visualType: "ai_poster",
    title:
      pickString(value, ["title"], "", 120) ||
      "Easy Harness visual wiring draft",
    promise:
      pickString(value, ["customer_takeaway", "customerTakeaway"], "", 500) ||
      "Easy Harness organized the submitted material into a visual draft for review.",
    known: safeStringArray(pickField(value, "summary_points", "summaryPoints"), 8),
    customerQuestions,
    easyHarnessReview,
    files: safeStringArray(fallbackFiles, 12),
    requirementMap,
    understanding: {
      goal,
      understood: understoodItems,
      factTrace,
      evidenceCoverage,
      notYetKnown: unknownItems.length ? unknownItems : customerQuestions,
      replyNeeded: customerQuestions,
      questionPlan,
      draftReadiness: {
        state: readinessState,
        reason: readinessReasonForState(readinessState, rawReadiness, customerQuestions),
        customerNextStep: customerNextStepForState(readinessState, rawReadiness, customerQuestions),
      },
      readinessSignal:
        pickString(understanding, ["readiness_signal", "readinessSignal"], "", 260) ||
        (customerQuestions.length
          ? "A short customer reply is still useful before Easy Harness review."
          : "Enough request structure is available for Easy Harness review."),
    },
    confidence: {
      connection: pickString(pickObject(value, "confidence"), ["connection"], "draft", 60),
      fileEvidence: pickString(pickObject(value, "confidence"), ["file_evidence", "fileEvidence"], "customer supplied material", 80),
      production: pickString(pickObject(value, "confidence"), ["production_boundary", "productionBoundary"], "visual draft only", 80),
    },
    poster: {
      headline:
        pickString(poster, ["headline"], "", 120) ||
        pickString(value, ["title"], "Easy Harness visual draft", 120),
      subheadline:
        pickString(poster, ["subheadline"], "", 180) ||
        "AI-organized wiring basis from customer-provided material.",
      warning:
        pickString(poster, ["warning"], "", 220) ||
        "Draft only. Easy Harness confirms final pin map, connector selection, and production details.",
      boards,
      wire_groups: wireGroups,
      route_zones: safeStringArray(pickField(poster, "route_zones", "routeZones"), 6),
      callouts,
      evidence_items:
        safeStringArray(pickField(poster, "evidence_items", "evidenceItems"), 8).length
          ? safeStringArray(pickField(poster, "evidence_items", "evidenceItems"), 8)
          : safeStringArray(fallbackFiles, 8),
      unknown_items:
        unknownItems.length
          ? unknownItems
          : customerQuestions,
    },
    raw_input_excerpt: safeString(fallbackInput, "", 1000),
  };
}

function visualDraftPrompt({ input, files }) {
  const fileList = safeStringArray(files, 20);
  const schema = {
    schema_version: "easy_harness_visual_draft_spec_v0_1",
    title: "string",
    customer_takeaway: "string",
    visual_style: "wiring_poster",
    requirement_map: {
      schema_version: "easy_harness_requirement_map_v0_1",
      connection_goal: "plain connection goal",
      endpoints: [
        {
          id: "short_id",
          label: "device, board, connector end, or unknown end",
          role: "source | target | branch_end | auxiliary | unknown",
          known_from: "customer text, file, observation, or inferred grouping",
          status: "identified | partial | unknown",
          evidence_refs: ["source labels"],
        },
      ],
      harness_sections: [
        {
          id: "short_id",
          label: "main trunk, branch, route zone, or cable carrier",
          type: "trunk | branch | route_zone | sample_copy | unknown",
          length_basis: "known length, approximate length, sample reference, or unknown",
          route_basis: "routing basis if known",
          status: "known | approximate | draft | unknown",
        },
      ],
      connection_groups: [
        {
          id: "short_id",
          label: "wire/function group",
          from: "endpoint id",
          to: "endpoint id",
          function: "power | signal | data | sensor | motor | safety | mixed | unknown",
          known_signals: ["signals, pin names, functions, or high-level labels"],
          status: "provided | parsed | inferred | draft | unknown",
          evidence_refs: ["source labels"],
          review_needed: ["Easy Harness review items for this group"],
        },
      ],
      known_facts: ["standardized facts usable by the visual draft"],
      open_items: [
        {
          item: "missing or uncertain item",
          owner: "customer | easy_harness_review | customer_or_easy_harness",
          why_it_matters: "why it matters",
          blocks_review: false,
        },
      ],
      easy_harness_review_items: ["internal review items"],
      evidence_refs: [
        {
          source: "customer text, file name, or attachment observation",
          supports: "what it supports in the map",
          boundary: "what should not be claimed yet",
        },
      ],
    },
    understanding: {
      customer_goal: "one sentence in plain customer language",
      understood_from_customer: ["facts explicitly stated or strongly implied by customer text"],
      understood_from_files: ["facts or file-level evidence available from filenames/observations only"],
      evidence_coverage: [
        {
          source: "file name or customer text",
          understood: "what this source contributes to the draft",
          boundary: "what should not be claimed from this source yet",
          confidence: "received | parsed | visual | inferred | unknown",
        },
      ],
      fact_trace: [
        {
          fact: "specific understood fact",
          source: "customer text, source file, or attachment observation",
          status: "provided | parsed | inferred | needs confirmation",
        },
      ],
      question_plan: [
        {
          question: "customer-facing question",
          why_needed: "why this is truly necessary for the draft or review",
          if_unknown: "what happens if the customer does not know",
          blocks_review: false,
        },
      ],
      draft_readiness: {
        state: "ready_for_easy_harness_review | needs_customer_reply | connection_goal_missing",
        reason: "plain-language reason",
        customer_next_step: "what the customer should do now",
      },
      readiness_signal: "why the request can continue, or what still blocks it",
    },
    summary_points: ["string"],
    customer_questions: ["max 3 concise questions"],
    easy_harness_review: ["string"],
    confidence: {
      connection: "clear | partial | unknown",
      file_evidence: "string",
      production_boundary: "string",
    },
    poster: {
      headline: "string",
      subheadline: "string",
      warning: "string",
      boards: [
        {
          id: "short_id",
          title: "customer-facing device/board/end name",
          subtitle: "what this side represents",
          role: "source | target | auxiliary | unknown",
          tone: "dark | teal | amber | blue | warning",
          ports: ["short labels"],
        },
      ],
      wire_groups: [
        {
          id: "short_id",
          label: "wire group label",
          from: "board id",
          to: "board id",
          route_zone: "routing/branch/cable-chain/loom section",
          purpose: "power | signal | data | mixed | sensor | motor | unknown",
          signals: ["short signal/pin/function labels"],
          optional: false,
          confidence: "confirmed | parsed | inferred | unknown",
        },
      ],
      route_zones: ["short route labels"],
      callouts: [
        {
          title: "short title",
          body: "short body",
          tone: "warning | question | review | info",
        },
      ],
      evidence_items: ["what evidence was used"],
      unknown_items: ["what remains unclear"],
    },
  };

  return [
    "You are Easy Harness Visual Draft Agent.",
    "Your task is to think through a customer's messy wiring-harness request and produce a structured visual_draft_spec for a customer-facing wiring poster.",
    "This is not a production drawing and not a final BOM. It is a visual request draft that helps the customer feel their need has been organized clearly enough to continue toward review/quote.",
    "First principle: understand everything the customer provided, show that understanding back to the customer, then ask only for the minimum missing information needed to continue.",
    "Before designing the poster, create requirement_map. This is the standardized harness requirement map between messy input and visual output.",
    "Use the snake_case field names from the schema exactly. Do not switch field names to camelCase, even though the post-processor can tolerate it.",
    "The poster must be derived from requirement_map; do not make unrelated visual groups that are absent from the standardized map.",
    "Separate three things clearly: what the customer explicitly provided, what files/observations contributed, and what Easy Harness still needs to review internally.",
    "Do not invent exact pin-to-pin mappings, connector part numbers, wire gauges, or manufacturing facts unless they are explicit in the customer's text or file observations.",
    "If the available file information is only a filename or file type, say it was received and what it may represent; do not claim you read its internal content.",
    "For every uploaded file or attachment observation listed, include it in understanding.evidence_coverage, even if the boundary is that it is only received and not fully interpreted.",
    "Create understanding.fact_trace so each important understood fact has a source and a status. This is how the customer can feel the draft really listened.",
    "Create understanding.question_plan for every customer question. Each question must explain why it matters, what happens if unknown, and whether it truly blocks review.",
    "If a missing item can be resolved by Easy Harness from photos, samples, or internal review, put it in easy_harness_review instead of blocking the customer.",
    "You may infer high-level boards/devices, wire groups, route zones, optional items, and review callouts from the request.",
    "Prefer a clear poster-like organization: main device/board on one side, target boards/devices on the other, grouped colored wire bundles between them, callout boxes for decisions/risk, and evidence/unknown lists.",
    "Ask at most 1-3 customer questions, and only ask questions that change the customer's request intent or build scope.",
    "Do not ask the customer for exact connector part numbers, crimp specs, shield termination details, datasheets, or engineering validation facts unless the customer explicitly says they have them and the draft cannot proceed without them.",
    "If a power/load rating matters, ask it in customer language such as device voltage/current or device model if available, and allow unknown. Put detailed wire gauge, fuse, thermal, shielding, and connector validation under easy_harness_review.",
    "If photos, samples, or sketches can let Easy Harness review the unknown internally, do not make that a customer blocker.",
    "CAD-only rule: if the input only says CAD/reference/dimensional context files were uploaded and does not state what the harness connects, copies, or replaces, set draft_readiness.state to connection_goal_missing, create unknown source/target endpoints, acknowledge every CAD file as received evidence, and ask one question: what should the harness connect, copy, or replace?",
    "Connector-A-only rule: if the customer gives Connector A, a pinout, spreadsheet, or CSV but does not state the other end, quantity, or length, keep those as open_items and ask for the missing other end plus quantity/length. Do not treat the request as ready just because pinout files exist.",
    "Mixed-files rule: if photos, notes, spreadsheets, and CAD references are supplied, show every supplied file in evidence_coverage, but only claim internal content that is present in the text or listed observations.",
    "Return JSON only, exactly matching this schema shape. No Markdown, no prose outside JSON.",
    JSON.stringify(schema, null, 2),
    "",
    "Customer input:",
    safeString(input, "", 8000),
    "",
    "Files or attachment observations available:",
    fileList.length ? fileList.map((file) => `- ${file}`).join("\n") : "- No files listed",
  ].join("\n");
}

async function callQwenVisualDraft(payload) {
  const env = readLocalEnv(secretPath);
  const apiKey = env.QWEN_API_KEY || "";
  if (!apiKey) throw new Error("QWEN_API_KEY is missing or empty.");
  const baseUrl = (env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1").replace(/\/$/, "");
  const model = env.QWEN_MODEL || "qwen3.6-plus";
  const prompt = visualDraftPrompt(payload);

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: false,
      max_tokens: 6000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are Easy Harness Visual Draft Agent. Think carefully, then output only valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Qwen request failed (${response.status}): ${raw.slice(0, 600)}`);
  }
  const data = JSON.parse(raw);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Qwen returned no message content.");
  const parsed = JSON.parse(extractJsonObject(content));
  return {
    provider: "qwen",
    model,
    usage: data.usage || null,
    visual_draft_spec: normalizeVisualDraftSpec(
      parsed,
      payload.input || "",
      payload.files || [],
    ),
  };
}

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") return jsonResponse(response, 204, {});

  try {
    if (request.method === "GET" && request.url === "/health") {
      const env = readLocalEnv(secretPath);
      return jsonResponse(response, 200, {
        ok: true,
        provider: env.AI_DRAFT_PROVIDER || "qwen",
        model: env.QWEN_MODEL || "qwen3.6-plus",
        hasQwenKey: Boolean(env.QWEN_API_KEY),
      });
    }

    if (request.method === "POST" && request.url === "/visual-draft") {
      const body = await readBody(request);
      const payload = JSON.parse(body || "{}");
      const input = safeString(payload.input, "", 12000);
      const files = safeStringArray(payload.files, 24);
      if (!input && !files.length) {
        return jsonResponse(response, 400, {
          ok: false,
          code: "missing_input",
          message: "input or files are required.",
        });
      }
      const result = await callQwenVisualDraft({ input, files });
      return jsonResponse(response, 200, { ok: true, ...result });
    }

    return jsonResponse(response, 404, {
      ok: false,
      code: "not_found",
      message: "Use GET /health or POST /visual-draft.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse(response, 500, {
      ok: false,
      code: "agent_lab_api_error",
      message,
    });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(
    `Easy Harness Agent Draft Lab API listening on http://127.0.0.1:${port}`,
  );
  console.log(`Using local env file: ${secretPath}`);
});
