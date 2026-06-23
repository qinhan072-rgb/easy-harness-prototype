-- Easy Harness maker/robotics catalog price book v1.
-- This is a curated internal catalog and deterministic price book for direct
-- canvas checkout. Prices are Easy Harness internal catalog prices, not live
-- distributor or manufacturer pricing.

insert into public.catalog_sources (id, source_type, name, base_url, api_docs_url, notes, active)
values
  (
    'easy-harness-maker-price-book-v1',
    'internal_curated',
    'Easy Harness maker robotics price book v1',
    null,
    null,
    'Curated maker, robotics, and small consumer-electronics harness catalog. Deterministic internal prices only.',
    true
  ),
  (
    'jst-official-catalog',
    'manufacturer',
    'JST official product catalog',
    'https://www.jst-mfg.com/',
    null,
    'Manufacturer source for JST SH, PH, XH, and GH connector characteristics.',
    true
  ),
  (
    'molex-official-catalog',
    'manufacturer',
    'Molex official product catalog',
    'https://www.molex.com/',
    null,
    'Manufacturer source for Molex PicoBlade, KK, Micro-Fit, and Mini-Fit characteristics.',
    true
  ),
  (
    'te-official-catalog',
    'manufacturer',
    'TE Connectivity official product catalog',
    'https://www.te.com/',
    null,
    'Manufacturer source for TE AMP Mini CT, AMP CT, Micro MATE-N-LOK, and AMPMODU MTE characteristics.',
    true
  )
on conflict (id) do update set
  source_type = excluded.source_type,
  name = excluded.name,
  base_url = excluded.base_url,
  api_docs_url = excluded.api_docs_url,
  notes = excluded.notes,
  active = excluded.active,
  updated_at = now();

insert into public.catalog_manufacturers (id, name, aliases, website_url, source_id, active)
values
  ('adafruit', 'Adafruit', array['Adafruit Industries'], 'https://www.adafruit.com/', 'easy-harness-maker-price-book-v1', true),
  ('amass', 'Amass', array['AMASS'], 'https://www.china-amass.net/', 'easy-harness-maker-price-book-v1', true),
  ('anderson-power', 'Anderson Power', array['Anderson Power Products'], 'https://www.andersonpower.com/', 'easy-harness-maker-price-book-v1', true),
  ('dfrobot', 'DFRobot', array[]::text[], 'https://www.dfrobot.com/', 'easy-harness-maker-price-book-v1', true),
  ('easy-harness', 'Easy Harness', array[]::text[], null, 'easy-harness-maker-price-book-v1', true),
  ('harwin', 'Harwin', array[]::text[], 'https://www.harwin.com/', 'easy-harness-maker-price-book-v1', true),
  ('jst', 'JST', array['J.S.T.', 'JST Mfg.'], 'https://www.jst-mfg.com/', 'jst-official-catalog', true),
  ('molex', 'Molex', array[]::text[], 'https://www.molex.com/', 'molex-official-catalog', true),
  ('seeed', 'Seeed Studio', array['Seeed'], 'https://www.seeedstudio.com/', 'easy-harness-maker-price-book-v1', true),
  ('te-connectivity', 'TE Connectivity', array['TE', 'Deutsch', 'AMP'], 'https://www.te.com/', 'te-official-catalog', true)
on conflict (id) do update set
  name = excluded.name,
  aliases = excluded.aliases,
  website_url = excluded.website_url,
  source_id = excluded.source_id,
  active = excluded.active,
  updated_at = now();

