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
  defaultConnectorPartId,
  defaultWireTypeId,
  harnessCatalogVersion,
  midElementTypeById,
  midElementTypes,
  partsForFamily,
  wireTypeById,
  wireTypes,
} from "./harnessCatalog.js";

const defaultNodes = [
  {
    id: "L0",
    type: "connector",
    side: "left",
    x: 48,
    y: 48,
    partId: defaultConnectorPartId,
    pinCount: 5,
    option: "USB Type-C breakout",
  },
  {
    id: "CL0",
    type: "mid",
    x: 540,
    y: 58,
    elementType: "splice",
    option: "Black heatshrink",
    leftPins: 1,
    rightPins: 4,
  },
];

const defaultWires = [
  {
    id: "W0",
    from: { nodeId: "L0", side: "right", pinId: "P1" },
    to: { nodeId: "CL0", side: "left", pinId: "P1" },
    lengthMm: 100,
    wireType: defaultWireTypeId,
    gauge: 28,
    color: "Black",
  },
];

function endpointKey(endpoint) {
  return `${endpoint.nodeId}:${endpoint.side}:${endpoint.pinId}`;
}

function pinList(count) {
  return Array.from({ length: Number(count || 0) }, (_, index) => `P${index + 1}`);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createConnectorId(nodes, side) {
  const prefix = side === "right" ? "R" : "L";
  const used = new Set(nodes.map((node) => node.id));
  let index = 0;
  while (used.has(`${prefix}${index}`)) index += 1;
  return `${prefix}${index}`;
}

function createMidId(nodes) {
  const used = new Set(nodes.map((node) => node.id));
  let index = 0;
  while (used.has(`CL${index}`)) index += 1;
  return `CL${index}`;
}

function createWireId(wires) {
  const used = new Set(wires.map((wire) => wire.id));
  let index = 0;
  while (used.has(`W${index}`)) index += 1;
  return `W${index}`;
}

function endpointLabel(endpoint) {
  return `${endpoint.pinId} of ${endpoint.nodeId}`;
}

function summarizeNode(node) {
  if (node.type === "connector") {
    const part = connectorPartById(node.partId);
    const family = connectorFamilyById(part.familyId);
    return {
      id: node.id,
      type: "connector",
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
    items.push("Easy Harness will review terminals or soldering method for breakout-board endpoints.");
  }
  if (nodes.some((node) => node.type === "connector" && connectorPartById(node.partId)?.sealed)) {
    items.push("Easy Harness will review seals, wedges, and backshell details.");
  }
  return items;
}

export default function CanvasConfigurator({
  activeMode = "canvas",
  onSwitchMode,
  onSubmitConfiguration,
  submitting = false,
}) {
  const [configurationName, setConfigurationName] = useState(
    "USB breakout to solder splice harness",
  );
  const [quantity, setQuantity] = useState(10);
  const [nodes, setNodes] = useState(defaultNodes);
  const [wires, setWires] = useState(defaultWires);
  const [pendingEndpoint, setPendingEndpoint] = useState(null);
  const [connectorPicker, setConnectorPicker] = useState(null);
  const [midSlotStack, setMidSlotStack] = useState(null);
  const [wireGeometry, setWireGeometry] = useState({});
  const [wireModalId, setWireModalId] = useState("");
  const [midModalId, setMidModalId] = useState("");
  const [submitError, setSubmitError] = useState("");
  const canvasRef = useRef(null);
  const pinRefs = useRef(new Map());

  const nodeById = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  );

  const connectedPins = useMemo(() => {
    const keys = new Set();
    wires.forEach((wire) => {
      keys.add(endpointKey(wire.from));
      keys.add(endpointKey(wire.to));
    });
    return keys;
  }, [wires]);

  const reviewItems = useMemo(() => buildReviewItems(nodes, wires), [nodes, wires]);
  const configuredSummary = `${nodes.filter((node) => node.type === "connector").length} connector + ${nodes.filter((node) => node.type === "mid").length} mid element + ${wires.length} wire`;

  const selectedWire = wires.find((wire) => wire.id === wireModalId);
  const selectedMid = nodes.find((node) => node.id === midModalId && node.type === "mid");

  useEffect(() => {
    const updateGeometry = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const canvasRect = canvas.getBoundingClientRect();
      const nextGeometry = {};

      wires.forEach((wire) => {
        const startEl = pinRefs.current.get(endpointKey(wire.from));
        const endEl = pinRefs.current.get(endpointKey(wire.to));
        if (!startEl || !endEl) return;
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
        const dx = Math.abs(end.x - start.x);
        const bend = clamp(dx * 0.42, 80, 210);
        nextGeometry[wire.id] = {
          start,
          end,
          label: {
            x: (start.x + end.x) / 2,
            y: (start.y + end.y) / 2 - 20,
          },
          path: `M ${start.x} ${start.y} C ${start.x + bend} ${start.y}, ${end.x - bend} ${end.y}, ${end.x} ${end.y}`,
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
  }, [nodes, wires, connectorPicker, midSlotStack]);

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

  const selectConnectorPart = (part, target) => {
    if (!part) return;
    const nextNode = {
      id: createConnectorId(nodes, target?.side || "left"),
      type: "connector",
      side: target?.side || "left",
      x: target?.x ?? 48,
      y: target?.y ?? 48,
      partId: part.id,
      pinCount: part.defaultPinCount,
      option: part.options[0],
    };
    setNodes((current) => [...current, nextNode]);
    setConnectorPicker(null);
  };

  const addMidElement = (slot) => {
    const type = midElementTypes[0];
    const nextNode = {
      id: createMidId(nodes),
      type: "mid",
      x: slot?.x ?? 520,
      y: slot?.y ?? 70,
      elementType: type.id,
      option: type.options[0],
      leftPins: type.defaultLeftPins,
      rightPins: type.defaultRightPins,
    };
    setNodes((current) => [...current, nextNode]);
    setMidSlotStack(null);
  };

  const deleteNode = (nodeId) => {
    setNodes((current) => current.filter((node) => node.id !== nodeId));
    setWires((current) =>
      current.filter(
        (wire) => wire.from.nodeId !== nodeId && wire.to.nodeId !== nodeId,
      ),
    );
    if (pendingEndpoint?.nodeId === nodeId) setPendingEndpoint(null);
  };

  const handlePinClick = (endpoint) => {
    setSubmitError("");
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
      setWires((current) => [
        ...current,
        {
          id: createWireId(current),
          from: pendingEndpoint,
          to: endpoint,
          lengthMm: 100,
          wireType: defaultWireTypeId,
          gauge: 22,
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

    return {
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
        pricePath: "Easy Harness price review before order",
      },
      reviewItems,
      visualDraftData: {
        nodes,
        wires,
      },
    };
  };

  const submitConfiguration = async () => {
    const configuration = buildConfiguration();
    if (!configuration.connectionGroups.length) {
      setSubmitError("Connect at least two pins before continuing to quote.");
      return;
    }
    setSubmitError("");
    try {
      await onSubmitConfiguration?.(configuration);
    } catch (error) {
      setSubmitError(error?.message || "This configuration could not be saved.");
    }
  };

  return (
    <div className="canvas-configurator-shell">
      <header className="canvas-configurator-header">
        <div>
          <span className="eyebrow">New request</span>
          <h1>Configure a harness on canvas</h1>
          <p>Choose catalog parts, connect pins, set quantity, then continue to quote.</p>
        </div>
        <div className="request-entry-switch compact" aria-label="Request entry mode">
          <button
            className={activeMode === "agent" ? "active" : ""}
            onClick={() => onSwitchMode?.("agent")}
          >
            Chat with Easy Harness AI Agent
          </button>
          <button
            className={activeMode === "canvas" ? "active" : ""}
            onClick={() => onSwitchMode?.("canvas")}
          >
            Canvas configurator
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
        <div className="canvas-config-status">
          <span>Canvas configuration</span>
          <strong>Price review needed</strong>
        </div>
      </div>

      <main className="canvas-stage-wrap">
        <div className="canvas-stage" ref={canvasRef}>
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
                <span>{wire.color}</span>
              </button>
            );
          })}

          {nodes.map((node) =>
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
                onPinCountChange={(pinCount) => updateConnector(node.id, { pinCount })}
                onOptionChange={(option) => updateConnector(node.id, { option })}
                onAddConnector={() =>
                  setConnectorPicker({
                    x: node.x,
                    y: node.y + 330,
                    side: node.side,
                    view: "choices",
                    query: "",
                  })
                }
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
                onAddMid={() =>
                  setMidSlotStack({
                    x: node.x + 320,
                    y: Math.max(34, node.y - 12),
                  })
                }
              />
            ),
          )}

          <AddCanvasPoint
            x={1420}
            y={78}
            label="Add connector"
            onClick={() =>
              setConnectorPicker({
                x: 1180,
                y: 70,
                side: "right",
                view: "choices",
                query: "",
              })
            }
          />
          <AddCanvasPoint
            x={900}
            y={310}
            label="Add mid element"
            onClick={() => setMidSlotStack({ x: 820, y: 160 })}
          />
          <AddCanvasPoint
            x={1200}
            y={310}
            label="Add mid element"
            onClick={() => setMidSlotStack({ x: 1120, y: 160 })}
          />
          <AddCanvasPoint
            x={560}
            y={470}
            label="Add mid element"
            onClick={() => setMidSlotStack({ x: 500, y: 330 })}
          />

          {connectorPicker && (
            <ConnectorPicker
              picker={connectorPicker}
              onChange={setConnectorPicker}
              onSelect={(part) => selectConnectorPart(part, connectorPicker)}
              onClose={() => setConnectorPicker(null)}
            />
          )}
          {midSlotStack && (
            <MidSlotStack
              stack={midSlotStack}
              existingCount={nodes.filter((node) => node.type === "mid").length}
              onAdd={addMidElement}
              onClose={() => setMidSlotStack(null)}
            />
          )}
        </div>
      </main>

      <footer className="canvas-configurator-footer">
        <div className="canvas-footer-summary">
          <strong>Configured item: {configuredSummary}</strong>
          <span>Saved under Requests as a canvas configuration. Easy Harness will release price before order.</span>
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
          onClick={submitConfiguration}
          disabled={submitting}
        >
          {submitting ? "Saving..." : "Continue to quote"}
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
  const part = connectorPartById(node.partId);
  const family = connectorFamilyById(part.familyId);
  const familyParts = partsForFamily(family.id);
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
            {part.pinCounts.map((count) => (
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
  onAddMid,
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
      <button className="mid-add-nearby" onClick={onAddMid}>
        <span><Plus size={20} /></span>
        Add mid element
      </button>
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
              aria-label={`${nodeId} ${pinId}`}
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

function MidSlotStack({ stack, existingCount, onAdd, onClose }) {
  const slots = Array.from({ length: 5 }, (_, index) => ({
    x: stack.x,
    y: stack.y + index * 56,
    label: index < existingCount ? "Add near existing element" : "Add an element",
  }));

  return (
    <div className="mid-slot-stack" style={{ left: stack.x, top: stack.y }}>
      {slots.map((slot, index) => (
        <button
          key={`${slot.x}-${slot.y}-${index}`}
          onClick={() => onAdd({ x: slot.x, y: slot.y })}
        >
          <span><Plus size={18} /></span>
          {slot.label}
        </button>
      ))}
      <button className="mid-stack-close" onClick={onClose} aria-label="Close element list">
        <X size={16} />
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
      <p>Configure this mid-harness element. Easy Harness will review exact part compatibility before quote.</p>
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
