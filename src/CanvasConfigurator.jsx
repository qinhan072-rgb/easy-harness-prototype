import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Cable,
  Check,
  ChevronLeft,
  CircleDot,
  Download,
  FilePlus,
  GitBranch,
  Plus,
  Save,
  Search,
  Settings,
  X,
} from "lucide-react";
import {
  connectorFamilies,
  connectorFamilyById,
  connectorPartById,
  connectorParts,
  defaultWireTypeId,
  harnessCatalogVersion,
  midElementTypeById,
  midElementTypes,
  partForFamilyPinCount,
  partsForFamily,
  wireTypeById,
  wireTypes,
} from "./harnessCatalog.js";
import {
  calculateCanvasConfigurationPrice,
  formatPriceCents,
} from "./canvasPricing.js";

const defaultNodes = [];
const defaultWires = [];
const canvasDraftVersion = 1;

const CONNECTOR_TOP = 24;
const CONNECTOR_LEFT_X = 26;
const CONNECTOR_RIGHT_X = "calc(100% - 280px)";
const CONNECTOR_SLOT_STEP = 300;

const MID_COLUMNS = [
  { id: "mid-a", x: "30%", centerX: "calc(30% + 76px)" },
  { id: "mid-b", x: "50%", centerX: "calc(50% + 76px)" },
  { id: "mid-c", x: "70%", centerX: "calc(70% + 76px)" },
];
const MID_SLOT_TOP = 58;
const MID_SLOT_STEP = 164;
const MID_EMPTY_ADD_Y = 312;

const TOPOLOGY_CANVAS_WIDTH = 2200;
const TOPOLOGY_CANVAS_HEIGHT = 1200;
const TOPOLOGY_CONNECTOR_WIDTH = 174;
const TOPOLOGY_CONNECTOR_HEIGHT = 116;
const TOPOLOGY_JUNCTION_RADIUS = 12;
const topologySegmentColors = ["#0e9f8d", "#2767bd", "#d48b12", "#d74b42", "#5b6a67"];

function endpointKey(endpoint) {
  return `${endpoint.nodeId}:${endpoint.side}:${endpoint.pinId}`;
}