insert into public.catalog_connector_families (
  id,
  manufacturer_id,
  name,
  series,
  category,
  common_use,
  pitch_mm,
  sealed,
  lock_style,
  mating_style,
  current_rating_a,
  voltage_rating_v,
  attributes,
  source_id,
  source_url,
  confidence,
  active
)
values
  ('jst-sh', 'jst', 'SH / Qwiic-STEMMA QT', 'SH', 'Maker sensor / I2C', 'Qwiic, STEMMA QT, compact sensor boards', 1.000, false, 'friction latch', 'wire-to-board', 1, 50, '{"default_part_id":"jst-shr-04v-s-b","terminal_price_cents":6}'::jsonb, 'jst-official-catalog', 'https://www.jst-mfg.com/product/detail_e.php?series=231', 0.920, true),
  ('jst-ph', 'jst', 'PH', 'PH', 'Battery / board-to-wire', 'Small batteries, compact robotics, sensor power leads', 2.000, false, 'friction latch', 'wire-to-board', 2, 100, '{"default_part_id":"jst-phr-2","terminal_price_cents":7}'::jsonb, 'jst-official-catalog', 'https://www.jst-mfg.com/product/detail_e.php?series=199', 0.920, true),
  ('jst-xh', 'jst', 'XH', 'XH', 'Wire-to-board', '3D printers, chargers, control boards, low-current equipment', 2.500, false, 'friction latch', 'wire-to-board', 3, 250, '{"default_part_id":"jst-xhp-4","terminal_price_cents":7}'::jsonb, 'jst-official-catalog', 'https://www.jst-mfg.com/product/detail_e.php?series=277', 0.920, true),
  ('jst-gh', 'jst', 'GH', 'GH', 'Locking wire-to-board', 'Drones, compact robots, secured sensor harnesses', 1.250, false, 'positive lock', 'wire-to-board', 1, 50, '{"default_part_id":"jst-ghr-04v-s","terminal_price_cents":9}'::jsonb, 'jst-official-catalog', 'https://www.jst-mfg.com/product/detail_e.php?series=105', 0.900, true),
  ('molex-picoblade', 'molex', 'PicoBlade', 'PicoBlade', 'Compact wire-to-board', 'Small consumer electronics, drones, compact sensors', 1.250, false, 'friction lock', 'wire-to-board', 1, 125, '{"default_part_id":"molex-51021-0400","terminal_price_cents":10}'::jsonb, 'molex-official-catalog', 'https://www.molex.com/en-us/products/connectors/wire-to-board-connectors/picoblade-connectors', 0.900, true),
  ('molex-kk-254', 'molex', 'KK 254', 'KK 254', '2.54 mm board connector', 'Arduino-era boards, arcade controls, pin-header signal harnesses', 2.540, false, 'friction ramp', 'wire-to-board', 5, 250, '{"default_part_id":"molex-22-01-2047","terminal_price_cents":8}'::jsonb, 'molex-official-catalog', 'https://www.molex.com/en-us/products/connectors/wire-to-board-connectors/kk-connectors', 0.880, true),
  ('molex-microfit-3', 'molex', 'Micro-Fit 3.0', 'Micro-Fit 3.0', 'Compact power connector', 'Robotics power, device internals, power plus signal', 3.000, false, 'positive lock', 'wire-to-wire / wire-to-board', 8.5, 600, '{"default_part_id":"molex-43025-0400","terminal_price_cents":18}'::jsonb, 'molex-official-catalog', 'https://www.molex.com/en-us/products/connectors/wire-to-board-connectors/micro-fit-connectors', 0.920, true),
  ('molex-minifit-jr', 'molex', 'Mini-Fit Jr.', 'Mini-Fit Jr.', 'Higher-current power connector', 'Robotics power, PC-style power leads, embedded power distribution', 4.200, false, 'positive lock', 'wire-to-wire / wire-to-board', 9, 600, '{"default_part_id":"molex-39-01-2040","terminal_price_cents":30}'::jsonb, 'molex-official-catalog', 'https://www.molex.com/en-us/products/connectors/wire-to-board-connectors/mini-fit-connectors', 0.900, true),
  ('te-amp-mini-ct', 'te-connectivity', 'AMP Mini CT', 'AMP Mini CT', 'Miniature wire-to-board', 'Small consumer electronics, LED modules, compact board harnesses', 1.500, false, 'detent', 'wire-to-board / wire-to-wire', 2, 50, '{"default_part_id":"te-353908-4","terminal_price_cents":10}'::jsonb, 'te-official-catalog', 'https://www.te.com/en/product-353908-2.html', 0.900, true),
  ('te-amp-ct', 'te-connectivity', 'AMP CT', 'AMP CT', '2.0 mm wire-to-board', 'Consumer devices, appliance modules, board-to-wire harnesses', 2.000, false, 'detent', 'wire-to-board / wire-to-wire', 4, 125, '{"default_part_id":"te-179228-4","terminal_price_cents":11}'::jsonb, 'te-official-catalog', 'https://www.te.com/en/product-179228-2.html', 0.900, true),
  ('te-micro-mate-n-lok', 'te-connectivity', 'Micro MATE-N-LOK', 'Micro MATE-N-LOK', 'Power connector', 'Device power, lighting, appliances, robotics modules', 3.000, false, 'positive latch', 'wire-to-wire / wire-to-board', 5, 250, '{"default_part_id":"te-1445022-4","terminal_price_cents":24}'::jsonb, 'te-official-catalog', 'https://www.te.com/en/product-1445022-2.html', 0.900, true),
  ('te-ampmodu-mte', 'te-connectivity', 'AMPMODU MTE', 'AMPMODU MTE', '2.54 mm crimp receptacle', 'Prototype boards, dev kits, single-row 0.1 inch headers', 2.540, false, 'latching shroud optional', 'wire-to-board / wire-to-wire', 3, 250, '{"default_part_id":"te-104257-3","terminal_price_cents":15}'::jsonb, 'te-official-catalog', 'https://www.te.com/en/products/brands/ampmodu/ampmodumte.html', 0.880, true),
  ('seeed-grove', 'seeed', 'Grove 4-pin', 'Grove', 'Maker sensor ecosystem', 'Grove sensor modules and quick prototypes', 2.000, false, 'buckled', 'wire-to-board', 1, 50, '{"default_part_id":"seeed-grove-4p-buckled-4p","terminal_price_cents":8}'::jsonb, 'easy-harness-maker-price-book-v1', 'https://wiki.seeedstudio.com/Grove_System/', 0.820, true),
  ('dfrobot-gravity', 'dfrobot', 'Gravity PH2.0', 'Gravity', 'Maker sensor ecosystem', 'DFRobot Gravity sensors, Arduino/robotics projects', 2.000, false, 'friction latch', 'wire-to-board', 1, 50, '{"default_part_id":"dfrobot-gravity-ph20-3p-3p","terminal_price_cents":8}'::jsonb, 'easy-harness-maker-price-book-v1', 'https://www.dfrobot.com/product-2551.html', 0.820, true),
  ('usb-breakout', 'adafruit', 'USB Breakout', 'USB breakout', 'Board / breakout', 'USB-C pigtails, board breakouts, quick device adapters', null, false, 'board solder', 'board breakout', 1, 5, '{"default_part_id":"adafruit-5978","terminal_price_cents":12,"labor_profile":"solder"}'::jsonb, 'easy-harness-maker-price-book-v1', null, 0.820, true),
  ('harwin-m20', 'harwin', 'DuPont / M20', 'M20', '2.54 mm crimp housing', 'Breadboard, dev-board, and 0.1 inch header harnesses', 2.540, false, 'friction latch', 'wire-to-board', 3, 250, '{"default_part_id":"harwin-m20-1060300","terminal_price_cents":14}'::jsonb, 'easy-harness-maker-price-book-v1', 'https://www.harwin.com/products/M20-8760742', 0.820, true),
  ('xt-power', 'amass', 'XT power', 'XT', 'Soldered DC power', 'Battery and motor-controller leads for drones and robots', null, false, 'friction shell', 'wire-to-wire solder', 30, 500, '{"default_part_id":"amass-xt30u-f-2p","terminal_price_cents":18,"labor_profile":"solder"}'::jsonb, 'easy-harness-maker-price-book-v1', null, 0.760, true),
  ('anderson-powerpole-15-45', 'anderson-power', 'Powerpole 15/45', 'Powerpole 15/30/45', 'Power connector', 'Low-voltage DC power and modular power leads', null, false, 'genderless stackable', 'wire-to-wire / wire-to-board', 45, 600, '{"default_part_id":"anderson-1327g6-bk","terminal_price_cents":110}'::jsonb, 'easy-harness-maker-price-book-v1', 'https://www.andersonpower.com/product-lines/powerpole/', 0.850, true),
  ('deutsch-dt', 'te-connectivity', 'DT sealed', 'Deutsch DT', 'Sealed connector', 'Outdoor and vehicle-adjacent harnesses; v1 keeps this lower priority', null, true, 'wedge lock', 'sealed wire-to-wire', 13, 250, '{"default_part_id":"deutsch-dt04-2p","terminal_price_cents":95}'::jsonb, 'easy-harness-maker-price-book-v1', null, 0.700, true)
on conflict (id) do update set
  manufacturer_id = excluded.manufacturer_id,
  name = excluded.name,
  series = excluded.series,
  category = excluded.category,
  common_use = excluded.common_use,
  pitch_mm = excluded.pitch_mm,
  sealed = excluded.sealed,
  lock_style = excluded.lock_style,
  mating_style = excluded.mating_style,
  current_rating_a = excluded.current_rating_a,
  voltage_rating_v = excluded.voltage_rating_v,
  attributes = excluded.attributes,
  source_id = excluded.source_id,
  source_url = excluded.source_url,
  confidence = excluded.confidence,
  active = excluded.active,
  updated_at = now();

create temporary table if not exists maker_connector_seed (
  id text primary key,
  family_id text not null,
  manufacturer_id text not null,
  mpn text not null,
  display_name text not null,
  housing_type text not null,
  gender text,
  pin_count integer not null,
  row_count integer not null,
  pitch_mm numeric(8,3),
  color text,
  sealed boolean not null default false,
  wire_to_wire boolean not null default false,
  wire_to_board boolean not null default true,
  awg_min integer,
  awg_max integer,
  current_rating_a numeric(10,3),
  voltage_rating_v numeric(10,3),
  terminal_notes text not null,
  accessory_notes text not null default '',
  attributes jsonb not null default '{}'::jsonb,
  source_id text not null default 'easy-harness-maker-price-book-v1',
  source_url text,
  confidence numeric(4,3) not null default 0.900,
  price_cents integer not null,
  terminal_price_cents integer not null
);

truncate table maker_connector_seed;

insert into maker_connector_seed
select
  'jst-shr-' || lpad(pin_count::text, 2, '0') || 'v-s-b',
  'jst-sh',
  'jst',
  'SHR-' || lpad(pin_count::text, 2, '0') || 'V-S-B',
  'SH cable-side receptacle housing, ' || pin_count || ' pin',
  'crimp_housing',
  'receptacle',
  pin_count,
  1,
  1.000,
  'natural',
  false,
  false,
  true,
  28,
  32,
  1,
  50,
  'SSH-003T-P0.2-H contact',
  '',
  jsonb_build_object('options', jsonb_build_array('Cable-side receptacle', 'Qwiic/STEMMA QT compatible on 4 pin'), 'terminal_price_cents', 6),
  'jst-official-catalog',
  'https://www.jst-mfg.com/product/detail_e.php?series=231',
  0.920,
  14 + pin_count * 3,
  6
