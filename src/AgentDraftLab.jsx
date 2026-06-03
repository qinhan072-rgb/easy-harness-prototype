import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Cable,
  CheckCircle2,
  Clock3,
  FileText,
  Sparkles,
} from "lucide-react";

const labCases = [
  {
    id: "wiring-poster-target",
    label: "Wiring poster target",
    stage: "Target style",
    status: "ready",
    input:
      "Customer uploaded a mixed set of photos, a PDF note, a rough wiring sketch, and a spreadsheet. They need a harness that links one controller/ECU to a remote head PCB, motors, sensors, fans, heater, LEDs, and a small auxiliary board. They know the main boards and rough routing, but expect Easy Harness to organize the whole connection basis before quote review.",
    files: [
      "wiring-reference.pdf",
      "board-photo-controller.jpg",
      "toolhead-pcb-photo.png",
      "pinout-table.xlsx",
      "routing-sketch.png",
    ],
    draft: {
      visualType: "ai_poster",
      title: "Controller-to-toolhead wiring harness draft",
      promise:
        "The customer's scattered files are organized into a single visual harness draft: main boards, cable-chain routes, wire groups, options, and the few decisions that still affect the build.",
      poster: {
        headline: "Controller-to-toolhead wiring harness draft",
        subheadline: "Mixed files organized into endpoints, route sections, wire groups, evidence, and open decisions",
        warning: "Draft only. Easy Harness confirms final pin map, connector selection, and production details.",
      },
      requirementMap: {
        schemaVersion: "easy_harness_requirement_map_v0_1",
        connectionGoal:
          "Build a controller/ECU-to-toolhead harness with motion, sensor, fan, heater, LED, and optional auxiliary connections.",
        endpoints: [
          {
            id: "controller_ecu",
            label: "Controller / ECU board",
            role: "source_controller",
            knownFrom: "Electronics-case board reference",
            status: "identified",
            evidenceRefs: ["board-photo-controller.jpg", "pinout-table.xlsx"],
          },
          {
            id: "toolhead_pcb",
            label: "Remote toolhead PCB",
            role: "target_board",
            knownFrom: "Toolhead PCB photo and wiring reference",
            status: "identified",
            evidenceRefs: ["toolhead-pcb-photo.png", "wiring-reference.pdf"],
          },
          {
            id: "motion_motors",
            label: "Motion motor groups",
            role: "target_device_group",
            knownFrom: "Wiring reference",
            status: "identified",
            evidenceRefs: ["wiring-reference.pdf"],
          },
          {
            id: "sensors_and_leds",
            label: "Sensors / LEDs / stops",
            role: "target_device_group",
            knownFrom: "Pinout table and routing sketch",
            status: "identified",
            evidenceRefs: ["pinout-table.xlsx", "routing-sketch.png"],
          },
          {
            id: "optional_aux",
            label: "Optional auxiliary wires",
            role: "optional_target",
            knownFrom: "Reference diagram options",
            status: "customer_choice_needed",
            evidenceRefs: ["wiring-reference.pdf"],
          },
        ],
        harnessSections: [
          {
            id: "x_cable_chain",
            label: "X cable chain",
            type: "route_zone",
            lengthBasis: "route basis shown, final length to review",
            routeBasis: "Customer wiring reference",
            status: "draft",
          },
          {
            id: "y_cable_chain",
            label: "Y cable chain",
            type: "route_zone",
            lengthBasis: "route basis shown, final length to review",
            routeBasis: "Customer wiring reference",
            status: "draft",
          },
          {
            id: "z_cable_chain",
            label: "Z cable chain",
            type: "route_zone",
            lengthBasis: "route basis shown, final length to review",
            routeBasis: "Customer wiring reference",
            status: "draft",
          },
        ],
        connectionGroups: [
          {
            id: "toolhead_signals",
            label: "Toolhead PCB bundle",
            from: "controller_ecu",
            to: "toolhead_pcb",
            function: "heater, fan, probe, thermistor, toolhead signals",
            knownSignals: ["heater", "fan", "probe", "thermistor", "toolhead IO"],
            status: "draft_from_evidence",
            evidenceRefs: ["wiring-reference.pdf", "pinout-table.xlsx"],
            reviewNeeded: ["Confirm final pin-to-pin map"],
          },
          {
            id: "motion_motor_bundle",
            label: "Motion motor bundle",
            from: "controller_ecu",
            to: "motion_motors",
            function: "motor groups through cable-chain routing",
            knownSignals: ["X motor", "Y motor", "Z motors", "extruder motor"],
            status: "draft_from_evidence",
            evidenceRefs: ["wiring-reference.pdf"],
            reviewNeeded: ["Confirm motor grouping and labels"],
          },
          {
            id: "sensor_led_bundle",
            label: "Sensor / LED bundle",
            from: "controller_ecu",
            to: "sensors_and_leds",
            function: "endstops, chamber temp, LEDs, auxiliary signals",
            knownSignals: ["endstops", "temperature", "LED", "accelerometer"],
            status: "draft_from_evidence",
            evidenceRefs: ["pinout-table.xlsx", "routing-sketch.png"],
            reviewNeeded: ["Confirm included options"],
          },
          {
            id: "optional_bundle",
            label: "Optional wires",
            from: "controller_ecu",
            to: "optional_aux",
            function: "customer-selected optional temperature or auxiliary wires",
            knownSignals: ["optional temp", "auxiliary signal"],
            status: "customer_choice_needed",
            evidenceRefs: ["wiring-reference.pdf"],
            reviewNeeded: ["Customer can select or mark unknown"],
          },
        ],
        knownFacts: [
          "Controller side and remote PCB side are identified.",
          "Motion, toolhead, sensor, LED, and optional groups are separated.",
          "Route basis is cable-chain style, but final build length still needs review.",
        ],
        openItems: [
          {
            item: "Which optional wires should be included in the first build?",
            owner: "customer",
            whyItMatters: "This changes the first quote scope.",
            blocksReview: false,
          },
          {
            item: "Which board/version or connector variant should be used as the current basis?",
            owner: "customer_or_easy_harness",
            whyItMatters: "This reduces risk before final pin confirmation.",
            blocksReview: false,
          },
        ],
        easyHarnessReviewItems: [
          "Confirm final pin-to-pin map from the uploaded diagram and spreadsheet.",
          "Review wire gauge, voltage groups, shielding, and thermal-load boundaries.",
          "Confirm connector housings, pin orientation, labels, and cable-chain routing before quote release.",
        ],
        evidenceRefs: [
          {
            source: "wiring-reference.pdf",
            supports: "Overall connection topology and optional wire groups",
            boundary: "Reference only until Easy Harness confirms final pin map.",
          },
          {
            source: "pinout-table.xlsx",
            supports: "Signal names and several pinout references",
            boundary: "Spreadsheet evidence does not by itself release a production package.",
          },
          {
            source: "board-photo-controller.jpg",
            supports: "Controller-side visual reference",
            boundary: "Photo supports identification but connector details still need review.",
          },
          {
            source: "routing-sketch.png",
            supports: "High-level cable-chain routing basis",
            boundary: "Final lengths and routing constraints still need review.",
          },
        ],
      },
      sourceNode: {
        title: "Controller / ECU board",
        subtitle: "Main electronics case",
      },
      trunk: {
        title: "Main cable-chain harness",
        subtitle: "Grouped power, motor, sensor, and toolhead lines",
      },
      branches: [
        {
          id: "toolhead-pcb",
          title: "Remote toolhead PCB",
          subtitle: "Fans / heater / probe / thermistor",
          tone: "teal",
        },
        {
          id: "motion",
          title: "Motion motors",
          subtitle: "X / Y / Z / extruder groups",
          tone: "blue",
        },
        {
          id: "auxiliary",
          title: "Auxiliary sensors",
          subtitle: "Endstops / accelerometer / LEDs",
          tone: "amber",
        },
      ],
      known: [
        "Controller side and remote PCB side identified",
        "Main routing is split into X/Y/Z cable-chain style sections",
        "Power, motor, fan, heater, thermistor, probe, LED, and sensor groups are separated",
        "Pinout/table evidence received for several signals",
        "Optional temperature/sensor wires are present as selectable items",
      ],
      customerQuestions: [
        "Which optional wires should be included in the first build?",
        "Which board/version or connector variant should Easy Harness use as the current basis?",
      ],
      easyHarnessReview: [
        "Confirm final pin-to-pin map from the uploaded diagram and spreadsheet.",
        "Review wire gauge, voltage groups, shielding, and thermal-load boundaries.",
        "Confirm connector housings, pin orientation, labels, and cable-chain routing before quote release.",
      ],
      confidence: {
        connection: "clear",
        fileEvidence: "multi-file evidence",
        production: "visual draft only",
      },
    },
  },
  {
    id: "ecu-sensor-branch",
    label: "ECU to sensor branch",
    stage: "Ready for review",
    status: "ready",
    input:
      "I need 12 pcs of a harness from a small ECU to three field sensors. Main trunk about 1.2 m, each branch about 300 mm. It is low-current signal only, outdoor equipment, waterproof preferred. I can provide connector photos but do not know the part numbers.",
    files: ["connector-end-a.jpg", "sensor-ports.png", "rough-sketch.pdf"],
    draft: {
      title: "ECU to three outdoor sensor harness",
      promise:
        "The customer's connection goal is organized into a clear branch harness draft that can move into Easy Harness review.",
      sourceNode: {
        title: "ECU / controller",
        subtitle: "Connector photos available",
      },
      trunk: {
        title: "Main harness trunk",
        subtitle: "Approx. 1.2 m, low-current signal",
      },
      branches: [
        {
          id: "sensor-a",
          title: "Sensor A",
          subtitle: "Branch approx. 300 mm",
          tone: "teal",
        },
        {
          id: "sensor-b",
          title: "Sensor B",
          subtitle: "Branch approx. 300 mm",
          tone: "blue",
        },
        {
          id: "sensor-c",
          title: "Sensor C",
          subtitle: "Branch approx. 300 mm",
          tone: "amber",
        },
      ],
      known: [
        "Quantity: 12 pcs",
        "Main trunk: approx. 1.2 m",
        "Branches: approx. 300 mm each",
        "Use: outdoor low-current signal harness",
        "Waterproofing preferred",
      ],
      customerQuestions: [
        "Are the three sensor connectors the same connector type?",
      ],
      easyHarnessReview: [
        "Identify connector housings from photos before final selection.",
        "Review waterproofing and labeling approach.",
        "Confirm branch layout and strain relief before quote release.",
      ],
      confidence: {
        connection: "clear",
        fileEvidence: "partial",
        production: "not production-ready",
      },
    },
  },
  {
    id: "old-harness-copy",
    label: "Old harness copy",
    stage: "Near ready",
    status: "near",
    input:
      "I want to copy an old harness for an outdoor sensor assembly. The old harness connects one controller box to two external sensors. Approximate total length is 1.2 m. Quantity 3 pcs first. It is signal wiring only and carries no motor or battery power. I have photos of both connector ends and the old sample.",
    files: ["old-sample-front.jpg", "old-sample-back.jpg"],
    draft: {
      title: "Copy old controller-to-two-sensors harness",
      promise:
        "The customer does not need connector part numbers yet; Easy Harness can work from the sample/photos and ask only for the one layout decision that affects the draft.",
      sourceNode: {
        title: "Controller box",
        subtitle: "Old sample available",
      },
      trunk: {
        title: "Copy existing harness",
        subtitle: "Total length approx. 1.2 m",
      },
      branches: [
        {
          id: "left-sensor",
          title: "External sensor 1",
          subtitle: "Connector photo received",
          tone: "teal",
        },
        {
          id: "right-sensor",
          title: "External sensor 2",
          subtitle: "Connector photo received",
          tone: "blue",
        },
      ],
      known: [
        "Quantity: 3 pcs first",
        "Use: outdoor sensor assembly",
        "Signal only / no motor or battery power",
        "Copy old harness from sample",
        "Total length: approx. 1.2 m",
      ],
      customerQuestions: [
        "Are the two sensor ends identical, or should they be treated as different ends?",
      ],
      easyHarnessReview: [
        "Measure the old sample before final layout.",
        "Identify connector orientation and locking features from photos.",
        "Confirm label and sleeve approach before quote release.",
      ],
      confidence: {
        connection: "clear",
        fileEvidence: "photos/sample referenced",
        production: "needs Easy Harness review",
      },
    },
  },
  {
    id: "spreadsheet-pinout",
    label: "Spreadsheet pinout",
    stage: "Needs key detail",
    status: "needs",
    input:
      "The pin mapping is in my spreadsheet and CSV. Please use those files as the source of truth. Connector A is DT06-6S. I am not sure about wire colors for pins 5 and 6.",
    files: ["dt06_6s_pinout.csv", "dt06_6s_pinout.xlsx"],
    draft: {
      title: "DT06-6S pinout basis with unknown output end",
      promise:
        "The uploaded pinout is treated as evidence, but the harness cannot close until the other end and basic order details are known.",
      sourceNode: {
        title: "Connector A",
        subtitle: "DT06-6S",
      },
      trunk: {
        title: "Pinout harness",
        subtitle: "Pin table received",
      },
      branches: [
        {
          id: "unknown-end",
          title: "Other end",
          subtitle: "Unknown",
          tone: "warning",
          unknown: true,
        },
      ],
      known: [
        "Connector A: DT06-6S",
        "Pin mapping source: spreadsheet and CSV",
        "Pins 5/6 color decision is not confirmed",
      ],
      pinRows: [
        ["Pin 1", "+5V", "red", "from file"],
        ["Pin 2", "GND", "black", "from file"],
        ["Pin 3", "Signal A", "white", "from file"],
        ["Pin 4", "Signal B", "blue", "from file"],
        ["Pin 5", "TBD", "TBD", "ask customer"],
        ["Pin 6", "TBD", "TBD", "ask customer"],
      ],
      customerQuestions: [
        "What should the other end be: connector, bare labeled leads, or another device/port?",
        "What approximate length and quantity do you need?",
        "Should pins 5 and 6 be populated, left open, or assigned to specific signals?",
      ],
      easyHarnessReview: [
        "Review spreadsheet/CSV before relying on final pin mapping.",
        "Confirm connector cavity orientation and terminal selection.",
      ],
      confidence: {
        connection: "partial",
        fileEvidence: "pinout files received",
        production: "not production-ready",
      },
    },
  },
  {
    id: "cad-reference-only",
    label: "CAD reference only",
    stage: "Needs connection goal",
    status: "blocked",
    input:
      "I uploaded CAD-style reference files for the connector shell, bracket outline, and protective boot. Please use them as dimensional/context references, not final manufacturing drawings.",
    files: ["connector-shell.step", "bracket-outline.dxf", "protective-boot.stl"],
    draft: {
      title: "CAD references received, connection goal missing",
      promise:
        "The files are acknowledged as useful references, but Easy Harness should not pretend a harness requirement exists before the connection goal is stated.",
      sourceNode: {
        title: "Unknown source",
        subtitle: "Connection goal needed",
        unknown: true,
      },
      trunk: {
        title: "Harness to define",
        subtitle: "CAD references only",
        unknown: true,
      },
      branches: [
        {
          id: "unknown-target",
          title: "Unknown target",
          subtitle: "Device/port not stated",
          tone: "warning",
          unknown: true,
        },
      ],
      known: [
        "CAD-style reference files received",
        "Use as dimensional/context references",
        "Not final manufacturing drawings",
      ],
      customerQuestions: [
        "What should this harness or cable connect, copy, or replace?",
      ],
      easyHarnessReview: [
        "Use CAD files only as reference until the actual connection goal is known.",
        "Confirm whether converted previews or screenshots are needed later.",
      ],
      confidence: {
        connection: "unknown",
        fileEvidence: "CAD metadata/reference only",
        production: "not production-ready",
      },
    },
  },
];

