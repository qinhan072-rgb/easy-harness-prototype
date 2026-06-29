import React from "react";

const laneColors = [
  "#d84b3e",
  "#2869cf",
  "#159688",
  "#c28622",
  "#7a4bc4",
  "#526662",
];

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function shortLabel(value, fallback, limit = 34) {
  const label = String(value || fallback || "").trim();
  if (label.length <= limit) return label;
  return `${label.slice(0, Math.max(4, limit - 3))}...`;
}

function mapField(value, snake, camel) {
  return value?.[snake] ?? value?.[camel];
}

function normalizeEndpoint(endpoint, index) {
  return {
    id: endpoint?.id || `endpoint_${index + 1}`,
    label: endpoint?.label || `Endpoint ${index + 1}`,
    role: endpoint?.role || "endpoint",
    status: endpoint?.status || "identified",
    knownFrom:
      mapField(endpoint, "known_from", "knownFrom") ||
      "Customer request",
  };
}

function normalizeRequirementMap(map = {}, fallback = {}) {
  const endpoints = list(map.endpoints).map(normalizeEndpoint);
  const endpointIds = new Set(endpoints.map((endpoint) => endpoint.id));
  const groups = list(mapField(map, "connection_groups", "connectionGroups"))
    .map((group, index) => ({
      id: group?.id || `group_${index + 1}`,
      label: group?.label || "Harness connection",
      from: group?.from || "",
      to: group?.to || "",
      signals: list(mapField(group, "known_signals", "knownSignals")),
      status: group?.status || "draft",
    }))
    .filter((group) =>
      group.from &&
      group.to &&
      endpointIds.has(group.from) &&
      endpointIds.has(group.to)
    );

  return {
    goal:
      mapField(map, "connection_goal", "connectionGoal") ||
      fallback.connectionGoal ||
      fallback.title ||
      "Harness connection request",
    endpoints,
    groups,
    sections: list(mapField(map, "harness_sections", "harnessSections")),
    openItems: list(mapField(map, "open_items", "openItems")),
    evidence: list(mapField(map, "evidence_refs", "evidenceRefs")),
  };
}

function endpointTone(endpoint) {
  const text = `${endpoint.role} ${endpoint.status} ${endpoint.label}`.toLowerCase();
  if (/unknown|missing|unclear|tbd|confirm/.test(text)) return "unknown";
  if (/source|controller|ecu|host/.test(text)) return "source";
  return "target";
}

function signalColor(signal, index) {
  const text = String(signal || "").toLowerCase();
  if (/\b(gnd|ground|negative)\b/.test(text)) return "#35433f";
  if (/\b(power|supply|vcc|vin|\d+v)\b/.test(text)) return "#d84b3e";
  if (/\b(shield|drain)\b/.test(text)) return "#7b8582";
  if (/\b(can|signal|data|rx|tx)\b/.test(text))
    return index % 2 ? "#2869cf" : "#159688";
  return laneColors[index % laneColors.length];
}

function endpointLayout(endpoints, height) {
  const source =
    endpoints.find((endpoint) => /source|controller|ecu|host/.test(endpoint.role)) ||
    endpoints[0];
  const targets = endpoints.filter((endpoint) => endpoint.id !== source.id);
  const targetGap = Math.min(142, Math.max(104, (height - 190) / Math.max(targets.length, 1)));
  const targetStart = Math.max(105, (height - targetGap * Math.max(targets.length - 1, 0)) / 2 - 40);
  const layouts = [
    {
      ...source,
      x: 48,
      y: Math.max(120, height / 2 - 50),
      width: 224,
      height: 98,
    },
  ];
  targets.forEach((target, index) => {
    layouts.push({
      ...target,
      x: 688,
      y: targetStart + index * targetGap,
      width: 224,
      height: 98,
    });
  });
  return layouts;
}

function center(layout) {
  return {
    x: layout.x + layout.width / 2,
    y: layout.y + layout.height / 2,
  };
}

function EndpointNode({ endpoint }) {
  const tone = endpointTone(endpoint);
  return (
    <g className={`requirement-visual-node ${tone}`}>
      <rect
        x={endpoint.x}
        y={endpoint.y}
        width={endpoint.width}
        height={endpoint.height}
        rx="8"
      />
      <text x={endpoint.x + 16} y={endpoint.y + 30} className="node-title">
        {shortLabel(endpoint.label, "Endpoint", 28)}
      </text>
      <text x={endpoint.x + 16} y={endpoint.y + 55} className="node-role">
        {shortLabel(endpoint.role.replaceAll("_", " "), "endpoint", 26)}
      </text>
      <text x={endpoint.x + 16} y={endpoint.y + 78} className="node-basis">
        {shortLabel(endpoint.knownFrom, "Customer request", 34)}
      </text>
    </g>
  );
}

