-- Deletes the 8 cancelled POs that came from the sheet import, with their lines, events, packaging lists and any container
-- that is left with no packaging list once they are gone. Matched by PO number (the poKey on the CREATED event / externalRef).
-- Run in one transaction: check the previews, then COMMIT or ROLLBACK.
-- Note: SP-00033-110826-USA172603 is in po-import-missing-10.sql; if that script has not been run yet this one finds nothing for it
-- (and you should remove that PO from the script instead).

BEGIN;
DROP TABLE IF EXISTS del_keys, del_po, del_pl, del_cont;

CREATE TEMP TABLE del_keys(po_key text);
INSERT INTO del_keys VALUES
  ('SP-00047-070426-CAN'), ('SP-00022-270426-USA'), ('SP-00022-250526-CAN'), ('SP-00033-110826-CAN170354'),
  ('SP-00033-110826-USA172603'), ('SP-0002-220726-USA'), ('SP-00026-110526-CAN'), ('SP-00065-110626-CAN');

-- Only POs created by the import
CREATE TEMP TABLE del_po AS
SELECT DISTINCT e."purchaseOrderId" AS id, k.po_key
FROM po_order_events e JOIN del_keys k ON k.po_key = e.payload ->> 'poKey'
WHERE e.type = 'CREATED' AND e.payload ->> 'importedFrom' = 'PO_Logistic_Combined_with_Payments_v2.xlsx';

CREATE TEMP TABLE del_pl AS
SELECT DISTINCT x."packagingListId" AS id FROM po_packaging_list_lines x WHERE x."purchaseOrderId" IN (SELECT id FROM del_po);

CREATE TEMP TABLE del_cont AS
SELECT DISTINCT pl."containerId" AS id FROM po_packaging_lists pl WHERE pl.id IN (SELECT id FROM del_pl) AND pl."containerId" IS NOT NULL;

-- Preview 1: the POs found (expect 8, or 7 if the missing-10 script has not run) and their status
SELECT d.po_key, o.id, o.status, o."isOpen",
       (SELECT count(*) FROM po_order_lines l WHERE l."purchaseOrderId" = o.id) AS lines
FROM del_po d JOIN po_orders o ON o.id = d.id ORDER BY d.po_key;

-- Preview 2: packaging lists shared with POs that are NOT being deleted (their other lines are kept)
SELECT x."packagingListId", x."purchaseOrderId" AS kept_po FROM po_packaging_list_lines x
WHERE x."packagingListId" IN (SELECT id FROM del_pl) AND x."purchaseOrderId" NOT IN (SELECT id FROM del_po);

-- Preview 3: containers that will be deleted (no packaging list left) vs kept (still used by other POs)
SELECT c.id, c."containerNumber", c.status,
       NOT EXISTS (SELECT 1 FROM po_packaging_lists pl JOIN po_packaging_list_lines x ON x."packagingListId" = pl.id
                   WHERE pl."containerId" = c.id AND x."purchaseOrderId" NOT IN (SELECT id FROM del_po)) AS will_delete
FROM po_containers c WHERE c.id IN (SELECT id FROM del_cont) ORDER BY 1;

-- 1. Packaging list lines of the deleted POs
DELETE FROM po_packaging_list_lines WHERE "purchaseOrderId" IN (SELECT id FROM del_po);

-- 2. Packaging lists left with no lines
DELETE FROM po_packaging_lists pl
WHERE pl.id IN (SELECT id FROM del_pl)
  AND NOT EXISTS (SELECT 1 FROM po_packaging_list_lines x WHERE x."packagingListId" = pl.id);

-- 3. Containers left with no packaging list
DELETE FROM po_containers c
WHERE c.id IN (SELECT id FROM del_cont)
  AND NOT EXISTS (SELECT 1 FROM po_packaging_lists pl WHERE pl."containerId" = c.id);

-- 4. The POs: events, lines, then the order
DELETE FROM po_order_events WHERE "purchaseOrderId" IN (SELECT id FROM del_po);
DELETE FROM po_order_lines  WHERE "purchaseOrderId" IN (SELECT id FROM del_po);
DELETE FROM po_orders       WHERE id IN (SELECT id FROM del_po);

-- Check: all four should be 0
SELECT (SELECT count(*) FROM po_orders WHERE id IN (SELECT id FROM del_po)) AS pos_left,
       (SELECT count(*) FROM po_packaging_list_lines WHERE "purchaseOrderId" IN (SELECT id FROM del_po)) AS pl_lines_left,
       (SELECT count(*) FROM po_packaging_lists WHERE id IN (SELECT id FROM del_pl)) AS pls_left_should_only_be_shared,
       (SELECT count(*) FROM po_containers WHERE id IN (SELECT id FROM del_cont)) AS containers_left_should_only_be_shared;

-- COMMIT;  or  ROLLBACK;