const agentLabApiUrl = "http://127.0.0.1:8787";

function statusIcon(status) {
  if (status === "ready") return <CheckCircle2 size={17} />;
  if (status === "near") return <BadgeCheck size={17} />;
  if (status === "needs") return <Clock3 size={17} />;
  return <AlertTriangle size={17} />;
}

function pointOnBranch(index, total) {
  const gap = total > 1 ? 170 / (total - 1) : 0;
  return 110 + gap * index;
}

function VisualDraftCanvas({ draft }) {
  if (draft.visualType === "ai_poster") return <AiPosterWiringDraftCanvas draft={draft} />;
  if (draft.visualType === "poster") return <PosterWiringDraftCanvas draft={draft} />;
  const branches = draft.branches || [];
  return (
    <section className="agent-lab-visual">
      <div className="agent-lab-section-head">
        <div>
          <span>Visual Draft</span>
          <h2>{draft.title}</h2>
        </div>
        <Cable size={22} />
      </div>

      <div className="visual-draft-board">
        <svg viewBox="0 0 980 410" role="img" aria-label="Visual harness draft">
          <defs>
            <linearGradient id="agentLabTrunk" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#159283" />
              <stop offset="50%" stopColor="#326fd1" />
              <stop offset="100%" stopColor="#c98522" />
            </linearGradient>
          </defs>

          <rect className="visual-bg" x="12" y="16" width="956" height="378" rx="8" />
          <rect
            className={`visual-node ${draft.sourceNode.unknown ? "unknown" : ""}`}
            x="52"
            y="150"
            width="170"
            height="88"
            rx="8"
          />
          <text className="visual-node-title" x="76" y="184">
            {draft.sourceNode.title}
          </text>
          <text className="visual-node-subtitle" x="76" y="213">
            {draft.sourceNode.subtitle}
          </text>

          <path className="visual-trunk-shadow" d="M222 194 C 330 194, 352 194, 440 194" />
          <path className="visual-trunk" d="M222 194 C 330 194, 352 194, 440 194" />

          <rect
            className={`visual-harness ${draft.trunk.unknown ? "unknown" : ""}`}
            x="440"
            y="136"
            width="190"
            height="116"
            rx="8"
          />
          <text className="visual-harness-title" x="466" y="178">
            {draft.trunk.title}
          </text>
          <text className="visual-harness-subtitle" x="466" y="210">
            {draft.trunk.subtitle}
          </text>

          {branches.map((branch, index) => {
            const y = pointOnBranch(index, branches.length);
            return (
              <g key={branch.id}>
                <path
                  className={`visual-branch branch-${branch.tone || "teal"} ${
                    branch.unknown ? "unknown" : ""
                  }`}
                  d={`M630 194 C 690 194, 692 ${y}, 750 ${y}`}
                />
                <rect
                  className={`visual-node target ${branch.unknown ? "unknown" : ""}`}
                  x="750"
                  y={y - 42}
                  width="180"
                  height="84"
                  rx="8"
                />
                <text className="visual-node-title" x="772" y={y - 10}>
                  {branch.title}
                </text>
                <text className="visual-node-subtitle" x="772" y={y + 18}>
                  {branch.subtitle}
                </text>
              </g>
            );
          })}

          <circle className="visual-junction" cx="630" cy="194" r="9" />
          <text className="visual-caption" x="54" y="352">
            Request structure only. Easy Harness confirms final build details.
          </text>
        </svg>
      </div>
    </section>
  );
}

