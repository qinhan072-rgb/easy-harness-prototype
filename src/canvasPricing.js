import {
  connectorFamilyById,
  connectorPartById,
  midElementTypeById,
  wireTypeById,
} from "./harnessCatalog.js";

export const canvasPricingCatalogVersion = "easy-harness-canvas-catalog-2026-06";
export const pricingBookVersion = "easy-harness-internal-price-book-2026-06-22";

const connectorHousingPrices = {
  "adafruit-5978": 495,
  "adafruit-5180": 695,
  "adafruit-6050": 450,
  "anderson-1327g6-bk": 85,
  "anderson-1327g6-red": 85,
  "harwin-m20-1060600": 36,
  "jst-b6b-xh-a": 22,
  "molex-43025-0400": 48,
  "deutsch-dt04-2p": 185,
};

const terminalPrices = {
  "usb-breakout": 12,
  "anderson-powerpole-15-45": 110,
  "harwin-m20": 14,
  "jst-xh": 7,
  "molex-microfit-3": 18,
  "deutsch-dt": 95,
};

const wireMeterPrices = {
  silicone: { 10: 410, 12: 318, 14: 232, 16: 168, 18: 126, 20: 96, 22: 72, 24: 54, 26: 44, 28: 36, 30: 30 },
  ul1007: { 16: 72, 18: 56, 20: 44, 22: 34, 24: 28, 26: 24, 28: 20 },
  txl: { 12: 118, 14: 92, 16: 70, 18: 52, 20: 42, 22: 34 },
  ptfe: { 18: 188, 20: 148, 22: 112, 24: 88, 26: 72, 28: 58, 30: 48 },
};

const midElementPrices = {
  splice: 60,
  cable: 180,
  fuse: 325,
  sleeve: 120,
};

const laborPrices = {
  cutStripPerWire: 40,
  crimpTerminationPerEnd: 85,
  solderTerminationPerEnd: 120,
  midElementAssembly: {
    splice: 160,
    cable: 220,
    fuse: 180,
    sleeve: 110,
  },
  continuityTestPerHarness: 250,
  circuitLabelPerWire: 18,
  packPerHarness: 125,
  orderHandling: 500,
};

const materialMarkupBps = 2800;
const laborMarkupBps = 1800;
const minimumHarnessPriceCents = 1250;

function centsWithMarkup(cents, bps) {
  return Math.round(cents * (10000 + bps) / 10000);
}

function money(cents) {
  return Number(cents || 0);
}

function awgInRange(awg, range = []) {
  const [min, max] = range.map(Number);
  return Number.isFinite(awg) && Number.isFinite(min) && Number.isFinite(max) && awg >= min && awg <= max;
}

function quantityDiscountBps(quantity) {
  if (quantity >= 100) return 1200;
  if (quantity >= 25) return 800;
  if (quantity >= 10) return 500;
  return 0;
}

function discountCents(cents, bps) {
  return Math.round(cents * bps / 10000);
}

function addLine(lineItems, line) {
  if (!line.quantity || !line.unitCents) return;
  lineItems.push({
    ...line,
    totalCents: money(line.quantity) * money(line.unitCents),
  });
}

function buildNodeMap(configuration) {
  const nodes = [
    ...(configuration.endpoints || []),
    ...(configuration.midElements || []),
  ];
  return new Map(nodes.map((node) => [node.id, node]));
}

function countConnectorTerminations(configuration, connectorId) {
  return (configuration.connectionGroups || []).reduce((count, wire) => {
    const endpoints = [wire.start, wire.end];
    return count + endpoints.filter((endpoint) => endpoint?.nodeId === connectorId).length;
  }, 0);
}

function endpointNode(nodeMap, endpoint) {
  return nodeMap.get(endpoint?.nodeId || "");
}