function pinList(count) {
  return Array.from({ length: Number(count || 0) }, (_, index) => `P${index + 1}`);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function readCanvasDraft(storageKey) {
  if (!storageKey || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== canvasDraftVersion) return null;
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.wires)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearCanvasDraft(storageKey) {
  if (!storageKey || typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey);
}

function createConnectorId(nodes) {
  const prefix = "J";
  const used = new Set(nodes.map((node) => node.id));
  let index = 1;
  while (used.has(`${prefix}${index}`)) index += 1;
  return `${prefix}${index}`;
}

function createMidId(nodes) {
  const indexes = nodes
    .map((node) => /^CL(\d+)$/.exec(node.id)?.[1])
    .filter((value) => value !== undefined)
    .map((value) => Number(value));
  return `CL${indexes.length ? Math.max(...indexes) + 1 : 0}`;
}

function createWireId(wires) {
  const used = new Set(wires.map((wire) => wire.id));
  let index = 0;
  while (used.has(`W${index}`)) index += 1;
  return `W${index}`;
}

function connectorSlotIndex(nodes, side) {
  return nodes.filter((node) => node.type === "connector" && node.side === side).length;
}

function connectorPosition(side, slotIndex = 0) {
  const leftSlots = [
    { x: 72, y: 252 },
    { x: 280, y: 64 },
    { x: 268, y: 448 },
    { x: 72, y: 78 },
  ];
  const rightSlots = [
    { x: 1000, y: 252 },
    { x: 940, y: 72 },
    { x: 926, y: 448 },
    { x: 1030, y: 78 },
  ];
  const slots = side === "right" ? rightSlots : leftSlots;
  if (slotIndex < slots.length) return slots[slotIndex];
  return {
    x: side === "right" ? 1000 : 72,
    y: CONNECTOR_TOP + slotIndex * CONNECTOR_SLOT_STEP,
  };
}

function connectorPickerPosition(side, slotIndex = 0) {
  return {
    x: side === "right" ? "calc(100% - 310px)" : CONNECTOR_LEFT_X + 8,
    y: CONNECTOR_TOP + slotIndex * CONNECTOR_SLOT_STEP + 12,
  };
}

function midColumnById(columnId) {
  return MID_COLUMNS.find((column) => column.id === columnId) || MID_COLUMNS[0];
}

function nextMidSlotIndex(nodes, columnId) {
  const usedSlots = nodes
    .filter((node) => node.type === "mid" && node.columnId === columnId)
    .map((node) => Number(node.slotIndex) || 0);
  return usedSlots.length ? Math.max(...usedSlots) + 1 : 0;
}

function midPosition(columnId, slotIndex = 0) {
  const column = midColumnById(columnId);
  return {
    x: column.x,
    y: MID_SLOT_TOP + slotIndex * MID_SLOT_STEP,
  };
}

function midAddPointY(nodes, columnId) {
  const nextSlot = nextMidSlotIndex(nodes, columnId);
  if (nextSlot === 0) return MID_EMPTY_ADD_Y;
  return MID_SLOT_TOP + nextSlot * MID_SLOT_STEP + 82;
}

function layoutCanvasNodes(nodes) {
  let fallbackMidIndex = 0;
  const connectorCounters = { left: 0, right: 0 };
  return nodes.map((node) => {
    if (node.type === "connector") {
      const side = node.side || "left";
      const slotIndex = Number.isInteger(node.slotIndex) ? node.slotIndex : connectorCounters[side] || 0;
      connectorCounters[side] = slotIndex + 1;
      const fallback = connectorPosition(side, slotIndex);
      const rawX = Number.isFinite(Number(node.x)) ? Number(node.x) : fallback.x;
      const rawY = Number.isFinite(Number(node.y)) ? Number(node.y) : fallback.y;
      const x = clamp(rawX, 24, TOPOLOGY_CANVAS_WIDTH - TOPOLOGY_CONNECTOR_WIDTH - 24);
      const y = clamp(rawY, 24, TOPOLOGY_CANVAS_HEIGHT - TOPOLOGY_CONNECTOR_HEIGHT - 24);
      return { ...node, side, slotIndex, x, y };
    }
    if (node.type !== "mid") return node;
    const columnId = node.columnId || MID_COLUMNS[Math.min(fallbackMidIndex, MID_COLUMNS.length - 1)].id;
    const slotIndex = Number.isInteger(node.slotIndex) ? node.slotIndex : fallbackMidIndex;
    fallbackMidIndex += 1;
    return {
      ...node,
      columnId,
      slotIndex,
      ...midPosition(columnId, slotIndex),
    };
  });
}

function endpointLabel(endpoint) {
  return `${endpoint.pinId} of ${endpoint.nodeId}`;
}

function endpointDisplayLabel(endpoint, nodeMap) {
  const node = nodeMap?.get?.(endpoint?.nodeId);
  return `${connectorDisplayName(node) || endpoint?.nodeId}:${endpoint?.pinId}`;
}

function nodeAwgRange(node) {
  if (!node) return [10, 32];
  if (node.type === "connector") {
    const savedPart = connectorPartById(node.partId);
    const part = savedPart.pinCounts.includes(Number(node.pinCount))
      ? savedPart
      : partForFamilyPinCount(savedPart.familyId, node.pinCount);
    return part.awgRange;
  }
  if (node.type === "mid") return midElementTypeById(node.elementType).awgRange;
  return [10, 32];
}

function rangeIncludes(range, gauge) {
  const [min, max] = range.map(Number);
  return Number.isFinite(min) && Number.isFinite(max) && gauge >= min && gauge <= max;
}

function defaultGaugeForEndpoints(nodes, firstEndpoint, secondEndpoint) {
  const firstRange = nodeAwgRange(nodes.find((node) => node.id === firstEndpoint?.nodeId));
  const secondRange = nodeAwgRange(nodes.find((node) => node.id === secondEndpoint?.nodeId));
  const wireType = wireTypeById(defaultWireTypeId);
  const preferredGauges = [22, 24, 20, 26, 18, 28, 16, 30, 14, 12, 10];
  return (
    preferredGauges.find(
      (gauge) =>
        wireType.gauges.includes(gauge) &&
        rangeIncludes(firstRange, gauge) &&
        rangeIncludes(secondRange, gauge),
    ) ||
    wireType.gauges.find(
      (gauge) => rangeIncludes(firstRange, gauge) && rangeIncludes(secondRange, gauge),
    ) ||
    22
  );
}

function summarizeNode(node) {
  if (node.type === "connector") {
    const savedPart = connectorPartById(node.partId);
    const part = savedPart.pinCounts.includes(Number(node.pinCount))
      ? savedPart
      : partForFamilyPinCount(savedPart.familyId, node.pinCount);
    const family = connectorFamilyById(part.familyId);
    return {
      id: node.id,
      type: "connector",
      label: node.label || node.id,
      catalogPartId: part.id,
      catalogFamilyId: family.id,
      manufacturer: part.manufacturer,
      family: family.name,
      mpn: part.mpn,
      selectedOption: node.option,
      pinCount: node.pinCount,
      awgRange: part.awgRange,
      currentRatingA: part.currentRatingA,
      voltageRatingV: part.voltageRatingV,
      compatibleTerminals: part.compatibleTerminals,
      position: {
        x: Number(node.x) || 0,
        y: Number(node.y) || 0,
      },
      notes: part.notes,
    };
  }

  const elementType = midElementTypeById(node.elementType);
  return {
    id: node.id,
    type: "mid_element",
    catalogElementId: elementType.id,
    elementType: elementType.id,
    label: elementType.label,
    selectedOption: node.option,
    leftPins: node.leftPins,
    rightPins: node.rightPins,
    awgRange: elementType.awgRange,
  };
}

function buildReviewItems(nodes, wires) {
  const items = [];
  if (!nodes.some((node) => node.type === "connector")) {
    items.push("At least one connector or endpoint is needed.");
  }
  if (!wires.length) {
    items.push("Connect at least two pins to define a circuit.");
  }
  if (nodes.some((node) => node.type === "connector" && !connectorPartById(node.partId)?.compatibleTerminals?.length)) {
    items.push("Breakout-board endpoints use the internal solder-pad assembly standard.");
  }
  if (nodes.some((node) => node.type === "connector" && connectorPartById(node.partId)?.sealed)) {
    items.push("Sealed endpoints include the internal seal and wedge accessory standard.");
  }
  return items;
}

function connectorDisplayName(node) {
  return node?.label?.trim() || node?.id || "";
}

function endpointNode(layoutNodes, endpoint) {
  return layoutNodes.find((node) => node.id === endpoint?.nodeId);
}

function topologyPinSide(node) {
  return Number(node?.x || 0) < TOPOLOGY_CANVAS_WIDTH / 2 ? "right" : "left";
}

function topologyPortPoint(node) {
  const portSide = topologyPinSide(node);
  return {
    x: portSide === "right" ? Number(node.x) + TOPOLOGY_CONNECTOR_WIDTH : Number(node.x),
    y: Number(node.y) + TOPOLOGY_CONNECTOR_HEIGHT / 2,
    side: portSide,
  };
}

function cubicPath(start, end, bend = 0) {
  const dx = Math.abs(end.x - start.x);
  const control = clamp(dx * 0.36, 72, 210);
  return (
    `M ${start.x} ${start.y} ` +
    `C ${start.x + (start.x <= end.x ? control : -control)} ${start.y + bend}, ` +
    `${end.x + (start.x <= end.x ? -control : control)} ${end.y - bend}, ` +
    `${end.x} ${end.y}`
  );
}

function distanceLength(start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return Math.max(50, Math.round(Math.sqrt(dx * dx + dy * dy) / 10) * 10);
}

function sameConnectorPairKey(a, b) {
  return [a, b].sort().join("::");
}

function segmentKeyForNodes(a, b) {
  return `pair:${sameConnectorPairKey(a, b)}`;
}

function pointBetween(start, end, ratio = 0.5) {
  return {
    x: start.x + (end.x - start.x) * ratio,
    y: start.y + (end.y - start.y) * ratio,
  };
}

function buildTopology(layoutNodes, wires, segmentLengths = {}) {
  const connectors = layoutNodes.filter((node) => node.type === "connector");
  const connectorById = new Map(connectors.map((node) => [node.id, node]));
  const usableWires = wires.filter((wire) => connectorById.has(wire.from?.nodeId) && connectorById.has(wire.to?.nodeId));
  if (!connectors.length) {
    return { segments: [], junctions: [], wireRoutes: new Map(), segmentWires: new Map(), rootId: "" };
  }
  if (!usableWires.length) {
    return { segments: [], junctions: [], wireRoutes: new Map(), segmentWires: new Map(), rootId: connectors[0]?.id || "" };
  }

  const segments = [];
  const junctions = [];
  const wireRoutes = new Map();
  const segmentWires = new Map();
  let segmentIndex = 1;
  let junctionIndex = 1;

  const addSegment = (segment) => {
    segments.push(segment);
    if (!segmentWires.has(segment.id)) segmentWires.set(segment.id, []);
    return segment;
  };

  const attachWireToSegment = (wire, segmentId) => {
    const current = segmentWires.get(segmentId) || [];
    if (!current.some((item) => item.id === wire.id)) current.push(wire);
    segmentWires.set(segmentId, current);
  };

  const directGroups = new Map();
  const branchWires = [];
  usableWires.forEach((wire) => {
    if (wire.route?.type === "branch" && wire.route.segmentKey) {
      branchWires.push(wire);
      return;
    }
    const key = segmentKeyForNodes(wire.from.nodeId, wire.to.nodeId);
    if (!directGroups.has(key)) directGroups.set(key, []);
    directGroups.get(key).push(wire);
  });

  branchWires.forEach((wire) => {
    if (!directGroups.has(wire.route.segmentKey)) {
      const key = segmentKeyForNodes(wire.from.nodeId, wire.to.nodeId);
      if (!directGroups.has(key)) directGroups.set(key, []);
      directGroups.get(key).push({ ...wire, route: { type: "direct" } });
    }
  });

  directGroups.forEach((group, key) => {
    const firstWire = group[0];
    const startNode = connectorById.get(firstWire.from.nodeId);
    const endNode = connectorById.get(firstWire.to.nodeId);
    if (!startNode || !endNode) return;
    const start = topologyPortPoint(startNode);
    const end = topologyPortPoint(endNode);
    const branches = branchWires.filter((wire) => wire.route?.segmentKey === key);

    if (!branches.length) {
      const segment = addSegment({
        id: `B${segmentIndex++}`,
        key,
        fromNodeId: startNode.id,
        toNodeId: endNode.id,
        lengthMm: Number(segmentLengths[key]) || Math.max(...group.map((wire) => Number(wire.lengthMm) || distanceLength(start, end))),
        path: cubicPath(start, end),
        label: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 - 28 },
      });
      group.forEach((wire) => {
        wireRoutes.set(wire.id, [segment.id]);
        attachWireToSegment(wire, segment.id);
      });
      return;
    }

    const ratio = clamp(Number(branches[0]?.route?.ratio) || 0.52, 0.2, 0.8);
    const junctionPoint = pointBetween(start, end, ratio);
    const junction = {
      id: `N${junctionIndex++}`,
      key: `${key}:junction`,
      x: junctionPoint.x,
      y: junctionPoint.y,
    };
    junctions.push(junction);

    const fullLength = Math.max(...group.map((wire) => Number(wire.lengthMm) || distanceLength(start, end)));
    const firstKey = `${key}:start`;
    const secondKey = `${key}:end`;
    const firstDefaultLength = Math.max(40, Math.round(fullLength * ratio));
    const secondDefaultLength = Math.max(40, fullLength - firstDefaultLength);
    const firstLength = Number(segmentLengths[firstKey]) || firstDefaultLength;
    const secondLength = Number(segmentLengths[secondKey]) || secondDefaultLength;
    const firstSegment = addSegment({
      id: `B${segmentIndex++}`,
      key: firstKey,
      baseKey: key,
      fromNodeId: startNode.id,
      toNodeId: junction.id,
      lengthMm: firstLength,
      path: cubicPath(start, junction),
      label: { x: (start.x + junction.x) / 2, y: (start.y + junction.y) / 2 - 28 },
    });
    const secondSegment = addSegment({
      id: `B${segmentIndex++}`,
      key: secondKey,
      baseKey: key,
      fromNodeId: junction.id,
      toNodeId: endNode.id,
      lengthMm: secondLength,
      path: cubicPath(junction, end),
      label: { x: (junction.x + end.x) / 2, y: (junction.y + end.y) / 2 - 28 },
    });

    group.forEach((wire) => {
      wireRoutes.set(wire.id, [firstSegment.id, secondSegment.id]);
      attachWireToSegment(wire, firstSegment.id);
      attachWireToSegment(wire, secondSegment.id);
    });

    branches.forEach((wire) => {
      const sharedNodeId = [wire.from.nodeId, wire.to.nodeId].find((nodeId) => nodeId === startNode.id || nodeId === endNode.id);
      const branchEndpoint = [wire.from, wire.to].find((endpoint) => endpoint.nodeId !== sharedNodeId) || wire.to;
      const branchNode = connectorById.get(branchEndpoint.nodeId);
      if (!branchNode) return;
      const branchPoint = topologyPortPoint(branchNode);
      const sharedSegment = sharedNodeId === endNode.id ? secondSegment : firstSegment;
      const branchKey = `branch:${wire.id}`;
      const branchLength = Math.max(40, Number(segmentLengths[branchKey]) || Number(wire.branchLengthMm) || distanceLength(junction, branchPoint));
      const branchSegment = addSegment({
        id: `B${segmentIndex++}`,
        key: branchKey,
        baseKey: key,
        fromNodeId: junction.id,
        toNodeId: branchNode.id,
        lengthMm: branchLength,
        path: cubicPath(junction, branchPoint, branchPoint.y < junction.y ? -18 : 18),
        label: {
          x: (junction.x + branchPoint.x) / 2,
          y: (junction.y + branchPoint.y) / 2 + (branchPoint.y < junction.y ? -28 : 34),
        },
      });
      wireRoutes.set(wire.id, [sharedSegment.id, branchSegment.id]);
      attachWireToSegment(wire, sharedSegment.id);
      attachWireToSegment(wire, branchSegment.id);
    });
  });

  branchWires.forEach((wire) => {
    if (wireRoutes.has(wire.id)) return;
    const startNode = connectorById.get(wire.from.nodeId);
    const endNode = connectorById.get(wire.to.nodeId);
    if (!startNode || !endNode) return;
    const start = topologyPortPoint(startNode);
    const end = topologyPortPoint(endNode);
    const segment = addSegment({
      id: `B${segmentIndex++}`,
      key: segmentKeyForNodes(startNode.id, endNode.id),
      fromNodeId: startNode.id,
      toNodeId: endNode.id,
      lengthMm: Number(segmentLengths[segmentKeyForNodes(startNode.id, endNode.id)]) || Number(wire.lengthMm) || distanceLength(start, end),
      path: cubicPath(start, end),
      label: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 - 28 },
    });
    wireRoutes.set(wire.id, [segment.id]);
    attachWireToSegment(wire, segment.id);
  });

  return { segments, junctions, wireRoutes, segmentWires, rootId: connectors[0]?.id || "" };
}

function conductorRouteLength(wire, topology) {
  const routeIds = topology.wireRoutes.get(wire.id) || [];
  const total = routeIds.reduce((sum, segmentId) => {
    const segment = topology.segments.find((item) => item.id === segmentId);
    return sum + (Number(segment?.lengthMm) || 0);
  }, 0);
  return total || Number(wire.lengthMm) || 100;
}

