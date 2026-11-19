-- Sets the 21 POs whose sheet status (PO Master col AQ) is "In Production" to IN_PROGRESS (shown as IN PRODUCTION).
-- Only POs still at APPROVED are moved. A PO already further along (packed / shipped) keeps its status, so nothing goes backwards.
BEGIN;

CREATE TEMP TABLE prod_keys(po_key text);
INSERT INTO prod_keys VALUES
  ('SP-0002-220726-CAN'),
  ('SP-00055-220726-USA'),
  ('SP-00026-220726-CAN'),
  ('SP-00016-220726-USA'),
  ('SP-0002-280726-CAN'),
  ('SP-0006-040826-USA164556'),
  ('SP-00022-120826-USA151921'),
  ('SP-00022-120826-USA154722'),
  ('SP-00022-170826-CAN172837'),
  ('SP-00022-180826-CAN115843'),
  ('SP-00022-180826-CAN122508'),
  ('SP-00022-180826-CAN124207'),
  ('SP-00016-180826-CAN154708'),
  ('SP-00058-180826-CAN172927'),
  ('SP-00091-240826-CAN163954'),
  ('SP-00039-280826-USA125903'),
  ('SP-00094-010926-USA114620'),
  ('SP-0002-080926-USA160223'),
  ('SP-00090-080926-CAN174652'),
  ('SP-00033-150926-CAN134619'),
  ('SP-00033-150926-USA141124');

-- Preview: current status of each PO (expect APPROVED for the ones that will change)
SELECT k.po_key, o.id, o.status, o."productionDate", o."isOpen"
FROM prod_keys k
LEFT JOIN po_order_events e ON e.type = 'CREATED' AND e.payload ->> 'poKey' = k.po_key
LEFT JOIN po_orders o ON o.id = e."purchaseOrderId"
ORDER BY (o.id IS NULL) DESC, o.status, k.po_key;

WITH upd AS (
  UPDATE po_orders o
  SET status = 'IN_PROGRESS'::"PoOrderStatus", "updatedAt" = now()
  FROM prod_keys k
  JOIN po_order_events e ON e.type = 'CREATED' AND e.payload ->> 'poKey' = k.po_key
  WHERE o.id = e."purchaseOrderId" AND o.status = 'APPROVED' AND o."isOpen"
  RETURNING o.id, o."decidedById"
)
INSERT INTO po_order_events ("purchaseOrderId", type, "actorId")
SELECT id, 'IN_PROGRESS', "decidedById" FROM upd;

-- Check
SELECT status, count(*) FROM po_orders
WHERE id IN (SELECT e."purchaseOrderId" FROM po_order_events e JOIN prod_keys k ON k.po_key = e.payload ->> 'poKey' WHERE e.type = 'CREATED')
GROUP BY status ORDER BY 2 DESC;

-- COMMIT;  or  ROLLBACK;
