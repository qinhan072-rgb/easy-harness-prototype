import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Cable,
  Check,
  ChevronLeft,
  CircleDot,
  Plus,
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

function createConnectorId(nodes, side) {
  const prefix = side === "right" ? "R" : "L";
  const used = new Set(nodes.map((node) => node.id));
  let index = 0;
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
  return {
    x: side === "right" ? CONNECTOR_RIGHT_X : CONNECTOR_LEFT_X,
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
  return nodes.map((node) => {
    if (node.type === "connector") {
      const position = connectorPosition(node.side || "left", node.slotIndex || 0);
      return { ...node, ...position };
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
  const [pendingEndpoint, setPendingEndpoint] = useState(null);
  const [connectorPicker, setConnectorPicker] = useState(null);
  const [wireGeometry, setWireGeometry] = useState({});
  const [wireModalId, setWireModalId] = useState("");
  const [midModalId, setMidModalId] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [confirmingConfiguration, setConfirmingConfiguration] = useState(null);
  const canvasRef = useRef(null);
  const pinRefs = useRef(new Map());

  const layoutNodes = useMemo(() => layoutCanvasNodes(nodes), [nodes]);

  const nodeById = useMemo(
    () => new Map(layoutNodes.map((node) => [node.id, node])),
    [layoutNodes],
  );

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
  const configuredSummary = `${connectorCount} connector + ${midCount} mid element + ${wires.length} wire`;

  const selectedWire = wires.find((wire) => wire.id === wireModalId);
  const selectedMid = nodes.find((node) => node.id === midModalId && node.type === "mid");
  const hasLeftConnector = nodes.some((node) => node.type === "connector" && node.side !== "right");
  const hasRightConnector = nodes.some((node) => node.type === "connector" && node.side === "right");

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
          updatedAt: new Date().toISOString(),
        }),
      );
    } catch {
      // Draft restore is a convenience; checkout should not depend on browser storage.
    }
  }, [configurationName, draftStorageKey, nodes, quantity, wires]);

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
    const side = target?.side || "left";
    const slotIndex = Number.isInteger(target?.slotIndex)
      ? target.slotIndex
      : connectorSlotIndex(nodes, side);
    const position = connectorPosition(side, slotIndex);
    const nextNode = {
      id: createConnectorId(nodes, side),
      type: "connector",
      side,
      slotIndex,
      x: position.x,
      y: position.y,
      partId: part.id,
      pinCount: part.defaultPinCount,
      option: part.options[0],
    };
    setNodes((current) => [...current, nextNode]);
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
  };

  const handlePinClick = (endpoint) => {
    setSubmitError("");
    const key = endpointKey(endpoint);
    if (!pendingEndpoint && connectedPins.has(key)) {
      setWires((current) =>
        current.filter(
          (wire) =>
            endpointKey(wire.from) !== key && endpointKey(wire.to) !== key,
        ),
      );
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
      setWires((current) => [
        ...current,
        {
          id: createWireId(current),
          from: pendingEndpoint,
          to: endpoint,
          lengthMm: 100,
          wireType: defaultWireTypeId,
          gauge: defaultGauge,
          color: "Black",
        },
      ]);
    }
    setPendingEndpoint(null);
  };

  const updateWire = (wireId, patch) => {
    setWires((current) =>
      current.map((wire) => (wire.id === wireId ? { ...wire, ...patch } : wire)),
    );
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
        startLabel: endpointLabel(wire.from),
        endLabel: endpointLabel(wire.to),
        lengthMm: Number(wire.lengthMm),
        wireType: type.label,
        wireTypeId: type.id,
        wireGaugeAwg: Number(wire.gauge),
        wireColor: wire.color,
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
        nodes: layoutNodes,
        wires,
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
        startLabel: endpointLabel(wire.from),
        endLabel: endpointLabel(wire.to),
        lengthMm: Number(wire.lengthMm),
        wireType: type.label,
        wireTypeId: type.id,
        wireGaugeAwg: Number(wire.gauge),
        wireColor: wire.color,
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
          <p>Choose catalog parts, connect pins, set quantity, then continue to checkout.</p>
        </div>
        <div className="request-entry-switch compact" aria-label="Request entry mode">
          <button
            className={activeMode === "agent" ? "active" : ""}
            onClick={() => onSwitchMode?.("agent")}
          >
            Chat with AI
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
            Upload design
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

      <main className="canvas-stage-wrap">
        <div
          className="canvas-stage"
          ref={canvasRef}
          style={{ minHeight: canvasContentHeight }}
        >
          <svg className="canvas-wire-layer" aria-hidden="true">
            {wires.map((wire) => {
              const geometry = wireGeometry[wire.id];
              if (!geometry) return null;
              return (
                <g key={wire.id}>
                  <path className="canvas-wire-shadow" d={geometry.path} />
                  <path
                    className="canvas-wire-hit"
                    d={geometry.path}
                    onClick={() => setWireModalId(wire.id)}
                  />
                  <path className="canvas-wire" d={geometry.path} />
                </g>
              );
            })}
          </svg>

          {wires.map((wire) => {
            const geometry = wireGeometry[wire.id];
            if (!geometry) return null;
            return (
              <button
                className="canvas-wire-label"
                style={{ left: geometry.label.x, top: geometry.label.y }}
                key={`${wire.id}-label`}
                onClick={() => setWireModalId(wire.id)}
              >
                <span>{wire.id}</span>
                <span>{wire.lengthMm}mm</span>
                <span>{wire.gauge}AWG</span>
              </button>
            );
          })}

          {layoutNodes.map((node) =>
            node.type === "connector" ? (
              <ConnectorNode
                key={node.id}
                node={node}
                connectedPins={connectedPins}
                pendingEndpoint={pendingEndpoint}
                onPinClick={handlePinClick}
                registerPin={registerPin}
                onDelete={() => deleteNode(node.id)}
                onFamilyChange={(familyId) => changeConnectorFamily(node.id, familyId)}
                onPinCountChange={(pinCount) => changeConnectorPinCount(node.id, pinCount)}
                onOptionChange={(option) => updateConnector(node.id, { option })}
                onAddConnector={() => {
                  const slotIndex = connectorSlotIndex(nodes, node.side);
                  setConnectorPicker({
                    ...connectorPickerPosition(node.side, slotIndex),
                    side: node.side,
                    slotIndex,
                    view: "choices",
                    query: "",
                  });
                }}
              />
            ) : (
              <MidElementNode
                key={node.id}
                node={node}
                connectedPins={connectedPins}
                pendingEndpoint={pendingEndpoint}
                onPinClick={handlePinClick}
                registerPin={registerPin}
                onDelete={() => deleteNode(node.id)}
                onOpenSettings={() => setMidModalId(node.id)}
              />
            ),
          )}

          {!hasRightConnector && (
            <AddCanvasPoint
              x="calc(100% - 155px)"
              y={72}
              label="Add connector"
              onClick={() => {
                setConnectorPicker({
                  ...connectorPickerPosition("right", 0),
                  side: "right",
                  slotIndex: 0,
                  view: "choices",
                  query: "",
                });
              }}
            />
          )}
          {!hasLeftConnector && (
            <AddCanvasPoint
              x={112}
              y={72}
              label="Add connector"
              onClick={() => {
                setConnectorPicker({
                  ...connectorPickerPosition("left", 0),
                  side: "left",
                  slotIndex: 0,
                  view: "choices",
                  query: "",
                });
              }}
            />
          )}
          {midColumnStates.map((column) => (
            <AddCanvasPoint
              key={column.id}
              x={column.centerX}
              y={column.addY}
              label="Add mid element"
              onClick={() => {
                setConnectorPicker(null);
                addMidElement({ columnId: column.id });
              }}
            />
          ))}

          {connectorPicker && (
            <ConnectorPicker
              picker={connectorPicker}
              onChange={setConnectorPicker}
              onSelect={(part) => selectConnectorPart(part, connectorPicker)}
              onClose={() => setConnectorPicker(null)}
            />
          )}
        </div>
      </main>

      <footer className="canvas-configurator-footer">
        <div className="canvas-footer-summary">
          <strong>
            {nodes.length || wires.length
              ? `Configured item: ${configuredSummary}`
              : "Start by adding a connector or mid element"}
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

function WireConfigurationModal({ wire, onClose, onSave }) {
  const [draft, setDraft] = useState(wire);
  const wireType = wireTypeById(draft.wireType);

  useEffect(() => setDraft(wire), [wire]);

  return (
    <ModalShell title={`Wire ${wire.id} Configuration`} onClose={onClose}>
      <p>Configure wire length and gauge. Only supported catalog options are shown.</p>
      <div className="modal-pin-row">
        <strong>Start Pin:</strong>
        <span>{endpointLabel(wire.from)}</span>
        <strong>End Pin:</strong>
        <span>{endpointLabel(wire.to)}</span>
      </div>
      <label className="modal-field length-field">
        <span>Wire length</span>
        <div>
          <input
            type="number"
            min="25"
            max="2500"
            value={draft.lengthMm}
            onChange={(event) => setDraft({ ...draft, lengthMm: event.target.value })}
          />
          <small>mm</small>
        </div>
        <input
          type="range"
          min="25"
          max="1000"
          value={clamp(Number(draft.lengthMm) || 100, 25, 1000)}
          onChange={(event) => setDraft({ ...draft, lengthMm: Number(event.target.value) })}
        />
      </label>
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
