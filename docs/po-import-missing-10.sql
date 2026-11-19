-- Imports the 10 POs that the first import left out. Same rules as the first import: suppliers by name, products by SKU,
-- one transaction, stops if anything is unmatched, safe to re-run (a PO already imported is skipped).
--
-- NOTES (review before running):
--  * SP-00033-110826-USA172603: "4pc Cabana stirpe towel" (1400 units) has no SKU - linked to NEW placeholder product BDR-CABANATOWEL4PK-USA
--  * SP-00033-110826-USA172603: "12pc Kitchen Towel Set" (2000 units) has no SKU - linked to NEW placeholder product BDR-KITCHENTOWEL12PK-BLUE-USA
--  * SP-00033-110826-USA172603: "12pc Kitchen Towel Set" (2000 units) has no SKU - linked to NEW placeholder product BDR-KITCHENTOWEL12PK-BLACK-USA
--  * SP-00033-110826-USA172603: "6pc Hand Towel Set" (2000 units) has no SKU - linked to NEW placeholder product BDR-HANDTOWEL6PK-GREY-USA
--  * SP-00033-110826-USA172603: "6pc Hand Towel Set" (2000 units) has no SKU - linked to NEW placeholder product BDR-HANDTOWEL6PK-WHITE-USA
--  * SP-00033-150926-USA141124: "4pc Cabana stirpe towel" (900 units) has no SKU - linked to NEW placeholder product BDR-CABANATOWEL4PK-USA
--  * SP-00055-220726-USA: no SKU on the sheet - mapped to BDR-NECKPILLOWGRAY-CAN (same product as SP-00055-290726-CAN)
--  * SP-00081-271026-CAN: no ERD or production date on the sheet - ERD set to the PO issuance date 2026-10-27 (placeholder), production date left empty
--  * SP-00082-291026-CAN: no ERD or production date on the sheet - ERD set to the PO issuance date 2026-10-29 (placeholder), production date left empty
--  * SP-0002-131126-USA172711: USA PO - lines use the CAN SKU from col T because cols U/V are blank (no USA SKU on the sheet)
--  * SP-00033-110826-USA172603: USA PO - lines use the CAN SKU from col T because cols U/V are blank (no USA SKU on the sheet)
--  * SP-00033-150926-USA141124: USA PO - lines use the CAN SKU from col T because cols U/V are blank (no USA SKU on the sheet)
--  * Sheet col X is the production date; ERD (po_orders.etd) comes from col AL, else the production date, else the issuance date.
--
-- BEFORE RUNNING: set the actor id (users.id shown as creator/approver).

BEGIN;
DROP TABLE IF EXISTS actor, imp_po, imp_line, imp_container, imp_pl, imp_pl_line;
CREATE TEMP TABLE actor AS SELECT 6::int AS id;   -- <<< users.id of the creator

CREATE TEMP TABLE imp_po (po_key text, supplier text, dest text, erd date, production date, issued date, closed boolean);
INSERT INTO imp_po VALUES
  ('SP-00016-220726-USA', 'Moncanol Home Textiles', 'US', '2026-07-25', '2026-07-25', '2026-07-22', false),
  ('SP-0002-131126-USA172711', 'Shanghai Orient Hometex Co., Ltd', 'US', '2026-11-20', '2026-11-20', '2026-11-13', false),
  ('SP-00022-260826-CAN153334', 'Dongguan Hongfeng(HongKong) Hanger Industrial Co.,Limited', 'CA', '2026-08-27', '2026-08-27', '2026-08-26', false),
  ('SP-00026-220726-CAN', 'Guangxi Guilin Glory Hanger Co.,Ltd.', 'CA', '2026-07-25', '2026-07-25', '2026-07-22', false),
  ('SP-00033-110826-USA172603', 'Golden Terry Towel Pvt Ltd.', 'US', '2026-08-15', '2026-08-15', '2026-08-11', true),
  ('SP-00033-150926-USA141124', 'Golden Terry Towel Pvt Ltd.', 'US', '2026-09-20', '2026-09-20', '2026-09-15', false),
  ('SP-00055-220726-USA', 'Shenzhen Jintongyuan Technology Co., Ltd.', 'US', '2026-07-23', '2026-07-23', '2026-07-22', false),
  ('SP-00070-090726-CAN', 'Globe Cotyarn Pvt Ltd', 'CA', '2026-06-26', '2026-06-26', '2026-07-09', false),
  ('SP-00081-271026-CAN', 'Hangzhou Banff Down feather', 'CA', '2026-10-27', NULL, '2026-10-27', false),
  ('SP-00082-291026-CAN', 'Guilin Lovehome Household Articles Co., Ltd', 'CA', '2026-10-29', NULL, '2026-10-29', false);

