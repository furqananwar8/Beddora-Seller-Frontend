# User manual project: session context (2026-11-24)

## Goal
Build a **summarized, module-wise user manual** for Beddora (fbeddora frontend + bbeddora backend) in the same design as `docs/designs/manual/payment-request-page.html`: one A4-landscape sheet per screen, a real screenshot with numbered badges, and peach cards (`Verb → result` tag + one-line explanation). Real system screenshots only, never mock-ups.

Modules requested: Containers, Finance, Shipping, Procurement, Channel Inventory, Inventory Management, Scanning Sessions, and Settings (Warehouses, GST, Approvals (admin only), Company, General, Users). A clickable index sheet comes first.

Decisions made with the user:
- Length: about 4–6 sheets per module (overview + flow, 2–4 key screens, one status cheat-sheet). The first plan (a page per screen and tab) was too big and was cancelled.
- Screenshots come from the running app: web on http://localhost:5100, API on http://localhost:3001, signed in via a separate Chrome window with remote debugging on port 9222.
- Output per module: `docs/designs/manual/<module>.html` (many `<section class="page" id="slug">`), images in `img/<module>/`, shared CSS in `css/manual.css`.

## Business flow every module must fit (from the user)
1. **Procurement > Price Analysis:** pick a product, create analysis, enter several supplier rates, save. It goes to approvers per Settings > Approvals rules; they approve or reject one supplier. On approval, people on the Settings > Approvals > Notification tab are notified.
2. **Purchase Order:** created, approved in order (1st approver, then 2nd...). On approve/reject, the notified people are told to create a payment request for the PO.
3. **Finance > Payment Request**, four "Paying against" tabs:
   - Invoice: any expense payment; every entry has an expense type.
   - Purchase Order.
   - Sample: samples from the PO screen and Inventory Management > Samples.
   - Shipment: WFS/FBA shipments from Inventory Management > Shipments.
   - Expense types come from Finance > Cost Center. If PO and payment currency differ, an exchange rate (current date) converts the amount.
4. Payment request approved by authorities → **Payment Process**: notified users upload documents and pay (full or split); the status changes. Every status on every screen must be explained.
5. **Purchase Invoice** is created against a PO. **Packaging List** is created against a PO and attached to a **Container**.
6. **Scanning:** sessions scan product UPCs from Shipping > Orders, Inventory Management > Shipments and Inbound Receiving; all are recorded under Scanning > Sessions.

## What exists now (nothing committed)
In `D:/projects/fbeddora/docs/designs/manual/`:
- `finance.html` / `finance.pdf`: **7 sheets** (overview and flow, payment request list, new request (Invoice tab), paying against PO/Sample/Shipment, Payment Process, statuses, notifications).
- `index.html` / `index.pdf`: index page, currently linking only to Finance.
- `build.py`: rebuilds `index.html` and each module's PDF from whichever `<module>.html` files exist (`python build.py`; uses headless Chrome).
- `css/manual.css`: shared design. `README.md`: authoring conventions, page anatomy, business flow, "SUMMARIZED EDITION" rules.
- `img/`: finance images, the original `pr/` and `recv/` captures, and some leftover screenshots in the other module folders (several are blank).
- Added `docs/designs/manual/.pdfprofile/` to `.gitignore`.

**Not written:** Procurement, Containers, Shipping, Channel Inventory, Inventory Management, Scanning, Settings.

## Known gaps in Finance
- No screenshot of the Record payment dialog (the signed-in user is view-only).
- Sample and Shipment tabs, batch and Excel upload, approval timeline: text only.
- Payment Process images are low resolution (~640px, taken via the browser pane).
- Payment Process detail image comes from a pending test record that already shows a proof.
- Two badges on the PO sheet were moved after the last render and not re-checked.
- Many of the other Finance screens (partner, bank, cost center, aging, cashflow) are one line each on the overview, with no sheet.