from unnest(array[2, 3, 4, 5, 6]) as pin_count;

insert into maker_connector_seed
select
  'jst-phr-' || pin_count,
  'jst-ph',
  'jst',
  'PHR-' || pin_count,
  'PH receptacle housing, ' || pin_count || ' pin',
  'crimp_housing',
  'receptacle',
  pin_count,
  1,
  2.000,
  'natural',
  false,
  false,
  true,
  24,
  30,
  2,
  100,
  'SPH-002T-P0.5S contact',
  '',
  jsonb_build_object('options', jsonb_build_array('Cable-side receptacle', 'Natural housing'), 'terminal_price_cents', 7),
  'jst-official-catalog',
  'https://www.jst-mfg.com/product/detail_e.php?series=199',
  0.920,
  15 + pin_count * 4,
  7
from unnest(array[2, 3, 4, 5, 6, 8]) as pin_count;

insert into maker_connector_seed
select
  'jst-xhp-' || pin_count,
  'jst-xh',
  'jst',
  'XHP-' || pin_count,
  'XH receptacle housing, ' || pin_count || ' pin',
  'crimp_housing',
  'receptacle',
  pin_count,
  1,
  2.500,
  'natural',
  false,
  false,
  true,
  22,
  30,
  3,
  250,
  'SXH-001T-P0.6 contact',
  '',
  jsonb_build_object('options', jsonb_build_array('Cable-side receptacle', 'Natural housing'), 'terminal_price_cents', 7),
  'jst-official-catalog',
  'https://www.jst-mfg.com/product/detail_e.php?series=277',
  0.920,
  16 + pin_count * 5,
  7
from unnest(array[2, 3, 4, 5, 6, 7, 8]) as pin_count;

insert into maker_connector_seed values
  ('jst-b6b-xh-a', 'jst-xh', 'jst', 'B6B-XH-A(LF)(SN)', 'XH 6-pin top-entry board header', 'header', 'male', 6, 1, 2.500, 'natural', false, false, true, 22, 30, 3, 250, 'Board header mate; solder or mating housing selected by configuration.', 'Mating housing direction must match board header.', '{"options":["Top-entry board header","Natural housing mate"],"terminal_price_cents":12,"termination_style":"solder"}'::jsonb, 'jst-official-catalog', 'https://www.jst-mfg.com/product/detail_e.php?series=277', 0.880, 26, 12);

insert into maker_connector_seed
select
  'jst-ghr-' || lpad(pin_count::text, 2, '0') || 'v-s',
  'jst-gh',
  'jst',
  'GHR-' || lpad(pin_count::text, 2, '0') || 'V-S',
  'GH locking receptacle housing, ' || pin_count || ' pin',
  'crimp_housing',
  'receptacle',
  pin_count,
  1,
  1.250,
  'natural',
  false,
  false,
  true,
  26,
  30,
  1,
  50,
  'SSHL-002T-P0.2 contact',
  '',
  jsonb_build_object('options', jsonb_build_array('Cable-side locking receptacle', 'Natural housing'), 'terminal_price_cents', 9),
  'jst-official-catalog',
  'https://www.jst-mfg.com/product/detail_e.php?series=105',
  0.900,
  22 + pin_count * 5,
  9
from unnest(array[2, 3, 4, 5, 6, 8]) as pin_count;

insert into maker_connector_seed
select
  'molex-51021-' || lpad(pin_count::text, 2, '0') || '00',
  'molex-picoblade',
  'molex',
  '51021-0' || pin_count || '00',
  'PicoBlade receptacle housing, ' || pin_count || ' pin',
  'crimp_housing',
  'receptacle',
  pin_count,
  1,
  1.250,
  'natural',
  false,
  true,
  true,
  26,
  32,
  1,
  125,
  'Molex PicoBlade crimp terminal',
  '',
  jsonb_build_object('options', jsonb_build_array('Cable-side receptacle', 'Friction lock'), 'terminal_price_cents', 10),
  'molex-official-catalog',
  'https://www.molex.com/en-us/products/connectors/wire-to-board-connectors/picoblade-connectors',
  0.900,
  24 + pin_count * 6,
  10
from unnest(array[2, 3, 4, 5, 6]) as pin_count;

insert into maker_connector_seed
select
  'molex-22-01-' || (2000 + pin_count * 10 + 7),
  'molex-kk-254',
  'molex',
  '22-01-' || (2000 + pin_count * 10 + 7),
  'KK 254 crimp housing, ' || pin_count || ' pin',
  'crimp_housing',
  'receptacle',
  pin_count,
  1,
  2.540,
  'natural',
  false,
  false,
  true,
  22,
  30,
  5,
  250,
  'KK 254 crimp terminal',
  '',
  jsonb_build_object('options', jsonb_build_array('Cable-side housing', '0.1 inch pitch'), 'terminal_price_cents', 8),
  'molex-official-catalog',
  'https://www.molex.com/en-us/products/connectors/wire-to-board-connectors/kk-connectors',
  0.880,
  20 + pin_count * 5,
  8
from unnest(array[2, 3, 4, 6, 8]) as pin_count;

insert into maker_connector_seed
select
  'molex-43025-' || lpad(pin_count::text, 2, '0') || '00',
  'molex-microfit-3',
  'molex',
  '43025-' || lpad(pin_count::text, 2, '0') || '00',
  'Micro-Fit 3.0 receptacle housing, ' || pin_count || ' pin',
  'crimp_housing',
  'female',
  pin_count,
  2,
  3.000,
  'black',
  false,
  true,
  true,
  18,
  30,
  8.5,
  600,
  'Micro-Fit 3.0 crimp terminal',
  '',
  jsonb_build_object('options', jsonb_build_array('Dual-row receptacle housing', 'Black'), 'visual', 'microfit', 'terminal_price_cents', 18),
  'molex-official-catalog',
  'https://www.molex.com/en-us/products/connectors/wire-to-board-connectors/micro-fit-connectors',
  0.920,
  42 + pin_count * 12,
  18
from unnest(array[2, 4, 6, 8]) as pin_count;

insert into maker_connector_seed
select
  'molex-39-01-' || (2000 + pin_count * 10),
  'molex-minifit-jr',
  'molex',
  '39-01-' || (2000 + pin_count * 10),
  'Mini-Fit Jr. receptacle housing, ' || pin_count || ' pin',
  'crimp_housing',
  'female',
  pin_count,
  2,
  4.200,
  'natural',
  false,
  true,
  true,
  16,
  28,
  9,
  600,
  'Mini-Fit Jr. crimp terminal',
  '',
  jsonb_build_object('options', jsonb_build_array('Dual-row receptacle housing', 'Natural housing'), 'visual', 'microfit', 'terminal_price_cents', 30),
  'molex-official-catalog',
  'https://www.molex.com/en-us/products/connectors/wire-to-board-connectors/mini-fit-connectors',
  0.900,
  62 + pin_count * 18,
  30
from unnest(array[2, 4, 6, 8]) as pin_count;

