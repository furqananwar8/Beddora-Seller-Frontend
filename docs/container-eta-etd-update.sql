-- Fills in ETD, ETA, Port of arrival and Destination city (and corrects a wrong destination) for the containers, from
-- "Logistics Team _ Canada Shipping Track.xlsx" (tab LogisticsTrack), then links each container to its country's
-- warehouse (the Warehouse column then reads CANADA / USA).
--
-- Sheet columns: container = A / I / AB (whichever holds it), ETD = AH, ETA = AR (AQ when AR is empty),
-- Port = AP, Destination city = AW, Destination = H. Matched to po_containers by container number (the id is shown in
-- the review output). A value the sheet does not have never overwrites one we already hold. Safe to re-run.
-- It changes nothing but these columns of po_containers (etd, eta, portOfArrival, destinationCity, destination,
-- warehouseId) and deletes nothing.
--
-- The port is stored the way the app's port list spells it ("Vancouver, BC"), so the sheet's names are translated below.
-- The destination city is stored exactly as the sheet writes it (AW, trimmed), with no province, so the Containers
-- screen reads "CANADA · Toronto" / "USA · Houston TX". The province is left as it is.
--
-- THE APP'S OWN RULES (container.policy.ts) lock these fields once a container has shipped or arrived:
--   BOOKED            -> everything     |  shipping (ON_BOARD, ARRIVED_AT_PORT...) -> ETA only
--   delivered / at the warehouse / received -> nothing
-- This is a one-off back-fill of history, so `include_locked` is TRUE: the sheet fills every container. Set it to false to
-- follow the app's rules to the letter.
--
-- EVERY container row of the sheet is included (43 rows), not only the imported ones. A sheet container that does not
-- exist in the app is simply listed in review 2. A container may be on the sheet under its container number (A / I) or,
-- for MRKU4001360, a booking number (AB), so each of them is a key.
-- Not in the sheet, so only the warehouse step touches them: FFAU1478321, USA-0002,0006-11, CAN-SP-0002-11.
-- ZCSU6938860 is on two sheet rows (9 and 19); row 19 is used because it has both dates.
-- Run container-status-fix.sql FIRST (TGBU6599144 and TXGU8197888 are not delivered, whatever the import said).
--
-- WAREHOUSE: every container gets the warehouse of its destination country (CA -> the Canadian one, US -> the US one),
-- but only when it has none yet (`replace_existing` = false). Each country must have exactly ONE warehouse in
-- Settings > Warehouses; otherwise the script stops and lists them: put the exact name in `wh_pick`.
--
-- Run it in ONE transaction, check the review output, then COMMIT; (with the semicolon, or some tools ignore it).

BEGIN;
DROP TABLE IF EXISTS date_opts, port_map, wh_pick, wh_resolved, sheet_dates, date_plan;

CREATE TEMP TABLE date_opts AS SELECT true AS include_locked, false AS replace_existing;   -- <<< include_locked=false follows the app's lock rules; replace_existing=true also overwrites a warehouse already set

-- the sheet's port names -> the app's port list (ports.ts)
CREATE TEMP TABLE port_map (sheet_port text, app_port text);
INSERT INTO port_map VALUES
  ('Vancouver',        'Vancouver, BC'),
  ('Montreal',         'Montreal, QC'),
  ('Montreal, CA',     'Montreal, QC'),
  ('Los Angeles',      'Los Angeles, CA'),
  ('Houston',          'Houston, TX'),
  ('Houston TX',       'Houston, TX'),
  ('Houston Bay Port', 'Houston, TX'),
  ('Baltimore',        'Baltimore, MD'),
  ('Prince Rupert',    'Prince Rupert, BC'),
  ('SAINT JOHN, NB',   'Saint John, NB');

-- <<< Optional: set a warehouse name (exactly as in Settings > Warehouses) to pick one when a country has several
CREATE TEMP TABLE wh_pick (dest text, wh_name text);
INSERT INTO wh_pick VALUES ('CA', NULL), ('US', NULL);

