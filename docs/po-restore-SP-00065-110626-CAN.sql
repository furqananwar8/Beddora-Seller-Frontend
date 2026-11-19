-- Puts PO SP-00065-110626-CAN back, with its packaging list on container MSMU8770262.
--
-- Why it is missing: po-delete-cancelled.sql deleted it as a "cancelled" PO, but in PO_Logistic_Combined_with_Payments_v2.xlsx
-- only 2 of its 18 lines are cancelled (CTT600PCGRQ and CTT600PCGRK); the other 16 are "Ready to Ship" and are on
-- MSMU8770262 (936 cartons, 26.84 CBM). Deleting the PO took those lines off the container.
--
-- What it restores, the way the first import and the later date scripts left it:
--   * the PO for Loyal Textile (Canada, USD) with the 16 live lines and their sheet prices; the 2 cancelled lines are NOT restored
--   * production date 2026-06-05, issuance date 2026-06-11 (when that column exists), ERD 2026-08-04 (production date + 60 days,
--     the rule po-erd-update.sql used for POs with no sheet ETD)
--   * created and approved events with poKey = SP-00065-110626-CAN (so every script that finds imported POs finds it again)
--   * one packaging list with the 16 lines on MSMU8770262, with the carton sizes, CBM and weights from the first import
--   * the PO status derived from that: FULLY_SHIPPED (every restored line is in a container that has not reached the warehouse)
-- It is a NEW purchase order: it gets a new id, so its PO number is not the old one.
-- NOT restored here: warehouse (run po-set-warehouse.sql afterwards: it picks up imported POs that have none) and any payment
-- request that was linked to the old PO (link it again from the payment screen).
--
-- Safe to re-run: if a PO with this poKey already exists it does nothing. Stops with a clear message if the supplier, the
-- container or a SKU is not found. Run it in ONE transaction, check the review output, then COMMIT; (with the semicolon).

BEGIN;
DROP TABLE IF EXISTS rst_actor, rst_line, rst_pl;
CREATE TEMP TABLE rst_actor AS SELECT 6::int AS id;   -- <<< users.id of the creator

-- the PO's lines as ordered (the 2 cancelled ones left out)
CREATE TEMP TABLE rst_line (sku text, units int, unit_price numeric);
INSERT INTO rst_line VALUES
  ('CTT600FSWHQ', 160, 8.41),
  ('CTT600FSWHK', 160, 11.02),
  ('CTT600PCWHQ', 264, 2.83),
  ('CTT600PCWHK', 156, 3.47),
  ('CTT600FSGRQ', 150, 8.41),
  ('CTT600FSGRK', 150, 11.02),
  ('CTT600SSWHT', 252, 14.17),
  ('CTT600SSWHF', 244, 17.87),
  ('CTT600SSWHQ', 1536, 19.11),
  ('CTT600SSWHK', 380, 22.76),
  ('CTT600DCSWHQ', 100, 16.63),
  ('CTT600DCSWHK', 52, 18.22),
  ('CTT600SSGRQ', 300, 19.11),
  ('CTT600SSGRK', 200, 22.76),
  ('CTT600DCSGRQ', 100, 16.63),
  ('CTT600DCSGRK', 50, 18.22);