function ConnectionGroup({ group, layouts, index }) {
  const from = layouts.find((endpoint) => endpoint.id === group.from) || layouts[0];
  const to =
    layouts.find((endpoint) => endpoint.id === group.to) ||
    layouts[Math.min(index + 1, layouts.length - 1)];
  if (!from || !to) return null;
  const start = center(from);
  const end = center(to);
  const signals = group.signals.length ? group.signals.slice(0, 6) : ["Connection basis"];
  const incomplete = /unknown|missing|incomplete|partial|review/.test(
    String(group.status).toLowerCase(),
  );
  const midY = (start.y + end.y) / 2;
  return (
    <g className={`requirement-visual-group ${incomplete ? "incomplete" : ""}`}>
      {signals.map((signal, signalIndex) => {
        const offset = (signalIndex - (signals.length - 1) / 2) * 6;
        const color = signalColor(signal, signalIndex);
        return (
          <path
            key={`${group.id}-${signalIndex}`}
            d={`M ${start.x + from.width / 2 - 2} ${start.y + offset}
                C 410 ${start.y + offset}, 540 ${end.y + offset}, ${end.x - to.width / 2 + 2} ${end.y + offset}`}
            stroke={color}
            strokeDasharray={incomplete ? "8 7" : undefined}
          />
        );
      })}
      <g className="requirement-visual-group-label">
        <rect x="344" y={midY - 34} width="272" height="68" rx="7" />
        <text x="362" y={midY - 8} className="group-title">
          {shortLabel(group.label, "Harness connection", 34)}
        </text>
        <text x="362" y={midY + 15} className="group-signals">
          {shortLabel(signals.join(" / "), "Connection basis", 48)}
        </text>
      </g>
    </g>
  );
}

export default function RequirementMapVisual({ map, fallback = {} }) {
  const visual = normalizeRequirementMap(map, fallback);
  const height = Math.max(430, visual.endpoints.length * 120 + 170);
  const layouts = endpointLayout(visual.endpoints, height);
  const hasSupportedTopology = visual.endpoints.length >= 2 && visual.groups.length > 0;
  const sectionLabels = visual.sections
    .map((section) => section?.label || section?.type)
    .filter(Boolean)
    .slice(0, 3);
  const openItems = visual.openItems
    .map((item) => item?.item || item?.question || item?.reason)
    .filter(Boolean)
    .slice(0, 2);
  const evidence = visual.evidence
    .map((item) => item?.source || item?.filename || item?.type)
    .filter(Boolean)
    .slice(0, 4);

  return (
    <section className="requirement-map-visual">
      <div className="requirement-map-visual-head">
        <div>
          <span>Connection summary</span>
          <strong>{visual.goal}</strong>
        </div>
        <div className="requirement-map-legend" aria-label="Connection summary legend">
          <span className="known">Known</span>
          <span className="unknown">To confirm</span>
        </div>
      </div>

      {hasSupportedTopology ? (
        <div className="requirement-map-canvas">
          <svg
            viewBox={`0 0 960 ${height}`}
            role="img"
            aria-label={`Connection summary for ${visual.goal}`}
          >
            <rect className="canvas-bg" x="1" y="1" width="958" height={height - 2} rx="8" />
            {visual.groups.map((group, index) => (
              <ConnectionGroup
                key={group.id}
                group={group}
                layouts={layouts}
                index={index}
              />
            ))}
            {layouts.map((endpoint) => (
              <EndpointNode key={endpoint.id} endpoint={endpoint} />
            ))}
          </svg>
        </div>
      ) : (
        <div className="requirement-map-empty">
          <strong>Connection layout not confirmed yet</strong>
          <span>The current information has been received, but it does not yet support an honest connection diagram.</span>
          {!!visual.endpoints.length && (
            <div>
              {visual.endpoints.map((endpoint) => (
                <span key={endpoint.id}>{endpoint.label}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {!!sectionLabels.length && (
        <div className="requirement-map-context">
          {sectionLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      )}

      {!!openItems.length && (
        <div className="requirement-map-open-items">
          <strong>Still to confirm</strong>
          {openItems.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      )}

      {!!evidence.length && (
        <div className="requirement-map-evidence">
          <strong>Based on</strong>
          <span>{evidence.join(" · ")}</span>
        </div>
      )}
    </section>
  );
}
