-- Records the receipt (Inbound Receiving) for the imported containers that are already at the warehouse, so the
-- Containers screen shows their cartons as received instead of "— / —".
--
-- What the Cartons (Received / Short) column reads: a container's receipt lines. Imported containers have none,
-- because a receipt is only created when Inbound Receiving is confirmed. This script does what confirming does for a
-- container that arrived complete: for every packaging-list line, good = everything expected, damaged = 0, short = 0.
-- The cartons are the ones already on the packaging-list lines (the same numbers the Containers screen totals), so
-- nothing is typed here. Each container then moves to GOODS_RECEIVED, as confirming does (it leaves the "waiting to
-- be received" queue).
--
-- Only containers that carry an imported PO (a CREATED event with a `poKey`) and are DELIVERED_AT_WAREHOUSE are touched.
-- Containers still booked or on board have not arrived: nothing is received there. A container that already has a
-- receipt is skipped, so it is safe to re-run.
--
-- BEFORE RUNNING: set the actor id (the users.id shown as "received by"). Run it in ONE transaction, check, then COMMIT.

BEGIN;
DROP TABLE IF EXISTS rcv_actor;
CREATE TEMP TABLE rcv_actor AS SELECT 6::int AS id;   -- <<< users.id of the receiver

DO $rcv$
DECLARE
  actor_id int := (SELECT id FROM rcv_actor);
  c record;
  v_receipt int;
  n_containers int := 0;
  n_lines int := 0;
  n_added int;
  -- there is no drawn signature for an imported receipt: a 1x1 transparent PNG stands in for it
  blank_signature text := 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = actor_id) THEN RAISE EXCEPTION 'actor id % is not a user', actor_id; END IF;

  FOR c IN
    SELECT DISTINCT ct.id, ct."containerNumber"
    FROM po_containers ct
    JOIN po_packaging_lists pl ON pl."containerId" = ct.id
    JOIN po_packaging_list_lines x ON x."packagingListId" = pl.id
    WHERE ct.status = 'DELIVERED_AT_WAREHOUSE'
      AND NOT EXISTS (SELECT 1 FROM po_container_receipts r WHERE r."containerId" = ct.id)
      AND EXISTS (SELECT 1 FROM po_order_events e WHERE e."purchaseOrderId" = x."purchaseOrderId" AND e.type = 'CREATED' AND e.payload ->> 'poKey' IS NOT NULL)
    ORDER BY ct.id
  LOOP
    INSERT INTO po_container_receipts ("containerId", "receivedById", signature, "receivedAt")
    VALUES (c.id, actor_id, blank_signature, coalesce((SELECT "deliveredAt" FROM po_containers WHERE id = c.id), now()))
    RETURNING id INTO v_receipt;

    INSERT INTO po_container_receipt_lines
      ("receiptId", "lineId", "productId", "expectedUnits", "goodUnits", "damagedUnits", "shortageUnits",
       "expectedCartons", "unitsPerCarton", "goodCartons", "damagedCartons", "shortageCartons")
    SELECT v_receipt, x.id, x."productId", x.units, x.units, 0, 0,
           x.cartons, CASE WHEN x.cartons > 0 THEN round(x.units::numeric / x.cartons)::int ELSE 0 END, x.cartons, 0, 0
    FROM po_packaging_list_lines x
    JOIN po_packaging_lists pl ON pl.id = x."packagingListId"
    WHERE pl."containerId" = c.id;
    GET DIAGNOSTICS n_added = ROW_COUNT;

    UPDATE po_containers SET status = 'GOODS_RECEIVED', "updatedAt" = now() WHERE id = c.id;
    n_containers := n_containers + 1;
    n_lines := n_lines + n_added;
  END LOOP;

  RAISE NOTICE 'Received % containers (% packaging-list lines).', n_containers, n_lines;
END
$rcv$;

-- Review before committing: cartons received per container (should equal the packed cartons, short = 0)
SELECT ct."containerNumber", ct.status,
       sum(rl."expectedCartons") AS packed_cartons,
       sum(rl."goodCartons")     AS received_cartons,
       sum(rl."shortageCartons") AS short_cartons,
       count(*)                  AS lines
FROM po_container_receipts r
JOIN po_containers ct ON ct.id = r."containerId"
JOIN po_container_receipt_lines rl ON rl."receiptId" = r.id
WHERE r."receivedById" = (SELECT id FROM rcv_actor) AND r."receivedAt" >= now() - interval '1 hour'
GROUP BY ct.id, ct."containerNumber", ct.status
ORDER BY ct."containerNumber";

-- Must return 0 rows: an imported container at the warehouse that still has no receipt
SELECT DISTINCT ct."containerNumber", ct.status
FROM po_containers ct
JOIN po_packaging_lists pl ON pl."containerId" = ct.id
JOIN po_packaging_list_lines x ON x."packagingListId" = pl.id
WHERE ct.status = 'DELIVERED_AT_WAREHOUSE'
  AND EXISTS (SELECT 1 FROM po_order_events e WHERE e."purchaseOrderId" = x."purchaseOrderId" AND e.type = 'CREATED' AND e.payload ->> 'poKey' IS NOT NULL);

-- The transaction is still open. If the cartons look right run:  COMMIT;   otherwise run:  ROLLBACK;