-- what is packed in MSMU8770262 for this PO
CREATE TEMP TABLE rst_pl (sku text, units int, cartons int, l numeric, w numeric, h numeric, cbm numeric, net numeric, gross numeric);
INSERT INTO rst_pl VALUES
  ('CTT600FSWHQ', 160, 20, 38.1, 30.48, 25.4, 0.58, 150.0, 170.0),
  ('CTT600FSWHK', 160, 20, 38.1, 30.48, 30.48, 0.7, 180.0, 206.0),
  ('CTT600PCWHQ', 264, 22, 38.1, 27.43, 19.05, 0.37, 94.6, 103.4),
  ('CTT600PCWHK', 156, 13, 38.1, 27.43, 19.05, 0.25, 97.5, 106.6),
  ('CTT600FSGRQ', 150, 20, 38.1, 30.48, 25.4, 0.58, 150.0, 170.0),
  ('CTT600FSGRK', 150, 20, 38.1, 30.48, 30.48, 0.7, 180.0, 206.0),
  ('CTT600SSWHT', 252, 63, 30.48, 35.56, 22.86, 1.56, 315.0, 378.0),
  ('CTT600SSWHF', 244, 61, 30.48, 35.56, 25.4, 1.67, 488.0, 512.4),
  ('CTT600SSWHQ', 1536, 384, 30.48, 35.56, 27.31, 11.36, 3417.6, 3571.2),
  ('CTT600SSWHK', 380, 120, 30.48, 35.56, 31.12, 3.03, 1140.0, 1200.0),
  ('CTT600DCSWHQ', 100, 25, 30.48, 40.64, 24.77, 0.76, 187.5, 215.0),
  ('CTT600DCSWHK', 52, 13, 30.48, 40.64, 24.77, 0.43, 127.4, 163.8),
  ('CTT600SSGRQ', 300, 68, 30.48, 35.56, 27.31, 2.01, 557.6, 612.0),
  ('CTT600SSGRK', 200, 51, 30.48, 35.56, 31.12, 1.7, 484.5, 515.1),
  ('CTT600DCSGRQ', 100, 24, 30.48, 40.64, 24.77, 0.73, 156.0, 187.2),
  ('CTT600DCSGRK', 50, 12, 30.48, 40.64, 24.77, 0.41, 134.4, 151.2);

DO $rst$
DECLARE
  actor_id int := (SELECT id FROM rst_actor);
  v_key constant text := 'SP-00065-110626-CAN';
  v_po int; v_list int; v_cont int; v_cont_status text; v_supplier int; v_status text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = actor_id) THEN RAISE EXCEPTION 'actor id % is not a user', actor_id; END IF;

  IF EXISTS (SELECT 1 FROM po_order_events e WHERE e.type = 'CREATED' AND e.payload ->> 'poKey' = v_key) THEN
    RAISE NOTICE '% already exists: nothing to restore.', v_key;
    RETURN;
  END IF;

  SELECT id, status::text INTO v_cont, v_cont_status FROM po_containers WHERE "containerNumber" = 'MSMU8770262';
  IF v_cont IS NULL THEN RAISE EXCEPTION 'Container MSMU8770262 not found'; END IF;

  IF (SELECT count(*) FROM partners p WHERE lower(regexp_replace(trim(p.name), '[[:space:]]+', ' ', 'g')) = 'loyal textile') <> 1 THEN
    RAISE EXCEPTION 'Supplier "Loyal Textile" is missing or ambiguous';
  END IF;
  SELECT p.id INTO v_supplier FROM partners p WHERE lower(regexp_replace(trim(p.name), '[[:space:]]+', ' ', 'g')) = 'loyal textile';

  IF EXISTS (SELECT 1 FROM rst_line l WHERE NOT EXISTS (SELECT 1 FROM po_products p WHERE upper(regexp_replace(trim(p.sku), '[[:space:]]+', '-', 'g')) = upper(regexp_replace(trim(l.sku), '[[:space:]]+', '-', 'g')))) THEN
    RAISE EXCEPTION 'SKUs not found in po_products: %', (SELECT string_agg(l.sku, ', ') FROM rst_line l WHERE NOT EXISTS (SELECT 1 FROM po_products p WHERE upper(regexp_replace(trim(p.sku), '[[:space:]]+', '-', 'g')) = upper(regexp_replace(trim(l.sku), '[[:space:]]+', '-', 'g'))));
  END IF;

  INSERT INTO po_orders ("supplierId", "contactName", destination, currency, etd, "productionDate", status, "isOpen", "approvedAt", "decidedById", "createdById", "updatedAt")
  SELECT v_supplier, p."contactName", 'CA'::"PoDestination", 'USD', DATE '2026-08-04', DATE '2026-06-05', 'APPROVED', true, now(), actor_id, actor_id, now()
  FROM partners p WHERE p.id = v_supplier
  RETURNING id INTO v_po;

  -- the issuance date column was added by po-dates-update.sql; it is not part of the app's schema, so only set it where it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'po_orders' AND column_name = 'issuanceDate') THEN
    EXECUTE format('UPDATE po_orders SET "issuanceDate" = %L WHERE id = %s', '2026-06-11', v_po);
  END IF;

  INSERT INTO po_order_lines ("purchaseOrderId", "productId", "unitsOrdered", "unitPrice")
  SELECT v_po, (SELECT p.id FROM po_products p WHERE upper(regexp_replace(trim(p.sku), '[[:space:]]+', '-', 'g')) = upper(regexp_replace(trim(l.sku), '[[:space:]]+', '-', 'g')) ORDER BY (p."parentId" IS NULL), (p.sku = l.sku) DESC, p."archivedAt" IS NOT NULL, p.id LIMIT 1), l.units, l.unit_price
  FROM rst_line l;

  INSERT INTO po_order_events ("purchaseOrderId", type, "actorId", payload) VALUES
    (v_po, 'CREATED', actor_id, jsonb_build_object('poKey', v_key, 'importedFrom', 'PO_Logistic_Combined_with_Payments_v2.xlsx', 'restoredAfterDelete', true)),
    (v_po, 'APPROVED', actor_id, NULL);

  INSERT INTO po_packaging_lists (destination, "createdById", "containerId", "updatedAt")
  VALUES ('CA'::"PoDestination", actor_id, v_cont, now()) RETURNING id INTO v_list;

  INSERT INTO po_packaging_list_lines ("packagingListId", "purchaseOrderId", "productId", units, cartons, "cartonLengthCm", "cartonWidthCm", "cartonHeightCm", cbm, "netWeightKg", "grossWeightKg")
  SELECT v_list, v_po, (SELECT p.id FROM po_products p WHERE upper(regexp_replace(trim(p.sku), '[[:space:]]+', '-', 'g')) = upper(regexp_replace(trim(x.sku), '[[:space:]]+', '-', 'g')) ORDER BY (p."parentId" IS NULL), (p.sku = x.sku) DESC, p."archivedAt" IS NOT NULL, p.id LIMIT 1),
         x.units, x.cartons, x.l, x.w, x.h, coalesce(x.cbm, 0), coalesce(x.net, 0), coalesce(x.gross, 0)
  FROM rst_pl x;

  -- every ordered unit is packed and the list is in a container: shipped, or received once that container is at the warehouse
  v_status := CASE WHEN v_cont_status IN ('DELIVERED_AT_WAREHOUSE', 'GOODS_RECEIVED') THEN 'RECEIVED' ELSE 'FULLY_SHIPPED' END;
  UPDATE po_orders SET status = v_status::"PoOrderStatus", "fullyShippedAt" = now(), "updatedAt" = now() WHERE id = v_po;
  INSERT INTO po_order_events ("purchaseOrderId", type, "actorId") VALUES (v_po, v_status, actor_id);

  RAISE NOTICE 'Restored % as PO id % (status %), packaging list % on container %.', v_key, v_po, v_status, v_list, v_cont;