function layoutBoards(boards = []) {
  const fallback = [
    {
      id: "source",
      title: "Source device",
      subtitle: "Customer basis",
      role: "source",
      tone: "dark",
      ports: ["PWR", "GND", "I/O"],
    },
    {
      id: "target",
      title: "Target device",
      subtitle: "Harness end",
      role: "target",
      tone: "teal",
      ports: ["Signals"],
    },
  ];
  const safeBoards = boards.length ? boards : fallback;
  const sourceIndex = safeBoards.findIndex((board) =>
    /source|controller|ecu|main/i.test(`${board.role} ${board.title}`),
  );
  const source = safeBoards[sourceIndex >= 0 ? sourceIndex : 0];
  const targets = safeBoards.filter((_, index) => index !== (sourceIndex >= 0 ? sourceIndex : 0));
  const sourceLayout = {
    ...source,
    x: 62,
    y: 382,
    width: 260,
    height: 170,
  };
  const targetSlots = [
    { x: 780, y: 112, width: 260, height: 138 },
    { x: 806, y: 316, width: 238, height: 124 },
    { x: 788, y: 520, width: 252, height: 126 },
    { x: 776, y: 682, width: 264, height: 92 },
    { x: 434, y: 660, width: 210, height: 92 },
  ];
  const targetLayouts = targets.slice(0, targetSlots.length).map((board, index) => ({
    ...board,
    ...targetSlots[index],
  }));
  return [sourceLayout, ...targetLayouts];
}

function boardCenter(board) {
  return {
    x: Number(board.x || 0) + Number(board.width || 0) / 2,
    y: Number(board.y || 0) + Number(board.height || 0) / 2,
  };
}

function boardById(layouts, id) {
  return layouts.find((board) => board.id === id) || layouts[0];
}

function shortVisualLabel(value, fallback = "Item", maxLength = 22) {
  const label = `${value || fallback}`.trim();
  if (label.length <= maxLength) return label;
  return `${label.slice(0, Math.max(3, maxLength - 1))}...`;
}

function endpointTone(endpoint, index) {
  const value = `${endpoint.role || ""} ${endpoint.status || ""} ${endpoint.label || ""}`.toLowerCase();
  if (/unknown|missing|unclear|tbd/.test(value)) return "amber";
  if (/source|controller|ecu|main|host/.test(value) || index === 0) return "dark";
  if (/optional|aux|accessory/.test(value)) return "amber";
  return "teal";
}

function boardsFromRequirementMap(requirementMap, fallbackBoards = []) {
  const endpoints = Array.isArray(requirementMap?.endpoints)
    ? requirementMap.endpoints.filter((endpoint) => endpoint && typeof endpoint === "object")
    : [];
  if (!endpoints.length) return fallbackBoards;

  const boards = endpoints.slice(0, 6).map((endpoint, index) => {
    const role = shortVisualLabel(endpoint.role || (index === 0 ? "source" : "target"), "target", 14);
    const status = shortVisualLabel(endpoint.status || "identified", "identified", 14);
    const evidenceCount = Array.isArray(endpoint.evidenceRefs) ? endpoint.evidenceRefs.length : 0;
    const ports = [role, status];
    if (evidenceCount > 0) ports.push(`${evidenceCount} evidence`);
    if (endpoint.knownFrom) ports.push(shortVisualLabel(endpoint.knownFrom, "basis", 14));

    return {
      id: endpoint.id || `endpoint_${index + 1}`,
      title: shortVisualLabel(endpoint.label, `Endpoint ${index + 1}`, 28),
      subtitle: shortVisualLabel(endpoint.knownFrom || endpoint.status || "Customer-provided basis", "Customer basis", 34),
      role: endpoint.role || (index === 0 ? "source" : "target"),
      tone: endpointTone(endpoint, index),
      ports: ports.slice(0, 6),
    };
  });
  if (boards.length === 1) {
    boards.push({
      id: "unknown_destination",
      title: "Other end unknown",
      subtitle: "Needed to complete request scope",
      role: "unknown_target",
      tone: "amber",
      ports: ["unknown", "reply useful"],
    });
  }
  return boards;
}