CREATE TEMP TABLE imp_line (po_key text, sku text, units int, unit_price numeric);
INSERT INTO imp_line VALUES
  ('SP-00016-220726-USA', 'BDR-COMFORTERQUEENWHITE-US', 963, 5.85),
  ('SP-00016-220726-USA', 'BDR-COMFORTERKINGWHITE-US', 960, 6.85),
  ('SP-00016-220726-USA', 'BDR-COMFORTERQUEENGREY-US', 963, 5.85),
  ('SP-00016-220726-USA', 'BDR-COMFORTERKINGGREY-US', 960, 6.85),
  ('SP-0002-131126-USA172711', 'BDR-SATINPILLOWBGREYSTANDARD-CAN', 1200, 1.32),
  ('SP-0002-131126-USA172711', 'BDR-SATINPILLOWWHITESTANDARD-CAN', 1200, 1.32),
  ('SP-0002-131126-USA172711', 'BDR-SATINPILLOWBEIGESTANDARD-CAN', 1200, 1.32),
  ('SP-0002-131126-USA172711', 'BDR-SATINPILLOWBLACKSTANDARD-CAN', 1200, 1.32),
  ('SP-0002-131126-USA172711', 'BDR-SATINPILLOWGREYQUEEN-CAN', 3000, 1.35),
  ('SP-0002-131126-USA172711', 'BDR-SATINPILLOWWHITEQUEEN-CAN', 3000, 1.35),
  ('SP-0002-131126-USA172711', 'BDR-SATINPILLOWBEIGEQUEEN-CAN', 3000, 1.35),
  ('SP-0002-131126-USA172711', 'BDR-SATINPILLOWBLACKQUEEN-CAN', 3000, 1.35),
  ('SP-0002-131126-USA172711', 'BDR-SATINPILLOWGREYKING-CAN', 700, 1.69),
  ('SP-0002-131126-USA172711', 'BDR-SATINPILLOWWHITEKING-CAN', 700, 1.69),
  ('SP-0002-131126-USA172711', 'BDR-SATINPILLOWBEIGEKING-CAN', 700, 1.69),
  ('SP-0002-131126-USA172711', 'BDR-SATINPILLOWBLACKKING-CAN', 700, 1.69),
  ('SP-00022-260826-CAN153334', 'Hangers-50Pack', 720, 3.15),
  ('SP-00026-220726-CAN', 'BDR-WOODENHANGER-20PACKCAN', 2650, 4.39),
  ('SP-00026-220726-CAN', 'BDR-WOODENHANGER-30PACKCAN', 1830, 6.58),
  ('SP-00033-110826-USA172603', 'BDR-24PKWASHCLOTHWHITE-CAN', 750, 5.43),
  ('SP-00033-110826-USA172603', 'BDR-24PKWASHCLOTHGREY-CAN', 750, 5.43),
  ('SP-00033-110826-USA172603', 'BDR-TOWEL6PKWHITE-CAN', 600, 11.06),
  ('SP-00033-110826-USA172603', 'BDR-TOWEL6PACKGREY-CAN', 600, 11.06),
  ('SP-00033-110826-USA172603', 'BDR-PREMIUMTOWEL4PKWHITE-CAN', 350, 8.54),
  ('SP-00033-110826-USA172603', 'BDR-PREMIUMTOWEL4PKGREY-CAN', 350, 8.54),
  ('SP-00033-110826-USA172603', 'BDR-TOWEL2PK-CAN', 350, 8.75),
  ('SP-00033-110826-USA172603', 'BDR-TOWEL2PKGREY-CAN', 350, 8.75),
  ('SP-00033-110826-USA172603', 'BDR-TOWEL8PACKWHITE-CAN', 400, 7.27),
  ('SP-00033-110826-USA172603', 'BDR-TOWEL8PACKGREY-CAN', 400, 7.27),
  ('SP-00033-110826-USA172603', 'BDR-CABANATOWEL4PK-USA', 1400, 11.92),
  ('SP-00033-110826-USA172603', 'BDR-KITCHENTOWEL12PK-BLUE-USA', 2000, 6.24),
  ('SP-00033-110826-USA172603', 'BDR-KITCHENTOWEL12PK-BLACK-USA', 2000, 6.24),
  ('SP-00033-110826-USA172603', 'BDR-HANDTOWEL6PK-GREY-USA', 2000, 5.1),
  ('SP-00033-110826-USA172603', 'BDR-HANDTOWEL6PK-WHITE-USA', 2000, 5.1),
  ('SP-00033-150926-USA141124', 'BDR-24PKWASHCLOTHWHITE-CAN', 600, 5.6),
  ('SP-00033-150926-USA141124', 'BDR-24PKWASHCLOTHGREY-CAN', 1000, 5.6),
  ('SP-00033-150926-USA141124', 'BDR-TOWEL6PKWHITE-CAN', 300, 11.39),
  ('SP-00033-150926-USA141124', 'BDR-TOWEL6PACKGREY-CAN', 600, 11.39),
  ('SP-00033-150926-USA141124', 'BDR-PREMIUMTOWEL4PKWHITE-CAN', 250, 8.8),
  ('SP-00033-150926-USA141124', 'BDR-PREMIUMTOWEL4PKGREY-CAN', 600, 8.8),
  ('SP-00033-150926-USA141124', 'BDR-TOWEL2PK-CAN', 200, 9.01),
  ('SP-00033-150926-USA141124', 'BDR-TOWEL2PKGREY-CAN', 600, 9.01),
  ('SP-00033-150926-USA141124', 'BDR-TOWEL8PACKWHITE-CAN', 200, 7.49),
  ('SP-00033-150926-USA141124', 'BDR-TOWEL8PACKGREY-CAN', 600, 7.49),
  ('SP-00033-150926-USA141124', 'BDR-CABANATOWEL4PK-USA', 900, 12.28),
  ('SP-00055-220726-USA', 'BDR-NECKPILLOWGRAY-CAN', 1008, 8.62),
  ('SP-00070-090726-CAN', 'CTCVCT1000SSBWQ', 298, 15.25),
  ('SP-00070-090726-CAN', 'CTCVCT1000SSHMQ', 293, 15.25),
  ('SP-00070-090726-CAN', 'CTCVCT1000SSFSQ', 299, 15.25),
  ('SP-00070-090726-CAN', 'CTCVCT1000SSCGQ', 293, 15.25),
  ('SP-00070-090726-CAN', 'CTCVCT1000SSBWK', 202, 17.75),
  ('SP-00070-090726-CAN', 'CTCVCT1000SSHMK', 199, 17.75),
  ('SP-00070-090726-CAN', 'CTCVCT1000SSFSK', 194, 17.75),
  ('SP-00070-090726-CAN', 'CTCVCT1000SSCGK', 196, 17.75),
  ('SP-00070-090726-CAN', 'CTT200SSBWT', 75, 9.45),
  ('SP-00070-090726-CAN', 'CTT200SSBWF', 73, 11.6),
  ('SP-00070-090726-CAN', 'CTT200SSBWQ', 222, 12.5),
  ('SP-00070-090726-CAN', 'CTT200SSBWK', 154, 14.85),
  ('SP-00070-090726-CAN', 'CTT200SSCGT', 75, 9.45),
  ('SP-00070-090726-CAN', 'CTT200SSCGF', 74, 11.6),
  ('SP-00070-090726-CAN', 'CTT200SSCGQ', 226, 12.5),
  ('SP-00070-090726-CAN', 'CTT200SSCGK', 157, 14.85),
  ('SP-00070-090726-CAN', 'CTT300SSBWT', 76, 11),
  ('SP-00070-090726-CAN', 'CTT300SSBWF', 74, 15),
  ('SP-00070-090726-CAN', 'CTT300SSBWQ', 221, 16.75),
  ('SP-00070-090726-CAN', 'CTT300SSBWK', 153, 19),
  ('SP-00070-090726-CAN', 'CTT300SSHMT', 71, 11),
  ('SP-00070-090726-CAN', 'CTT300SSHMF', 67, 15),
  ('SP-00070-090726-CAN', 'CTT300SSHMQ', 212, 16.75),
  ('SP-00070-090726-CAN', 'CTT300SSHMK', 154, 19),
  ('SP-00070-090726-CAN', 'CTT400SSBWT', 75, 12.5),
  ('SP-00070-090726-CAN', 'CTT400SSBWF', 73, 16.75),
  ('SP-00070-090726-CAN', 'CTT400SSBWQ', 215, 18.5),
  ('SP-00070-090726-CAN', 'CTT400SSBWK', 155, 21.25),
  ('SP-00070-090726-CAN', 'CTT400SSLPT', 72, 12.5),
  ('SP-00070-090726-CAN', 'CTT400SSLPF', 71, 16.75),
  ('SP-00070-090726-CAN', 'CTT400SSLPQ', 203, 18.5),
  ('SP-00070-090726-CAN', 'CTT400SSLPK', 157, 21.25),
  ('SP-00081-271026-CAN', 'NLBAMDUWHQ-BH', 200, 23.8),
  ('SP-00081-271026-CAN', 'NLBAMDUWHK-BH', 100, 26.8),
  ('SP-00081-271026-CAN', 'NLBAMPILQ-BH', 350, 7.2),
  ('SP-00081-271026-CAN', 'NLBAMPILK-BH', 250, 8.65),
  ('SP-00081-271026-CAN', 'NLORGCTDUWHQ-WW', 200, 20.4),
  ('SP-00081-271026-CAN', 'NLORGCTDUWHK-WW', 100, 23.4),
  ('SP-00081-271026-CAN', 'NLORGCTPILWHQ-WW', 350, 7.05),
  ('SP-00081-271026-CAN', 'NLORGCTPILWHK-WW', 250, 8.45),
  ('SP-00081-271026-CAN', 'NLWOLDUCRQ-WW', 200, 26.5),
  ('SP-00081-271026-CAN', 'NLWOLDUCRK-WW', 100, 31.2),
  ('SP-00081-271026-CAN', 'NLWOLPILCRQ-WW', 350, 7.42),
  ('SP-00081-271026-CAN', 'NLWOLPILCRK-WW', 250, 8.89),
  ('SP-00081-271026-CAN', 'NLBAMMPQ-BH', 500, 11.14),
  ('SP-00081-271026-CAN', 'NLBAMMPK-BH', 300, 13.77),
  ('SP-00081-271026-CAN', 'NLCOTMPDQQ-NL', 500, 10.9),
  ('SP-00081-271026-CAN', 'NLCOTMPDQK-NL', 300, 12.78),
  ('SP-00082-291026-CAN', 'NLWODHANNT10PK-NL', 383, 2.43),
  ('SP-00082-291026-CAN', 'NLWODHANNT10PK-VRS', 383, 2.43),
  ('SP-00082-291026-CAN', 'NLWODHANNT10PK-PTF', 384, 2.43),
  ('SP-00082-291026-CAN', 'NLWODHANNT5PK-NL', 133, 1.215),
  ('SP-00082-291026-CAN', 'NLWODHANNT5PK-VRS', 133, 1.215),
  ('SP-00082-291026-CAN', 'NLWODHANNT5PK-PTF', 134, 1.215),
  ('SP-00082-291026-CAN', 'NLWODHANRW10PK-NL', 450, 2.47),
  ('SP-00082-291026-CAN', 'NLWODHANRW10PK-VRS', 450, 2.47),
  ('SP-00082-291026-CAN', 'NLWODHANRW10PK-PTF', 450, 2.47),
  ('SP-00082-291026-CAN', 'NLWODHANRW5PK-NL', 200, 1.235),
  ('SP-00082-291026-CAN', 'NLWODHANRW5PK-VRS', 200, 1.235),
  ('SP-00082-291026-CAN', 'NLWODHANRW5PK-PTF', 200, 1.235),
  ('SP-00082-291026-CAN', 'NLWODHANCH10PK-NL', 150, 2.47),
  ('SP-00082-291026-CAN', 'NLWODHANCH10PK-VRS', 150, 2.47),
  ('SP-00082-291026-CAN', 'NLWODHANCH10PK-PTF', 150, 2.47),
  ('SP-00082-291026-CAN', 'NLWODHANCH5PK-NL', 67, 1.235),
  ('SP-00082-291026-CAN', 'NLWODHANCH5PK-VRS', 67, 1.235),
  ('SP-00082-291026-CAN', 'NLWODHANCH5PK-PTF', 66, 1.235),
  ('SP-00082-291026-CAN', 'NLWODHANBL10PK-NL', 216, 2.58),
  ('SP-00082-291026-CAN', 'NLWODHANBL10PK-VRS', 217, 2.58),
  ('SP-00082-291026-CAN', 'NLWODHANBL10PK-PTF', 217, 2.58),
  ('SP-00082-291026-CAN', 'NLWODHANBL5PK-NL', 50, 1.29),
  ('SP-00082-291026-CAN', 'NLWODHANBL5PK-VRS', 50, 1.29),
  ('SP-00082-291026-CAN', 'NLWODHANBL5PK-PTF', 50, 1.29),
  ('SP-00082-291026-CAN', 'NLWODHANWH10PK-NL', 216, 2.58),
  ('SP-00082-291026-CAN', 'NLWODHANWH10PK-VRS', 217, 2.58),
  ('SP-00082-291026-CAN', 'NLWODHANWH10PK-PTF', 217, 2.58),
  ('SP-00082-291026-CAN', 'NLWODHANWH5PK-NL', 50, 1.29),
  ('SP-00082-291026-CAN', 'NLWODHANWH5PK-VRS', 50, 1.29),
  ('SP-00082-291026-CAN', 'NLWODHANWH5PK-PTF', 50, 1.29),
  ('SP-00082-291026-CAN', 'NLWODCTHANNT3PK-NL', 192, 2.25),
  ('SP-00082-291026-CAN', 'NLWODCTHANRW3PK-NL', 288, 2.25),
  ('SP-00082-291026-CAN', 'NLMTALHANMTGL5PK-VRS', 1000, 2.45),
  ('SP-00082-291026-CAN', 'NLMTALHANMYSL5PK-VRS', 1000, 2.35),
  ('SP-00082-291026-CAN', 'NLMTALHANMTGL10PK-VRS', 1000, 3.9),
  ('SP-00082-291026-CAN', 'NLMTALHANMYSL10PK-VRS', 1000, 3.85),
  ('SP-00082-291026-CAN', 'NLKDWODHANPNK10PK-NL', 500, 3.2),
  ('SP-00082-291026-CAN', 'NLKDWODHANBL10PK-NL', 500, 3.2),
  ('SP-00082-291026-CAN', 'NLKDWODHANNT10PK-NL', 250, 3);