## Why it stalled
Eight agents sharing one Chrome plus the dev server made navigation time out and the CDP connection hang (Chrome reached about 18 tabs). The user also flagged the first plan as far too long, so all agents were stopped and restarted once with the smaller scope. All agents have since been stopped on the user's request.

## Facts already verified in code (reuse when writing)
**Procurement statuses**
- Price analysis: NO QUOTES, AWAITING APPROVAL (PENDING), APPROVED; REJECTED is a per-supplier badge, not a list status; a pending analysis can be deleted.
- Purchase order: DRAFT, PENDING FOR APPROVAL, APPROVED (locked until a production date is set), IN PRODUCTION, PARTIALLY PACKED, FULLY PACKED, SHORT CLOSED, PARTIALLY SHIPPED, FULLY SHIPPED, RECEIVED. READY_TO_SHIP is legacy. Separate fields: payment (UNPAID / PARTIALLY PAID / PAID) and open/closed.
- Purchase invoice: DRAFT, PENDING FOR APPROVAL, REJECTED, PAYMENT PENDING, PARTIALLY PAID, PAID. PDF status: GENERATING / READY / FAILED.
- Packaging list: no status enum; filtered by container (Assigned / Unassigned). A PO is packable once approved and open.
- Products: no status enum found.

**Settings**
- Approvals has 3 tabs: Approval rules, Departments, Notifications.
- Rules: Procurement (PO Submit, Invoice Submit, Price analysis Approve) and Finance (Payment request Submit). Ordered steps (max 10); "Move on when": Any one approves / Everyone approves / One from each team. People can be named users, department heads, or by product platform (Retail/Ecommerce). Rejection returns to the creator with a reason. **No amount conditions. No rule active/inactive toggle.** A rule with no steps means all holders of the page permission are notified.
- Departments: name, heads, platform, members; saves immediately; a department used by a rule can't be deleted; one with no head can't be used in a rule.
- Notifications: events grouped Finance, Containers, Shipping, Procurement; recipients (creator, screen access, department heads, named people), optional schedule relative to ETA, bell and/or email, message templates. Exact event names were not confirmed in the UI.
- Users: Active / Invited tabs; user statuses ACTIVE, INACTIVE; invite statuses PENDING, EXPIRED, REVOKED. **No roles** (feature-permission tree only), **no deactivate action** in the UI.
- Warehouses: ship-from address only if phone and postal code are set. GST: rate can't be removed while in use. General: "Profile Info" tab is a placeholder. Company: letterhead for PO PDFs and invoices.

## Capture setup (for resuming)
- Servers: `fbeddora` (npm run dev, port 5100) and the API on 3001 (already running before the session).
- Chrome: `chrome.exe --remote-debugging-port=9222 --user-data-dir=<scratchpad>\chrome-profile http://localhost:5100/login`; sign in once manually.
- Helper: `<scratchpad>\cap\shot.js` using `playwright-core@1.49.1` with `connectOverCDP`. Use `domcontentloaded` + a wait (the app holds an SSE stream, so never `networkidle`); viewport 1440×900; under Git Bash set `MSYS_NO_PATHCONV=1` so `/dashboard/...` isn't rewritten. Device-scale-factor 2 did not apply, so captures are 1×.
- Scratchpad: `C:\Users\DEV\AppData\Local\Temp\claude\495389ae1309d0d3\80193890-6c7d-4576-9901-0fc78b0a58ec\scratchpad`.
- Run agents **at most 2–3 at a time**, one browser page each, 90 s timeouts, close pages in `finally`.
- Footer on every sheet: `Draft v1 · Backend 73f5d22 · Frontend bd07481`.
- Dev DB rules: no deletes or edits of existing records; test records named `MANUAL-`; never submit to carriers or marketplaces; save nothing in Settings; never type passwords.

## Next steps
1. Re-run Procurement first (statuses above are ready), then Containers + Shipping, Channel Inventory + Inventory Management, Scanning + Settings (2 agents at a time).
2. Fill Finance's screenshot gaps and re-check the PO-sheet badges.
3. `python build.py` to regenerate the index and PDFs.
4. Commit the manual files when the user asks.
