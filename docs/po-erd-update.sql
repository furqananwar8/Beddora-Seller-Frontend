-- ERD = production date + 60 days, for the 77 imported POs whose sheet row has no ETD (col AL).
-- POs that have an ETD in the sheet were already set to it by po-dates-update.sql and are not touched here.
-- To make it 60 days BEFORE the production date instead, change "+ 60" to "- 60".
BEGIN;

CREATE TEMP TABLE erd_keys(po_key text);
INSERT INTO erd_keys VALUES
  ('SP-00047-070426-CAN'),
  ('SP-00022-270426-USA'),
  ('SP-00057-120526-CAN'),
  ('SP-0001-120526-CAN'),
  ('SP-0002-140526-CAN'),
  ('SP-00040-150526-USA'),
  ('SP-00039-150526-USA'),
  ('SP-0006-150526-USA'),
  ('SP-00026-200526-USA'),
  ('SP-00022-250526-CAN'),
  ('SP-0006-260526-CAN'),
  ('SP-0006-030626-CAN'),
  ('SP-00022-030626-CAN'),
  ('SP-00016-050626-CAN'),
  ('SP-00026-050626-CAN'),
  ('SP-00022-050626-USA'),
  ('SP-00053-050626-CAN'),
  ('SP-0005-080626-CAN'),
  ('SP-0005-080626-USA'),
  ('SP-0005-090626-CAN'),
  ('SP-0005-090626-USA'),
  ('SP-0006-090626-CAN'),
  ('SP-00058-090626-CAN'),
  ('SP-00022-100626-USA'),
  ('SP-00039-120626-CAN'),
  ('SP-00040-120626-CAN'),
  ('SP-00066-150626-CAN'),
  ('SP-00039-300626-CAN'),
  ('SP-00016-070726-USA'),
  ('SP-00081-100726-CAN'),
  ('SP-00040-100726-USA'),
  ('SP-0002-220726-CAN'),
  ('SP-0002-220726-USA'),
  ('SP-0002-280726-CAN'),
  ('SP-00055-290726-CAN'),
  ('SP-00022-300726-CAN'),
  ('SP-0002-030826-USA'),
  ('SP-0002-030826-CAN153301'),
  ('SP-00057-040826-CAN114640'),
  ('SP-0006-040826-CAN161625'),
  ('SP-0006-040826-USA164556'),
  ('SP-00033-110826-CAN170354'),
  ('SP-00022-120826-USA151459'),
  ('SP-00022-120826-USA151921'),
  ('SP-00022-120826-USA152502'),
  ('SP-00022-120826-USA154722'),
  ('SP-00022-130826-USA145645'),
  ('SP-00022-170826-CAN172837'),
  ('SP-00022-180826-CAN115843'),
  ('SP-00022-180826-CAN122508'),
  ('SP-00022-180826-CAN124207'),
  ('SP-00016-180826-CAN154708'),
  ('SP-00058-180826-CAN172927'),
  ('SP-00040-190826-CAN120820'),
  ('SP-00039-190826-CAN122855'),
  ('SP-00091-240826-CAN163954'),
  ('SP-00039-280826-USA125903'),
  ('SP-00094-010926-USA114620'),
  ('SP-0002-080926-USA160223'),
  ('SP-00090-080926-CAN174652'),
  ('SP-00033-150926-CAN134619'),
  ('SP-00022-280926-CAN143914'),
  ('SP-00022-280926-CAN174638'),
  ('SP-00092-300926-CAN133617'),
  ('SP-00092-061026-USA133324'),
  ('SP-0002-131126-CAN172016'),
  ('SP-0002-131126-CAN173347'),
  ('SP-0002-131126-USA173854'),
  ('SP-00026-110526-CAN'),
  ('SP-00026-120526-CAN'),
  ('SP-00026-130526-CAN'),
  ('SP-00065-110626-CAN'),
  ('SP-00058-120626-CAN'),
  ('SP-00071-100726-CAN'),
  ('SP-00080-230726-CAN'),
  ('SP-00026-161026-CAN'),
  ('SP-00026-221026-CAN');

-- Preview
SELECT k.po_key, o."productionDate", o.etd AS erd_now, o."productionDate" + 60 AS erd_new
FROM erd_keys k
JOIN po_order_events e ON e.type = 'CREATED' AND e.payload ->> 'poKey' = k.po_key
JOIN po_orders o ON o.id = e."purchaseOrderId"
ORDER BY k.po_key;

UPDATE po_orders o
SET etd = o."productionDate" + 60,
    "updatedAt" = now()
FROM erd_keys k
JOIN po_order_events e ON e.type = 'CREATED' AND e.payload ->> 'poKey' = k.po_key
WHERE o.id = e."purchaseOrderId" AND o."productionDate" IS NOT NULL;

-- Check: expect 77 rows updated
SELECT count(*) AS erd_after_production
FROM po_orders o
JOIN po_order_events e ON e.type = 'CREATED' AND e."purchaseOrderId" = o.id
WHERE e.payload ->> 'poKey' IN (SELECT po_key FROM erd_keys) AND o.etd = o."productionDate" + 60;

-- COMMIT;  or  ROLLBACK;