insert into maker_connector_seed
select
  'te-353908-' || pin_count,
  'te-amp-mini-ct',
  'te-connectivity',
  '353908-' || pin_count,
  'AMP Mini CT receptacle housing, ' || pin_count || ' pin',
  'crimp_housing',
  'receptacle',
  pin_count,
  1,
  1.500,
  'white',
  false,
  true,
  true,
  24,
  28,
  2,
  50,
  '353907-series socket contact',
  '',
  jsonb_build_object('options', jsonb_build_array('Cable-side receptacle', 'White housing'), 'terminal_price_cents', 10),
  'te-official-catalog',
  'https://www.te.com/en/product-353908-2.html',
  0.900,
  18 + pin_count * 5,
  10
from unnest(array[2, 3, 4, 6, 8]) as pin_count;

insert into maker_connector_seed
select
  'te-179228-' || pin_count,
  'te-amp-ct',
  'te-connectivity',
  '179228-' || pin_count,
  'AMP CT receptacle housing, ' || pin_count || ' pin',
  'crimp_housing',
  'receptacle',
  pin_count,
  1,
  2.000,
  'natural',
  false,
  true,
  true,
  22,
  28,
  4,
  125,
  'AMP CT crimp contact',
  '',
  jsonb_build_object('options', jsonb_build_array('Cable-side receptacle', 'Natural housing'), 'terminal_price_cents', 11),
  'te-official-catalog',
  'https://www.te.com/en/product-179228-2.html',
  0.900,
  22 + pin_count * 6,
  11
from unnest(array[2, 3, 4, 6, 8]) as pin_count;

insert into maker_connector_seed
select
  'te-1445022-' || pin_count,
  'te-micro-mate-n-lok',
  'te-connectivity',
  '1445022-' || pin_count,
  'Micro MATE-N-LOK receptacle housing, ' || pin_count || ' pin',
  'crimp_housing',
  'receptacle',
  pin_count,
  1,
  3.000,
  'natural',
  false,
  true,
  true,
  18,
  30,
  5,
  250,
  'Micro MATE-N-LOK crimp contact',
  '',
  jsonb_build_object('options', jsonb_build_array('Single-row receptacle housing', 'Positive latch'), 'visual', 'microfit', 'terminal_price_cents', 24),
  'te-official-catalog',
  'https://www.te.com/en/product-1445022-2.html',
  0.900,
  48 + pin_count * 13,
  24
from unnest(array[2, 4, 6, 8, 10, 12]) as pin_count;

insert into maker_connector_seed
select
  'te-104257-' || (pin_count - 1),
  'te-ampmodu-mte',
  'te-connectivity',
  '104257-' || (pin_count - 1),
  'AMPMODU MTE receptacle housing, ' || pin_count || ' pin',
  'crimp_housing',
  'receptacle',
  pin_count,
  1,
  2.540,
  'black',
  false,
  true,
  true,
  20,
  32,
  3,
  250,
  'AMPMODU MTE crimp contact',
  '',
  jsonb_build_object('options', jsonb_build_array('Single-row receptacle', '0.1 inch pitch'), 'terminal_price_cents', 15),
  'te-official-catalog',
  'https://www.te.com/en/products/brands/ampmodu/ampmodumte.html',
  0.880,
  34 + pin_count * 7,
  15
from unnest(array[2, 3, 4, 5, 6, 8]) as pin_count;

insert into maker_connector_seed
select
  'harwin-m20-106' || lpad(pin_count::text, 2, '0') || '00',
  'harwin-m20',
  'harwin',
  'M20-106' || lpad(pin_count::text, 2, '0') || '00',
  'M20 1-row female crimp housing, ' || pin_count || ' pin',
  'crimp_housing',
  'female',
  pin_count,
  1,
  2.540,
  'black',
  false,
  false,
  true,
  22,
  30,
  3,
  250,
  'M20 crimp socket contact',
  '',
  jsonb_build_object('options', jsonb_build_array('1 row female crimp housing', 'Black'), 'terminal_price_cents', 14),
  'easy-harness-maker-price-book-v1',
  'https://www.harwin.com/products/M20-8760742',
  0.820,
  24 + pin_count * 4,
  14
from unnest(array[2, 3, 4, 5, 6, 8]) as pin_count;