function routeDisplayLabel(routeIds, topology) {
  const segments = routeIds
    .map((segmentId) => topology.segments.find((segment) => segment.id === segmentId))
    .filter(Boolean);
  if (!segments.length) return "";

  return segments.reduce((parts, segment, index) => {
    if (index > 0) {
      const previous = segments[index - 1];
      const sharedJunction = [previous.fromNodeId, previous.toNodeId].find(
        (nodeId) =>
          typeof nodeId === "string" &&
          nodeId.startsWith("N") &&
          (segment.fromNodeId === nodeId || segment.toNodeId === nodeId),
      );
      if (sharedJunction) parts.push(sharedJunction);
    }
    parts.push(segment.id);
    return parts;
  }, []).join(" / ");
}

function isBranchOnlySegment(segment) {
  return typeof segment?.key === "string" && segment.key.startsWith("branch:");
}

function segmentTouchesWireEndpoint(segment, wire) {
  if (!segment || !wire) return false;
  const endpointNodeIds = new Set([wire.from?.nodeId, wire.to?.nodeId]);
  return endpointNodeIds.has(segment.fromNodeId) || endpointNodeIds.has(segment.toNodeId);
}

function routeCandidateSegmentsForWire(topology, routeDecisionWire) {
  if (!routeDecisionWire) return [];
  return topology.segments.filter((segment) => {
    const segmentWireIds = new Set((topology.segmentWires.get(segment.id) || []).map((wire) => wire.id));
    return (
      !segmentWireIds.has(routeDecisionWire.id) &&
      !isBranchOnlySegment(segment) &&
      segmentTouchesWireEndpoint(segment, routeDecisionWire)
    );
  });
}