function validateEndpointGauge(blockers, node, wireGaugeAwg, wireId) {
  if (!node) {
    blockers.push(`Wire ${wireId} references a missing endpoint.`);
    return;
  }

  if (node.type === "connector") {
    if (!awgInRange(wireGaugeAwg, node.awgRange)) {
      blockers.push(`${wireId} ${wireGaugeAwg} AWG is outside ${node.id} connector range.`);
    }
    return;
  }

  if (node.type === "mid_element" && !awgInRange(wireGaugeAwg, node.awgRange)) {
    blockers.push(`${wireId} ${wireGaugeAwg} AWG is outside ${node.id} mid element range.`);
  }
}

export function calculateCanvasConfigurationPrice(configuration = {}) {
  const quantity = Math.max(1, Number(configuration.quantity) || 1);
  const endpoints = configuration.endpoints || [];
  const midElements = configuration.midElements || [];
  const wires = configuration.connectionGroups || [];
  const nodeMap = buildNodeMap(configuration);
  const blockers = [];
  const materialLines = [];
  const laborLines = [];

  if (!endpoints.length) blockers.push("Add at least one catalog connector.");
  if (!wires.length) blockers.push("Connect at least two pins before checkout.");

  endpoints.forEach((endpoint) => {
    const partId = endpoint.catalogPartId || endpoint.partId;
    const familyId = endpoint.catalogFamilyId || connectorPartById(partId).familyId;
    const part = connectorPartById(partId);
    const family = connectorFamilyById(familyId);
    const terminations = countConnectorTerminations(configuration, endpoint.id);
    const housingCents = connectorHousingPrices[part.id];
    const terminalCents = terminalPrices[family.id];

    if (!housingCents) blockers.push(`${endpoint.id} is not mapped to the internal connector price book.`);
    if (!terminalCents) blockers.push(`${endpoint.id} is not mapped to the internal contact price book.`);

    addLine(materialLines, {
      id: `connector-${endpoint.id}`,
      category: "material",
      label: `${endpoint.id} ${family.name} ${part.mpn}`,
      quantity: 1,
      unitCents: housingCents || 0,
      source: "Easy Harness internal catalog price",
    });

    addLine(materialLines, {
      id: `terminal-${endpoint.id}`,
      category: "material",
      label: `${endpoint.id} contacts / solder pads`,
      quantity: Math.max(terminations, 1),
      unitCents: terminalCents || 0,
      source: "Easy Harness internal catalog price",
    });

    addLine(laborLines, {
      id: `terminate-${endpoint.id}`,
      category: "labor",
      label: `${endpoint.id} termination labor`,
      quantity: Math.max(terminations, 1),
      unitCents: part.compatibleTerminals?.length
        ? laborPrices.crimpTerminationPerEnd
        : laborPrices.solderTerminationPerEnd,
      source: "Easy Harness internal operation standard",
    });
  });

  midElements.forEach((element) => {
    const elementId = element.catalogElementId || element.elementType;
    const type = midElementTypeById(elementId);
    const unitCents = midElementPrices[type.id];
    if (!unitCents) blockers.push(`${element.id} is not mapped to the internal mid element price book.`);
    addLine(materialLines, {
      id: `mid-${element.id}`,
      category: "material",
      label: `${element.id} ${type.label}`,
      quantity: 1,
      unitCents: unitCents || 0,
      source: "Easy Harness internal catalog price",
    });
    addLine(laborLines, {
      id: `mid-labor-${element.id}`,
      category: "labor",
      label: `${element.id} assembly labor`,
      quantity: 1,
      unitCents: laborPrices.midElementAssembly[type.id] || laborPrices.midElementAssembly.splice,
      source: "Easy Harness internal operation standard",
    });
  });

  wires.forEach((wire) => {
    const wireType = wireTypeById(wire.wireTypeId);
    const gauge = Number(wire.wireGaugeAwg);
    const lengthMm = Math.max(0, Number(wire.lengthMm) || 0);
    const meterPrice = wireMeterPrices[wireType.id]?.[gauge];
    const wireCents = meterPrice ? Math.ceil(meterPrice * lengthMm / 1000) : 0;

    if (!wireType.gauges.includes(gauge)) {
      blockers.push(`${wire.id} ${gauge} AWG is not available for ${wireType.label}.`);
    }
    if (!meterPrice) {
      blockers.push(`${wire.id} ${wireType.label} ${gauge} AWG is not mapped to the internal wire price book.`);
    }
    if (!lengthMm) blockers.push(`${wire.id} needs a positive wire length.`);

    validateEndpointGauge(blockers, endpointNode(nodeMap, wire.start), gauge, wire.id);
    validateEndpointGauge(blockers, endpointNode(nodeMap, wire.end), gauge, wire.id);

    addLine(materialLines, {
      id: `wire-${wire.id}`,
      category: "material",
      label: `${wire.id} ${wireType.label} ${gauge} AWG ${lengthMm}mm`,
      quantity: 1,
      unitCents: wireCents,
      source: "Easy Harness internal catalog price",
    });
  });

  addLine(laborLines, {
    id: "cut-strip",
    category: "labor",
    label: "Cut and strip wires",
    quantity: wires.length,
    unitCents: laborPrices.cutStripPerWire,
    source: "Easy Harness internal operation standard",
  });
  addLine(laborLines, {
    id: "labels",
    category: "labor",
    label: "Circuit labels",
    quantity: wires.length,
    unitCents: laborPrices.circuitLabelPerWire,
    source: "Easy Harness internal operation standard",
  });
  addLine(laborLines, {
    id: "continuity-test",
    category: "labor",
    label: "Continuity test",
    quantity: 1,
    unitCents: laborPrices.continuityTestPerHarness,
    source: "Easy Harness internal operation standard",
  });
  addLine(laborLines, {
    id: "pack",
    category: "labor",
    label: "Pack harness",
    quantity: 1,
    unitCents: laborPrices.packPerHarness,
    source: "Easy Harness internal operation standard",
  });

  const unitMaterialRawCents = materialLines.reduce((sum, line) => sum + line.totalCents, 0);
  const unitLaborRawCents = laborLines.reduce((sum, line) => sum + line.totalCents, 0);
  const unitMaterialCents = centsWithMarkup(unitMaterialRawCents, materialMarkupBps);
  const unitLaborCents = centsWithMarkup(unitLaborRawCents, laborMarkupBps);
  const unitBeforeMinimumCents = unitMaterialCents + unitLaborCents;
  const unitPriceBeforeDiscountCents = Math.max(unitBeforeMinimumCents, minimumHarnessPriceCents);
  const discountBps = quantityDiscountBps(quantity);
  const unitDiscountCents = discountCents(unitPriceBeforeDiscountCents, discountBps);
  const unitPriceCents = unitPriceBeforeDiscountCents - unitDiscountCents;
  const orderHandlingCents = laborPrices.orderHandling;
  const subtotalCents = unitPriceCents * quantity;
  const totalCents = subtotalCents + orderHandlingCents;
  const directCheckoutEligible = blockers.length === 0;

  return {
    pricingBookVersion,
    catalogVersion: canvasPricingCatalogVersion,
    currency: "USD",
    quantity,
    directCheckoutEligible,
    blockers,
    lineItems: [...materialLines, ...laborLines],
    materialTotalCents: unitMaterialCents * quantity,
    laborTotalCents: unitLaborCents * quantity + orderHandlingCents,
    unitMaterialCents,
    unitLaborCents,
    unitPriceCents,
    subtotalCents,
    orderHandlingCents,
    discountBps,
    discountCents: unitDiscountCents * quantity,
    minimumHarnessPriceCents,
    totalCents,
    sourceLabel: "Easy Harness internal catalog price",
  };
}

export function formatPriceCents(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(cents || 0) / 100);
}

export function priceEstimateToQuoteAmount(estimate = {}) {
  return Number((Number(estimate.totalCents || 0) / 100).toFixed(2));
}