CREATE TEMP TABLE imp_container (cn text, status text, etd date, eta date, dest text);
INSERT INTO imp_container VALUES
  ('HAMU4555871', 'ON_BOARD', NULL, NULL, 'CA');

CREATE TEMP TABLE imp_pl (po_key text, cn text);
INSERT INTO imp_pl VALUES
  ('SP-00070-090726-CAN', 'HAMU4555871');

CREATE TEMP TABLE imp_pl_line (po_key text, cn text, sku text, units int, cartons int, l numeric, w numeric, h numeric, cbm numeric, net numeric, gross numeric);
INSERT INTO imp_pl_line VALUES
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTCVCT1000SSBWQ', 298, 75, 50.13, 32.63, 24.63, 3.0025, 675, 705),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTCVCT1000SSHMQ', 293, 74, 50.13, 32.63, 24.64, 3.0025, 666, 695.6),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTCVCT1000SSFSQ', 299, 75, 50.13, 32.63, 24.65, 3.0025, 675, 705),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTCVCT1000SSCGQ', 293, 74, 50.13, 32.63, 24.66, 3.0025, 666, 695.6),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTCVCT1000SSBWK', 202, 51, 50.13, 32.63, 27.63, 2.005, 479.4, 561),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTCVCT1000SSHMK', 199, 50, 50.13, 32.63, 27.64, 2.005, 475, 555),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTCVCT1000SSFSK', 194, 49, 50.13, 32.63, 27.65, 2.005, 460.6, 539),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTCVCT1000SSCGK', 196, 49, 50.13, 32.63, 27.66, 2.005, 465.5, 543.9),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTT200SSBWT', 75, 19, 49.63, 30.63, 15.63, 0.45, 81.7, 108.3),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTT200SSBWF', 73, 19, 49.63, 30.63, 19.13, 0.555, 106.4, 133),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTT200SSBWQ', 222, 56, 49.63, 30.63, 19.13, 1.645, 380.8, 453.6),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTT200SSBWK', 154, 39, 49.63, 30.63, 22.13, 1.33, 308.1, 366.6),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTT200SSCGT', 75, 19, 49.63, 30.63, 15.63, 0.45, 81.7, 108.3),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTT200SSCGF', 74, 19, 49.63, 30.63, 19.13, 0.555, 106.4, 134.9),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTT200SSCGQ', 226, 57, 49.63, 30.63, 19.13, 1.645, 387.6, 461.7),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTT200SSCGK', 157, 40, 49.63, 30.63, 22.13, 1.33, 316, 372),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTT300SSBWT', 76, 19, 49.63, 30.63, 16.63, 0.47, 81.7, 106.4),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTT300SSBWF', 74, 19, 49.63, 30.63, 20.13, 0.55, 136.8, 146.3),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTT300SSBWQ', 221, 56, 49.63, 30.63, 20.13, 1.67, 380.8, 420),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTT300SSBWK', 153, 39, 49.63, 30.63, 23.63, 1.4, 292.5, 347.1),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTT300SSHMT', 71, 18, 49.63, 30.63, 16.63, 0.47, 75.6, 99),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTT300SSHMF', 67, 17, 49.63, 30.63, 20.13, 0.55, 122.4, 132.6),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTT300SSHMQ', 212, 53, 49.63, 30.63, 20.13, 1.67, 365.7, 365.7),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTT300SSHMK', 154, 39, 49.63, 30.63, 23.63, 1.4, 292.5, 351),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTT400SSBWT', 75, 19, 49.63, 30.63, 16.63, 0.47, 89.3, 110.2),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTT400SSBWF', 73, 19, 49.63, 30.63, 21.63, 0.61, 117.8, 134.9),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTT400SSBWQ', 215, 54, 49.63, 30.63, 21.63, 1.73, 383.4, 437.4),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTT400SSBWK', 155, 39, 49.63, 30.63, 24.63, 1.48, 312, 370.5),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTT400SSLPT', 72, 18, 49.63, 30.63, 16.63, 0.47, 86.4, 106.2),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTT400SSLPF', 71, 18, 49.63, 30.63, 21.63, 0.61, 115.2, 131.4),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTT400SSLPQ', 203, 51, 49.63, 30.63, 21.63, 1.73, 362.1, 413.1),
  ('SP-00070-090726-CAN', 'HAMU4555871', 'CTT400SSLPK', 157, 40, 49.63, 30.63, 24.63, 1.48, 320, 320);