export default function CanvasConfigurator({
  activeMode = "canvas",
  onSwitchMode,
  onSubmitConfiguration,
  submitting = false,
  draftStorageKey = "",
}) {
  const initialDraft = readCanvasDraft(draftStorageKey);
  const [configurationName, setConfigurationName] = useState(
    initialDraft?.configurationName || "New canvas harness configuration",
  );
  const [quantity, setQuantity] = useState(initialDraft?.quantity || 10);
  const [nodes, setNodes] = useState(initialDraft?.nodes || defaultNodes);
  const [wires, setWires] = useState(initialDraft?.wires || defaultWires);
  const [segmentLengths, setSegmentLengths] = useState(initialDraft?.segmentLengths || {});
  const [pendingEndpoint, setPendingEndpoint] = useState(null);
  const [connectorPicker, setConnectorPicker] = useState(null);
  const [wireGeometry, setWireGeometry] = useState({});
  const [wireModalId, setWireModalId] = useState("");
  const [midModalId, setMidModalId] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [confirmingConfiguration, setConfirmingConfiguration] = useState(null);
  const [selectedConnectorId, setSelectedConnectorId] = useState("");
  const [selectedWireId, setSelectedWireId] = useState("");
  const [selectedSegmentId, setSelectedSegmentId] = useState("");
  const [routeDecisionWireId, setRouteDecisionWireId] = useState("");
  const canvasRef = useRef(null);
  const pinRefs = useRef(new Map());

  const layoutNodes = useMemo(() => layoutCanvasNodes(nodes), [nodes]);

  const nodeById = useMemo(
    () => new Map(layoutNodes.map((node) => [node.id, node])),
    [layoutNodes],
  );

  const topology = useMemo(() => buildTopology(layoutNodes, wires, segmentLengths), [layoutNodes, segmentLengths, wires]);

  const connectorNodes = layoutNodes.filter((node) => node.type === "connector");
  const selectedConnector =
    connectorNodes.find((node) => node.id === selectedConnectorId) ||
    connectorNodes[0] ||
    null;
  const selectedConductor = wires.find((wire) => wire.id === selectedWireId) || null;
  const selectedSegment =
    topology.segments.find((segment) => segment.id === selectedSegmentId) ||
    (selectedConductor
      ? topology.segments.find((segment) => topology.wireRoutes.get(selectedConductor.id)?.includes(segment.id))
      : null);
  const selectedSegmentWires = selectedSegment
    ? topology.segmentWires.get(selectedSegment.id) || []
    : [];
  const routeDecisionWire = wires.find((wire) => wire.id === routeDecisionWireId) || null;
  const routeCandidateSegments = routeCandidateSegmentsForWire(topology, routeDecisionWire);

  const midColumnStates = useMemo(
    () =>
      MID_COLUMNS.map((column) => ({
        ...column,
        nextSlot: nextMidSlotIndex(nodes, column.id),
        addY: midAddPointY(nodes, column.id),
      })),
    [nodes],
  );

  const canvasContentHeight = useMemo(() => {
    const connectorBottoms = nodes
      .filter((node) => node.type === "connector")
      .map((node) => CONNECTOR_TOP + (Number(node.slotIndex) || 0) * CONNECTOR_SLOT_STEP + 420);
    const midBottoms = nodes
      .filter((node) => node.type === "mid")
      .map((node) => MID_SLOT_TOP + (Number(node.slotIndex) || 0) * MID_SLOT_STEP + 250);
    const addPointBottoms = midColumnStates.map((column) => column.addY + 120);
    return Math.max(560, ...connectorBottoms, ...midBottoms, ...addPointBottoms);
  }, [midColumnStates, nodes]);

  const connectedPins = useMemo(() => {
    const keys = new Set();
    wires.forEach((wire) => {
      keys.add(endpointKey(wire.from));
      keys.add(endpointKey(wire.to));
    });
    return keys;
  }, [wires]);

  const reviewItems = useMemo(() => buildReviewItems(nodes, wires), [nodes, wires]);
  const connectorCount = nodes.filter((node) => node.type === "connector").length;
  const midCount = nodes.filter((node) => node.type === "mid").length;
  const bundleCount = topology.segments.length;
  const configuredSummary = `${connectorCount} connector + ${bundleCount} bundle segment + ${wires.length} conductor`;

  const selectedWire = wires.find((wire) => wire.id === wireModalId);
  const selectedMid = nodes.find((node) => node.id === midModalId && node.type === "mid");
  const hasLeftConnector = nodes.some((node) => node.type === "connector" && node.side !== "right");
  const hasRightConnector = nodes.some((node) => node.type === "connector" && node.side === "right");

  useEffect(() => {
    if (!connectorNodes.length) {
      if (selectedConnectorId) setSelectedConnectorId("");
      return;
    }
    if (!selectedConnectorId || !connectorNodes.some((node) => node.id === selectedConnectorId)) {
      setSelectedConnectorId(connectorNodes[0].id);
    }
  }, [connectorNodes, selectedConnectorId]);

  useEffect(() => {
    if (selectedWireId && !wires.some((wire) => wire.id === selectedWireId)) {
      setSelectedWireId("");
    }
    if (routeDecisionWireId && !wires.some((wire) => wire.id === routeDecisionWireId)) {
      setRouteDecisionWireId("");
    }
    if (selectedSegmentId && !topology.segments.some((segment) => segment.id === selectedSegmentId)) {
      setSelectedSegmentId("");
    }
  }, [routeDecisionWireId, selectedSegmentId, selectedWireId, topology.segments, wires]);

  useEffect(() => {
    const updateGeometry = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const canvasRect = canvas.getBoundingClientRect();
      const nextGeometry = {};

      wires.forEach((wire, wireIndex) => {
        const startEl = pinRefs.current.get(endpointKey(wire.from));
        const endEl = pinRefs.current.get(endpointKey(wire.to));
        if (!startEl || !endEl || !nodeById.has(wire.from.nodeId) || !nodeById.has(wire.to.nodeId)) return;
        const startRect = startEl.getBoundingClientRect();
        const endRect = endEl.getBoundingClientRect();
        const start = {
          x: startRect.left - canvasRect.left + startRect.width / 2,
          y: startRect.top - canvasRect.top + startRect.height / 2,
        };
        const end = {
          x: endRect.left - canvasRect.left + endRect.width / 2,
          y: endRect.top - canvasRect.top + endRect.height / 2,
        };
        const visualStart = start.x <= end.x ? start : end;
        const visualEnd = start.x <= end.x ? end : start;
        const dx = Math.abs(visualEnd.x - visualStart.x);
        const control = clamp(dx * 0.42, 56, 220);
        const labelNudges = [-13, 13, -28, 28, 0];
        const labelX = visualStart.x + clamp(dx * 0.28, 78, 148);
        const labelY = visualStart.y + (visualEnd.y - visualStart.y) * 0.16 + labelNudges[wireIndex % labelNudges.length];
        nextGeometry[wire.id] = {
          start,
          end,
          label: {
            x: labelX,
            y: clamp(labelY, 24, Math.max(120, canvasRect.height - 80)),
          },
          path:
            `M ${visualStart.x} ${visualStart.y} ` +
            `C ${visualStart.x + control} ${visualStart.y}, ` +
            `${visualEnd.x - control} ${visualEnd.y}, ${visualEnd.x} ${visualEnd.y}`,
        };
      });
      setWireGeometry(nextGeometry);
    };

    const frame = window.requestAnimationFrame(updateGeometry);
    window.addEventListener("resize", updateGeometry);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateGeometry);
    };
  }, [layoutNodes, wires, connectorPicker, nodeById]);

  useEffect(() => {
    if (!draftStorageKey || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        draftStorageKey,
        JSON.stringify({
          version: canvasDraftVersion,
          configurationName,
          quantity,
          nodes,
          wires,
          segmentLengths,
          updatedAt: new Date().toISOString(),
        }),
      );
    } catch {
      // Draft restore is a convenience; checkout should not depend on browser storage.
    }
  }, [configurationName, draftStorageKey, nodes, quantity, segmentLengths, wires]);

  const registerPin = (endpoint) => (element) => {
    const key = endpointKey(endpoint);
    if (element) {
      pinRefs.current.set(key, element);
    } else {
      pinRefs.current.delete(key);
    }
  };

  const updateConnector = (nodeId, patch) => {
    setNodes((current) =>
      current.map((node) => (node.id === nodeId ? { ...node, ...patch } : node)),
    );
  };

  const moveConnector = (nodeId, x, y) => {
    setNodes((current) =>
      current.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              x: clamp(Math.round(x), 24, TOPOLOGY_CANVAS_WIDTH - TOPOLOGY_CONNECTOR_WIDTH - 24),
              y: clamp(Math.round(y), 24, TOPOLOGY_CANVAS_HEIGHT - TOPOLOGY_CONNECTOR_HEIGHT - 24),
            }
          : node,
      ),
    );
  };

  const changeConnectorFamily = (nodeId, familyId) => {
    const family = connectorFamilyById(familyId);
    const part = connectorPartById(family.defaultPartId);
    updateConnector(nodeId, {
      partId: part.id,
      pinCount: part.defaultPinCount,
      option: part.options[0],
    });
  };

  const changeConnectorPinCount = (nodeId, pinCount) => {
    const node = nodes.find((item) => item.id === nodeId);
    const currentPart = connectorPartById(node?.partId);
    const nextPart = partForFamilyPinCount(currentPart.familyId, pinCount);
    updateConnector(nodeId, {
      partId: nextPart.id,
      pinCount: nextPart.defaultPinCount,
      option: nextPart.options.includes(node?.option) ? node.option : nextPart.options[0],
    });
  };

  const selectConnectorPart = (part, target) => {
    if (!part) return;
    const connectorNumber = nodes.filter((node) => node.type === "connector").length;
    const side = target?.side || (connectorNumber % 2 ? "right" : "left");
    const slotIndex = Number.isInteger(target?.slotIndex)
      ? target.slotIndex
      : connectorSlotIndex(nodes, side);
    const position = connectorPosition(side, slotIndex);
    const x = Number.isFinite(Number(target?.x)) ? Number(target.x) : position.x;
    const y = Number.isFinite(Number(target?.y)) ? Number(target.y) : position.y;
    const id = createConnectorId(nodes);
    const nextNode = {
      id,
      type: "connector",
      side,
      slotIndex,
      x,
      y,
      label: id,
      partId: part.id,
      pinCount: part.defaultPinCount,
      option: part.options[0],
    };
    setNodes((current) => [...current, nextNode]);
    setSelectedConnectorId(id);
    setConnectorPicker(null);
  };

  const addMidElement = (slot) => {
    const type = midElementTypes[0];
    const columnId = slot?.columnId || MID_COLUMNS[0].id;
    setNodes((current) => {
      const slotIndex = nextMidSlotIndex(current, columnId);
      const position = midPosition(columnId, slotIndex);
      const nextNode = {
        id: createMidId(current),
        type: "mid",
        columnId,
        slotIndex,
        x: position.x,
        y: position.y,
        elementType: type.id,
        option: type.options[0],
        leftPins: type.defaultLeftPins,
        rightPins: type.defaultRightPins,
      };
      return [...current, nextNode];
    });
  };

  const deleteNode = (nodeId) => {
    const targetNode = nodes.find((node) => node.id === nodeId);
    setNodes((current) => {
      const remaining = current.filter((node) => node.id !== nodeId);
      if (!targetNode) return remaining;
      const deletedSlot = Number(targetNode.slotIndex) || 0;
      if (targetNode.type === "connector") {
        return remaining.map((node) =>
          node.type === "connector" &&
          node.side === targetNode.side &&
          (Number(node.slotIndex) || 0) > deletedSlot
            ? { ...node, slotIndex: (Number(node.slotIndex) || 0) - 1 }
            : node,
        );
      }
      if (targetNode.type === "mid") {
        return remaining.map((node) =>
          node.type === "mid" &&
          node.columnId === targetNode.columnId &&
          (Number(node.slotIndex) || 0) > deletedSlot
            ? { ...node, slotIndex: (Number(node.slotIndex) || 0) - 1 }
            : node,
        );
      }
      return remaining;
    });
    setWires((current) =>
      current.filter(
        (wire) => wire.from.nodeId !== nodeId && wire.to.nodeId !== nodeId,
      ),
    );
    if (pendingEndpoint?.nodeId === nodeId) setPendingEndpoint(null);
    if (midModalId === nodeId) setMidModalId("");
    if (selectedConnectorId === nodeId) setSelectedConnectorId("");
  };

  const handlePinClick = (endpoint) => {
    setSubmitError("");
    const key = endpointKey(endpoint);
    if (!pendingEndpoint && connectedPins.has(key)) {
      const removedWire = wires.find(
        (wire) => endpointKey(wire.from) === key || endpointKey(wire.to) === key,
      );
      setWires((current) =>
        current.filter(
          (wire) =>
            endpointKey(wire.from) !== key && endpointKey(wire.to) !== key,
        ),
      );
      if (removedWire?.id === selectedWireId) setSelectedWireId("");
      return;
    }
    if (!pendingEndpoint) {
      setPendingEndpoint(endpoint);
      return;
    }
    if (endpointKey(pendingEndpoint) === endpointKey(endpoint)) {
      setPendingEndpoint(null);
      return;
    }
    const duplicate = wires.some((wire) => {
      const a = endpointKey(wire.from);
      const b = endpointKey(wire.to);
      const first = endpointKey(pendingEndpoint);
      const second = endpointKey(endpoint);
      return (a === first && b === second) || (a === second && b === first);
    });
    if (!duplicate) {
      const defaultGauge = defaultGaugeForEndpoints(nodes, pendingEndpoint, endpoint);
      const nextWireId = createWireId(wires);
      const nextWire = {
        id: nextWireId,
        from: pendingEndpoint,
        to: endpoint,
        lengthMm: 100,
        wireType: defaultWireTypeId,
        gauge: defaultGauge,
        color: "Black",
        route: { type: "direct" },
      };
      setWires((current) => [...current, nextWire]);
      setSelectedWireId(nextWireId);
      setSelectedSegmentId("");
      if (routeCandidateSegmentsForWire(topology, nextWire).length) {
        setRouteDecisionWireId(nextWireId);
      }
    }
    setPendingEndpoint(null);
  };

  const updateWire = (wireId, patch) => {
    setWires((current) =>
      current.map((wire) => (wire.id === wireId ? { ...wire, ...patch } : wire)),
    );
  };

  const setWireDirectRoute = (wireId) => {
    updateWire(wireId, { route: { type: "direct" } });
    setRouteDecisionWireId("");
  };

  const setWireBranchRoute = (wireId, segment) => {
    const segmentKey = segment?.baseKey || segment?.key;
    if (!segmentKey) return;
    updateWire(wireId, {
      route: { type: "branch", segmentKey, ratio: 0.52 },
    });
    setRouteDecisionWireId("");
    setSelectedWireId(wireId);
    setSelectedSegmentId("");
  };

  const requestRouteDecision = (wireId) => {
    setRouteDecisionWireId(wireId);
    setSelectedWireId(wireId);
    setSelectedSegmentId("");
  };

  const updateSegmentLength = (segmentId, lengthMm) => {
    const nextLength = clamp(Math.round(Number(lengthMm) || 100), 25, 2500);
    const segment = topology.segments.find((item) => item.id === segmentId);
    if (!segment?.key) return;
    setSegmentLengths((current) => ({ ...current, [segment.key]: nextLength }));
  };

  const deleteWire = (wireId) => {
    setWires((current) => current.filter((wire) => wire.id !== wireId));
    if (selectedWireId === wireId) setSelectedWireId("");
    if (wireModalId === wireId) setWireModalId("");
    if (routeDecisionWireId === wireId) setRouteDecisionWireId("");
  };

  const updateMidElement = (nodeId, patch) => {
    setNodes((current) =>
      current.map((node) => (node.id === nodeId ? { ...node, ...patch } : node)),
    );
  };

  const buildConfiguration = () => {
    const connectionGroups = wires.map((wire) => {
      const type = wireTypeById(wire.wireType);
      return {
        id: wire.id,
        start: wire.from,
        end: wire.to,
        startLabel: endpointDisplayLabel(wire.from, nodeById),
        endLabel: endpointDisplayLabel(wire.to, nodeById),
        lengthMm: conductorRouteLength(wire, topology),
        wireType: type.label,
        wireTypeId: type.id,
        wireGaugeAwg: Number(wire.gauge),
        wireColor: wire.color,
        route: wire.route || { type: "direct" },
      };
    });

    const baseConfiguration = {
      schemaVersion: "easy-harness.canvas-configuration.v1",
      catalogVersion: harnessCatalogVersion,
      source: "canvas_configurator",
      title: configurationName.trim() || "Canvas harness configuration",
      quantity: Number(quantity) || 1,
      endpoints: nodes.filter((node) => node.type === "connector").map(summarizeNode),
      midElements: nodes.filter((node) => node.type === "mid").map(summarizeNode),
      connectionGroups,
      knownRequirements: {
        selectedFromCatalog: true,
        pricePath: "Easy Harness internal catalog price",
      },
      visualDraftData: {
        mode: "topology",
        nodes: layoutNodes,
        wires,
        topologySegments: topology.segments,
        topologyJunctions: topology.junctions,
        wireRoutes: Object.fromEntries(topology.wireRoutes),
      },
    };

    const pricingEstimate = calculateCanvasConfigurationPrice(baseConfiguration);
    return {
      ...baseConfiguration,
      pricingEstimate,
      reviewItems: [
        ...reviewItems,
        ...pricingEstimate.blockers,
      ],
    };
  };

  const pricingPreview = calculateCanvasConfigurationPrice({
    schemaVersion: "easy-harness.canvas-configuration.v1",
    catalogVersion: harnessCatalogVersion,
    source: "canvas_configurator",
    title: configurationName.trim() || "Canvas harness configuration",
    quantity: Number(quantity) || 1,
    endpoints: nodes.filter((node) => node.type === "connector").map(summarizeNode),
    midElements: nodes.filter((node) => node.type === "mid").map(summarizeNode),
    connectionGroups: wires.map((wire) => {
      const type = wireTypeById(wire.wireType);
      return {
        id: wire.id,
        start: wire.from,
        end: wire.to,
        startLabel: endpointDisplayLabel(wire.from, nodeById),
        endLabel: endpointDisplayLabel(wire.to, nodeById),
        lengthMm: conductorRouteLength(wire, topology),
        wireType: type.label,
        wireTypeId: type.id,
        wireGaugeAwg: Number(wire.gauge),
        wireColor: wire.color,
        route: wire.route || { type: "direct" },
      };
    }),
  });
  const canContinueToOrder = pricingPreview.directCheckoutEligible;

  const openCheckoutConfirmation = () => {
    const configuration = buildConfiguration();
    if (!configuration.connectionGroups.length) {
      setSubmitError("Connect at least two pins before continuing to checkout.");
      return;
    }
    if (!configuration.pricingEstimate?.directCheckoutEligible) {
      setSubmitError(configuration.pricingEstimate?.blockers?.[0] || "Resolve catalog selections before checkout.");
      return;
    }
    setSubmitError("");
    setConfirmingConfiguration(configuration);
  };

  const submitConfiguration = async () => {
    const configuration = confirmingConfiguration || buildConfiguration();
    try {
      await onSubmitConfiguration?.(configuration);
      clearCanvasDraft(draftStorageKey);
      setConfirmingConfiguration(null);
    } catch (error) {
      setSubmitError(error?.message || "This configuration could not be saved.");
      setConfirmingConfiguration(null);
    }
  };

  return (
    <div className="canvas-configurator-shell">
      <header className="canvas-configurator-header">
        <div>
          <span className="eyebrow">New request</span>
          <h1>Configure a harness on canvas</h1>
          <p>Draw the physical harness topology, then confirm each connector pin table.</p>
        </div>
        <div className="request-entry-switch compact" aria-label="Request entry mode">
          <button
            className={activeMode === "agent" ? "active" : ""}
            onClick={() => onSwitchMode?.("agent")}
          >
            Upload assistant
          </button>
          <button
            className={activeMode === "canvas" ? "active" : ""}
            onClick={() => onSwitchMode?.("canvas")}
          >
            Canvas configurator
          </button>
          <button
            className={activeMode === "upload" ? "active" : ""}
            onClick={() => onSwitchMode?.("upload")}
          >
            Prepared package
          </button>
        </div>
      </header>

      <div className="canvas-configurator-meta">
        <label className="canvas-name-field">
          <span>Request item</span>
          <input
            value={configurationName}
            onChange={(event) => setConfigurationName(event.target.value)}
          />
        </label>
      </div>

      <main className="canvas-topology-workspace">
        <section className="topology-canvas-panel" aria-label="Harness topology drawing">
          <div className="topology-toolbar">
            <button
              className="topology-tool-primary"
              type="button"
              onClick={() => {
                const side = connectorCount % 2 ? "right" : "left";
                const slotIndex = connectorSlotIndex(nodes, side);
                const position = connectorPosition(side, slotIndex);
                setConnectorPicker({
                  x: position.x + 8,
                  y: position.y + 8,
                  side,
                  slotIndex,
                  view: "choices",
                  query: "",
                });
              }}
            >
              <Plus size={15} />
              Add connector
            </button>
            <button className="topology-tool" type="button" onClick={() => setSubmitError("New harness action is reserved for Canvas V2.")}>
              <FilePlus size={15} />
              New
            </button>
            <button className="topology-tool" type="button" onClick={() => setSubmitError("Draft is saved automatically in this browser.")}>
              <Save size={15} />
              Save
            </button>
            <button className="topology-tool" type="button" onClick={() => setSubmitError("Drawing export will use this topology and pin table format.")}>
              <Download size={15} />
              Export
            </button>
            <div className="topology-toolbar-note">
              Drawing shows physical bundles. Pin table keeps conductor-level mapping.
            </div>
          </div>
          <div className="topology-canvas-scroll">
            <div className="topology-board" ref={canvasRef}>
              <svg
                className="topology-svg"
                viewBox={`0 0 ${TOPOLOGY_CANVAS_WIDTH} ${TOPOLOGY_CANVAS_HEIGHT}`}
                aria-hidden="true"
              >
                {topology.segments.map((segment, index) => {
                  const segmentWires = topology.segmentWires.get(segment.id) || [];
                  const isSelected = selectedSegment?.id === segment.id;
                  const isOnSelectedWire =
                    selectedConductor && topology.wireRoutes.get(selectedConductor.id)?.includes(segment.id);
                  const wireCountLabel = `${segmentWires.length} wire${segmentWires.length === 1 ? "" : "s"}`;
                  const label = `${segment.id} ${segment.lengthMm}mm | ${wireCountLabel}`;
                  const labelWidth = clamp(label.length * 7 + 16, 92, 158);
                  return (
                    <g key={segment.id} className={isSelected || isOnSelectedWire ? "active" : ""}>
                      <path className="topology-bundle-shadow" d={segment.path} />
                      <path
                        className="topology-bundle-hit"
                        d={segment.path}
                        onClick={() => {
                          setSelectedSegmentId(segment.id);
                          setSelectedWireId("");
                        }}
                      />
                      <path className="topology-bundle" d={segment.path} />
                      <path
                        className="topology-bundle-thread"
                        d={segment.path}
                        style={{ "--segment-color": topologySegmentColors[index % topologySegmentColors.length] }}
                      />
                      {(isSelected || isOnSelectedWire) && (
                        <path className="topology-bundle-highlight" d={segment.path} />
                      )}
                      <g
                        className="topology-bundle-label"
                        transform={`translate(${segment.label.x} ${segment.label.y})`}
                        onClick={() => {
                          setSelectedSegmentId(segment.id);
                          setSelectedWireId("");
                        }}
                      >
                        <rect x={-labelWidth / 2} y="-13" width={labelWidth} height="26" />
                        <text x="0" y="4" textAnchor="middle">{label}</text>
                      </g>
                    </g>
                  );
                })}
                {topology.junctions.map((junction) => (
                  <g key={junction.id} className="topology-junction">
                    <circle cx={junction.x} cy={junction.y} r={TOPOLOGY_JUNCTION_RADIUS} />
                    <text x={junction.x + 23} y={junction.y - 10}>{junction.id}</text>
                  </g>
                ))}
              </svg>

              {connectorNodes.map((node) => (
                <TopologyConnectorCard
                  key={node.id}
                  node={node}
                  selected={selectedConnector?.id === node.id}
                  pendingTarget={Boolean(pendingEndpoint && pendingEndpoint.nodeId !== node.id)}
                  connectedCount={wires.filter((wire) => wire.from.nodeId === node.id || wire.to.nodeId === node.id).length}
                  onSelect={() => {
                    setSelectedConnectorId(node.id);
                    setSelectedSegmentId("");
                    setSelectedWireId("");
                  }}
                  onMove={(nextX, nextY) => moveConnector(node.id, nextX, nextY)}
                  onDelete={() => deleteNode(node.id)}
                  canvasRef={canvasRef}
                />
              ))}

              {pendingEndpoint && (
                <div className="topology-pending-banner">
                  <GitBranch size={15} />
                  <span>Connecting from {pendingEndpoint.nodeId}:{pendingEndpoint.pinId}. Click another connector, then choose an open pin row.</span>
                  <button type="button" onClick={() => setPendingEndpoint(null)}>Cancel</button>
                </div>
              )}

              {!connectorNodes.length && (
                <button
                  className="topology-empty-add"
                  type="button"
                  onClick={() =>
                    setConnectorPicker({
                      x: 96,
                      y: 88,
                      side: "left",
                      slotIndex: 0,
                      view: "choices",
                      query: "",
                    })
                  }
                >
                  <Plus size={22} />
                  Add first connector
                </button>
              )}

              {connectorPicker && (
                <ConnectorPicker
                  picker={connectorPicker}
                  onChange={setConnectorPicker}
                  onSelect={(part) => selectConnectorPart(part, connectorPicker)}
                  onClose={() => setConnectorPicker(null)}
                />
              )}
            </div>
          </div>
        </section>

        <TopologyDetailPanel
          selectedConnector={selectedConnector}
          wires={wires}
          pendingEndpoint={pendingEndpoint}
          selectedWireId={selectedWireId}
          selectedSegment={selectedSegment}
          selectedSegmentWires={selectedSegmentWires}
          routeDecisionWire={routeDecisionWire}
          routeCandidateSegments={routeCandidateSegments}
          topology={topology}
          nodeById={nodeById}
          onSelectWire={(wireId) => {
            setSelectedWireId(wireId);
            setSelectedSegmentId("");
          }}
          onSelectSegment={setSelectedSegmentId}
          onPinClick={handlePinClick}
          onOpenWire={setWireModalId}
          onUpdateSegmentLength={updateSegmentLength}
          onKeepDirectRoute={setWireDirectRoute}
          onJoinSegmentRoute={setWireBranchRoute}
          onRequestRouteDecision={requestRouteDecision}
          onDeleteWire={deleteWire}
          onDeleteConnector={deleteNode}
          onUpdateConnector={updateConnector}
          onFamilyChange={changeConnectorFamily}
          onPinCountChange={changeConnectorPinCount}
        />
      </main>

      <footer className="canvas-configurator-footer">
        <div className="canvas-footer-summary">
          <strong>
            {nodes.length || wires.length
              ? `Configured item: ${configuredSummary}`
              : "Start by adding a connector"}
          </strong>
          {nodes.length || wires.length ? (
            <>
              <span className="canvas-price-line">
                {formatPriceCents(pricingPreview.totalCents)} total - {formatPriceCents(pricingPreview.unitPriceCents)} each - internal catalog price
              </span>
              {!canContinueToOrder && (
                <small>{pricingPreview.blockers[0] || "Complete catalog selections before checkout."}</small>
              )}
            </>
          ) : null}
          {submitError && <small>{submitError}</small>}
        </div>
        <label className="canvas-quantity-field">
          <span>Quantity</span>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </label>
        <button
          className="canvas-submit-button"
          onClick={openCheckoutConfirmation}
          disabled={submitting || !canContinueToOrder}
        >
          {submitting ? "Saving..." : "Continue to checkout"}
        </button>
      </footer>

      {selectedWire && (
        <WireConfigurationModal
          wire={selectedWire}
          nodeById={nodeById}
          onClose={() => setWireModalId("")}
          onSave={(patch) => {
            updateWire(selectedWire.id, patch);
            setWireModalId("");
          }}
        />
      )}
      {selectedMid && (
        <MidConfigurationModal
          node={selectedMid}
          onClose={() => setMidModalId("")}
          onSave={(patch) => {
            updateMidElement(selectedMid.id, patch);
            setMidModalId("");
          }}
        />
      )}
      {confirmingConfiguration && (
        <CanvasCheckoutConfirmationModal
          configuration={confirmingConfiguration}
          estimate={confirmingConfiguration.pricingEstimate}
          submitting={submitting}
          onClose={() => setConfirmingConfiguration(null)}
          onConfirm={submitConfiguration}
        />
      )}
    </div>
  );
}

