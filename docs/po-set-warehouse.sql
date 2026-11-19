-- Attaches a warehouse (Settings > Warehouses) to the imported purchase orders that have none:
-- Canada POs get the Canadian warehouse, USA POs get the US one.
--
-- The imported POs are the ones with a CREATED event that carries a `poKey` (set by the PO import scripts).
-- A PO that already has a warehouse is left alone. Safe to re-run.
--
-- Each country must resolve to exactly ONE warehouse. By default that is the only warehouse in that country; when a
-- country has several (or none), the script stops and lists them: put the warehouse's exact name in `wh_pick` below.
-- Run it in ONE transaction, check the review queries at the end, then COMMIT or ROLLBACK.

BEGIN;
DROP TABLE IF EXISTS wh_pick, wh_resolved;

-- <<< Optional: set a warehouse name (exactly as in Settings > Warehouses) to pick one when a country has several
CREATE TEMP TABLE wh_pick (dest text, wh_name text);
INSERT INTO wh_pick VALUES ('CA', NULL), ('US', NULL);

CREATE TEMP TABLE wh_resolved (dest text, warehouse_id int);

DO $set$
DECLARE
  r record;
  candidates int[];
  n_updated int;
BEGIN
  FOR r IN SELECT * FROM wh_pick ORDER BY dest LOOP
    -- skip a destination with nothing to update
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM po_orders o
      WHERE o."warehouseId" IS NULL AND o.destination::text = r.dest
        AND EXISTS (SELECT 1 FROM po_order_events e WHERE e."purchaseOrderId" = o.id AND e.type = 'CREATED' AND e.payload ->> 'poKey' IS NOT NULL)
    );

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

  UPDATE po_orders o
  SET "warehouseId" = x.warehouse_id, "updatedAt" = now()
  FROM wh_resolved x
  WHERE o."warehouseId" IS NULL
    AND o.destination::text = x.dest
    AND EXISTS (SELECT 1 FROM po_order_events e WHERE e."purchaseOrderId" = o.id AND e.type = 'CREATED' AND e.payload ->> 'poKey' IS NOT NULL);
  GET DIAGNOSTICS n_updated = ROW_COUNT;

  RAISE NOTICE 'Warehouse set on % purchase orders.', n_updated;
END
$set$;

-- Review before committing: every imported PO should now have the warehouse of its own country
SELECT o.destination, w.name AS warehouse, w.country AS warehouse_country, w.city, count(*) AS pos
FROM po_orders o
JOIN po_order_events e ON e."purchaseOrderId" = o.id AND e.type = 'CREATED' AND e.payload ->> 'poKey' IS NOT NULL
LEFT JOIN warehouses w ON w.id = o."warehouseId"
GROUP BY 1, 2, 3, 4 ORDER BY 1;

-- Must return 0 rows: an imported PO still without a warehouse, or with one from another country
SELECT o.id, o.destination, w.name AS warehouse, w.country AS warehouse_country
FROM po_orders o
JOIN po_order_events e ON e."purchaseOrderId" = o.id AND e.type = 'CREATED' AND e.payload ->> 'poKey' IS NOT NULL
LEFT JOIN warehouses w ON w.id = o."warehouseId"
WHERE o."warehouseId" IS NULL OR w.country <> o.destination::text;

-- The transaction is still open. If the first query shows CA -> a Canadian warehouse and US -> a US one, run:  COMMIT;   otherwise run:  ROLLBACK;