insert into maker_connector_seed values
  ('jst-sm04b-srss-tb-4p', 'jst-sh', 'jst', 'SM04B-SRSS-TB', 'SH 4-pin right-angle board header', 'header', 'male', 4, 1, 1.000, 'black', false, false, true, 28, 32, 1, 50, 'Board header; solder or mating cable housing selected by configuration.', 'Use 4-pin Qwiic/STEMMA QT orientation.', '{"options":["Board header mate","Qwiic/STEMMA QT board connector"],"terminal_price_cents":12,"termination_style":"solder"}'::jsonb, 'easy-harness-maker-price-book-v1', 'https://www.sparkfun.com/qwiic-jst-connector-smd-4-pin-horizontal.html', 0.850, 32, 12),
  ('seeed-grove-4p-buckled-4p', 'seeed-grove', 'seeed', 'Grove-4P-2.0', 'Grove 4-pin buckled connector', 'crimp_housing', 'receptacle', 4, 1, 2.000, 'white', false, false, true, 24, 28, 1, 50, 'Grove 2.0 mm crimp terminal', '', '{"options":["Grove 4-pin 2.0 mm","Sensor cable endpoint"],"terminal_price_cents":8}'::jsonb, 'easy-harness-maker-price-book-v1', 'https://wiki.seeedstudio.com/Grove_System/', 0.820, 38, 8),
  ('dfrobot-gravity-ph20-3p-3p', 'dfrobot-gravity', 'dfrobot', 'Gravity-PH2.0-3P', 'Gravity PH2.0 3-pin sensor plug', 'crimp_housing', 'receptacle', 3, 1, 2.000, 'black', false, false, true, 24, 28, 1, 50, 'PH2.0 crimp terminal', '', '{"options":["3-pin digital sensor cable","PH2.0 to DuPont style"],"terminal_price_cents":8}'::jsonb, 'easy-harness-maker-price-book-v1', 'https://www.dfrobot.com/product-2551.html', 0.820, 42, 8),
  ('dfrobot-gravity-ph20-4p-4p', 'dfrobot-gravity', 'dfrobot', 'Gravity-PH2.0-4P', 'Gravity PH2.0 4-pin I2C/UART plug', 'crimp_housing', 'receptacle', 4, 1, 2.000, 'black', false, false, true, 24, 28, 1, 50, 'PH2.0 crimp terminal', '', '{"options":["4-pin I2C/UART sensor cable","PH2.0 to DuPont style"],"terminal_price_cents":8}'::jsonb, 'easy-harness-maker-price-book-v1', 'https://www.dfrobot.com/product-2554.html', 0.820, 48, 8),
  ('adafruit-5978', 'usb-breakout', 'adafruit', '5978', 'USB Type-C breakout', 'breakout_board', null, 5, 1, null, null, false, false, true, 22, 28, 1, 5, 'Soldered leads; terminal compatibility not applicable.', '', '{"options":["USB Type-C breakout","USB 2.0 signal pads"],"visual":"usb-board","terminal_price_cents":12,"termination_style":"solder"}'::jsonb, 'easy-harness-maker-price-book-v1', null, 0.820, 495, 12),
  ('adafruit-5180', 'usb-breakout', 'adafruit', '5180', 'USB-C plug breakout', 'breakout_board', null, 6, 1, null, null, false, false, true, 24, 30, 1, 5, 'Soldered leads; terminal compatibility not applicable.', '', '{"options":["USB-C plug breakout","Signal pads"],"visual":"usb-board","terminal_price_cents":12,"termination_style":"solder"}'::jsonb, 'easy-harness-maker-price-book-v1', null, 0.820, 695, 12),
  ('adafruit-6050', 'usb-breakout', 'adafruit', '6050', 'USB-C receptacle breakout', 'breakout_board', null, 6, 1, null, null, false, false, true, 24, 30, 1, 5, 'Soldered leads; terminal compatibility not applicable.', '', '{"options":["USB-C receptacle breakout","Power-only pads"],"visual":"usb-board","terminal_price_cents":12,"termination_style":"solder"}'::jsonb, 'easy-harness-maker-price-book-v1', null, 0.820, 450, 12),
  ('amass-xt30u-f-2p', 'xt-power', 'amass', 'XT30U-F', 'XT30 female solder connector', 'solder_connector', 'female', 2, 1, null, 'yellow', false, true, false, 14, 18, 15, 500, 'Solder cup contacts are included in connector basis.', '', '{"options":["Female battery connector","Solder cup"],"visual":"powerpole","terminal_price_cents":18,"termination_style":"solder"}'::jsonb, 'easy-harness-maker-price-book-v1', null, 0.760, 110, 18),
  ('amass-xt30u-m-2p', 'xt-power', 'amass', 'XT30U-M', 'XT30 male solder connector', 'solder_connector', 'male', 2, 1, null, 'yellow', false, true, false, 14, 18, 15, 500, 'Solder cup contacts are included in connector basis.', '', '{"options":["Male battery connector","Solder cup"],"visual":"powerpole","terminal_price_cents":18,"termination_style":"solder"}'::jsonb, 'easy-harness-maker-price-book-v1', null, 0.760, 110, 18),
  ('amass-xt60-f-2p', 'xt-power', 'amass', 'XT60-F', 'XT60 female solder connector', 'solder_connector', 'female', 2, 1, null, 'yellow', false, true, false, 12, 16, 30, 500, 'Solder cup contacts are included in connector basis.', '', '{"options":["Female battery connector","Solder cup"],"visual":"powerpole","terminal_price_cents":24,"termination_style":"solder"}'::jsonb, 'easy-harness-maker-price-book-v1', null, 0.760, 165, 24),
  ('amass-xt60-m-2p', 'xt-power', 'amass', 'XT60-M', 'XT60 male solder connector', 'solder_connector', 'male', 2, 1, null, 'yellow', false, true, false, 12, 16, 30, 500, 'Solder cup contacts are included in connector basis.', '', '{"options":["Male battery connector","Solder cup"],"visual":"powerpole","terminal_price_cents":24,"termination_style":"solder"}'::jsonb, 'easy-harness-maker-price-book-v1', null, 0.760, 165, 24),
  ('anderson-1327g6-bk', 'anderson-powerpole-15-45', 'anderson-power', '1327G6-BK', 'Powerpole 15/45 housing, black', 'crimp_housing', 'genderless', 1, 1, null, 'black', false, true, false, 10, 20, 45, 600, 'Powerpole 15/30/45 contacts; contact size depends on wire gauge.', '', '{"options":["1 row, neutral, black"],"visual":"powerpole","terminal_price_cents":110}'::jsonb, 'easy-harness-maker-price-book-v1', 'https://www.andersonpower.com/product-lines/powerpole/', 0.850, 85, 110),
  ('anderson-1327g6-red', 'anderson-powerpole-15-45', 'anderson-power', '1327G6-RED', 'Powerpole 15/45 housing, red', 'crimp_housing', 'genderless', 1, 1, null, 'red', false, true, false, 10, 20, 45, 600, 'Powerpole 15/30/45 contacts; contact size depends on wire gauge.', '', '{"options":["1 row, neutral, red"],"visual":"powerpole","terminal_price_cents":110}'::jsonb, 'easy-harness-maker-price-book-v1', 'https://www.andersonpower.com/product-lines/powerpole/', 0.850, 85, 110),
  ('deutsch-dt04-2p', 'deutsch-dt', 'te-connectivity', 'DT04-2P', 'DT 2-pin receptacle housing', 'sealed_crimp_housing', 'receptacle', 2, 1, null, 'gray', true, true, false, 14, 20, 13, 250, 'Size 16 solid contacts; exact terminal and seal selection included in internal basis.', 'Wedge lock and seals required for sealed assembly.', '{"options":["Receptacle, 2 pin, gray","Wedge lock needed"],"visual":"sealed-dt","terminal_price_cents":95}'::jsonb, 'easy-harness-maker-price-book-v1', null, 0.700, 185, 95);

insert into public.catalog_connector_housings (
  id,
  family_id,
  manufacturer_id,
  mpn,
  display_name,
  description,
  housing_type,
  gender,
  pin_count,
  pin_count_options,
  row_count,
  pitch_mm,
  color,
  sealed,
  wire_to_wire,
  wire_to_board,
  awg_min,
  awg_max,
  current_rating_a,
  voltage_rating_v,
  compatible_terminal_notes,
  required_accessory_notes,
  lifecycle_status,
  attributes,
  source_id,
  source_url,
  confidence,
  direct_checkout_enabled,
  active
)
select
  id,
  family_id,
  manufacturer_id,
  mpn,
  display_name,
  display_name,
  housing_type,
  gender,
  pin_count,
  array[pin_count],
  row_count,
  pitch_mm,
  color,
  sealed,
  wire_to_wire,
  wire_to_board,
  awg_min,
  awg_max,
  current_rating_a,
  voltage_rating_v,
  terminal_notes,
  accessory_notes,
  'active',
  attributes || jsonb_build_object('internal_price_cents', price_cents),
  source_id,
  source_url,
  confidence,
  true,
  true
from maker_connector_seed
on conflict (id) do update set
  family_id = excluded.family_id,
  manufacturer_id = excluded.manufacturer_id,
  mpn = excluded.mpn,
  display_name = excluded.display_name,
  description = excluded.description,
  housing_type = excluded.housing_type,
  gender = excluded.gender,
  pin_count = excluded.pin_count,
  pin_count_options = excluded.pin_count_options,
  row_count = excluded.row_count,
  pitch_mm = excluded.pitch_mm,
  color = excluded.color,
  sealed = excluded.sealed,
  wire_to_wire = excluded.wire_to_wire,
  wire_to_board = excluded.wire_to_board,
  awg_min = excluded.awg_min,
  awg_max = excluded.awg_max,
  current_rating_a = excluded.current_rating_a,
  voltage_rating_v = excluded.voltage_rating_v,
  compatible_terminal_notes = excluded.compatible_terminal_notes,
  required_accessory_notes = excluded.required_accessory_notes,
  lifecycle_status = excluded.lifecycle_status,
  attributes = excluded.attributes,
  source_id = excluded.source_id,
  source_url = excluded.source_url,
  confidence = excluded.confidence,
  direct_checkout_enabled = true,
  active = true,
  updated_at = now();