CREATE TEMP TABLE sheet_dates (cn text, etd date, eta date, sheet_port text, sheet_dest text, sheet_city text, sheet_status text);
INSERT INTO sheet_dates VALUES
  ('YMMU6041154', '2026-01-26', '2026-03-10', 'Vancouver', NULL, 'Toronto', 'Delivered at Warehouse'),
  ('TGBU6345854', '2026-02-08', '2026-03-05', 'Los Angeles', NULL, 'Hesperia', 'Delivered at Warehouse'),
  ('HLBU3299646', '2026-02-23', '2026-03-27', 'Vancouver', NULL, 'Toronto', 'Delivered at Warehouse'),
  ('STJU4201050', '2026-02-17', '2026-03-25', 'Vancouver', NULL, 'Toronto', 'Delivered at Warehouse'),
  ('MRKU4001360', '2026-02-16', '2026-04-01', 'Vancouver', NULL, 'Toronto', 'Delivered at Warehouse'),
  ('MAEU265269113', '2026-02-16', '2026-04-01', 'Vancouver', NULL, 'Toronto', 'Delivered at Warehouse'),
  ('ZCSU6938860', '2026-05-09', '2026-06-18', 'Los Angeles', 'US', 'Houston TX', 'Delivered at Warehouse'),
  ('MSMU8668163', '2026-04-26', '2026-06-15', 'Vancouver', 'CA', 'Toronto', 'Delivered at Warehouse'),
  ('TCNU3197075', '2026-06-25', '2026-08-11', 'Houston Bay Port', 'US', 'Houston TX', 'Delivered at Warehouse'),
  ('TCKU6883500', '2026-06-25', '2026-08-11', 'Houston Bay Port', 'US', 'Houston TX', 'Delivered at Warehouse'),
  ('HAMU2571132', '2026-05-16', '2026-06-18', 'Vancouver', 'CA', 'Toronto', 'Delivered at Warehouse'),
  ('NWRU8568291', '2026-08-17', '2026-09-23', 'Vancouver', 'CA', 'Toronto', 'Delivered at Warehouse'),
  ('KOCU4560294', '2026-04-28', '2026-08-04', 'Vancouver', 'CA', 'Toronto', 'Delivered at Warehouse'),
  ('HASU5068252', '2026-05-29', '2026-07-08', 'Houston TX', 'US', 'Houston TX', 'Delivered at Warehouse'),
  ('CAAU7780438', '2026-06-10', '2026-08-11', 'Montreal', 'CA', 'Toronto', 'Delivered at Warehouse'),
  ('HPXU3031940', '2026-05-15', '2026-06-26', 'Prince Rupert', 'CA', 'Toronto', 'Delivered at Warehouse'),
  ('SEKU4040875', '2026-06-20', '2026-08-14', 'Vancouver', 'CA', 'Toronto', 'Delivered at Warehouse'),
  ('YMLU9008259', '2026-06-27', '2026-08-04', 'Vancouver', 'CA', 'Toronto', 'Delivered at Warehouse'),
  ('KOCU4359567', '2026-07-03', '2026-08-21', 'Vancouver', 'CA', 'Toronto', 'Delivered at Warehouse'),
  ('MSKU4691077', '2026-08-16', '2026-09-29', 'Houston Bay Port', 'US', 'Houston TX', 'Delivered at Warehouse'),
  ('MSKU4691077  / 45HQ', '2026-08-16', '2026-09-29', 'Houston Bay Port', 'US', 'Houston TX', 'Delivered at Warehouse'),
  ('TCNU4770140', '2026-05-28', '2026-07-27', 'Vancouver', 'CA', 'Toronto', 'Delivered at Warehouse'),
  ('MRKU4314174', '2026-07-12', '2026-08-26', 'Vancouver', 'CA', 'Toronto', 'Delivered at Warehouse'),
  ('MRSU2678842', '2026-07-18', '2026-09-10', 'Vancouver', 'CA', 'Toronto', 'Delivered at Warehouse'),
  ('BMOU4583741', '2026-08-04', '2026-09-21', 'Baltimore', 'US', 'LBE1 NEW STANTON, PA', 'Delivered at Warehouse'),
  ('CAIU4387116', '2026-08-23', '2026-10-13', 'Houston Bay Port', 'US', 'Houston TX', 'Delivered at Warehouse'),
  ('MSDU5269815', '2026-07-22', '2026-09-07', 'Vancouver', 'CA', 'Toronto', 'Delivered at Warehouse'),
  ('CMAU7924741', '2026-07-21', '2026-09-09', 'Vancouver', 'CA', 'Toronto', 'Delivered at Warehouse'),
  ('OOCU7649076', '2026-08-03', '2026-09-23', 'Houston Bay Port', 'US', 'Houston TX', 'Delivered at Warehouse'),
  ('NWRU8566616', '2026-08-16', '2026-09-21', 'Vancouver', 'CA', 'Toronto', 'Delivered at Warehouse'),
  ('JTAU7377936', '2026-08-18', '2026-10-20', 'Vancouver', 'CA', 'Toronto', 'Delivered at Warehouse'),
  ('SJCU4575732', '2026-08-17', '2026-09-18', 'Vancouver', 'CA', 'Toronto', 'Delivered at Warehouse'),
  ('YMMU6592603', '2026-08-28', '2026-09-26', 'Vancouver', 'CA', 'Toronto', 'Delivered at Warehouse'),
  ('TCNU4639058', '2026-08-27', '2026-09-30', 'Vancouver', 'CA', 'Toronto', 'Delivered at Warehouse'),
  ('TEMU6196025', '2026-09-27', '2026-11-14', 'Houston Bay Port', 'US', 'Houston TX', 'Onboard Vessel'),
  ('NYKU4342588', '2026-09-12', '2026-10-26', 'Vancouver', 'CA', 'Toronto', 'Delivered at Warehouse'),
  ('TXGU8197888', '2026-09-14', '2026-10-28', 'Vancouver', 'CA', 'Toronto', 'Arrival at port'),
  ('FBLU0224723', '2026-11-05', '2026-11-25', 'Los Angeles', 'US', 'Fontana, CA', 'Booked'),
  ('FANU1319365', '2026-11-01', '2026-11-19', 'Los Angeles', 'US', 'Hesperia, CA', 'Onboard Vessel'),
  ('MSMU8770262', '2026-10-24', '2026-12-31', 'Montreal, CA', 'CA', 'Toronto', 'Onboard Vessel'),
  ('HAMU4555871', '2026-10-03', '2026-11-23', 'SAINT JOHN, NB', 'CA', 'Toronto', 'Onboard Vessel'),
  ('HLBU3166448', '2026-10-25', '2026-11-25', 'Vancouver', 'CA', 'Toronto', 'Onboard Vessel'),
  ('CAN-BDR-SP-00080, 0005, 00039, 0006-17', '2026-11-10', '2026-12-12', 'Vancouver', 'CA', 'Toronto', 'Booked'),
  ('TGBU6599144', '2026-10-04', '2026-11-23', 'Vancouver', 'CA', 'Toronto', 'Onboard Vessel')