END
$rst$;

-- Review 1: the restored PO (expected: 1 row, FULLY_SHIPPED, 16 lines, 4,254 units)
SELECT o.id, o.status, o.destination, o."productionDate", o.etd,
       (SELECT count(*) FROM po_order_lines l WHERE l."purchaseOrderId" = o.id) AS lines,
       (SELECT sum(l."unitsOrdered") FROM po_order_lines l WHERE l."purchaseOrderId" = o.id) AS units_ordered
FROM po_orders o JOIN po_order_events e ON e."purchaseOrderId" = o.id AND e.type = 'CREATED' AND e.payload ->> 'poKey' = 'SP-00065-110626-CAN';

-- Review 2: MSMU8770262 now (expected with SP-00058-120626-CAN: 22 SKUs, 6,318 units, 1,449 cartons, 56.19 CBM)
SELECT c."containerNumber", c.status,
       count(DISTINCT x."productId") AS skus, sum(x.units) AS units, sum(x.cartons) AS cartons, round(sum(x.cbm), 2) AS cbm,
       string_agg(DISTINCT e.payload ->> 'poKey', ', ') AS pos
FROM po_containers c
JOIN po_packaging_lists pl ON pl."containerId" = c.id
JOIN po_packaging_list_lines x ON x."packagingListId" = pl.id
LEFT JOIN po_order_events e ON e."purchaseOrderId" = x."purchaseOrderId" AND e.type = 'CREATED'
WHERE c."containerNumber" = 'MSMU8770262'
GROUP BY c.id, c."containerNumber", c.status;

-- The transaction is still open. If the review looks right run:  COMMIT;   otherwise run:  ROLLBACK;