insert into public.catalog_terminals (
  id,
  manufacturer_id,
  family_id,
  mpn,
  display_name,
  description,
  terminal_type,
  wire_awg_min,
  wire_awg_max,
  current_rating_a,
  tooling_notes,
  attributes,
  source_id,
  source_url,
  confidence,
  direct_checkout_enabled,
  active
)
select
  'terminal-' || family_id,
  min(manufacturer_id),
  family_id,
  'terminal-' || family_id,
  min(terminal_notes),
  'Internal stocked contact / solder-pad standard for ' || family_id,
  case when bool_or((attributes->>'termination_style') = 'solder') then 'solder_pad' else 'crimp_contact' end,
  min(awg_min),
  max(awg_max),
  max(current_rating_a),
  'Easy Harness internal tooling standard.',
  jsonb_build_object('internal_price_cents', max(terminal_price_cents)),
  'easy-harness-maker-price-book-v1',
  null,
  0.900,
  true,
  true
from maker_connector_seed
group by family_id
on conflict (id) do update set
  manufacturer_id = excluded.manufacturer_id,
  family_id = excluded.family_id,
  mpn = excluded.mpn,
  display_name = excluded.display_name,
  description = excluded.description,
  terminal_type = excluded.terminal_type,
  wire_awg_min = excluded.wire_awg_min,
  wire_awg_max = excluded.wire_awg_max,
  current_rating_a = excluded.current_rating_a,
  tooling_notes = excluded.tooling_notes,
  attributes = excluded.attributes,
  source_id = excluded.source_id,
  source_url = excluded.source_url,
  confidence = excluded.confidence,
  direct_checkout_enabled = true,
  active = true,
  updated_at = now();

insert into public.catalog_mid_elements (
  id,
  element_type,
  display_name,
  description,
  left_pin_count_min,
  left_pin_count_max,
  right_pin_count_min,
  right_pin_count_max,
  supported_awg_min,
  supported_awg_max,
  validation_rules,
  required_parts,
  attributes,
  source_id,
  confidence,
  direct_checkout_enabled,
  active
)
values
  ('splice', 'splice', 'Solder splice with heatshrink', 'Canvas splice node for joining one or more wires.', 1, 4, 1, 4, 10, 32, '{"requires_wire_configuration":true}'::jsonb, '[]'::jsonb, '{"options":["Black heatshrink","Clear heatshrink","Adhesive-lined heatshrink"],"material_price_cents":60,"labor_price_cents":160}'::jsonb, 'easy-harness-maker-price-book-v1', 0.900, true, true),
  ('cable', 'cable', 'Cable breakout', 'Canvas cable or jacketed lead grouping node.', 1, 6, 1, 6, 18, 30, '{"requires_cable_type":true}'::jsonb, '[]'::jsonb, '{"options":["Jacketed cable","Shielded cable","Twisted pair"],"material_price_cents":180,"labor_price_cents":220}'::jsonb, 'easy-harness-maker-price-book-v1', 0.900, true, true),
  ('fuse', 'fuse', 'Inline fuse holder', 'Canvas inline fuse holder node.', 1, 1, 1, 1, 12, 20, '{"requires_fuse_rating":true}'::jsonb, '[]'::jsonb, '{"options":["ATO/ATC fuse holder","Mini blade fuse holder"],"material_price_cents":325,"labor_price_cents":180}'::jsonb, 'easy-harness-maker-price-book-v1', 0.900, true, true),
  ('sleeve', 'sleeve', 'Protective sleeve', 'Canvas sleeve or jacket node for routing protection.', 1, 6, 1, 6, 10, 32, '{"requires_length":true}'::jsonb, '[]'::jsonb, '{"options":["PET braided sleeve","Split loom","Heatshrink sleeve"],"material_price_cents":120,"labor_price_cents":110}'::jsonb, 'easy-harness-maker-price-book-v1', 0.900, true, true),
  ('shield_drain', 'shield_drain', 'Shield drain termination', 'Shield/drain termination node for signal harnesses.', 1, 2, 1, 2, 22, 30, '{"requires_ground_reference":true}'::jsonb, '[]'::jsonb, '{"options":["Drain wire to ground","Foil shield termination"],"material_price_cents":95,"labor_price_cents":190}'::jsonb, 'easy-harness-maker-price-book-v1', 0.850, true, true),
  ('branch_point', 'branch_point', 'Labeled branch point', 'Harness branch and sleeve transition node.', 1, 6, 1, 6, 18, 30, '{"requires_branch_labels":true}'::jsonb, '[]'::jsonb, '{"options":["Heatshrink branch","Sleeved branch","Labeled branch"],"material_price_cents":140,"labor_price_cents":240}'::jsonb, 'easy-harness-maker-price-book-v1', 0.850, true, true)
on conflict (id) do update set
  element_type = excluded.element_type,
  display_name = excluded.display_name,
  description = excluded.description,
  left_pin_count_min = excluded.left_pin_count_min,
  left_pin_count_max = excluded.left_pin_count_max,
  right_pin_count_min = excluded.right_pin_count_min,
  right_pin_count_max = excluded.right_pin_count_max,
  supported_awg_min = excluded.supported_awg_min,
  supported_awg_max = excluded.supported_awg_max,
  validation_rules = excluded.validation_rules,
  required_parts = excluded.required_parts,
  attributes = excluded.attributes,
  source_id = excluded.source_id,
  confidence = excluded.confidence,
  direct_checkout_enabled = true,
  active = true,
  updated_at = now();

insert into public.catalog_wires (
  id,
  manufacturer_id,
  spec,
  display_name,
  wire_type,
  insulation,
  color,
  conductor_count,
  stranded,
  shielded,
  twisted_pair,
  voltage_rating_v,
  attributes,
  source_id,
  confidence,
  direct_checkout_enabled,
  active
)
values
  ('silicone-hookup-generic', 'easy-harness', 'Generic silicone hookup wire', 'Silicone hookup wire', 'silicone', 'silicone', null, 1, true, false, false, null, '{"supported_awg":[10,12,14,16,18,20,22,24,26,28,30],"colors":["Black","Red","Yellow","Blue","Green","White","Orange"],"price_per_meter_cents_by_gauge":{"10":410,"12":318,"14":232,"16":168,"18":126,"20":96,"22":72,"24":54,"26":44,"28":36,"30":30}}'::jsonb, 'easy-harness-maker-price-book-v1', 0.900, true, true),
  ('ul1007-hookup-generic', 'easy-harness', 'Generic UL1007 PVC hook-up wire', 'UL1007 PVC hook-up wire', 'ul1007', 'PVC', null, 1, true, false, false, null, '{"supported_awg":[16,18,20,22,24,26,28],"colors":["Black","Red","White","Blue","Yellow","Green","Orange","Brown","Gray","Purple"],"price_per_meter_cents_by_gauge":{"16":72,"18":56,"20":44,"22":34,"24":28,"26":24,"28":20}}'::jsonb, 'easy-harness-maker-price-book-v1', 0.900, true, true),
  ('qwiic-stemma-color-generic', 'easy-harness', 'Qwiic/STEMMA QT color set wire', 'Qwiic/STEMMA QT color set', 'qwiic-stemma', 'PVC', null, 1, true, false, false, 50, '{"supported_awg":[26,28,30],"colors":["Black","Red","Blue","Yellow"],"price_per_meter_cents_by_gauge":{"26":46,"28":38,"30":32}}'::jsonb, 'easy-harness-maker-price-book-v1', 0.880, true, true),
  ('ribbon-lead-generic', 'easy-harness', 'IDC / ribbon lead wire', 'IDC / ribbon lead', 'ribbon', 'PVC', null, 1, true, false, false, 50, '{"supported_awg":[26,28,30],"colors":["Gray","Rainbow","Black","Red"],"price_per_meter_cents_by_gauge":{"26":38,"28":32,"30":28}}'::jsonb, 'easy-harness-maker-price-book-v1', 0.850, true, true),
  ('shielded-signal-generic', 'easy-harness', 'Generic shielded signal wire', 'Shielded signal wire', 'shielded-signal', 'PVC', null, 1, true, true, false, 300, '{"supported_awg":[22,24,26,28],"colors":["Black","Gray","Blue"],"price_per_meter_cents_by_gauge":{"22":126,"24":96,"26":78,"28":64}}'::jsonb, 'easy-harness-maker-price-book-v1', 0.850, true, true),
  ('txl-gxl-automotive-generic', 'easy-harness', 'Generic TXL/GXL automotive wire', 'TXL / GXL automotive wire', 'txl', 'XLPE', null, 1, true, false, false, null, '{"supported_awg":[12,14,16,18,20,22],"colors":["Black","Red","White","Blue","Yellow","Green","Brown"],"price_per_meter_cents_by_gauge":{"12":118,"14":92,"16":70,"18":52,"20":42,"22":34}}'::jsonb, 'easy-harness-maker-price-book-v1', 0.800, true, true),
  ('ptfe-high-temp-generic', 'easy-harness', 'Generic PTFE high-temperature wire', 'PTFE high-temp wire', 'ptfe', 'PTFE', null, 1, true, false, false, null, '{"supported_awg":[18,20,22,24,26,28,30],"colors":["Black","Red","White","Blue","Yellow"],"price_per_meter_cents_by_gauge":{"18":188,"20":148,"22":112,"24":88,"26":72,"28":58,"30":48}}'::jsonb, 'easy-harness-maker-price-book-v1', 0.850, true, true)