function resolveEndpointRef(ref, boards, fallbackId) {
  const value = `${ref || ""}`.trim();
  if (!value) return fallbackId;
  const exact = boards.find((board) => board.id === value);
  if (exact) return exact.id;
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const loose = boards.find((board) => {
    const id = `${board.id || ""}`.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const title = `${board.title || ""}`.toLowerCase().replace(/[^a-z0-9]+/g, "");
    return id === normalized || title === normalized;
  });
  return loose?.id || fallbackId;
}

function wireGroupsFromRequirementMap(requirementMap, fallbackGroups = [], boards = []) {
  const groups = Array.isArray(requirementMap?.connectionGroups)
    ? requirementMap.connectionGroups.filter((group) => group && typeof group === "object")
    : [];
  if (!groups.length) return fallbackGroups;

  return groups.slice(0, 10).map((group, index) => {
    const fallbackTarget = boards[Math.min(index + 1, Math.max(1, boards.length - 1))]?.id || boards[1]?.id;
    const status = `${group.status || ""}`.toLowerCase();
    return {
      id: group.id || `connection_group_${index + 1}`,
      label: shortVisualLabel(group.label, `Connection group ${index + 1}`, 30),
      from: resolveEndpointRef(group.from, boards, boards[0]?.id),
      to: resolveEndpointRef(group.to, boards, fallbackTarget),
      route_zone: group.routeZone || group.route_zone || "",
      purpose: shortVisualLabel(group.function || "draft connection", "draft connection", 28),
      signals: Array.isArray(group.knownSignals)
        ? group.knownSignals.map((item) => shortVisualLabel(item, "signal", 20)).slice(0, 8)
        : [],
      optional: /unknown|missing|optional|partial|review/.test(status),
      confidence: group.status || "draft",
    };
  });
}

function routeZonesFromRequirementMap(requirementMap, poster = {}) {
  const sections = Array.isArray(requirementMap?.harnessSections)
    ? requirementMap.harnessSections.filter((section) => section && typeof section === "object")
    : [];
  const labels = sections
    .map((section) => section.label || section.type)
    .filter(Boolean)
    .map((label) => shortVisualLabel(label, "Harness route", 18).toUpperCase());
  if (labels.length) return labels;
  if (Array.isArray(poster.route_zones) && poster.route_zones.length) return poster.route_zones;
  return ["MAIN HARNESS", "BRANCH HARNESS", "AUX HARNESS"];
}

function openItemsFromRequirementMap(requirementMap, poster = {}, draft = {}) {
  const openItems = Array.isArray(requirementMap?.openItems)
    ? requirementMap.openItems.filter((item) => item && typeof item === "object")
    : [];
  if (openItems.length) {
    return openItems.map((item) => item.item).filter(Boolean);
  }
  return poster.unknown_items || draft.customerQuestions || [];
}

function calloutsFromRequirementMap(requirementMap, poster = {}) {
  const openItems = Array.isArray(requirementMap?.openItems)
    ? requirementMap.openItems.filter((item) => item && typeof item === "object")
    : [];
  if (openItems.length) {
    return openItems.map((item) => ({
      title: item.blocksReview ? "Reply needed" : "Review note",
      body: `${item.item || "Open item"} ${item.whyItMatters || ""}`.trim(),
      tone: item.blocksReview ? "question" : "warning",
    }));
  }
  return poster.callouts?.length
    ? poster.callouts
    : [
        {
          title: "Draft boundary",
          body: poster.warning || "Easy Harness confirms final build details.",
          tone: "warning",
        },
      ];
}

function evidenceFromRequirementMap(requirementMap, poster = {}, draft = {}) {
  const refs = Array.isArray(requirementMap?.evidenceRefs)
    ? requirementMap.evidenceRefs.filter((item) => item && typeof item === "object")
    : [];
  if (refs.length) {
    return refs.map((item) =>
      shortVisualLabel(
        `${item.source || "Evidence"}${item.supports ? `: ${item.supports}` : ""}`,
        "Evidence",
        54,
      ),
    );
  }
  return [...(poster.evidence_items || []), ...(draft.files || [])].map((item) =>
    shortVisualLabel(item, "Evidence", 54),
  );
}

