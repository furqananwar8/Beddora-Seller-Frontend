-- Sets production date (sheet col X), ERD (col AL "ETD") and PO issuance date (col AO) on the POs imported earlier.
-- Matched by PO number (sheet col AN) = the poKey on each PO's CREATED event.
BEGIN;

ALTER TABLE po_orders ADD COLUMN IF NOT EXISTS "issuanceDate" date;

CREATE TEMP TABLE po_dates (po_key text, production date, erd date, issued date);
INSERT INTO po_dates VALUES
  ('SP-00033-070426-CAN', '2026-03-13'::date, '2026-05-12'::date, '2026-04-07'::date),
  ('SP-00022-070426-CAN', '2026-03-18'::date, '2026-04-25'::date, '2026-04-07'::date),
  ('SP-0006-070426-CAN', '2026-03-10'::date, '2026-05-20'::date, '2026-04-07'::date),
  ('SP-00047-070426-CAN', '2026-11-13'::date, NULL::date, '2026-04-07'::date),
  ('SP-00022-080426-CAN', '2026-04-08'::date, '2026-05-07'::date, '2026-04-08'::date),
  ('SP-00022-080426-USA', '2026-04-08'::date, '2026-05-07'::date, '2026-04-08'::date),
  ('SP-00022-100426-CAN', '2026-04-10'::date, '2026-05-07'::date, '2026-04-10'::date),
  ('SP-0002-100426-USA', '2025-12-02'::date, '2026-05-20'::date, '2026-04-10'::date),
  ('SP-0002-100426-CAN', '2025-12-02'::date, '2026-05-07'::date, '2026-04-10'::date),
  ('SP-00016-160426-USA', '2025-12-14'::date, '2026-05-25'::date, '2026-04-16'::date),
  ('SP-00055-230426-CAN', '2026-04-21'::date, '2026-05-30'::date, '2026-04-23'::date),
  ('SP-0001-230426-USA', '2026-01-04'::date, '2026-05-30'::date, '2026-04-23'::date),
  ('SP-00053-230426-CAN', '2026-03-19'::date, '2026-06-10'::date, '2026-04-23'::date),
  ('SP-00056-240426-CAN', '2026-04-07'::date, '2026-06-10'::date, '2026-04-24'::date),
  ('SP-00022-270426-USA', '2026-05-01'::date, NULL::date, '2026-04-27'::date),
  ('SP-00057-120526-CAN', '2026-04-09'::date, NULL::date, '2026-05-12'::date),
  ('SP-0001-120526-CAN', '2026-04-21'::date, NULL::date, '2026-05-12'::date),
  ('SP-0002-140526-CAN', '2026-04-30'::date, NULL::date, '2026-05-14'::date),
  ('SP-00040-150526-USA', '2025-09-05'::date, NULL::date, '2026-05-15'::date),
  ('SP-00039-150526-USA', '2025-12-15'::date, NULL::date, '2026-05-15'::date),
  ('SP-0006-150526-USA', '2025-12-15'::date, NULL::date, '2026-05-15'::date),
  ('SP-00026-200526-USA', '2026-05-15'::date, NULL::date, '2026-05-20'::date),
  ('SP-00022-250526-CAN', '2026-05-26'::date, NULL::date, '2026-05-25'::date),
  ('SP-0006-260526-CAN', '2026-05-27'::date, NULL::date, '2026-05-26'::date),
  ('SP-0006-030626-CAN', '2026-06-02'::date, NULL::date, '2026-06-03'::date),
  ('SP-00022-030626-CAN', '2026-06-02'::date, NULL::date, '2026-06-03'::date),
  ('SP-00016-050626-CAN', '2026-06-05'::date, NULL::date, '2026-06-05'::date),
  ('SP-00026-050626-CAN', '2026-06-05'::date, NULL::date, '2026-06-05'::date),
  ('SP-00022-050626-USA', '2026-06-05'::date, NULL::date, '2026-06-05'::date),
  ('SP-00053-050626-CAN', '2026-06-05'::date, NULL::date, '2026-06-05'::date),
  ('SP-0005-080626-CAN', '2026-06-05'::date, NULL::date, '2026-06-08'::date),
  ('SP-0005-080626-USA', '2026-06-05'::date, NULL::date, '2026-06-08'::date),
  ('SP-0005-090626-CAN', '2026-06-05'::date, NULL::date, '2026-06-09'::date),
  ('SP-0005-090626-USA', '2026-06-08'::date, NULL::date, '2026-06-09'::date),
  ('SP-0006-090626-CAN', '2026-06-08'::date, NULL::date, '2026-06-09'::date),
  ('SP-00058-090626-CAN', '2026-06-09'::date, NULL::date, '2026-06-09'::date),
  ('SP-00022-100626-USA', '2026-06-08'::date, NULL::date, '2026-06-10'::date),
  ('SP-00039-120626-CAN', '2026-06-10'::date, NULL::date, '2026-06-12'::date),
  ('SP-00040-120626-CAN', '2026-06-12'::date, NULL::date, '2026-06-12'::date),
  ('SP-00066-150626-CAN', '2026-06-10'::date, NULL::date, '2026-06-15'::date),
  ('SP-00039-300626-CAN', '2026-07-01'::date, NULL::date, '2026-06-30'::date),
  ('SP-00016-070726-USA', '2026-07-07'::date, NULL::date, '2026-07-07'::date),
  ('SP-00081-100726-CAN', '2026-06-28'::date, NULL::date, '2026-07-10'::date),
  ('SP-00040-100726-USA', '2026-07-14'::date, NULL::date, '2026-07-10'::date),
  ('SP-0002-220726-CAN', '2026-07-23'::date, NULL::date, '2026-07-22'::date),
  ('SP-0002-220726-USA', '2026-07-23'::date, NULL::date, '2026-07-22'::date),
  ('SP-0002-280726-CAN', '2026-07-30'::date, NULL::date, '2026-07-28'::date),
  ('SP-00055-290726-CAN', '2026-07-31'::date, NULL::date, '2026-07-29'::date),
  ('SP-00022-300726-CAN', '2026-07-31'::date, NULL::date, '2026-07-30'::date),
  ('SP-0002-030826-USA', '2026-08-05'::date, NULL::date, '2026-08-03'::date),
  ('SP-0002-030826-CAN153301', '2026-08-05'::date, NULL::date, '2026-08-03'::date),
  ('SP-00057-040826-CAN114640', '2026-08-05'::date, NULL::date, '2026-08-04'::date),
  ('SP-0006-040826-CAN161625', '2026-08-05'::date, NULL::date, '2026-08-04'::date),
  ('SP-0006-040826-USA164556', '2026-08-05'::date, NULL::date, '2026-08-04'::date),
  ('SP-00033-110826-CAN170354', '2026-08-15'::date, NULL::date, '2026-08-11'::date),
  ('SP-00022-120826-USA151459', '2026-08-15'::date, NULL::date, '2026-08-12'::date),
  ('SP-00022-120826-USA151921', '2026-08-15'::date, NULL::date, '2026-08-12'::date),
  ('SP-00022-120826-USA152502', '2026-08-15'::date, NULL::date, '2026-08-12'::date),
  ('SP-00022-120826-USA154722', '2026-08-15'::date, NULL::date, '2026-08-12'::date),
  ('SP-00022-130826-USA145645', '2026-08-15'::date, NULL::date, '2026-08-13'::date),
  ('SP-00022-170826-CAN172837', '2026-08-20'::date, NULL::date, '2026-08-17'::date),
  ('SP-00022-180826-CAN115843', '2026-08-20'::date, NULL::date, '2026-08-18'::date),
  ('SP-00022-180826-CAN122508', '2026-08-20'::date, NULL::date, '2026-08-18'::date),
  ('SP-00022-180826-CAN124207', '2026-08-20'::date, NULL::date, '2026-08-18'::date),
  ('SP-00016-180826-CAN154708', '2026-08-20'::date, NULL::date, '2026-08-18'::date),
  ('SP-00058-180826-CAN172927', '2026-08-20'::date, NULL::date, '2026-08-18'::date),
  ('SP-00040-190826-CAN120820', '2026-08-20'::date, NULL::date, '2026-08-19'::date),
  ('SP-00039-190826-CAN122855', '2026-08-20'::date, NULL::date, '2026-08-19'::date),
  ('SP-00091-240826-CAN163954', '2026-08-27'::date, NULL::date, '2026-08-24'::date),
  ('SP-00039-280826-USA125903', '2026-08-30'::date, NULL::date, '2026-08-28'::date),
  ('SP-00094-010926-USA114620', '2026-09-05'::date, NULL::date, '2026-09-01'::date),
  ('SP-0002-080926-USA160223', '2026-09-15'::date, NULL::date, '2026-09-08'::date),
  ('SP-00090-080926-CAN174652', '2026-09-12'::date, NULL::date, '2026-09-08'::date),
  ('SP-00033-150926-CAN134619', '2026-09-20'::date, NULL::date, '2026-09-15'::date),
  ('SP-00022-280926-CAN143914', '2026-10-07'::date, NULL::date, '2026-09-28'::date),
  ('SP-00022-280926-CAN174638', '2026-10-07'::date, NULL::date, '2026-09-28'::date),
  ('SP-00092-300926-CAN133617', '2026-10-08'::date, NULL::date, '2026-09-30'::date),
  ('SP-00092-061026-USA133324', '2026-10-12'::date, NULL::date, '2026-10-06'::date),
  ('SP-0002-131126-CAN172016', '2026-11-20'::date, NULL::date, '2026-11-13'::date),
  ('SP-0002-131126-CAN173347', '2026-11-20'::date, NULL::date, '2026-11-13'::date),
  ('SP-0002-131126-USA173854', '2026-11-20'::date, NULL::date, '2026-11-13'::date),
  ('SP-00026-110526-CAN', '2026-04-24'::date, NULL::date, '2026-05-11'::date),
  ('SP-00026-120526-CAN', '2026-04-24'::date, NULL::date, '2026-05-12'::date),
  ('SP-00026-130526-CAN', '2026-04-24'::date, NULL::date, '2026-05-13'::date),
  ('SP-00065-110626-CAN', '2026-06-05'::date, NULL::date, '2026-06-11'::date),
  ('SP-00058-120626-CAN', '2026-06-10'::date, NULL::date, '2026-06-12'::date),
  ('SP-00071-100726-CAN', '2026-07-01'::date, NULL::date, '2026-07-10'::date),
  ('SP-00080-230726-CAN', '2026-07-21'::date, NULL::date, '2026-07-23'::date),
  ('SP-00026-161026-CAN', '2026-10-24'::date, NULL::date, '2026-10-16'::date),
  ('SP-00026-221026-CAN', '2026-10-27'::date, NULL::date, '2026-10-22'::date);

-- Every key must match a PO (expect 0 rows)
SELECT d.po_key FROM po_dates d
WHERE NOT EXISTS (SELECT 1 FROM po_order_events e WHERE e.type='CREATED' AND e.payload->>'poKey' = d.po_key);

-- etd (ERD) is NOT NULL: where the sheet has no ETD the current ERD is kept
UPDATE po_orders o
SET "productionDate" = d.production,
    etd = COALESCE(d.erd, o.etd),
    "issuanceDate" = d.issued,
    "updatedAt" = now()
FROM po_dates d
JOIN po_order_events e ON e.type='CREATED' AND e.payload->>'poKey' = d.po_key
WHERE o.id = e."purchaseOrderId";

SELECT count(*) AS updated, count("issuanceDate") AS with_issuance, count("productionDate") AS with_production
FROM po_orders WHERE id IN (SELECT "purchaseOrderId" FROM po_order_events WHERE type='CREATED' AND payload->>'poKey' IN (SELECT po_key FROM po_dates));

-- COMMIT;  or  ROLLBACK;