;

-- A port the sheet names that has no mapping would be skipped silently: stop instead
DO $chk$
BEGIN
  IF EXISTS (SELECT 1 FROM sheet_dates s WHERE s.sheet_port IS NOT NULL AND NOT EXISTS (SELECT 1 FROM port_map m WHERE m.sheet_port = s.sheet_port)) THEN
    RAISE EXCEPTION 'Ports with no mapping: %', (SELECT string_agg(DISTINCT s.sheet_port, ', ') FROM sheet_dates s WHERE s.sheet_port IS NOT NULL AND NOT EXISTS (SELECT 1 FROM port_map m WHERE m.sheet_port = s.sheet_port));
  END IF;
END
$chk$;

-- What each container may change: by the app's rules, or everything when include_locked is true
CREATE TEMP TABLE date_plan AS
SELECT DISTINCT ON (c.id) c.id, c."containerNumber" AS cn, c.status::text AS status, s.sheet_status,
       c.etd AS old_etd, c.eta AS old_eta, c."portOfArrival" AS old_port, c.destination::text AS old_dest,
       c."destinationCity" AS old_city,
       s.etd AS sheet_etd, s.eta AS sheet_eta,
       CASE WHEN c.status = 'BOOKED' OR o.include_locked THEN coalesce(s.etd, c.etd) ELSE c.etd END AS new_etd,
       CASE WHEN c.status IN ('BOOKED', 'IN_TRANSIT', 'ON_RAIL', 'ON_BOARD', 'ARRIVED_AT_PORT', 'CUSTOMS_CLEARED', 'OUT_FOR_DELIVERY') OR o.include_locked THEN coalesce(s.eta, c.eta) ELSE c.eta END AS new_eta,
       CASE WHEN c.status = 'BOOKED' OR o.include_locked THEN coalesce(m.app_port, c."portOfArrival") ELSE c."portOfArrival" END AS new_port,
       CASE WHEN c.status = 'BOOKED' OR o.include_locked THEN coalesce(s.sheet_dest, c.destination::text) ELSE c.destination::text END AS new_dest,
       CASE WHEN c.status = 'BOOKED' OR o.include_locked THEN coalesce(nullif(trim(s.sheet_city), ''), c."destinationCity") ELSE c."destinationCity" END AS new_city
FROM po_containers c
JOIN sheet_dates s ON s.cn = c."containerNumber"
CROSS JOIN date_opts o
LEFT JOIN port_map m ON m.sheet_port = s.sheet_port
ORDER BY c.id, s.cn;

UPDATE po_containers c
SET etd = p.new_etd, eta = p.new_eta, "portOfArrival" = p.new_port, destination = p.new_dest::"PoDestination",
    "destinationCity" = p.new_city
FROM date_plan p
WHERE c.id = p.id
  AND (c.etd IS DISTINCT FROM p.new_etd OR c.eta IS DISTINCT FROM p.new_eta
       OR c."portOfArrival" IS DISTINCT FROM p.new_port OR c.destination::text IS DISTINCT FROM p.new_dest
       OR c."destinationCity" IS DISTINCT FROM p.new_city);