-- New products for the lines that had no SKU. The SKUs below are PLACEHOLDERS: replace them with the real SKUs later (edit the product's SKU).
CREATE TEMP TABLE new_products (sku text, master_name text, color text, size_name text, material text, packaging text);
INSERT INTO new_products VALUES
  ('BDR-CABANATOWEL4PK-USA', '4pc Cabana stripe towel', 'Blue/Yellow/Green/Orange', '61 x 29.25 Inch', 'GSM: 450', 'Insert + PE bag.'),
  ('BDR-KITCHENTOWEL12PK-BLUE-USA', '12pc Kitchen Towel Set', 'Blue + white', '16 x 25 Inch', 'GSM: 350', 'Insert + PE bag.'),
  ('BDR-KITCHENTOWEL12PK-BLACK-USA', '12pc Kitchen Towel Set', 'Black + white', '16 x 25 Inch', 'GSM: 350', 'Insert + PE bag.'),
  ('BDR-HANDTOWEL6PK-GREY-USA', '6pc Hand Towel Set', 'Grey', '16 x 28 Inch', 'GSM: 600', 'Insert + PE bag.'),
  ('BDR-HANDTOWEL6PK-WHITE-USA', '6pc Hand Towel Set', 'White', '16 x 28 Inch', 'GSM: 600', 'Insert + PE bag.');

INSERT INTO po_products (name, platform, "categoryId", "createdById", "updatedAt")
SELECT DISTINCT ON (lower(np.master_name)) np.master_name, 'ECOMMERCE'::"PoPlatform", c.id, (SELECT id FROM actor), now()
FROM new_products np
LEFT JOIN po_product_categories c ON c.name = 'Bedding'
WHERE NOT EXISTS (SELECT 1 FROM po_products m WHERE m."parentId" IS NULL AND m."archivedAt" IS NULL AND lower(m.name) = lower(np.master_name))
ORDER BY lower(np.master_name), np.sku;

INSERT INTO po_products (name, "parentId", platform, "variantName", sku, color, material, packaging, "sizeName", "categoryId", marketplace, "createdById", "updatedAt")
SELECT m.name, m.id, m.platform, concat_ws('-', m.name, nullif(np.color, ''), nullif(np.size_name, '')), np.sku,
       np.color, np.material, np.packaging, np.size_name, m."categoryId", 'US', (SELECT id FROM actor), now()
FROM new_products np
JOIN po_products m ON m."parentId" IS NULL AND m."archivedAt" IS NULL AND lower(m.name) = lower(np.master_name)
WHERE NOT EXISTS (SELECT 1 FROM po_products v WHERE upper(trim(v.sku)) = np.sku);

INSERT INTO po_product_marketplace_skus ("productId", marketplace, sku)
SELECT v.id, 'US', np.sku FROM new_products np JOIN po_products v ON v.sku = np.sku
WHERE NOT EXISTS (SELECT 1 FROM po_product_marketplace_skus x WHERE x."productId" = v.id);

DO $import$
DECLARE
  actor_id int := (SELECT id FROM actor);
  r record; plr record;
  v_po int; v_list int; v_cont int; v_supplier int;
  n_po int := 0; n_skip int := 0; n_list int := 0; n_cont int := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = actor_id) THEN RAISE EXCEPTION 'actor id % is not a user', actor_id; END IF;

  IF EXISTS (SELECT 1 FROM imp_po s WHERE (SELECT count(*) FROM partners p WHERE lower(regexp_replace(trim(p.name), '[[:space:]]+', ' ', 'g')) = lower(s.supplier)) <> 1) THEN
    RAISE EXCEPTION 'Suppliers missing or ambiguous: %', (SELECT string_agg(DISTINCT s.supplier, '; ') FROM imp_po s WHERE (SELECT count(*) FROM partners p WHERE lower(regexp_replace(trim(p.name), '[[:space:]]+', ' ', 'g')) = lower(s.supplier)) <> 1);
  END IF;
  IF EXISTS (SELECT 1 FROM imp_line l WHERE NOT EXISTS (SELECT 1 FROM po_products p WHERE upper(regexp_replace(trim(p.sku), '[[:space:]]+', '-', 'g')) = upper(regexp_replace(trim(l.sku), '[[:space:]]+', '-', 'g')))) THEN
    RAISE EXCEPTION 'SKUs not found in po_products: %', (SELECT string_agg(DISTINCT l.sku, ', ') FROM imp_line l WHERE NOT EXISTS (SELECT 1 FROM po_products p WHERE upper(regexp_replace(trim(p.sku), '[[:space:]]+', '-', 'g')) = upper(regexp_replace(trim(l.sku), '[[:space:]]+', '-', 'g'))));
  END IF;

  FOR r IN SELECT * FROM imp_container LOOP
    IF NOT EXISTS (SELECT 1 FROM po_containers WHERE "containerNumber" = r.cn) THEN
      INSERT INTO po_containers ("containerNumber", status, etd, eta, destination, currency, "createdById", "updatedAt")
      VALUES (r.cn, r.status::"PoContainerStatus", r.etd, r.eta, r.dest::"PoDestination", 'USD', actor_id, now());
      n_cont := n_cont + 1;
    END IF;
  END LOOP;

  FOR r IN SELECT * FROM imp_po ORDER BY po_key LOOP
    IF EXISTS (SELECT 1 FROM po_order_events e WHERE e.type = 'CREATED' AND e.payload ->> 'poKey' = r.po_key)
       OR EXISTS (SELECT 1 FROM po_orders WHERE "externalRef" = r.po_key) THEN
      n_skip := n_skip + 1; CONTINUE;
    END IF;
    SELECT p.id INTO v_supplier FROM partners p WHERE lower(regexp_replace(trim(p.name), '[[:space:]]+', ' ', 'g')) = lower(r.supplier);

    INSERT INTO po_orders ("supplierId", "contactName", destination, currency, etd, "productionDate", "issuanceDate", "externalRef", status, "isOpen", "closedAt", "approvedAt", "decidedById", "createdById", "updatedAt")
    SELECT v_supplier, p."contactName", r.dest::"PoDestination", 'USD', r.erd, r.production, r.issued, r.po_key, 'APPROVED', NOT r.closed, CASE WHEN r.closed THEN now() END, now(), actor_id, actor_id, now()
    FROM partners p WHERE p.id = v_supplier
    RETURNING id INTO v_po;

    INSERT INTO po_order_lines ("purchaseOrderId", "productId", "unitsOrdered", "unitPrice")
    SELECT v_po, (SELECT p.id FROM po_products p WHERE upper(regexp_replace(trim(p.sku), '[[:space:]]+', '-', 'g')) = upper(regexp_replace(trim(l.sku), '[[:space:]]+', '-', 'g')) ORDER BY (p."parentId" IS NULL), (p.sku = l.sku) DESC, p."archivedAt" IS NOT NULL, p.id LIMIT 1), l.units, l.unit_price
    FROM imp_line l WHERE l.po_key = r.po_key;

    INSERT INTO po_order_events ("purchaseOrderId", type, "actorId", payload) VALUES
      (v_po, 'CREATED', actor_id, jsonb_build_object('poKey', r.po_key, 'importedFrom', 'PO_Logistic_Combined_with_Payments_v2.xlsx')),
      (v_po, 'APPROVED', actor_id, NULL);

    FOR plr IN SELECT * FROM imp_pl WHERE po_key = r.po_key LOOP
      SELECT id INTO v_cont FROM po_containers WHERE "containerNumber" = plr.cn;
      INSERT INTO po_packaging_lists (destination, "createdById", "containerId", "updatedAt")
      VALUES (r.dest::"PoDestination", actor_id, v_cont, now()) RETURNING id INTO v_list;

      INSERT INTO po_packaging_list_lines ("packagingListId", "purchaseOrderId", "productId", units, cartons, "cartonLengthCm", "cartonWidthCm", "cartonHeightCm", cbm, "netWeightKg", "grossWeightKg")
      SELECT v_list, v_po, (SELECT p.id FROM po_products p WHERE upper(regexp_replace(trim(p.sku), '[[:space:]]+', '-', 'g')) = upper(regexp_replace(trim(x.sku), '[[:space:]]+', '-', 'g')) ORDER BY (p."parentId" IS NULL), (p.sku = x.sku) DESC, p."archivedAt" IS NOT NULL, p.id LIMIT 1), x.units, x.cartons, x.l, x.w, x.h, coalesce(x.cbm, 0), coalesce(x.net, 0), coalesce(x.gross, 0)
      FROM imp_pl_line x WHERE x.po_key = r.po_key AND x.cn = plr.cn;
      n_list := n_list + 1;
    END LOOP;
    n_po := n_po + 1;
  END LOOP;

  -- Status derived as the app does it (po-readiness), for these POs only
  WITH ids AS (
    SELECT e."purchaseOrderId" AS id FROM po_order_events e WHERE e.type = 'CREATED' AND e.payload ->> 'poKey' IN (SELECT po_key FROM imp_po)
  ), facts AS (
    SELECT o.id, o."isOpen",
      (SELECT count(DISTINCT pl.id) FROM po_packaging_lists pl JOIN po_packaging_list_lines x ON x."packagingListId" = pl.id WHERE x."purchaseOrderId" = o.id) AS lists,
      (SELECT count(DISTINCT pl.id) FROM po_packaging_lists pl JOIN po_packaging_list_lines x ON x."packagingListId" = pl.id WHERE x."purchaseOrderId" = o.id AND pl."containerId" IS NOT NULL) AS in_cont,
      (SELECT count(DISTINCT pl.id) FROM po_packaging_lists pl JOIN po_packaging_list_lines x ON x."packagingListId" = pl.id JOIN po_containers c ON c.id = pl."containerId"
         WHERE x."purchaseOrderId" = o.id AND c.status IN ('DELIVERED_AT_WAREHOUSE', 'GOODS_RECEIVED')) AS at_wh,
      NOT EXISTS (SELECT 1 FROM po_order_lines l WHERE l."purchaseOrderId" = o.id
         AND coalesce((SELECT sum(x.units) FROM po_packaging_list_lines x WHERE x."purchaseOrderId" = o.id AND x."productId" = l."productId"), 0) < l."unitsOrdered") AS packed_all
    FROM po_orders o WHERE o.id IN (SELECT id FROM ids) AND o.status = 'APPROVED'
  ), derived AS (
    SELECT id, lists, CASE
      WHEN NOT "isOpen" AND NOT (packed_all AND lists > 0 AND in_cont = lists) THEN 'SHORT_CLOSED'
      WHEN lists = 0 THEN 'APPROVED'
      WHEN in_cont > 0 AND packed_all AND in_cont = lists THEN CASE WHEN at_wh = lists THEN 'RECEIVED' ELSE 'FULLY_SHIPPED' END
      WHEN in_cont > 0 THEN 'PARTIALLY_SHIPPED'
      WHEN packed_all THEN 'FULLY_PACKED' ELSE 'PARTIALLY_PACKED' END AS st,
      (packed_all AND lists > 0 AND in_cont = lists) AS fully_shipped
    FROM facts
  ), upd AS (
    UPDATE po_orders o SET status = d.st::"PoOrderStatus", "fullyShippedAt" = CASE WHEN d.fully_shipped THEN now() END, "updatedAt" = now()
    FROM derived d WHERE o.id = d.id AND d.st <> 'APPROVED' RETURNING o.id, d.st
  )
  INSERT INTO po_order_events ("purchaseOrderId", type, "actorId") SELECT id, st, actor_id FROM upd;

  RAISE NOTICE 'Imported % POs (% already present, skipped), % packaging lists, % new containers.', n_po, n_skip, n_list, n_cont;
END
$import$;

-- Review before committing
SELECT o."externalRef", o.status, o.etd AS erd, o."productionDate", o."issuanceDate", (SELECT count(*) FROM po_order_lines l WHERE l."purchaseOrderId" = o.id) AS lines
FROM po_orders o WHERE o."externalRef" IN (SELECT po_key FROM imp_po) ORDER BY 1;

-- The transaction is still open. If the numbers look right run:  COMMIT;   otherwise run:  ROLLBACK;
