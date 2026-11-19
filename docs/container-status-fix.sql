-- Corrects two containers the import marked as delivered at the warehouse, but that "Logistics Team _ Canada Shipping
-- Track.xlsx" (tab LogisticsTrack) says are still on their way:
--
--   TGBU6599144  sheet: "Onboard Vessel"   ->  ON_BOARD          (ETD 2026-10-04, ETA 2026-11-23)
--   TXGU8197888  sheet: "Arrival at port"  ->  ARRIVED_AT_PORT   (ETD 2026-09-14, ETA 2026-10-28)
--
-- What it does for each of them (only when it is still DELIVERED_AT_WAREHOUSE / GOODS_RECEIVED, so it is safe to re-run):
--   1. Deletes nothing. If container-cartons-received.sql already gave them a receipt, it is left alone and shown in review 1
--      (has_receipt) so you can decide what to do with it.
--   2. Sets the status above, clears the delivery date, and sets the ETD and ETA from the sheet (AH, AR). The ETD is set
--      here because once a container has shipped the app locks it, so container-eta-etd-update.sql could not.
--   3. Puts back the status of the POs on them. A PO is RECEIVED only when every container it is in has reached the
--      warehouse, so a RECEIVED PO that is now short of one goes back to FULLY_SHIPPED (everything is in a container).
--
-- Run it in ONE transaction, check the review output, then COMMIT (or ROLLBACK).

BEGIN;
DROP TABLE IF EXISTS fix_actor, fix_containers, fix_pos;

CREATE TEMP TABLE fix_actor AS SELECT 6::int AS id;   -- <<< users.id recorded on the PO status events

CREATE TEMP TABLE fix_containers (cn text, new_status text, etd date, eta date);
INSERT INTO fix_containers VALUES
  ('TGBU6599144', 'ON_BOARD',        '2026-10-04', '2026-11-23'),
  ('TXGU8197888', 'ARRIVED_AT_PORT', '2026-09-14', '2026-10-28');

-- POs that have goods in these containers (found before anything changes)
CREATE TEMP TABLE fix_pos AS
SELECT DISTINCT x."purchaseOrderId" AS id
FROM po_containers c
JOIN fix_containers f ON f.cn = c."containerNumber"
JOIN po_packaging_lists pl ON pl."containerId" = c.id
JOIN po_packaging_list_lines x ON x."packagingListId" = pl.id
WHERE c.status IN ('DELIVERED_AT_WAREHOUSE', 'GOODS_RECEIVED');

DO $fix$
DECLARE
  actor_id int := (SELECT id FROM fix_actor);
  n_containers int; n_pos int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = actor_id) THEN RAISE EXCEPTION 'actor id % is not a user', actor_id; END IF;

  -- 2. status, delivery date, dates from the sheet
  UPDATE po_containers c
  SET status = f.new_status::"PoContainerStatus", "deliveredAt" = NULL, etd = f.etd, eta = f.eta, "updatedAt" = now()
  FROM fix_containers f
  WHERE f.cn = c."containerNumber" AND c.status IN ('DELIVERED_AT_WAREHOUSE', 'GOODS_RECEIVED');
  GET DIAGNOSTICS n_containers = ROW_COUNT;

  -- 3. POs marked RECEIVED that still have a packaging list not yet at the warehouse
  WITH wrong AS (
    SELECT o.id FROM po_orders o
    WHERE o.id IN (SELECT id FROM fix_pos) AND o.status = 'RECEIVED'
      AND EXISTS (
        SELECT 1 FROM po_packaging_lists pl JOIN po_packaging_list_lines x ON x."packagingListId" = pl.id
        LEFT JOIN po_containers c ON c.id = pl."containerId"
        WHERE x."purchaseOrderId" = o.id AND (pl."containerId" IS NULL OR c.status NOT IN ('DELIVERED_AT_WAREHOUSE', 'GOODS_RECEIVED'))
      )
  ), upd AS (
    UPDATE po_orders o SET status = 'FULLY_SHIPPED', "updatedAt" = now() FROM wrong w WHERE o.id = w.id RETURNING o.id
  )
  INSERT INTO po_order_events ("purchaseOrderId", type, "actorId") SELECT id, 'FULLY_SHIPPED', actor_id FROM upd;
  GET DIAGNOSTICS n_pos = ROW_COUNT;

  RAISE NOTICE 'Fixed % containers, moved % POs back to FULLY_SHIPPED.', n_containers, n_pos;
END
$fix$;

-- Review 1: the two containers (expected: ON_BOARD and ARRIVED_AT_PORT, no delivery date, no receipt)
SELECT c.id, c."containerNumber", c.status, c."deliveredAt", c.etd, c.eta,
       EXISTS (SELECT 1 FROM po_container_receipts r WHERE r."containerId" = c.id) AS has_receipt
FROM po_containers c WHERE c."containerNumber" IN (SELECT cn FROM fix_containers) ORDER BY c."containerNumber";

-- Review 2: the POs that have goods in them and their status now
SELECT o.id, o.status, (SELECT string_agg(DISTINCT e.payload ->> 'poKey', ',') FROM po_order_events e WHERE e."purchaseOrderId" = o.id AND e.type = 'CREATED') AS po_key
FROM po_orders o WHERE o.id IN (SELECT id FROM fix_pos) ORDER BY o.id;

-- Must return 0 rows: a RECEIVED PO that still has a list outside the warehouse
SELECT o.id FROM po_orders o
WHERE o.status = 'RECEIVED' AND EXISTS (
  SELECT 1 FROM po_packaging_lists pl JOIN po_packaging_list_lines x ON x."packagingListId" = pl.id
  LEFT JOIN po_containers c ON c.id = pl."containerId"
  WHERE x."purchaseOrderId" = o.id AND (pl."containerId" IS NULL OR c.status NOT IN ('DELIVERED_AT_WAREHOUSE', 'GOODS_RECEIVED')));

-- The transaction is still open. If the review looks right run:  COMMIT;   otherwise run:  ROLLBACK;