function TopologyConnectorCard({ node, selected, pendingTarget, connectedCount, onSelect, onMove, onDelete, canvasRef }) {
  const savedPart = connectorPartById(node.partId);
  const part = savedPart.pinCounts.includes(Number(node.pinCount))
    ? savedPart
    : partForFamilyPinCount(savedPart.familyId, node.pinCount);
  const portSide = topologyPinSide(node);
  const dragRef = useRef(null);

  const startDrag = (event) => {
    if (event.button !== 0 || event.target.closest("button")) return;
    const board = canvasRef.current;
    if (!board) return;
    const boardRect = board.getBoundingClientRect();
    dragRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: Number(node.x) || 0,
      startY: Number(node.y) || 0,
      scaleX: TOPOLOGY_CANVAS_WIDTH / boardRect.width,
      scaleY: TOPOLOGY_CANVAS_HEIGHT / boardRect.height,
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    onSelect();
  };

  const drag = (event) => {
    const dragState = dragRef.current;
    if (!dragState) return;
    const nextX = dragState.startX + (event.clientX - dragState.startClientX) * dragState.scaleX;
    const nextY = dragState.startY + (event.clientY - dragState.startClientY) * dragState.scaleY;
    if (Math.abs(event.clientX - dragState.startClientX) > 2 || Math.abs(event.clientY - dragState.startClientY) > 2) {
      dragState.moved = true;
    }
    onMove(nextX, nextY);
  };

  const endDrag = (event) => {
    const moved = dragRef.current?.moved;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (!moved) onSelect();
  };

  return (
    <article
      className={`topology-connector-card ${selected ? "selected" : ""} ${pendingTarget ? "pending-target" : ""}`}
      style={{ left: node.x, top: node.y }}
      role="button"
      tabIndex={0}
      onPointerDown={startDrag}
      onPointerMove={drag}
      onPointerUp={endDrag}
      onPointerCancel={() => {
        dragRef.current = null;
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelect();
      }}
    >
      <div className="topology-connector-head">
        <strong title={connectorDisplayName(node)}>{connectorDisplayName(node)}</strong>
        <button
          type="button"
          aria-label={`Delete ${node.id}`}
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
        >
          <X size={12} />
        </button>
      </div>
      <div className="topology-connector-art" aria-hidden="true">
        <span />
      </div>
      <div className="topology-connector-copy">
        <strong title={part.mpn}>{part.mpn}</strong>
        <span title={part.displayName}>{part.displayName}</span>
        <small>{node.pinCount} pins / {connectedCount} assigned</small>
      </div>
      <i className={`topology-connector-port ${portSide}`} />
    </article>
  );
}

