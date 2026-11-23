"""Rebuild index.html from every <module>.html and export PDFs. Run: python build.py"""
import re, subprocess, pathlib, html
d = pathlib.Path(__file__).parent
mods = [("procurement","Procurement"),("finance","Finance"),("containers","Containers"),("shipping","Shipping"),
        ("channel-inventory","Channel Inventory"),("inventory-management","Inventory Management"),
        ("scanning","Scanning Sessions"),("settings","Settings")]
toc, pending = [], []
for slug, name in mods:
    f = d / f"{slug}.html"
    if not f.exists(): pending.append(name); continue
    t = f.read_text(encoding="utf8")
    secs = re.findall(r'<section class="page" id="([^"]+)".*?<h1[^>]*>(.*?)</h1>', t, re.S)
    rows = "".join(f'<a href="{slug}.html#{i}">{re.sub("<[^>]+>","",h)}<span>p.{n}</span></a>' for n,(i,h) in enumerate(secs,1))
    toc.append(f'<h2>{name} <a style="display:inline;border:0;float:right" href="{slug}.pdf">PDF</a></h2>{rows}')
    css = (d/"css/manual.css").resolve()
    subprocess.run(["C:/Program Files/Google/Chrome/Application/chrome.exe","--headless=new","--disable-gpu",
        f"--user-data-dir={d/'.pdfprofile'}","--no-pdf-header-footer",f"--print-to-pdf={d/(slug+'.pdf')}",f.resolve().as_uri()],
        capture_output=True, timeout=180)
note = f'<p class="sub">Not written yet: {", ".join(pending)}.</p>' if pending else ""
(d/"index.html").write_text(f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Beddora user manual</title>
<link rel="stylesheet" href="css/manual.css"></head><body><section class="page" id="index">
<div class="eyebrow">Beddora · User manual</div><h1>Index — click a screen to open it</h1>{note}
<div class="toc">{"".join(toc)}</div>
<div class="foot"><span class="ph">Draft v1</span><span>Backend 73f5d22 · Frontend bd07481</span></div></section></body></html>''', encoding="utf8")
subprocess.run(["C:/Program Files/Google/Chrome/Application/chrome.exe","--headless=new","--disable-gpu",f"--user-data-dir={d/'.pdfprofile'}","--no-pdf-header-footer",f"--print-to-pdf={d/'index.pdf'}",(d/'index.html').resolve().as_uri()],capture_output=True,timeout=120)
print("built; pending:", pending)
