-- Dest. City only: sets each container's destination city from column AW (Destination City) of
-- "Logistics Team _ Canada Shipping Track.xlsx" (tab LogisticsTrack), exactly as the sheet writes it (trimmed), so the
-- Containers screen reads "CANADA · Toronto" / "USA · Houston TX". Containers are matched by container number.
--
-- It changes ONLY po_containers."destinationCity" and "destinationProvince" and deletes nothing. The province is cleared
-- for these containers (clear_province = true): the sheet's city text often carries its own state ("Fontana, CA"), so a
-- stored province would print it twice ("Fontana, CA · CA"). Set clear_province to false to leave provinces as they are.
-- The app's lock on delivered containers is ignored on purpose: this is a one-off back-fill.
-- Safe to re-run. Run it in ONE transaction, check the review output, then COMMIT; (with the semicolon).

BEGIN;
DROP TABLE IF EXISTS city_opts, sheet_city;

CREATE TEMP TABLE city_opts AS SELECT true AS clear_province;   -- <<< false = leave the province as it is

CREATE TEMP TABLE sheet_city (cn text, city text);
INSERT INTO sheet_city VALUES
  ('YMMU6041154', 'Toronto'),
  ('TGBU6345854', 'Hesperia'),
  ('HLBU3299646', 'Toronto'),
  ('STJU4201050', 'Toronto'),
  ('MRKU4001360', 'Toronto'),
  ('MAEU265269113', 'Toronto'),
  ('ZCSU6938860', 'Houston TX'),
  ('MSMU8668163', 'Toronto'),
  ('TCNU3197075', 'Houston TX'),
  ('TCKU6883500', 'Houston TX'),
  ('HAMU2571132', 'Toronto'),
  ('NWRU8568291', 'Toronto'),
  ('KOCU4560294', 'Toronto'),
  ('HASU5068252', 'Houston TX'),
  ('CAAU7780438', 'Toronto'),
  ('HPXU3031940', 'Toronto'),
  ('SEKU4040875', 'Toronto'),
  ('YMLU9008259', 'Toronto'),
  ('KOCU4359567', 'Toronto'),
  ('MSKU4691077', 'Houston TX'),
  ('MSKU4691077  / 45HQ', 'Houston TX'),
  ('TCNU4770140', 'Toronto'),
  ('MRKU4314174', 'Toronto'),
  ('MRSU2678842', 'Toronto'),
  ('BMOU4583741', 'LBE1 NEW STANTON, PA'),
  ('CAIU4387116', 'Houston TX'),
  ('MSDU5269815', 'Toronto'),
  ('CMAU7924741', 'Toronto'),
  ('OOCU7649076', 'Houston TX'),
  ('NWRU8566616', 'Toronto'),
  ('JTAU7377936', 'Toronto'),
  ('SJCU4575732', 'Toronto'),
  ('YMMU6592603', 'Toronto'),
  ('TCNU4639058', 'Toronto'),
  ('TEMU6196025', 'Houston TX'),
  ('NYKU4342588', 'Toronto'),
  ('TXGU8197888', 'Toronto'),
  ('FBLU0224723', 'Fontana, CA'),
  ('FANU1319365', 'Hesperia, CA'),
  ('MSMU8770262', 'Toronto'),
  ('HAMU4555871', 'Toronto'),
  ('HLBU3166448', 'Toronto'),
  ('CAN-BDR-SP-00080, 0005, 00039, 0006-17', 'Toronto'),
  ('TGBU6599144', 'Toronto');

UPDATE po_containers c
SET "destinationCity" = s.city,
    "destinationProvince" = CASE WHEN (SELECT clear_province FROM city_opts) THEN NULL ELSE c."destinationProvince" END
FROM (SELECT DISTINCT ON (cn) cn, city FROM sheet_city ORDER BY cn) s
WHERE c."containerNumber" = s.cn
  AND (c."destinationCity" IS DISTINCT FROM s.city
       OR ((SELECT clear_province FROM city_opts) AND c."destinationProvince" IS NOT NULL));

-- Review 1: every container the sheet gives a city for, before and after
SELECT c.id, c."containerNumber", c.destination, s.city AS sheet_city, c."destinationCity" AS city_now, c."destinationProvince" AS province_now,
       CASE c.destination WHEN 'CA' THEN 'CANADA' ELSE 'USA' END || ' · ' || coalesce(c."destinationCity", '—') || coalesce(' · ' || c."destinationProvince", '') AS shown_as
FROM po_containers c JOIN (SELECT DISTINCT ON (cn) cn, city FROM sheet_city ORDER BY cn) s ON s.cn = c."containerNumber"
ORDER BY c."containerNumber";

-- Review 2: sheet containers that are not in the app (information)
SELECT s.cn FROM sheet_city s WHERE NOT EXISTS (SELECT 1 FROM po_containers c WHERE c."containerNumber" = s.cn);

-- Review 3: containers with no city at all (the sheet has none for them; not changed)
SELECT c.id, c."containerNumber", c.destination FROM po_containers c WHERE c."destinationCity" IS NULL ORDER BY c.id;

-- The transaction is still open. If the review looks right run:  COMMIT;   otherwise run:  ROLLBACK;