on conflict (id) do update set
  manufacturer_id = excluded.manufacturer_id,
  spec = excluded.spec,
  display_name = excluded.display_name,
  wire_type = excluded.wire_type,
  insulation = excluded.insulation,
  color = excluded.color,
  conductor_count = excluded.conductor_count,
  stranded = excluded.stranded,
  shielded = excluded.shielded,
  twisted_pair = excluded.twisted_pair,
  voltage_rating_v = excluded.voltage_rating_v,
  attributes = excluded.attributes,
  source_id = excluded.source_id,
  confidence = excluded.confidence,
  direct_checkout_enabled = true,
  active = true,
  updated_at = now();

delete from public.catalog_price_snapshots
where source_id = 'easy-harness-maker-price-book-v1';

insert into public.catalog_price_snapshots (
  entity_type,
  entity_id,
  source_id,
  supplier_name,
  supplier_part_number,
  manufacturer_part_number,
  currency,
  price_breaks,
  visibility,
  confidence,
  direct_checkout_allowed,
  active
)
select
  'connector_housing',
  id,
  'easy-harness-maker-price-book-v1',
  'Easy Harness internal catalog',
  id,
  mpn,
  'USD',
  jsonb_build_array(jsonb_build_object('min_qty', 1, 'unit_cents', price_cents)),
  'public_catalog',
  0.950,
  true,
  true
from maker_connector_seed
union all
select
  'terminal',
  'terminal-' || family_id,
  'easy-harness-maker-price-book-v1',
  'Easy Harness internal catalog',
  'terminal-' || family_id,
  min(terminal_notes),
  'USD',
  jsonb_build_array(jsonb_build_object('min_qty', 1, 'unit_cents', max(terminal_price_cents))),
  'public_catalog',
  0.950,
  true,
  true
from maker_connector_seed
group by family_id
union all
select 'wire', 'silicone-hookup-generic', 'easy-harness-maker-price-book-v1', 'Easy Harness internal catalog', 'silicone-hookup-generic', 'silicone-hookup-generic', 'USD', '[{"awg":10,"meter_cents":410},{"awg":12,"meter_cents":318},{"awg":14,"meter_cents":232},{"awg":16,"meter_cents":168},{"awg":18,"meter_cents":126},{"awg":20,"meter_cents":96},{"awg":22,"meter_cents":72},{"awg":24,"meter_cents":54},{"awg":26,"meter_cents":44},{"awg":28,"meter_cents":36},{"awg":30,"meter_cents":30}]'::jsonb, 'public_catalog', 0.950, true, true
union all
select 'wire', 'ul1007-hookup-generic', 'easy-harness-maker-price-book-v1', 'Easy Harness internal catalog', 'ul1007-hookup-generic', 'ul1007-hookup-generic', 'USD', '[{"awg":16,"meter_cents":72},{"awg":18,"meter_cents":56},{"awg":20,"meter_cents":44},{"awg":22,"meter_cents":34},{"awg":24,"meter_cents":28},{"awg":26,"meter_cents":24},{"awg":28,"meter_cents":20}]'::jsonb, 'public_catalog', 0.950, true, true
union all
select 'wire', 'qwiic-stemma-color-generic', 'easy-harness-maker-price-book-v1', 'Easy Harness internal catalog', 'qwiic-stemma-color-generic', 'qwiic-stemma-color-generic', 'USD', '[{"awg":26,"meter_cents":46},{"awg":28,"meter_cents":38},{"awg":30,"meter_cents":32}]'::jsonb, 'public_catalog', 0.950, true, true
union all
select 'wire', 'ribbon-lead-generic', 'easy-harness-maker-price-book-v1', 'Easy Harness internal catalog', 'ribbon-lead-generic', 'ribbon-lead-generic', 'USD', '[{"awg":26,"meter_cents":38},{"awg":28,"meter_cents":32},{"awg":30,"meter_cents":28}]'::jsonb, 'public_catalog', 0.950, true, true
union all
select 'wire', 'shielded-signal-generic', 'easy-harness-maker-price-book-v1', 'Easy Harness internal catalog', 'shielded-signal-generic', 'shielded-signal-generic', 'USD', '[{"awg":22,"meter_cents":126},{"awg":24,"meter_cents":96},{"awg":26,"meter_cents":78},{"awg":28,"meter_cents":64}]'::jsonb, 'public_catalog', 0.950, true, true
union all
select 'wire', 'txl-gxl-automotive-generic', 'easy-harness-maker-price-book-v1', 'Easy Harness internal catalog', 'txl-gxl-automotive-generic', 'txl-gxl-automotive-generic', 'USD', '[{"awg":12,"meter_cents":118},{"awg":14,"meter_cents":92},{"awg":16,"meter_cents":70},{"awg":18,"meter_cents":52},{"awg":20,"meter_cents":42},{"awg":22,"meter_cents":34}]'::jsonb, 'public_catalog', 0.900, true, true
union all
select 'wire', 'ptfe-high-temp-generic', 'easy-harness-maker-price-book-v1', 'Easy Harness internal catalog', 'ptfe-high-temp-generic', 'ptfe-high-temp-generic', 'USD', '[{"awg":18,"meter_cents":188},{"awg":20,"meter_cents":148},{"awg":22,"meter_cents":112},{"awg":24,"meter_cents":88},{"awg":26,"meter_cents":72},{"awg":28,"meter_cents":58},{"awg":30,"meter_cents":48}]'::jsonb, 'public_catalog', 0.900, true, true
union all
select 'mid_element', 'splice', 'easy-harness-maker-price-book-v1', 'Easy Harness internal catalog', 'splice', 'splice-standard', 'USD', '[{"min_qty":1,"unit_cents":60}]'::jsonb, 'public_catalog', 0.950, true, true
union all
select 'mid_element', 'cable', 'easy-harness-maker-price-book-v1', 'Easy Harness internal catalog', 'cable', 'cable-breakout-standard', 'USD', '[{"min_qty":1,"unit_cents":180}]'::jsonb, 'public_catalog', 0.950, true, true
union all
select 'mid_element', 'fuse', 'easy-harness-maker-price-book-v1', 'Easy Harness internal catalog', 'fuse', 'inline-fuse-standard', 'USD', '[{"min_qty":1,"unit_cents":325}]'::jsonb, 'public_catalog', 0.950, true, true
union all
select 'mid_element', 'sleeve', 'easy-harness-maker-price-book-v1', 'Easy Harness internal catalog', 'sleeve', 'sleeve-standard', 'USD', '[{"min_qty":1,"unit_cents":120}]'::jsonb, 'public_catalog', 0.950, true, true
union all
select 'mid_element', 'shield_drain', 'easy-harness-maker-price-book-v1', 'Easy Harness internal catalog', 'shield_drain', 'shield-drain-standard', 'USD', '[{"min_qty":1,"unit_cents":95}]'::jsonb, 'public_catalog', 0.900, true, true
union all
select 'mid_element', 'branch_point', 'easy-harness-maker-price-book-v1', 'Easy Harness internal catalog', 'branch_point', 'branch-point-standard', 'USD', '[{"min_qty":1,"unit_cents":140}]'::jsonb, 'public_catalog', 0.900, true, true
union all
select 'labor_operation', 'cut_wire', 'easy-harness-maker-price-book-v1', 'Easy Harness internal catalog', 'cut_wire', 'cut_wire', 'USD', '[{"unit":"per_wire","unit_cents":40}]'::jsonb, 'public_catalog', 0.950, true, true
union all
select 'labor_operation', 'crimp_terminal', 'easy-harness-maker-price-book-v1', 'Easy Harness internal catalog', 'crimp_terminal', 'crimp_terminal', 'USD', '[{"unit":"per_pin","unit_cents":85}]'::jsonb, 'public_catalog', 0.950, true, true
union all
select 'labor_operation', 'solder_terminal', 'easy-harness-maker-price-book-v1', 'Easy Harness internal catalog', 'solder_terminal', 'solder_terminal', 'USD', '[{"unit":"per_pin","unit_cents":120}]'::jsonb, 'public_catalog', 0.950, true, true
union all
select 'labor_operation', 'continuity_test', 'easy-harness-maker-price-book-v1', 'Easy Harness internal catalog', 'continuity_test', 'continuity_test', 'USD', '[{"unit":"per_harness","unit_cents":250}]'::jsonb, 'public_catalog', 0.950, true, true;