-- Warehouse: the country's warehouse for every container (its destination is final by now)
CREATE TEMP TABLE wh_resolved (dest text, warehouse_id int);

DO $wh$
DECLARE
  r record;
  candidates int[];
BEGIN
  FOR r IN SELECT * FROM wh_pick ORDER BY dest LOOP
    CONTINUE WHEN NOT EXISTS (SELECT 1 FROM po_containers c WHERE c.destination::text = r.dest);

    SELECT array_agg(w.id ORDER BY w.id) INTO candidates
    FROM warehouses w
    WHERE w.country = r.dest AND (r.wh_name IS NULL OR lower(trim(w.name)) = lower(trim(r.wh_name)));

    IF candidates IS NULL OR cardinality(candidates) <> 1 THEN
      RAISE EXCEPTION 'Destination %: expected exactly one warehouse, found %. Warehouses in % : %. Set its exact name in wh_pick.',
        r.dest, coalesce(cardinality(candidates), 0), r.dest,
        coalesce((SELECT string_agg('#' || w.id || ' ' || w.name || ' (' || w.city || ')', '; ' ORDER BY w.id) FROM warehouses w WHERE w.country = r.dest), 'none, add one in Settings > Warehouses');
    END IF;

    INSERT INTO wh_resolved VALUES (r.dest, candidates[1]);
  END LOOP;
END
$wh$;

UPDATE po_containers c
SET "warehouseId" = x.warehouse_id
FROM wh_resolved x, date_opts o
WHERE c.destination::text = x.dest
  AND c."warehouseId" IS DISTINCT FROM x.warehouse_id
  AND (c."warehouseId" IS NULL OR o.replace_existing);

-- Review 1: every sheet container with its id, what changed and why
SELECT p.id, p.cn, p.status,
       p.old_etd, p.new_etd, p.old_eta, p.new_eta, p.old_port, p.new_port, p.old_dest, p.new_dest,
       p.old_city, p.new_city,
       CASE
         WHEN p.old_etd IS DISTINCT FROM p.new_etd OR p.old_eta IS DISTINCT FROM p.new_eta OR p.old_port IS DISTINCT FROM p.new_port
              OR p.old_dest IS DISTINCT FROM p.new_dest OR p.old_city IS DISTINCT FROM p.new_city THEN 'UPDATED'
         WHEN NOT (SELECT include_locked FROM date_opts) AND p.status NOT IN ('BOOKED', 'IN_TRANSIT', 'ON_RAIL', 'ON_BOARD', 'ARRIVED_AT_PORT', 'CUSTOMS_CLEARED', 'OUT_FOR_DELIVERY') THEN 'LOCKED (' || lower(p.status) || ')'
         ELSE 'already the same'
       END AS result
FROM date_plan p
ORDER BY p.cn;

-- Review 2: sheet containers that are not in the app (information: old containers that were never entered)
SELECT s.cn FROM sheet_dates s WHERE NOT EXISTS (SELECT 1 FROM po_containers c WHERE c."containerNumber" = s.cn);

-- Review 3: must return 0 rows, an ETA before the ETD
SELECT p.id, p.cn, p.new_etd, p.new_eta FROM date_plan p WHERE p.new_eta < p.new_etd;

-- Review 4: must return 0 rows, a port from the other country than the container's destination
SELECT p.id, p.cn, p.new_dest, p.new_port FROM date_plan p
WHERE p.new_port IS NOT NULL AND ((p.new_dest = 'CA' AND p.new_port NOT IN ('Vancouver, BC', 'Prince Rupert, BC', 'Montreal, QC', 'Halifax, NS', 'Saint John, NB'))
   OR (p.new_dest = 'US' AND p.new_port IN ('Vancouver, BC', 'Prince Rupert, BC', 'Montreal, QC', 'Halifax, NS', 'Saint John, NB')));

-- Review 5: every container's warehouse (the country must match the container's destination)
SELECT c.id, c."containerNumber", c.status, c.destination, w.name AS warehouse, w.country AS warehouse_country,
       CASE WHEN c."warehouseId" IS NULL THEN 'NO WAREHOUSE' WHEN w.country::text <> c.destination::text THEN 'COUNTRY MISMATCH' ELSE 'ok' END AS check
FROM po_containers c LEFT JOIN warehouses w ON w.id = c."warehouseId"
ORDER BY (CASE WHEN c."warehouseId" IS NULL THEN 0 WHEN w.country::text <> c.destination::text THEN 0 ELSE 1 END), c.id;

-- The transaction is still open. If the review looks right run:  COMMIT;   otherwise run:  ROLLBACK;