function TopologyDetailPanel({
  selectedConnector,
  wires,
  pendingEndpoint,
  selectedWireId,
  selectedSegment,
  selectedSegmentWires,
  routeDecisionWire,
  routeCandidateSegments,
  topology,
  nodeById,
  onSelectWire,
  onSelectSegment,
  onPinClick,
  onOpenWire,
  onUpdateSegmentLength,
  onKeepDirectRoute,
  onJoinSegmentRoute,
  onRequestRouteDecision,
  onDeleteWire,
  onDeleteConnector,
  onUpdateConnector,
  onFamilyChange,
  onPinCountChange,
}) {
  if (!selectedConnector) {
    return (
      <aside className="topology-detail-panel">
        <section className="topology-panel-card empty">
          <strong>No connector selected</strong>
          <span>Add a connector to start a harness topology.</span>
        </section>
      </aside>
    );
  }

  const savedPart = connectorPartById(selectedConnector.partId);
  const part = savedPart.pinCounts.includes(Number(selectedConnector.pinCount))
    ? savedPart
    : partForFamilyPinCount(savedPart.familyId, selectedConnector.pinCount);
  const family = connectorFamilyById(part.familyId);
  const familyParts = partsForFamily(family.id);
  const familyPinCounts = [...new Set(familyParts.flatMap((item) => item.pinCounts))].sort((a, b) => a - b);
  const pins = pinList(selectedConnector.pinCount);
  const assignedCount = pins.filter((pinId) => wireForConnectorPin(wires, selectedConnector.id, pinId)).length;
  const selectedWire = wires.find((wire) => wire.id === selectedWireId);
  const segmentOnly = selectedSegment && !selectedWire;

  if (segmentOnly) {
    return (
      <aside className="topology-detail-panel">
        <TopologySelectionSummary
          selectedWire={null}
          selectedSegment={selectedSegment}
          selectedSegmentWires={selectedSegmentWires}
          topology={topology}
          onSelectWire={onSelectWire}
          onOpenWire={onOpenWire}
          onUpdateSegmentLength={onUpdateSegmentLength}
          nodeById={nodeById}
        />
      </aside>
    );
  }

  return (
    <aside className="topology-detail-panel">
      <section className="topology-panel-card connector-detail-card">
        <div className="topology-panel-title">
          <span>Selected connector</span>
          <strong>{connectorDisplayName(selectedConnector)}</strong>
        </div>
        <div className="topology-connector-form">
          <label className="topology-form-field span-2">
            <span>Drawing label</span>
            <input
              value={selectedConnector.label || selectedConnector.id}
              onChange={(event) => onUpdateConnector(selectedConnector.id, { label: event.target.value })}
            />
          </label>
          <label className="topology-form-field span-2">
            <span>Family</span>
            <select value={family.id} onChange={(event) => onFamilyChange(selectedConnector.id, event.target.value)}>
              {connectorFamilies.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className="topology-form-field">
            <span>Pins</span>
            <select value={selectedConnector.pinCount} onChange={(event) => onPinCountChange(selectedConnector.id, Number(event.target.value))}>
              {familyPinCounts.map((count) => (
                <option key={count} value={count}>{count}</option>
              ))}
            </select>
          </label>
          <label className="topology-form-field">
            <span>Option</span>
            <select
              value={selectedConnector.option}
              onChange={(event) => onUpdateConnector(selectedConnector.id, { option: event.target.value })}
            >
              {[...new Set([...part.options, ...familyParts.flatMap((item) => item.options)])].slice(0, 8).map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <div className="topology-meta-pill">
            <span>Part basis</span>
            <strong title={part.mpn}>{part.mpn}</strong>
          </div>
          <div className="topology-meta-pill">
            <span>Wire range</span>
            <strong>AWG {part.awgRange[0]}-{part.awgRange[1]}</strong>
          </div>
        </div>
        <div className="topology-panel-actions">
          <button type="button" onClick={() => onDeleteConnector(selectedConnector.id)}>
            <X size={13} />
            Delete connector
          </button>
        </div>

        <div className="topology-panel-title topology-panel-subtitle">
          <span>Pin connection table</span>
          <strong>{assignedCount} assigned</strong>
        </div>
        {pendingEndpoint && (
          <div className="topology-pending-note">
            <GitBranch size={14} />
            Start pin selected: {endpointDisplayLabel(pendingEndpoint, nodeById)}. Choose another pin row to connect.
          </div>
        )}
        <div className="topology-pin-table-wrap">
          <table className="topology-pin-table">
            <thead>
              <tr>
                <th>Pin</th>
                <th>Connects to</th>
                <th>AWG</th>
                <th>Color</th>
                <th>Route</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pins.map((pinId) => {
                const wire = wireForConnectorPin(wires, selectedConnector.id, pinId);
                const endpoint = wire
                  ? endpointForConnectorPin(wire, selectedConnector.id, pinId)
                  : { nodeId: selectedConnector.id, side: topologyPinSide(selectedConnector), pinId };
                const other = wire ? otherWireEndpoint(wire, selectedConnector.id, pinId) : null;
                const routeIds = wire ? topology.wireRoutes.get(wire.id) || [] : [];
                const selected = wire?.id === selectedWireId;
                const isPending = pendingEndpoint && endpointKey(pendingEndpoint) === endpointKey(endpoint);
                return (
                  <tr key={pinId} className={`${selected ? "selected" : ""} ${wire ? "" : "open"}`}>
                    <td>{pinId}</td>
                    <td>
                      {wire ? (
                        <button type="button" onClick={() => onSelectWire(wire.id)}>
                          <strong>{endpointDisplayLabel(other, nodeById)}</strong>
                          <span>{wire.signal || wire.id}</span>
                        </button>
                      ) : (
                        <span>Open / unused</span>
                      )}
                    </td>
                    <td>{wire ? wire.gauge : "-"}</td>
                    <td>
                      {wire ? (
                        <span className="topology-color-chip">
                          <i style={{ "--wire-color": wire.color }} />
                          {wire.color}
                        </span>
                      ) : "-"}
                    </td>
                    <td>
                      {routeIds.length ? (
                        <button
                          type="button"
                          className="topology-route-chip"
                          onClick={() => {
                            onSelectWire(wire.id);
                            onSelectSegment("");
                          }}
                        >
                          {routeDisplayLabel(routeIds, topology)}
                        </button>
                      ) : "-"}
                    </td>
                    <td>
                      {wire ? (
                        <button className="topology-row-action" type="button" onClick={() => onOpenWire(wire.id)}>
                          Edit
                        </button>
                      ) : (
                        <button
                          className={`topology-row-action ${isPending ? "active" : ""}`}
                          type="button"
                          onClick={() => onPinClick(endpoint)}
                        >
                          {isPending ? "Selected" : pendingEndpoint ? "Connect" : "Start"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {routeDecisionWire && (
        <section className="topology-panel-card route-choice-card">
          <div className="topology-panel-title">
            <span>Choose physical route</span>
            <strong>{endpointDisplayLabel(routeDecisionWire.from, nodeById)} - {endpointDisplayLabel(routeDecisionWire.to, nodeById)}</strong>
          </div>
          <div className="topology-route-choice">
            <p>This pin-to-pin connection is already created. Now choose whether it stays as a separate bundle, or shares a related existing physical path and branches at the split point.</p>
            <button type="button" onClick={() => onKeepDirectRoute(routeDecisionWire.id)}>
              <strong>Keep independent</strong>
              <span>Draw as its own bundle</span>
            </button>
            <div className="topology-route-choice-list">
              {routeCandidateSegments.length ? routeCandidateSegments.map((segment) => {
                const count = topology.segmentWires.get(segment.id)?.length || 0;
                return (
                  <button key={segment.id} type="button" onClick={() => onJoinSegmentRoute(routeDecisionWire.id, segment)}>
                    <strong>Share path through {segment.id}</strong>
                    <span>{segment.lengthMm}mm / {count} wire{count === 1 ? "" : "s"}</span>
                  </button>
                );
              }) : (
                <div className="topology-route-choice-empty">
                  No related existing bundle path touches this conductor endpoint.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <TopologySelectionSummary
        selectedWire={selectedWire}
        selectedSegment={selectedSegment}
        selectedSegmentWires={selectedSegmentWires}
        topology={topology}
        nodeById={nodeById}
        onSelectWire={onSelectWire}
        onOpenWire={onOpenWire}
        onUpdateSegmentLength={onUpdateSegmentLength}
        onRequestRouteDecision={onRequestRouteDecision}
        onDeleteWire={onDeleteWire}
      />
    </aside>
  );
}

function wireForConnectorPin(wires, connectorId, pinId) {
  return wires.find((wire) =>
    [wire.from, wire.to].some((endpoint) => endpoint?.nodeId === connectorId && endpoint?.pinId === pinId),
  );
}

function endpointForConnectorPin(wire, connectorId, pinId) {
  return [wire.from, wire.to].find((endpoint) => endpoint?.nodeId === connectorId && endpoint?.pinId === pinId);
}

function otherWireEndpoint(wire, connectorId, pinId) {
  return [wire.from, wire.to].find((endpoint) => endpoint?.nodeId !== connectorId || endpoint?.pinId !== pinId);
}

function TopologySelectionSummary({
  selectedWire,
  selectedSegment,
  selectedSegmentWires,
  topology,
  nodeById,
  onSelectWire,
  onOpenWire,
  onUpdateSegmentLength,
  onRequestRouteDecision,
  onDeleteWire,
}) {
  if (selectedWire) {
    const routeIds = topology.wireRoutes.get(selectedWire.id) || [];
    const routeSegments = routeIds
      .map((segmentId) => topology.segments.find((segment) => segment.id === segmentId))
      .filter(Boolean);
    const canChangeRoute =
      selectedWire.route?.type === "branch" ||
      routeCandidateSegmentsForWire(topology, selectedWire).length > 0;
    return (
      <section className="topology-panel-card">
        <div className="topology-panel-title">
          <span>Selected conductor route</span>
          <strong>{endpointDisplayLabel(selectedWire.from, nodeById)} - {endpointDisplayLabel(selectedWire.to, nodeById)}</strong>
        </div>
        <div className="topology-route-detail">
          <strong>{selectedWire.signal || selectedWire.id}</strong>
          <p>{selectedWire.color} {selectedWire.gauge} AWG conductor, routed length {conductorRouteLength(selectedWire, topology)}mm.</p>
          {routeIds.length > 0 && (
            <div className="topology-route-label">
              <span>Physical route</span>
              <strong>{routeDisplayLabel(routeIds, topology)}</strong>
            </div>
          )}
          <div className="topology-segment-list">
            {routeSegments.map((segment) => {
              const count = topology.segmentWires.get(segment.id)?.length || 0;
              return (
                <div className="topology-segment-row" key={segment.id}>
                  <b>{segment.id}</b>
                  <span>{count} wire{count === 1 ? "" : "s"} in bundle</span>
                  <strong>{segment.lengthMm}mm</strong>
                </div>
              );
            })}
          </div>
          <button className="topology-edit-wide" type="button" onClick={() => onOpenWire(selectedWire.id)}>
            Edit conductor details
          </button>
          {canChangeRoute && (
            <button className="topology-edit-wide" type="button" onClick={() => onRequestRouteDecision?.(selectedWire.id)}>
              Change physical route
            </button>
          )}
          <button className="topology-danger-wide" type="button" onClick={() => onDeleteWire?.(selectedWire.id)}>
            Remove this conductor
          </button>
        </div>
      </section>
    );
  }

  if (selectedSegment) {
    const selectedLength = Number(selectedSegment.lengthMm) || 100;
    return (
      <section className="topology-panel-card">
        <div className="topology-panel-title">
          <span>Selected bundle segment</span>
          <strong>{selectedSegment.id}</strong>
        </div>
        <div className="topology-route-detail">
          <strong>{selectedSegment.lengthMm}mm physical bundle section</strong>
          <label className="topology-segment-length-control">
            <span>Bundle segment length</span>
            <div>
              <input
                type="number"
                min="25"
                max="2500"
                value={selectedLength}
                onChange={(event) => onUpdateSegmentLength?.(selectedSegment.id, event.target.value)}
              />
              <small>mm</small>
            </div>
            <input
              type="range"
              min="25"
              max="1200"
              value={clamp(selectedLength, 25, 1200)}
              onChange={(event) => onUpdateSegmentLength?.(selectedSegment.id, Number(event.target.value))}
            />
          </label>
          <div className="topology-process-grid">
            <div>
              <span>Covering</span>
              <strong>Sleeve / tape</strong>
            </div>
            <div>
              <span>Fixing</span>
              <strong>Clip / tie</strong>
            </div>
            <div>
              <span>Branch</span>
              <strong>Optional</strong>
            </div>
          </div>
          <p>This drawing segment contains the conductors listed below. Process fields are placeholders for sleeve, tape, clips, and branch manufacturing details.</p>
          <div className="topology-wire-list">
            {selectedSegmentWires.length ? selectedSegmentWires.map((wire) => (
              <button key={wire.id} type="button" onClick={() => onSelectWire(wire.id)}>
                <strong>{wire.id}</strong>
                <span>{endpointDisplayLabel(wire.from, nodeById)} - {endpointDisplayLabel(wire.to, nodeById)}</span>
                <small>{wire.gauge} AWG / {wire.color} / open route</small>
              </button>
            )) : <span className="topology-muted">No conductors assigned to this segment.</span>}
          </div>
        </div>
      </section>
    );
  }

  return (
    null
  );
}

function ConnectorNode({
  node,
  connectedPins,
  pendingEndpoint,
  onPinClick,
  registerPin,
  onDelete,
  onFamilyChange,
  onPinCountChange,
  onOptionChange,
  onAddConnector,
}) {
  const savedPart = connectorPartById(node.partId);
  const part = savedPart.pinCounts.includes(Number(node.pinCount))
    ? savedPart
    : partForFamilyPinCount(savedPart.familyId, node.pinCount);
  const family = connectorFamilyById(part.familyId);
  const familyParts = partsForFamily(family.id);
  const familyPinCounts = [...new Set(familyParts.flatMap((item) => item.pinCounts))].sort((a, b) => a - b);
  const railSide = node.side === "right" ? "left" : "right";
  const pins = pinList(node.pinCount);

  return (
    <div
      className={`harness-node connector-node ${node.side === "right" ? "right-end" : ""}`}
      style={{ left: node.x, top: node.y }}
    >
      <div className="connector-card">
        <div className="node-card-top">
          <strong>{node.id}</strong>
          <button aria-label={`Delete ${node.id}`} onClick={onDelete}>
            <X size={13} />
          </button>
        </div>
        <ConnectorVisual visual={part.visual} />
        <div className="connector-mpn">{part.mpn}</div>
        <label>
          <span>Family</span>
          <select value={family.id} onChange={(event) => onFamilyChange(event.target.value)}>
            {connectorFamilies.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Pins</span>
          <select value={node.pinCount} onChange={(event) => onPinCountChange(Number(event.target.value))}>
            {familyPinCounts.map((count) => (
              <option key={count} value={count}>
                {count} pins
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Option</span>
          <select value={node.option} onChange={(event) => onOptionChange(event.target.value)}>
            {[...new Set([...part.options, ...familyParts.flatMap((item) => item.options)])].slice(0, 8).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <div className="connector-awg">AWG: {part.awgRange[0]} - {part.awgRange[1]}</div>
      </div>
      <PinRail
        nodeId={node.id}
        side={railSide}
        pins={pins}
        connectedPins={connectedPins}
        pendingEndpoint={pendingEndpoint}
        onPinClick={onPinClick}
        registerPin={registerPin}
      />
      <button className="node-add-below" onClick={onAddConnector}>
        <span><Plus size={20} /></span>
        Add connector
      </button>
    </div>
  );
}

function MidElementNode({
  node,
  connectedPins,
  pendingEndpoint,
  onPinClick,
  registerPin,
  onDelete,
  onOpenSettings,
}) {
  const elementType = midElementTypeById(node.elementType);

  return (
    <div className="harness-node mid-node" style={{ left: node.x, top: node.y }}>
      <PinRail
        nodeId={node.id}
        side="left"
        compact
        pins={pinList(node.leftPins)}
        connectedPins={connectedPins}
        pendingEndpoint={pendingEndpoint}
        onPinClick={onPinClick}
        registerPin={registerPin}
      />
      <div className="mid-card">
        <div className="mid-card-head">
          <strong>{node.id}</strong>
          <button onClick={onOpenSettings} aria-label={`Configure ${node.id}`}>
            <Settings size={13} />
          </button>
          <button onClick={onDelete} aria-label={`Delete ${node.id}`}>
            <X size={13} />
          </button>
        </div>
        <p>{elementType.defaultLabel}</p>
        <div className="mid-awg">
          <span>AWG:</span>
          <strong>{elementType.awgRange[0]} - {elementType.awgRange[1]}</strong>
        </div>
      </div>
      <PinRail
        nodeId={node.id}
        side="right"
        compact
        pins={pinList(node.rightPins)}
        connectedPins={connectedPins}
        pendingEndpoint={pendingEndpoint}
        onPinClick={onPinClick}
        registerPin={registerPin}
      />
    </div>
  );
}

function PinRail({
  nodeId,
  side,
  pins,
  connectedPins,
  pendingEndpoint,
  onPinClick,
  registerPin,
  compact = false,
}) {
  return (
    <div className={`pin-rail ${side} ${compact ? "compact" : ""}`}>
      {pins.map((pinId) => {
        const endpoint = { nodeId, side, pinId };
        const key = endpointKey(endpoint);
        const selected = pendingEndpoint && endpointKey(pendingEndpoint) === key;
        const connected = connectedPins.has(key);
        return (
          <div className="pin-row" key={key}>
            {side === "right" && !compact && <span>{pinId}</span>}
            <button
              ref={registerPin(endpoint)}
              className={`pin-dot ${connected ? "connected" : ""} ${selected ? "selected" : ""}`}
              aria-label={`${nodeId} ${side} ${pinId}`}
              onClick={() => onPinClick(endpoint)}
            >
              {connected ? <Check size={9} /> : null}
            </button>
            {side === "left" && !compact && <span>{pinId}</span>}
          </div>
        );
      })}
    </div>
  );
}

function ConnectorPicker({ picker, onChange, onSelect, onClose }) {
  const query = picker.query || "";
  const normalized = query.trim().toLowerCase();
  const filteredParts = connectorParts.filter((part) => {
    const family = connectorFamilyById(part.familyId);
    const haystack = `${part.mpn} ${part.displayName} ${part.manufacturer} ${family.name}`.toLowerCase();
    return !normalized || haystack.includes(normalized);
  });

  return (
    <div className="connector-picker" style={{ left: picker.x, top: picker.y }}>
      {picker.view === "choices" ? (
        <>
          <button
            className="picker-choice teal"
            onClick={() => onChange({ ...picker, view: "search", query: "" })}
          >
            <Search size={15} />
            Search catalog by MPN
          </button>
          <button
            className="picker-choice amber"
            onClick={() => onChange({ ...picker, view: "family", query: "" })}
          >
            <CircleDot size={15} />
            Browse common connectors by family
          </button>
        </>
      ) : (
        <>
          <button className="picker-back" onClick={() => onChange({ ...picker, view: "choices", query: "" })}>
            <ChevronLeft size={14} />
            Back to search options
          </button>
          <label className="picker-search">
            <Search size={14} />
            <input
              value={query}
              onChange={(event) => onChange({ ...picker, query: event.target.value })}
              placeholder={picker.view === "search" ? "Search by MPN" : "Search family or part"}
            />
          </label>
          <div className="picker-list">
            {connectorFamilies.map((family) => {
              const parts = filteredParts.filter((part) => part.familyId === family.id);
              if (!parts.length) return null;
              return (
                <div className="picker-family" key={family.id}>
                  <div className="picker-family-head">
                    <span>{family.manufacturer} - {family.name}</span>
                    <small>{parts.length}</small>
                  </div>
                  {parts.map((part) => (
                    <button key={part.id} onClick={() => onSelect(part)}>
                      {part.mpn}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}
      <button className="picker-close" onClick={onClose} aria-label="Close connector picker">
        <X size={13} />
      </button>
    </div>
  );
}

function AddCanvasPoint({ x, y, label, onClick }) {
  return (
    <button className="canvas-add-point" style={{ left: x, top: y }} onClick={onClick}>
      <span><Plus size={22} /></span>
      {label}
    </button>
  );
}

function ConnectorVisual({ visual }) {
  return (
    <div className={`connector-visual ${visual || "rect-housing"}`} aria-hidden="true">
      <span />
      <i />
    </div>
  );
}

function CanvasCheckoutConfirmationModal({
  configuration,
  estimate,
  submitting,
  onClose,
  onConfirm,
}) {
  const endpoints = configuration.endpoints || [];
  const midElements = configuration.midElements || [];
  const wires = configuration.connectionGroups || [];

  return (
    <div className="canvas-modal-layer" role="presentation">
      <section
        className="canvas-modal canvas-checkout-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Confirm canvas checkout"
      >
        <button className="canvas-modal-close" onClick={onClose} aria-label="Close">
          <X size={15} />
        </button>
        <div className="modal-title-row">
          <Cable size={18} />
          <h2>Confirm checkout price</h2>
        </div>
        <div className="canvas-checkout-items">
          <div>
            <span>Harness</span>
            <strong>{configuration.title || "Canvas harness configuration"}</strong>
          </div>
          <div>
            <span>Quantity</span>
            <strong>{estimate.quantity}</strong>
          </div>
          <div>
            <span>Unit price</span>
            <strong>{formatPriceCents(estimate.unitPriceCents)}</strong>
          </div>
          <div>
            <span>Harness total</span>
            <strong>{formatPriceCents(estimate.totalCents)}</strong>
          </div>
        </div>
        <div className="canvas-checkout-summary">
          <div>
            <span>Catalog basis</span>
            <strong>
              {endpoints.length} connector + {midElements.length} mid element + {wires.length} wire
            </strong>
          </div>
          <div>
            <span>Price source</span>
            <strong>Easy Harness internal catalog price</strong>
          </div>
          <div>
            <span>Shipping and import charges</span>
            <strong>Handled on the order page</strong>
          </div>
        </div>
        <p>
          Review this price before creating the checkout order. You can close this
          window to keep editing the canvas.
        </p>
        <div className="modal-actions canvas-checkout-actions">
          <button className="secondary-action" onClick={onClose} disabled={submitting}>
            Keep editing
          </button>
          <button className="modal-set-button" onClick={onConfirm} disabled={submitting}>
            {submitting ? "Creating..." : "Create order"}
          </button>
        </div>
      </section>
    </div>
  );
}

function WireConfigurationModal({ wire, nodeById, onClose, onSave }) {
  const [draft, setDraft] = useState(wire);
  const wireType = wireTypeById(draft.wireType);

  useEffect(() => setDraft(wire), [wire]);

  return (
    <ModalShell title={`Wire ${wire.id} Configuration`} onClose={onClose}>
      <p>Configure conductor type, gauge, and color. Physical length is controlled by the bundle segments on the drawing.</p>
      <div className="modal-pin-row">
        <strong>Start Pin:</strong>
        <span>{endpointDisplayLabel(wire.from, nodeById)}</span>
        <strong>End Pin:</strong>
        <span>{endpointDisplayLabel(wire.to, nodeById)}</span>
      </div>
      <label className="modal-field">
        <span>Wire type</span>
        <select
          value={draft.wireType}
          onChange={(event) => {
            const nextType = wireTypeById(event.target.value);
            setDraft({
              ...draft,
              wireType: nextType.id,
              gauge: nextType.gauges.includes(Number(draft.gauge)) ? draft.gauge : nextType.gauges[0],
              color: nextType.colors.includes(draft.color) ? draft.color : nextType.colors[0],
            });
          }}
        >
          {wireTypes.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </label>
      <label className="modal-field">
        <span>Wire gauge</span>
        <select value={draft.gauge} onChange={(event) => setDraft({ ...draft, gauge: Number(event.target.value) })}>
          {wireType.gauges.map((gauge) => (
            <option key={gauge} value={gauge}>{gauge} AWG</option>
          ))}
        </select>
      </label>
      <label className="modal-field">
        <span>Wire color</span>
        <select value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })}>
          {wireType.colors.map((color) => (
            <option key={color} value={color}>{color}</option>
          ))}
        </select>
      </label>
      <div className="modal-actions">
        <button className="text-button" onClick={onClose}>Cancel</button>
        <button className="modal-set-button" onClick={() => onSave(draft)}>Set</button>
      </div>
    </ModalShell>
  );
}

function MidConfigurationModal({ node, onClose, onSave }) {
  const [draft, setDraft] = useState(node);
  const type = midElementTypeById(draft.elementType);

  useEffect(() => setDraft(node), [node]);

  return (
    <ModalShell title={`${node.id} Configuration`} onClose={onClose}>
      <p>Configure this mid-harness element. Checkout uses the Easy Harness internal catalog basis shown on canvas.</p>
      <label className="modal-field">
        <span>Element type</span>
        <select
          value={draft.elementType}
          onChange={(event) => {
            const nextType = midElementTypeById(event.target.value);
            setDraft({
              ...draft,
              elementType: nextType.id,
              option: nextType.options[0],
              leftPins: nextType.defaultLeftPins,
              rightPins: nextType.defaultRightPins,
            });
          }}
        >
          {midElementTypes.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </label>
      <label className="modal-field">
        <span>Option</span>
        <select value={draft.option} onChange={(event) => setDraft({ ...draft, option: event.target.value })}>
          {type.options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
      <div className="modal-two-columns">
        <label className="modal-field">
          <span>Left pin count</span>
          <select value={draft.leftPins} onChange={(event) => setDraft({ ...draft, leftPins: Number(event.target.value) })}>
            {type.allowedLeftPins.map((count) => (
              <option key={count} value={count}>{count}</option>
            ))}
          </select>
        </label>
        <label className="modal-field">
          <span>Right pin count</span>
          <select value={draft.rightPins} onChange={(event) => setDraft({ ...draft, rightPins: Number(event.target.value) })}>
            {type.allowedRightPins.map((count) => (
              <option key={count} value={count}>{count}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="modal-actions">
        <button className="text-button" onClick={onClose}>Cancel</button>
        <button className="modal-set-button" onClick={() => onSave(draft)}>Set</button>
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, children, onClose }) {
  return (
    <div className="canvas-modal-layer" role="presentation">
      <section className="canvas-modal" role="dialog" aria-modal="true" aria-label={title}>
        <button className="canvas-modal-close" onClick={onClose} aria-label="Close">
          <X size={15} />
        </button>
        <div className="modal-title-row">
          <Cable size={18} />
          <h2>{title}</h2>
        </div>
        {children}
      </section>
    </div>
  );
}