delete from public.catalog_compatibility_edges
where source_id = 'easy-harness-maker-price-book-v1';

insert into public.catalog_compatibility_edges (
  left_entity_type,
  left_entity_id,
  right_entity_type,
  right_entity_id,
  relationship_type,
  conditions,
  source_id,
  confidence,
  active
)
select
  'connector_family',
  family_id,
  'terminal',
  'terminal-' || family_id,
  'uses_terminal',
  jsonb_build_object('direct_checkout', true),
  'easy-harness-maker-price-book-v1',
  0.900,
  true
from maker_connector_seed
group by family_id;

insert into public.catalog_labor_operations (
  id,
  operation_type,
  display_name,
  description,
  unit,
  setup_seconds,
  run_seconds,
  cost_cents,
  conditions,
  confidence,
  direct_checkout_allowed,
  active
)
values
  ('cut_wire', 'cut_wire', 'Cut and strip wire', 'Cut wire to length and strip both ends.', 'per_wire', 0, 72, 40, '{}'::jsonb, 0.950, true, true),
  ('crimp_terminal', 'crimp_terminal', 'Crimp terminal', 'Crimp selected contact onto wire.', 'per_pin', 0, 55, 85, '{}'::jsonb, 0.950, true, true),
  ('solder_terminal', 'solder_terminal', 'Solder breakout or power connector', 'Solder lead to board breakout pad or solder-cup connector.', 'per_pin', 0, 85, 120, '{}'::jsonb, 0.950, true, true),
  ('mid_element_assembly', 'mid_element_assembly', 'Mid element assembly', 'Assemble splice, cable, fuse, sleeve, shield drain, or branch node.', 'each', 0, 120, 160, '{"splice":160,"cable":220,"fuse":180,"sleeve":110,"shield_drain":190,"branch_point":240}'::jsonb, 0.950, true, true),
  ('continuity_test', 'continuity_test', 'Continuity test', 'Electrical continuity check for configured circuits.', 'per_harness', 0, 180, 250, '{}'::jsonb, 0.950, true, true),
  ('circuit_label', 'label', 'Circuit label', 'Apply circuit label to configured wire.', 'per_wire', 0, 20, 18, '{}'::jsonb, 0.950, true, true),
  ('pack_harness', 'pack', 'Pack harness', 'Pack harness for checkout shipment.', 'per_harness', 0, 90, 125, '{}'::jsonb, 0.950, true, true),
  ('order_handling', 'order_handling', 'Order handling', 'Checkout handling for a priced canvas order.', 'per_harness', 0, 300, 500, '{}'::jsonb, 0.950, true, true)
on conflict (id) do update set
  operation_type = excluded.operation_type,
  display_name = excluded.display_name,
  description = excluded.description,
  unit = excluded.unit,
  setup_seconds = excluded.setup_seconds,
  run_seconds = excluded.run_seconds,
  cost_cents = excluded.cost_cents,
  conditions = excluded.conditions,
  confidence = excluded.confidence,
  direct_checkout_allowed = true,
  active = true,
  updated_at = now();

insert into public.catalog_pricing_rules (
  id,
  rule_type,
  display_name,
  rule,
  margin_bps,
  sort_order,
  active
)
values
  ('canvas_material_markup_2026_06_v1', 'material_markup', 'Canvas material markup', '{"basis":"internal_catalog_material_total","catalog_version":"maker-robotics-catalog-2026-06-v1"}'::jsonb, 2800, 20, true),
  ('canvas_labor_markup_2026_06_v1', 'labor_markup', 'Canvas labor markup', '{"basis":"internal_operation_labor_total","catalog_version":"maker-robotics-catalog-2026-06-v1"}'::jsonb, 1800, 30, true),
  ('canvas_minimum_harness_2026_06_v1', 'minimum_order', 'Canvas minimum harness price', '{"minimum_harness_price_cents":1250,"catalog_version":"maker-robotics-catalog-2026-06-v1"}'::jsonb, null, 40, true),
  ('canvas_quantity_discount_2026_06_v1', 'material_markup', 'Canvas quantity discount', '{"discount_bps":[{"min_qty":10,"bps":500},{"min_qty":25,"bps":800},{"min_qty":100,"bps":1200}],"catalog_version":"maker-robotics-catalog-2026-06-v1"}'::jsonb, null, 50, true)
on conflict (id) do update set
  rule_type = excluded.rule_type,
  display_name = excluded.display_name,
  rule = excluded.rule,
  margin_bps = excluded.margin_bps,
  sort_order = excluded.sort_order,
  active = excluded.active,
  updated_at = now();