function AiPosterWiringDraftCanvas({ draft }) {
  const poster = draft.poster || {};
  const requirementMap = draft.requirementMap || {};
  const hasRequirementMap = Boolean(requirementMap.schemaVersion);
  const boards = boardsFromRequirementMap(requirementMap, poster.boards || []);
  const layouts = layoutBoards(boards);
  const source = layouts[0];
  const wireGroupsFromPoster = poster.wire_groups?.length
    ? poster.wire_groups
    : [
        {
          id: "draft_link",
          label: "Draft harness",
          from: source.id,
          to: layouts[1]?.id,
          signals: ["connection basis"],
        },
      ];
  const wireGroups = wireGroupsFromRequirementMap(requirementMap, wireGroupsFromPoster, boards);
  const colors = [
    "#d84332",
    "#2067d5",
    "#12998b",
    "#c98522",
    "#7b3ec8",
    "#e0569c",
    "#24a6c8",
    "#46a049",
    "#ff7a1a",
    "#5b6c72",
    "#8b5a2b",
    "#2c3b37",
  ];
  const routeZones = routeZonesFromRequirementMap(requirementMap, poster);
  const unknownItems = openItemsFromRequirementMap(requirementMap, poster, draft);
  const callouts = calloutsFromRequirementMap(requirementMap, poster);
  const evidence = evidenceFromRequirementMap(requirementMap, poster, draft);

  return (
    <section className="agent-lab-visual poster-mode">
      <div className="agent-lab-section-head">
        <div>
          <span>{hasRequirementMap ? "Requirement Map Visual Draft" : "Qwen Visual Draft"}</span>
          <h2>{draft.title}</h2>
        </div>
        <Cable size={22} />
      </div>

      <div className="visual-draft-board poster-board">
        <svg viewBox="0 0 1120 820" role="img" aria-label="AI-generated poster style wiring harness draft">
          <rect x="14" y="14" width="1092" height="792" rx="8" fill="#fffdf9" stroke="#dce6e3" />
          <rect x="34" y="34" width="620" height="94" rx="4" fill="#ffffff" stroke="#e1e7e5" />
          <text x="54" y="64" fill="#111918" fontSize="23" fontWeight="950">
            {shortVisualLabel(poster.headline || requirementMap.connectionGoal || draft.title, draft.title, 62)}
          </text>
          <text x="54" y="91" fill="#40504c" fontSize="13" fontWeight="750">
            {poster.subheadline || (hasRequirementMap ? "Rendered from the standardized request map" : "AI-organized visual request draft")}
          </text>
          <text x="54" y="114" fill="#bc2f2a" fontSize="12.5" fontWeight="900">
            {poster.warning || "Draft only. Easy Harness confirms final build details."}
          </text>

          <rect x="690" y="34" width="376" height="94" rx="4" fill="#fff3df" stroke="#d7a95a" />
          <text x="712" y="64" fill="#7b4a12" fontSize="16" fontWeight="950">
            Decisions and unknowns
          </text>
          {unknownItems.slice(0, 3).map((item, index) => (
            <text key={`${item}-${index}`} x="712" y={91 + index * 17} fill="#514333" fontSize="11.5" fontWeight="760">
              {index + 1}. {shortVisualLabel(item, "Open item", 48)}
            </text>
          ))}

          <rect x="82" y="156" width="294" height="178" rx="8" fill="#f1f4f3" stroke="#cbd8d5" />
          <text x="104" y="188" fill="#2c3b37" fontSize="17" fontWeight="950">
            Physical / routing basis
          </text>
          <path d="M116 290 L170 200 L254 214 L348 282 Z" fill="#ffffff" stroke="#8fa29d" strokeWidth="2" />
          <circle cx="154" cy="276" r="17" fill="#fff3df" stroke="#c98522" strokeWidth="4" />
          <circle cx="332" cy="278" r="17" fill="#fff3df" stroke="#c98522" strokeWidth="4" />
          <circle cx="254" cy="216" r="16" fill="#e8f7f4" stroke="#12998b" strokeWidth="4" />
          <text x="138" y="316" fill="#c23b34" fontSize="16" fontWeight="950">route ref</text>
          <text x="242" y="195" fill="#12998b" fontSize="16" fontWeight="950">end / PCB</text>

          <CableBand x={552} y={246} label={routeZones[0] || "MAIN HARNESS"} color="#e36e46" />
          <CableBand x={578} y={410} label={routeZones[1] || "BRANCH HARNESS"} color="#36a6c9" />
          <CableBand x={580} y={584} label={routeZones[2] || "AUX HARNESS"} color="#7f3ed6" />

          {layouts.map((board) => (
            <PosterBoard
              key={board.id}
              x={board.x}
              y={board.y}
              width={board.width}
              height={board.height}
              title={board.title}
              subtitle={board.subtitle}
              tone={board.tone || "teal"}
              ports={board.ports || []}
            />
          ))}

          <g opacity="0.94">
            {wireGroups.map((group, groupIndex) => {
              const from = boardCenter(boardById(layouts, group.from));
              const to = boardCenter(boardById(layouts, group.to) || layouts[Math.min(groupIndex + 1, layouts.length - 1)]);
              const signalCount = Math.max(2, Math.min((group.signals || []).length || 3, 7));
              const midX = 500 + (groupIndex % 3) * 38;
              const midY = 220 + (groupIndex % 4) * 126;
              return Array.from({ length: signalCount }).map((_, signalIndex) => {
                const offset = signalIndex * 4 - signalCount * 2;
                const color = colors[(groupIndex * 3 + signalIndex) % colors.length];
                const dash = group.optional ? "7 7" : "";
                return (
                  <WirePath
                    key={`${group.id}-${signalIndex}`}
                    d={`M${from.x + 92} ${from.y - 34 + offset} C ${midX} ${from.y - 18 + offset}, ${midX} ${midY + offset}, ${to.x - 110} ${to.y - 20 + offset}`}
                    color={color}
                    width={2.1}
                    dash={dash}
                  />
                );
              });
            })}
          </g>

          {wireGroups.slice(0, 5).map((group, index) => (
            <g key={`label-${group.id}`}>
              <rect x={410 + (index % 2) * 174} y={170 + Math.floor(index / 2) * 164} width="146" height="68" rx="5" fill="#ffffff" stroke="#dce6e3" />
              <text x={426 + (index % 2) * 174} y={198 + Math.floor(index / 2) * 164} fill="#111918" fontSize="12.5" fontWeight="950">
                {group.label}
              </text>
              <text x={426 + (index % 2) * 174} y={220 + Math.floor(index / 2) * 164} fill="#61706d" fontSize="9.5" fontWeight="700">
                {(group.signals || []).slice(0, 3).join(" / ") || group.purpose || "draft group"}
              </text>
            </g>
          ))}

          <g>
            <rect x="68" y="614" width="254" height="144" rx="8" fill="#ffffff" stroke="#dce6e3" />
            <text x="88" y="646" fill="#111918" fontSize="16" fontWeight="950">
              Evidence used
            </text>
          {evidence.slice(0, 5).map((item, index) => (
            <g key={`${item}-${index}`}>
              <circle cx="92" cy={674 + index * 20} r="4" fill="#12998b" />
              <text x="106" y={678 + index * 20} fill="#40504c" fontSize="11" fontWeight="760">
                {item}
                </text>
              </g>
            ))}
          </g>

          {!hasRequirementMap && callouts.slice(0, 3).map((callout, index) => (
            <g key={`${callout.title}-${index}`}>
              <rect
                x={666}
                y={284 + index * 98}
                width="360"
                height="76"
                rx="5"
                fill={callout.tone === "warning" || callout.tone === "question" ? "#fff7e8" : "#f3f7fd"}
                stroke={callout.tone === "warning" || callout.tone === "question" ? "#d7a95a" : "#b8cbed"}
              />
              <text x={688} y={314 + index * 98} fill="#7b4a12" fontSize="14" fontWeight="950">
                {callout.title}
              </text>
              <text x={688} y={340 + index * 98} fill="#514333" fontSize="11.2" fontWeight="760">
                {callout.body.slice(0, 82)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}

function WirePath({ d, color, width = 2.3, dash = "" }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={width}
      strokeDasharray={dash}
    />
  );
}

function MiniPort({ x, y, label, color = "#12998b" }) {
  return (
    <g>
      <rect x={x} y={y} width="86" height="18" rx="3" fill="#ffffff" stroke={color} />
      <text x={x + 6} y={y + 12.5} fill="#263431" fontSize="8.5" fontWeight="800">
        {label}
      </text>
    </g>
  );
}

function PosterBoard({ x, y, width, height, title, subtitle, ports = [], tone = "teal" }) {
  const stroke = tone === "dark" ? "#2c3b37" : tone === "amber" ? "#c98522" : "#12998b";
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx="8" fill="#ffffff" stroke={stroke} strokeWidth="1.4" />
      <rect x={x} y={y} width={width} height="28" rx="8" fill={tone === "dark" ? "#20302c" : tone === "amber" ? "#fff3df" : "#e8f7f4"} />
      <text x={x + 14} y={y + 19} fill={tone === "dark" ? "#ffffff" : "#10201d"} fontSize="13" fontWeight="900">
        {title}
      </text>
      <text x={x + 14} y={y + 45} fill="#61706d" fontSize="10" fontWeight="700">
        {subtitle}
      </text>
      {ports.map((port, index) => (
        <MiniPort
          key={port}
          x={x + 14 + (index % 2) * 98}
          y={y + 62 + Math.floor(index / 2) * 25}
          label={port}
          color={stroke}
        />
      ))}
    </g>
  );
}

function CableBand({ x, y, label, color, rotate = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <rect x="-76" y="-18" width="152" height="36" rx="3" fill={color} opacity="0.86" />
      <text x="0" y="7" fill="#ffffff" fontSize="18" fontWeight="900" textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

function PosterWiringDraftCanvas({ draft }) {
  const colors = [
    "#d84332",
    "#2067d5",
    "#12998b",
    "#c98522",
    "#7b3ec8",
    "#e0569c",
    "#24a6c8",
    "#5b6c72",
    "#46a049",
    "#ff7a1a",
    "#8b5a2b",
    "#2c3b37",
  ];
  const toolheadWires = colors.map((color, index) => ({
    color,
    d: `M276 ${454 + index * 5} C 410 ${454 + index * 5}, 445 ${260 + index * 2}, 612 ${194 + index * 4} C 680 ${176 + index * 2}, 710 ${120 + index * 4}, 776 ${126 + index * 3}`,
  }));
  const motionWires = colors.slice(0, 9).map((color, index) => ({
    color,
    d: `M278 ${430 + index * 5} C 462 ${430 + index * 3}, 535 ${540 + index * 4}, 792 ${546 + index * 7}`,
  }));
  const auxWires = colors.slice(2, 11).map((color, index) => ({
    color,
    d: `M286 ${492 + index * 4} C 430 ${530 + index * 3}, 572 ${644 + index * 3}, 780 ${708 + index * 4}`,
  }));

  return (
    <section className="agent-lab-visual poster-mode">
      <div className="agent-lab-section-head">
        <div>
          <span>Visual Draft</span>
          <h2>{draft.title}</h2>
        </div>
        <Cable size={22} />
      </div>

      <div className="visual-draft-board poster-board">
        <svg viewBox="0 0 1120 820" role="img" aria-label="Poster style wiring harness draft">
          <rect x="14" y="14" width="1092" height="792" rx="8" fill="#fffdf9" stroke="#dce6e3" />
          <rect x="34" y="34" width="610" height="92" rx="4" fill="#ffffff" stroke="#e1e7e5" />
          <text x="54" y="64" fill="#111918" fontSize="24" fontWeight="950">
            EASY HARNESS VISUAL DRAFT
          </text>
          <text x="54" y="90" fill="#40504c" fontSize="13" fontWeight="750">
            Controller-to-toolhead wiring basis organized from mixed customer materials
          </text>
          <text x="54" y="112" fill="#bc2f2a" fontSize="13" fontWeight="900">
            Draft only: final pin map, connector selection, and production details remain for Easy Harness review.
          </text>

          <rect x="668" y="34" width="398" height="92" rx="4" fill="#fff3df" stroke="#d7a95a" />
          <text x="690" y="63" fill="#7b4a12" fontSize="16" fontWeight="950">
            Decisions that affect the build
          </text>
          <text x="690" y="91" fill="#4f4231" fontSize="12" fontWeight="760">
            Include optional temp/sensor wires? Which board/connector variant is current?
          </text>
          <text x="690" y="112" fill="#4f4231" fontSize="12" fontWeight="760">
            Easy Harness can continue once these are selected or marked unknown.
          </text>

          <PosterBoard
            x={64}
            y={388}
            width={250}
            height={160}
            title="Controller / ECU board"
            subtitle="Main electronics case"
            tone="dark"
            ports={["24V / GND", "Motor A", "Motor B", "Toolhead", "Probe", "Fans", "Endstop", "Aux I/O"]}
          />
          <PosterBoard
            x={776}
            y={106}
            width={250}
            height={142}
            title="Remote toolhead PCB"
            subtitle="Fans / heater / probe / thermistor"
            ports={["HEATER", "THERM", "PROBE", "FAN", "LED", "FS"]}
          />
          <PosterBoard
            x={794}
            y={506}
            width={230}
            height={118}
            title="Motion group"
            subtitle="Motors and endstops"
            tone="amber"
            ports={["X motor", "Y motor", "Z motors", "XY stops", "Z endstop", "Extruder"]}
          />
          <PosterBoard
            x={782}
            y={688}
            width={246}
            height={82}
            title="Auxiliary sensor board"
            subtitle="Raspberry Pi / accelerometer / LEDs"
            ports={["GPIO", "ACCEL", "LED", "CAMERA"]}
          />

          <rect x="86" y="150" width="300" height="174" rx="8" fill="#f1f4f3" stroke="#cbd8d5" />
          <text x="108" y="182" fill="#2c3b37" fontSize="18" fontWeight="950">
            Physical routing reference
          </text>
          <path d="M112 280 L172 190 L258 202 L352 272 Z" fill="#ffffff" stroke="#8fa29d" strokeWidth="2" />
          <circle cx="154" cy="266" r="18" fill="#fff3df" stroke="#c98522" strokeWidth="4" />
          <circle cx="335" cy="268" r="18" fill="#fff3df" stroke="#c98522" strokeWidth="4" />
          <circle cx="258" cy="205" r="17" fill="#e8f7f4" stroke="#12998b" strokeWidth="4" />
          <text x="134" y="309" fill="#c23b34" fontSize="18" fontWeight="950">Z chain</text>
          <text x="246" y="178" fill="#12998b" fontSize="18" fontWeight="950">Toolhead</text>

          <CableBand x={560} y={246} label="X CABLE CHAIN" color="#e36e46" />
          <CableBand x={584} y={386} label="Y CABLE CHAIN" color="#36a6c9" />
          <CableBand x={584} y={584} label="Z CABLE CHAIN" color="#7f3ed6" />

          <g opacity="0.95">
            {toolheadWires.map((wire, index) => (
              <WirePath key={`tool-${index}`} d={wire.d} color={wire.color} />
            ))}
            {motionWires.map((wire, index) => (
              <WirePath key={`motion-${index}`} d={wire.d} color={wire.color} width={2} />
            ))}
            {auxWires.map((wire, index) => (
              <WirePath key={`aux-${index}`} d={wire.d} color={wire.color} width={2} />
            ))}
          </g>

          <g>
            <rect x="446" y="152" width="136" height="76" rx="5" fill="#ffffff" stroke="#dce6e3" />
            <text x="464" y="178" fill="#111918" fontSize="13" fontWeight="950">Toolhead lines</text>
            <text x="464" y="202" fill="#61706d" fontSize="10" fontWeight="700">heater / fan / probe / thermistor</text>
            <rect x="420" y="464" width="148" height="68" rx="5" fill="#ffffff" stroke="#dce6e3" />
            <text x="438" y="490" fill="#111918" fontSize="13" fontWeight="950">Motion lines</text>
            <text x="438" y="512" fill="#61706d" fontSize="10" fontWeight="700">motors / endstops / extruder</text>
            <rect x="426" y="666" width="164" height="68" rx="5" fill="#ffffff" stroke="#dce6e3" />
            <text x="444" y="692" fill="#111918" fontSize="13" fontWeight="950">Auxiliary lines</text>
            <text x="444" y="714" fill="#61706d" fontSize="10" fontWeight="700">GPIO / accel / LEDs / camera</text>
          </g>

          <g>
            <rect x="68" y="594" width="250" height="160" rx="8" fill="#ffffff" stroke="#dce6e3" />
            <text x="88" y="626" fill="#111918" fontSize="16" fontWeight="950">
              Draft evidence captured
            </text>
            {["Board names", "Routing zones", "Wire groups", "Optional wires", "Risk notes"].map((item, index) => (
              <g key={item}>
                <circle cx="92" cy={656 + index * 21} r="4" fill="#12998b" />
                <text x="106" y={660 + index * 21} fill="#40504c" fontSize="11" fontWeight="760">
                  {item}
                </text>
              </g>
            ))}
          </g>

          <g>
            <rect x="642" y="282" width="376" height="88" rx="5" fill="#fff7e8" stroke="#d7a95a" />
            <text x="664" y="312" fill="#7b4a12" fontSize="15" fontWeight="950">
              Customer decisions
            </text>
            <text x="664" y="338" fill="#514333" fontSize="11.5" fontWeight="760">
              Optional wires, board variant, connector/endstop choice.
            </text>
            <text x="664" y="358" fill="#514333" fontSize="11.5" fontWeight="760">
              Unknown answers can be marked for Easy Harness review.
            </text>
          </g>
        </svg>
      </div>
    </section>
  );
}

function InfoList({ title, items, tone = "" }) {
  if (!items?.length) return null;
  return (
    <section className={`agent-lab-card ${tone}`}>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function getDraftUnderstanding(draft) {
  const understanding = draft.understanding || {};
  const understood =
    understanding.understood?.length
      ? understanding.understood
      : draft.known || [];
  const evidenceCoverage =
    understanding.evidenceCoverage?.length
      ? understanding.evidenceCoverage
      : (draft.files || []).map((file) => ({
          source: file,
          understood: "Received as customer-provided material.",
          boundary: "Use as draft evidence until Easy Harness confirms the details.",
          confidence: "received",
        }));
  const factTrace =
    understanding.factTrace?.length
      ? understanding.factTrace
      : understood.map((fact) => ({
          fact,
          source: "Customer message or listed file",
          status: "understood",
        }));
  const questionPlan =
    understanding.questionPlan?.length
      ? understanding.questionPlan
      : (draft.customerQuestions || []).map((question) => ({
          question,
          whyNeeded: "This answer helps Easy Harness avoid organizing the wrong harness scope.",
          ifUnknown: "If unknown, Easy Harness can keep it as a review item and continue with the available evidence.",
          blocksReview: false,
        }));
  const draftReadiness =
    understanding.draftReadiness || {
      state: draft.customerQuestions?.length
        ? "needs_customer_reply"
        : "ready_for_easy_harness_review",
      reason: draft.customerQuestions?.length
        ? "A short customer reply would improve the draft before Easy Harness review."
        : "The connection basis is clear enough for Easy Harness review.",
      customerNextStep: draft.customerQuestions?.length
        ? "Reply to the listed questions, or mark unknown."
        : "No immediate customer reply is required before review.",
    };

  return {
    goal: understanding.goal || draft.title,
    understood,
    factTrace,
    evidenceCoverage,
    notYetKnown: understanding.notYetKnown || draft.customerQuestions || [],
    questionPlan,
    draftReadiness,
    readinessSignal:
      understanding.readinessSignal ||
      (draft.customerQuestions?.length
        ? "A short customer reply is still useful before Easy Harness review."
        : "Enough request structure is available for Easy Harness review."),
  };
}

function getRequirementMap(draft, understanding) {
  if (draft.requirementMap?.schemaVersion) return draft.requirementMap;
  const endpoints = [
    draft.sourceNode && {
      id: "source",
      label: draft.sourceNode.title,
      role: "source",
      knownFrom: draft.sourceNode.subtitle || "Draft source node",
      status: draft.sourceNode.unknown ? "unknown" : "identified",
      evidenceRefs: [],
    },
    ...(draft.branches || []).map((branch, index) => ({
      id: branch.id || `branch_${index + 1}`,
      label: branch.title,
      role: branch.unknown ? "unknown" : "target",
      knownFrom: branch.subtitle || "Draft branch",
      status: branch.unknown ? "unknown" : "identified",
      evidenceRefs: [],
    })),
  ].filter(Boolean);

  return {
    schemaVersion: "easy_harness_requirement_map_v0_1",
    connectionGoal: understanding.goal || draft.title,
    endpoints,
    harnessSections: [
      draft.trunk && {
        id: "main_trunk",
        label: draft.trunk.title,
        type: "trunk_or_route_basis",
        lengthBasis: draft.trunk.subtitle || "",
        routeBasis: "",
        status: draft.trunk.unknown ? "unknown" : "draft",
      },
    ].filter(Boolean),
    connectionGroups: (draft.branches || []).map((branch, index) => ({
      id: `connection_group_${index + 1}`,
      label: branch.title,
      from: "source",
      to: branch.id || `branch_${index + 1}`,
      function: "draft",
      knownSignals: [],
      status: branch.unknown ? "unknown" : "draft",
      evidenceRefs: [],
      reviewNeeded: [],
    })),
    knownFacts: understanding.understood || draft.known || [],
    openItems: (understanding.notYetKnown || []).map((item) => ({
      item,
      owner: "customer_or_easy_harness",
      whyItMatters: "This affects review confidence or final build preparation.",
      blocksReview: false,
    })),
    easyHarnessReviewItems: draft.easyHarnessReview || [],
    evidenceRefs: (understanding.evidenceCoverage || []).map((item) => ({
      source: item.source,
      supports: item.understood,
      boundary: item.boundary,
    })),
  };
}

function EvidenceCoverage({ items = [] }) {
  if (!items.length) return null;
  return (
    <section className="agent-lab-card evidence">
      <h3>Evidence Coverage</h3>
      <div className="agent-lab-evidence-list">
        {items.map((item) => (
          <article key={`${item.source}-${item.understood}`}>
            <strong>{item.source}</strong>
            <p>{item.understood}</p>
            <small>{item.boundary}</small>
            <span>{item.confidence}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function RequirementMapPanel({ map }) {
  if (!map?.schemaVersion) return null;
  return (
    <section className="agent-lab-card requirement-map">
      <h3>Standardized Requirement Map</h3>
      <p className="requirement-map-goal">{map.connectionGoal}</p>

      <div className="requirement-map-block">
        <strong>Endpoints</strong>
        <div className="requirement-map-chips">
          {(map.endpoints || []).map((endpoint) => (
            <span key={endpoint.id}>
              {endpoint.label} <small>{endpoint.role}</small>
            </span>
          ))}
        </div>
      </div>

      <div className="requirement-map-block">
        <strong>Harness Sections</strong>
        <div className="requirement-map-list">
          {(map.harnessSections || []).slice(0, 5).map((section) => (
            <article key={section.id}>
              <b>{section.label}</b>
              <small>
                {section.type}
                {section.lengthBasis ? ` · ${section.lengthBasis}` : ""}
                {section.routeBasis ? ` · ${section.routeBasis}` : ""}
              </small>
            </article>
          ))}
        </div>
      </div>

      <div className="requirement-map-block">
        <strong>Connection Groups</strong>
        <div className="requirement-map-list">
          {(map.connectionGroups || []).slice(0, 6).map((group) => (
            <article key={group.id}>
              <b>{group.label}</b>
              <small>
                {group.from} {"->"} {group.to} · {group.function} · {group.status}
              </small>
              {group.knownSignals?.length > 0 && (
                <em>{group.knownSignals.slice(0, 5).join(" / ")}</em>
              )}
            </article>
          ))}
        </div>
      </div>

      {(map.openItems || []).length > 0 && (
        <div className="requirement-map-block">
          <strong>Open Items</strong>
          <div className="requirement-map-list">
            {map.openItems.slice(0, 5).map((item) => (
              <article key={item.item}>
                <b>{item.item}</b>
                <small>
                  {item.owner} · {item.blocksReview ? "blocks review" : "does not block review"}
                </small>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function DraftReadiness({ readiness }) {
  if (!readiness) return null;
  const isReady = readiness.state === "ready_for_easy_harness_review";
  const isMissingGoal = readiness.state === "connection_goal_missing";
  return (
    <section
      className={`agent-lab-readiness ${
        isReady ? "ready" : isMissingGoal ? "blocked" : "needs"
      }`}
    >
      <strong>
        {isReady
          ? "Ready for Easy Harness review"
          : isMissingGoal
            ? "Connection goal needed"
            : "Customer reply useful"}
      </strong>
      <p>{readiness.reason}</p>
      <span>{readiness.customerNextStep}</span>
    </section>
  );
}

function FactTrace({ items = [] }) {
  if (!items.length) return null;
  return (
    <section className="agent-lab-card fact-trace">
      <h3>Understood Facts and Sources</h3>
      <div className="agent-lab-fact-list">
        {items.slice(0, 8).map((item) => (
          <article key={`${item.fact}-${item.source}`}>
            <p>{item.fact}</p>
            <div>
              <span>{item.source}</span>
              <small>{item.status}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function QuestionPlan({ items = [], readiness }) {
  if (!items.length) return null;
  const hasBlockingQuestion = items.some((item) => item.blocksReview);
  const readyForReview = readiness?.state === "ready_for_easy_harness_review";
  return (
    <section className="agent-lab-card questions">
      <h3>
        {hasBlockingQuestion || !readyForReview
          ? "Your Reply Needed"
          : "Helpful Details If Known"}
      </h3>
      <div className="agent-lab-question-plan">
        {items.map((item) => (
          <article key={item.question}>
            <strong>{item.question}</strong>
            <p>{item.whyNeeded}</p>
            <small>{item.ifUnknown}</small>
            <span>{item.blocksReview ? "needed before review" : "can mark unknown"}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function PinoutPreview({ rows = [] }) {
  if (!rows.length) return null;
  return (
    <section className="agent-lab-card pinout-preview">
      <h3>Pinout Evidence Preview</h3>
      <div className="pinout-grid">
        <strong>Pin</strong>
        <strong>Signal</strong>
        <strong>Color</strong>
        <strong>Source</strong>
        {rows.map((row) =>
          row.map((cell, index) => (
            <span key={`${row[0]}-${index}`} className={cell === "TBD" ? "pending" : ""}>
              {cell}
            </span>
          )),
        )}
      </div>
    </section>
  );
}

function VisualDraftSpecPreview({ draft }) {
  if (!draft?.visualType) return null;
  return (
    <details className="agent-lab-json-preview">
      <summary>Visual draft spec JSON</summary>
      <pre>{JSON.stringify(draft, null, 2)}</pre>
    </details>
  );
}

function AgentDraftLab() {
  const [activeId, setActiveId] = useState(labCases[0].id);
  const [caseEdits, setCaseEdits] = useState({});
  const [generatedDrafts, setGeneratedDrafts] = useState({});
  const [generationState, setGenerationState] = useState({
    caseId: "",
    status: "idle",
    message: "",
  });
  const activeCase = useMemo(
    () => labCases.find((item) => item.id === activeId) || labCases[0],
    [activeId],
  );
  const generatedDraft = generatedDrafts[activeCase.id];
  const draft = generatedDraft || activeCase.draft;
  const activeEdit = caseEdits[activeCase.id] || {};
  const activeInput = activeEdit.input ?? activeCase.input;
  const activeFilesText =
    activeEdit.filesText ?? activeCase.files.join("\n");
  const activeFiles = activeFilesText
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 24);
  const understanding = getDraftUnderstanding(draft);
  const requirementMap = getRequirementMap(draft, understanding);
  const isGenerated = Boolean(generatedDraft);
  const activeGenerationState =
    generationState.caseId === activeCase.id ? generationState : null;
  const isGenerating =
    activeGenerationState?.status === "loading";

  async function handleGenerateWithQwen() {
    setGenerationState({
      caseId: activeCase.id,
      status: "loading",
      message: "Asking Qwen to understand the customer input and produce the visual draft...",
    });
    try {
      const response = await fetch(`${agentLabApiUrl}/visual-draft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: activeInput,
          files: activeFiles,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.message || `Agent Lab API failed (${response.status}).`);
      }
      setGeneratedDrafts((current) => ({
        ...current,
        [activeCase.id]: data.visual_draft_spec,
      }));
      setGenerationState({
        caseId: activeCase.id,
        status: "done",
        message: `Qwen generated a visual draft spec with ${data.model}.`,
      });
    } catch (error) {
      setGenerationState({
        caseId: activeCase.id,
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Qwen generation failed.",
      });
    }
  }

  function handleResetGeneratedDraft() {
    setGeneratedDrafts((current) => {
      const next = { ...current };
      delete next[activeCase.id];
      return next;
    });
    setGenerationState({
      caseId: activeCase.id,
      status: "idle",
      message: "",
    });
  }

  function updateActiveEdit(nextPartial) {
    setCaseEdits((current) => ({
      ...current,
      [activeCase.id]: {
        ...(current[activeCase.id] || {}),
        ...nextPartial,
      },
    }));
    setGeneratedDrafts((current) => {
      if (!current[activeCase.id]) return current;
      const next = { ...current };
      delete next[activeCase.id];
      return next;
    });
    setGenerationState({
      caseId: activeCase.id,
      status: "idle",
      message: "Input changed. Generate again to test the Agent on this version.",
    });
  }

  function handleResetInput() {
    setCaseEdits((current) => {
      const next = { ...current };
      delete next[activeCase.id];
      return next;
    });
    handleResetGeneratedDraft();
  }

  return (
    <main className="agent-lab-shell">
      <aside className="agent-lab-sidebar">
        <div className="agent-lab-brand">
          <Sparkles size={20} />
          <div>
            <strong>Agent Draft Lab</strong>
            <span>Internal visual-draft experiment</span>
          </div>
        </div>

        <div className="agent-lab-case-list">
          {labCases.map((item) => (
            <button
              type="button"
              className={`agent-lab-case ${item.id === activeId ? "active" : ""}`}
              key={item.id}
              onClick={() => setActiveId(item.id)}
            >
              {statusIcon(item.status)}
              <span>{item.label}</span>
              <small>{item.stage}</small>
            </button>
          ))}
        </div>

        <div className="agent-lab-note">
          <strong>Goal</strong>
          <p>
            Make the customer feel their messy input has become a clear harness
            request they can confidently continue with.
          </p>
        </div>
      </aside>

      <section className="agent-lab-main">
        <header className="agent-lab-header">
          <div>
            <span>Easy Harness Draft vNext</span>
            <h1>Visual request draft</h1>
            <p>
              The lab keeps the current platform untouched while we test whether
              the Agent makes a messy request feel clear enough to continue.
            </p>
          </div>
          <div className={`agent-lab-status status-${activeCase.status}`}>
            {statusIcon(activeCase.status)}
            {isGenerated ? "Qwen generated" : activeCase.stage}
          </div>
        </header>

        <div className="agent-lab-grid">
          <section className="agent-lab-input-panel">
            <div className="agent-lab-section-head">
              <div>
                <span>Customer Input</span>
                <h2>Customer wording and files</h2>
              </div>
              <FileText size={21} />
            </div>
            <label className="agent-lab-field">
              <span>Customer message</span>
              <textarea
                value={activeInput}
                onChange={(event) =>
                  updateActiveEdit({ input: event.target.value })
                }
              />
            </label>
            <label className="agent-lab-field">
              <span>Files or attachment observations</span>
              <textarea
                className="files"
                value={activeFilesText}
                onChange={(event) =>
                  updateActiveEdit({ filesText: event.target.value })
                }
              />
            </label>
            <div className="agent-lab-files">
              {activeFiles.map((file) => (
                <span key={file}>{file}</span>
              ))}
            </div>
            <div className="agent-lab-actions">
              <button
                type="button"
                className="agent-lab-generate-button"
                onClick={handleGenerateWithQwen}
                disabled={isGenerating}
              >
                <Sparkles size={16} />
                {isGenerating ? "Generating..." : "Generate with Qwen"}
              </button>
              {isGenerated && (
                <button
                  type="button"
                  className="agent-lab-secondary-button"
                  onClick={handleResetGeneratedDraft}
                  disabled={isGenerating}
                >
                  Reset sample
                </button>
              )}
              {(activeEdit.input !== undefined ||
                activeEdit.filesText !== undefined) && (
                <button
                  type="button"
                  className="agent-lab-secondary-button"
                  onClick={handleResetInput}
                  disabled={isGenerating}
                >
                  Reset input
                </button>
              )}
            </div>
            <p className={`agent-lab-api-state state-${activeGenerationState?.status || "idle"}`}>
              {activeGenerationState?.message ||
                "Local-only experiment. The browser sends sample input to the local Agent Lab API; the key stays in your local env file."}
            </p>
          </section>

          <VisualDraftCanvas draft={draft} />

          <section className="agent-lab-output-panel">
            <div className="agent-lab-section-head">
              <div>
                <span>Customer Takeaway</span>
                <h2>{draft.title}</h2>
              </div>
              <BadgeCheck size={22} />
            </div>
            <p className="agent-lab-promise">{draft.promise}</p>
            <p className="agent-lab-understanding-goal">
              {understanding.goal}
            </p>
            <DraftReadiness readiness={understanding.draftReadiness} />
            <RequirementMapPanel map={requirementMap} />

            <div className="agent-lab-confidence">
              <span>Connection: {draft.confidence.connection}</span>
              <span>Evidence: {draft.confidence.fileEvidence}</span>
              <span>{draft.confidence.production}</span>
            </div>

            <InfoList
              title="What Easy Harness Understood"
              items={understanding.understood}
            />
            <FactTrace items={understanding.factTrace} />
            <EvidenceCoverage items={understanding.evidenceCoverage} />
            <InfoList title="Known in the Draft" items={draft.known} />
            <PinoutPreview rows={draft.pinRows} />
            <QuestionPlan
              items={understanding.questionPlan}
              readiness={understanding.draftReadiness}
            />
            <InfoList
              title="Easy Harness Will Review"
              items={draft.easyHarnessReview}
              tone="review"
            />
            <VisualDraftSpecPreview draft={draft} />
          </section>
        </div>
      </section>
    </main>
  );
}

export default AgentDraftLab;
