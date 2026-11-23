# User manual: authoring conventions

Design reference: `payment-request-page.html` (one A4-landscape sheet = one screen / tab / state).
Shared styles: `css/manual.css`. Output per module: `<module>.html` (many `<section class="page" id="slug">`), images in `img/<module>/`.
`index.html` (built last) links to every page as `<module>.html#slug`; PDFs are exported from each HTML.

## Page anatomy (copy this)
```html
<section class="page" id="price-analysis-list">
  <div class="eyebrow"><a href="index.html">Index</a> · Procurement · Price Analysis</div>
  <h1>Price Analysis — list and filters</h1>
  <p class="sub">one-line purpose</p>
  <div class="legend"><div><span class="b" style="position:static;margin:0;width:5mm;height:5mm;box-shadow:none">1</span> Option on screen</div><div><i></i> Command / function</div></div>
  <div class="main">
    <div class="screen"><div class="crop">
      <img src="img/procurement/price-analysis-list.png" alt="...">
      <div class="b" style="left:12.5%;top:8.2%">1</div>   <!-- % of the cropped image -->
    </div></div>
    <div class="cards">
      <div class="card"><h3><b>1</b>Title</h3><span class="tag">Click → what happens</span><p>Short plain-English explanation.</p></div>
    </div>
  </div>
  <div class="foot"><span class="ph">Draft v1</span><span>Backend 73f5d22 · Frontend bd07481</span></div>
</section>
```
Rules: max 8 cards per page (split into more pages otherwise; cards must not overflow the 210mm sheet); screenshot is a tight crop of the real app (never mock-ups, never invented screens); tag = `Verb → result`; plain language for non-technical staff; mention required fields, defaults and limits only when verified in code/UI.
Status pages use `.panel` + `table.st` + `.pill` (columns: Status · Meaning · Who sets it · What the user can do next). Document EVERY status of every list/detail on the screen (read the enum/constants in code, and confirm against the UI).
Module HTML head: `<link rel="stylesheet" href="css/manual.css">`, `<title>` = module name. First page of a module = module overview (what the module is for, screen list, and where it sits in the business flow).

## Business flow (what the company does; every module must fit into it)
1. Procurement > Price Analysis: pick a product -> create analysis screen -> enter different supplier rates for the same product -> Save -> sent to approvers per Settings > Approvals rules -> approvers log in and approve/reject one of the suppliers. On approval, notifications go to people configured on Settings > Approvals > Notification tab.
2. Create Purchase Order -> approved in order (1st approver, then 2nd...) per approval rules -> on approve/reject, people from the Notification tab are told to create a payment request for the PO.
3. Finance > Payment Request, 4 "Paying against" tabs: Invoice (any expense payment; every entry has an expense type), Purchase Order, Sample (samples seen on PO screen and Inventory Management > Samples create flow), Shipment (WFS/FBA shipments created in Inventory Management > Shipments). Expense types come from Finance > Cost Center. If PO currency differs from payment currency, an exchange rate (current date) converts the amount to pay.
4. Payment request created -> approvers notified (Settings > Approvals) -> approved -> moves to Finance > Payment Process where notified users upload documents and pay (full or split); statuses change accordingly.
5. Purchase Invoice is created against a PO. Packaging List is created against a PO and gets attached to a Container.
6. Scanning: sessions scan product UPCs from Shipping > Orders, Inventory Management > Shipments and Inbound Receiving; every session is recorded under Scanning > Sessions.

## Capture
Logged-in Chrome (user's own sign-in) runs with CDP on 127.0.0.1:9222; app on http://localhost:5100, API on 3001. Use `playwright-core` (see scratchpad cap/shot.js): connectOverCDP, `ctx.newPage()`, viewport 1440x900, `waitUntil:'domcontentloaded'` + wait (the app holds an SSE stream open, never use networkidle), close your page when done. Crop with PIL. Compute badge % from `getBoundingClientRect()` of the real elements so badges land exactly on the option.

## SUMMARIZED EDITION (overrides page counts above)
Target per module: 4-6 sheets TOTAL: (1) overview + how it fits the business flow, (2-4) key-screen sheets with real screenshot + numbered callouts, (last) one status cheat-sheet sheet covering every status of the module's main records (`table.st`). No per-tab or per-dialog sheets: mention secondary screens inside the cards. Max 6 cards per sheet, one-line card text. Reuse screenshots already in img/<module>/ when they still match the app; capture only what is missing. Run captures one page at a time with 90s timeouts and close pages in finally{} (Chrome is shared). Do not write prose beyond the cards.
