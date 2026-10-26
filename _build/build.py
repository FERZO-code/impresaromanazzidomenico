# -*- coding: utf-8 -*-
"""Genera le pagine HTML del sito in ../site.

    python3 _build/build.py

Testi, foto e struttura stanno qui; stile e comportamento in
site/assets/css/style.css e site/assets/js/main.js.
"""
import os, html, datetime, re as _re
from string import Template

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", "site"))
SITE_URL = "https://www.impresaromanazzidomenico.it/"
TEL_D, TEL_G = "3471769861", "3475679127"
EMAIL = "domrom@hotmail.it"
ADDRESS = "Via Falcone 12, 70018 Rutigliano (BA)"
MAPS = "https://www.google.com/maps/search/?api=1&amp;query=Via+Falcone+12+70018+Rutigliano+BA"
IG_PROFILE = "https://www.instagram.com/impresaromanazzidomenico/"
VIDEO_DIR = "assets/video/"
MAILTO = "mailto:domrom@hotmail.it?subject=Richiesta%20di%20sopralluogo&amp;body=Buongiorno%2C%0A%0Avorrei%20un%20sopralluogo%20per%3A%0A%0AAmbiente%20%28bagno%2C%20cucina%2C%20terrazzo%2C%20casa%20intera...%29%3A%20%0AMetri%20quadri%2C%20anche%20a%20occhio%3A%20%0AMateriale%20gi%C3%A0%20scelto%20%28formato%20e%20marca%29%2C%20se%20c%27%C3%A8%3A%20%0AComune%3A%20%0AQuando%20vorrei%20iniziare%3A%20%0A%0AIl%20mio%20numero%20di%20telefono%3A%20%0A"

def esc(s): return html.escape(s, quote=True)

# Versione degli asset: cambia da sola quando cambia il file, così chi ha
# già visitato il sito non resta con il vecchio CSS/JS in cache.
import hashlib
def asset(path):
    data = open(os.path.join(ROOT, path), "rb").read()
    return "%s?v=%s" % (path, hashlib.md5(data).hexdigest()[:8])

ICONS = {
 "phone":'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
 "mail":'<rect x="2" y="4" width="20" height="16" rx="1"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
 "arrow":'<path d="M5 12h14M13 6l6 6-6 6"/>',
 "close":'<path d="M18 6 6 18M6 6l12 12"/>',
 "left":'<path d="m15 18-6-6 6-6"/>',
 "right":'<path d="m9 18 6-6-6-6"/>',
}
def icon(n, cls="ico"):
    return ('<svg class="%s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
            'stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true" focusable="false">%s</svg>'
            % (cls, ICONS[n]))

# ---- foto: slug -> (orientamento, categorie, alt, didascalia) ----
PHOTOS = {
 "bagno-lavabi-01":            ("L","bagni","Bagno rivestito in gres effetto Calacatta con doppio lavabo in vetro ambra e specchio retroilluminato","Bagno in Calacatta"),
 "bagno-lastre-blu-01":        ("L","bagni formati","Bagno con porta a filo muro rivestita in lastra blu metallizzata e lavabo su piano scuro","Porta a filo in lastra blu"),
 "bagno-lavabo-nicchia-01":    ("L","bagni","Lavabo in appoggio con specchio e parete in lastre di grande formato","Lavabo e parete in lastre"),
 "lavabo-oro-01":              ("L","bagni","Lavabo in vetro ambra su piano in gres scuro con rubinetteria a parete","Lavabo in vetro ambra"),
 "lavabo-oro-dettaglio-01":    ("L","bagni","Dettaglio del bordo del lavabo in vetro ambra appoggiato sul piano in gres","Dettaglio del piano"),
 "calacatta-rubinetteria-01":  ("L","bagni","Rubinetteria a parete incassata nel rivestimento in gres effetto Calacatta","Rubinetteria incassata"),
 "wc-cabine-01":               ("L","bagni","Cabine WC rivestite a tutta altezza in gres effetto Calacatta","Cabine a tutta altezza"),
 "calacatta-dettaglio-01":     ("L","bagni formati","Comandi a parete incassati a filo nella lastra effetto Calacatta","Comandi a filo lastra"),
 "calacatta-angolo-01":        ("L","formati","Angolo fra due lastre effetto Calacatta con taglio a 45 gradi e giunto continuo","Angolo a 45 gradi"),
 "calacatta-parete-01":        ("L","formati","Parete rivestita con lastre effetto Calacatta a venatura continua","Venatura continua"),
 "lastre-blu-corridoio-01":    ("L","formati","Corridoio con pareti e porte a filo muro rivestite in lastre blu metallizzate","Corridoio in lastre blu"),
 "lastre-blu-porta-01":        ("L","formati","Porta a filo muro rivestita in lastra blu con maniglia e placca nere","Porta a filo muro"),
 "lastre-blu-porta-02":        ("P","formati","Parete in lastra blu metallizzata con maniglia e serratura nere","Ferramenta su lastra"),
 "lastre-blu-dettaglio-01":    ("L","formati","Dettaglio della texture della lastra blu accanto al vano lavabo","Texture della lastra"),
 "lastre-bronzo-porta-01":     ("P","formati","Porta rivestita in lastra effetto tessuto bronzo con ferramenta nera","Lastra effetto tessuto"),
 "panca-calacatta-01":         ("L","formati","Panca monolitica realizzata in lastre effetto Calacatta con spigoli a 45 gradi","Panca monolitica"),
 "scala-calacatta-01":         ("L","scale","Scala con gradini scuri, parapetto in vetro e vano rivestito in Calacatta","Scala in Calacatta"),
 "vano-scala-calacatta-01":    ("L","scale formati","Vano scala rivestito a tutta altezza con lastre effetto Calacatta","Vano scala in lastre"),
 "scala-led-01":               ("P","scale","Scala con alzate in gres e gradini illuminati da profili LED","Gradini con LED"),
 "scala-vetro-alto-01":        ("P","scale","Scala vista dall'alto con parapetto in vetro e corrimano","Scala dall'alto"),
 "scala-vetro-alto-02":        ("P","scale","Vano scala con parapetto in vetro e gradini in gres","Vano scala e vetro"),
 "soggiorno-parete-tv-01":     ("L","interni","Soggiorno con parete attrezzata in gres effetto marmo e mensola in legno","Parete attrezzata"),
 "soggiorno-parete-tv-02":     ("P","interni","Dettaglio della parete TV in gres effetto marmo con luce radente","Luce radente sul gres"),
 "zona-pranzo-01":             ("P","interni","Zona pranzo con pavimento in gres effetto legno","Pavimento effetto legno"),
 "corridoio-legno-01":         ("P","interni","Corridoio con pavimento in gres effetto legno e illuminazione a soffitto","Corridoio effetto legno"),
 "ingresso-legno-01":          ("L","interni","Ingresso con pavimento effetto legno e parete decorativa","Ingresso"),
 "bagno-specchio-01":          ("P","bagni interni","Bagno con specchio tondo retroilluminato e rivestimento effetto marmo","Specchio retroilluminato"),
 "bagno-vasca-01":             ("P","bagni interni","Bagno padronale con vasca freestanding e pavimento in gres effetto legno","Bagno con vasca"),
 "bagno-vasca-02":             ("P","bagni interni","Vasca freestanding con rivestimento effetto marmo e finestra","Vasca freestanding"),
 "posa-colla-01":              ("P","cantiere","Stesura del collante con spatola dentata prima della posa della lastra","Stesura del collante"),
 "taglio-piastrella-01":       ("P","cantiere","Taglio di una lastra con tagliapiastrelle professionale","Taglio della lastra"),
 "team-01":                    ("T","cantiere","Domenico e Giuseppe Romanazzi in cantiere","Domenico e Giuseppe"),
 "team-02":                    ("T","cantiere","Il team di Impresa Romanazzi Domenico in cantiere","La squadra RD"),
 "bagno-calacatta-lavabi-02":  ("L","bagni formati","Bagno rivestito a tutta altezza in lastre di gres laminato effetto Calacatta, con lavabi in vetro ambra su piano scuro e specchi retroilluminati","Lastre a tutta altezza"),
 "terrazzo-mapeguard-01":      ("W","cantiere","Terrazzo visto dal drone durante la posa del tappetino impermeabilizzante blu Mapei Mapeguard WP 200, con due operai al lavoro","Terrazzo in Mapeguard WP 200"),
}
DIMS = {"L": (1800,1200), "P": (1200,1800), "T": (1350,1800), "W": (1800,1424)}
P = "assets/img/photos/"

def width_of(full_w, long_side):
    """Larghezza reale della versione ridotta: lato lungo = long_side, e
    dimensioni sempre PARI. Con dimensioni dispari l'AVIF prodotto da macOS
    risulta caricato ma vuoto in Chrome (verificato: tutte le 33 versioni
    medie a 733/825 px erano invisibili)."""
    w = int(full_w * long_side / 1800.0)   # troncato, come fa sips
    return w + (w % 2)

def check_photos():
    """Blocca la generazione se una foto ha dimensioni dispari o diverse da
    quelle dichiarate nei srcset."""
    import subprocess
    errs = []
    for slug, (o, _, _, _) in PHOTOS.items():
        for z, L in (("sm", 640), ("md", 1100), ("lg", 1800)):
            for ext in ("avif", "jpg"):
                f = os.path.join(ROOT, P, "%s-%s.%s" % (slug, z, ext))
                out = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", f],
                                     capture_output=True, text=True).stdout
                w = int(_re.search(r"pixelWidth: (\d+)", out).group(1))
                h = int(_re.search(r"pixelHeight: (\d+)", out).group(1))
                if w % 2 or h % 2: errs.append("%s: dimensioni dispari %dx%d" % (os.path.basename(f), w, h))
                if w != width_of(DIMS[o][0], L): errs.append("%s: larga %d, dichiarata %d" % (os.path.basename(f), w, width_of(DIMS[o][0], L)))
    if errs:
        raise SystemExit("Foto non valide:\n  " + "\n  ".join(errs))
    print("foto verificate: %d file, dimensioni pari e coerenti" % (len(PHOTOS) * 6))

def srcsets(slug, sizes=("sm","md","lg")):
    """Il descrittore "w" deve essere la larghezza vera del file. Le foto sono
    ridotte sul lato LUNGO (640/1100/1800), quindi una verticale "md" è larga
    733 px, non 1100: dichiararla 1100 fa scegliere al browser file troppo
    piccoli e le foto verticali escono sgranate."""
    b = P + slug
    full_w = DIMS[PHOTOS[slug][0]][0]
    W = {z: width_of(full_w, L) for z, L in (("sm", 640), ("md", 1100), ("lg", 1800))}
    avif = ", ".join("%s-%s.avif %dw" % (b, z, W[z]) for z in sizes)
    jpg = ", ".join("%s-%s.jpg %dw" % (b, z, W[z]) for z in sizes)
    return avif, jpg

def img(slug, size="md", sizes="100vw", loading="lazy", cls=""):
    """<picture>: AVIF (circa il 60% più leggero) con ripiego JPEG."""
    o, cat, alt, cap = PHOTOS[slug]
    w, h = DIMS[o]
    avif, jpg = srcsets(slug)
    return ('<picture><source type="image/avif" srcset="%s" sizes="%s">'
            '<img src="%s%s-%s.jpg" srcset="%s" sizes="%s" width="%d" height="%d" alt="%s" '
            'loading="%s" decoding="async"%s></picture>'
            % (avif, sizes, P, slug, size, jpg, sizes, w, h, esc(alt), loading,
               (' class="%s"' % cls) if cls else ""))

def shot(slug, wide=False):
    o, cat, alt, cap = PHOTOS[slug]
    w, h = DIMS[o]
    b = P + slug
    avif, jpg = srcsets(slug, ("sm", "md"))
    sz = "(min-width:1180px) 25vw, (min-width:760px) 33vw, 50vw"
    return """<figure class="shot wipe%s" data-mosaic="3x3" data-cat="%s">
        <button type="button" data-lb-open data-full="%s-lg.jpg" data-full-avif="%s-lg.avif" data-w="%d" data-h="%d"
          data-alt="%s" data-caption="%s">
          <picture><source type="image/avif" srcset="%s" sizes="%s">
          <img src="%s-sm.jpg" srcset="%s" sizes="%s"
            width="%d" height="%d" alt="%s" loading="lazy" decoding="async"></picture>
          <span class="visually-hidden">Ingrandisci</span>
        </button>
        <figcaption aria-hidden="true">%s</figcaption>
      </figure>""" % (" shot--wide" if wide else "", cat, b, b, w, h, esc(alt), esc(cap),
                      avif, sz, b, jpg, sz, w, h, esc(alt), esc(cap))

def lines(*ls):
    """Titolo diviso in righe che salgono da una maschera."""
    out = ""
    for i, l in enumerate(ls):
        out += '<span class="reveal-line" style="--d:%dms"><span>%s</span></span>' % (i * 110, l)
    return out

NAV = [("index.html","Home"),("lavori.html","Lavori"),("impresa.html","Impresa"),("contatti.html","Contatti")]

check_photos()

# ============================ STRUTTURA COMUNE ============================
def bar():
    return """<a class="skip-link" href="#main">Salta al contenuto</a>
<div class="grid-lines" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span></div>
<header class="site-bar">
  <div class="wrap bar-inner">
    <a class="wordmark" href="index.html">
      <img src="assets/img/brand/logo-rd.png" width="34" height="34" alt="">
      <span class="brand-text"><b>Romanazzi Domenico</b><span>Piastrellisti e posatori</span></span>
      <span class="visually-hidden">— torna alla home</span>
    </a>
    <div class="bar-right">
      <a class="bar-tel" href="tel:+39%s">%s %s</a>
      <button class="burger" type="button" aria-expanded="false" aria-controls="nav-overlay">
        <i></i><i></i><i></i>
        <span class="visually-hidden">Apri e chiudi il menu</span>
      </button>
    </div>
  </div>
</header>""" % (TEL_D, icon("phone"), TEL_D)

def nav_overlay(current):
    """Menu a schermo intero. "Lavorazioni" non è una pagina: è un pulsante
    che apre una tendina con le quattro pagine servizio."""
    svc_files = [sp["file"] for sp in SERVICE_PAGES]
    in_svc = current in svc_files
    entries = [NAV[0], ("#lavorazioni", "Lavorazioni")] + NAV[1:]
    items = ""
    for i, (href, label) in enumerate(entries, 1):
        if href == "#lavorazioni":
            subs = "".join('<li><a href="%s"%s>%s</a></li>' % (
                sp["file"], ' aria-current="page"' if sp["file"] == current else "", esc(sp["short"]))
                for sp in SERVICE_PAGES)
            items += ('<li class="has-sub%s"><button class="nav-sub-toggle" type="button" aria-expanded="%s" aria-controls="nav-sub"%s>'
                      '<span class="n">0%d</span><span>%s</span><span class="sign" aria-hidden="true"></span></button>'
                      '<div class="nav-sub-wrap"><ul class="nav-sub" id="nav-sub">%s</ul></div></li>'
                      % (" is-open" if in_svc else "", "true" if in_svc else "false",
                         ' data-current' if in_svc else "", i, esc(label), subs))
            continue
        cur = ' aria-current="page"' if href == current else ""
        items += ('<li><a href="%s"%s><span class="n">0%d</span><span>%s</span></a></li>'
                  % (href, cur, i, esc(label)))
    return """<div class="nav-overlay" id="nav-overlay" hidden>
  <div aria-hidden="true"></div>
  <div class="wrap nav-body">
    <nav aria-label="Navigazione principale">
      <ul class="nav-list">%s</ul>
    </nav>
  </div>
  <div class="wrap">
    <dl class="nav-foot">
      <div><dt>Telefono</dt><dd><a href="tel:+39%s">%s</a> · <a href="tel:+39%s">%s</a></dd></div>
      <div><dt>E-mail</dt><dd><a href="mailto:%s">%s</a></dd></div>
      <div><dt>Sede</dt><dd><a href="%s" target="_blank" rel="noopener">%s</a></dd></div>
    </dl>
  </div>
</div>""" % (items, TEL_D, TEL_D, TEL_G, TEL_G, EMAIL, EMAIL, MAPS, esc(ADDRESS))

def footer():
    links = "".join('<li><a href="%s">%s</a></li>' % (h, esc(l)) for h, l in NAV)
    svc_links = "".join('<li><a href="%s">%s</a></li>' % (sp["file"], esc(sp["short"])) for sp in SERVICE_PAGES)
    return """<footer class="site-footer">
  <div class="wrap">
    <div class="foot-cta">
      <p class="label rise">Il prossimo cantiere</p>
      <h2 class="rise">%s</h2>
      <p class="lede rise" style="margin-top:32px">Chiamaci e dicci cosa devi fare. Se il lavoro è nelle nostre corde te lo diciamo subito, e fissiamo il sopralluogo.</p>
      <p class="rise" style="margin-top:32px;display:flex;flex-wrap:wrap;gap:12px">
        <a class="btn btn--flare" href="tel:+39%s">%s Chiama %s</a>
        <a class="btn btn--line" href="%s">%s Scrivi</a>
      </p>
    </div>
    <div class="foot-grid">
      <div class="foot-mark">
        <img src="assets/img/brand/logo-rd.png" width="44" height="44" alt="Marchio Romanazzi Domenico">
        <p>Impresa di piastrellisti e posatori a Rutigliano, provincia di Bari. Massetti, impermeabilizzazioni, pavimenti, rivestimenti e gres laminato a grande formato.</p>
      </div>
      <div>
        <h3>Pagine</h3>
        <ul class="foot-links">%s</ul>
      </div>
      <div>
        <h3>Lavorazioni</h3>
        <ul class="foot-links">%s</ul>
      </div>
      <div>
        <h3>Contatti</h3>
        <ul class="foot-links">
          <li><a href="tel:+39%s">Domenico · %s</a></li>
          <li><a href="tel:+39%s">Giuseppe · %s</a></li>
          <li><a href="mailto:%s">%s</a></li>
          <li><a href="%s" target="_blank" rel="noopener">%s</a></li>
        </ul>
      </div>
    </div>
    <div class="foot-bottom">
      <span>© <span data-year>2026</span> Impresa Romanazzi Domenico</span>
      <a class="replay" href="index.html?intro">Rivedi l'apertura</a>
      <span>Lun–Ven 7:00–15:00 · Sab 7:00–13:00</span>
    </div>
  </div>
</footer>
<div class="callbar" data-callbar hidden>
  <a class="btn btn--flare" href="tel:+39%s">%s Chiama</a>
  <a class="btn btn--line" href="%s">%s Scrivi</a>
</div>
<div class="peek" aria-hidden="true"><img alt="" decoding="async"></div>
<dialog id="lightbox" class="lightbox" aria-label="Galleria fotografica">
  <div class="lb-bar">
    <p class="lb-count" data-lb-count>1 / 1</p>
    <button class="lb-btn" type="button" data-lb-close>%s<span class="visually-hidden">Chiudi</span></button>
  </div>
  <div class="lb-stage"><img data-lb-image alt="" width="1800" height="1200"></div>
  <div class="lb-foot">
    <p class="lb-cap" data-lb-caption></p>
    <div class="lb-nav">
      <button class="lb-btn" type="button" data-lb-prev>%s<span class="visually-hidden">Precedente</span></button>
      <button class="lb-btn" type="button" data-lb-next>%s<span class="visually-hidden">Successiva</span></button>
    </div>
  </div>
</dialog>
<script src="%s" defer></script>""" % (
    lines("Parliamo del", '<span class="flare">tuo cantiere.</span>'),
    TEL_D, icon("phone"), TEL_D, MAILTO, icon("mail"), links, svc_links,
    TEL_D, TEL_D, TEL_G, TEL_G, EMAIL, EMAIL, MAPS, esc(ADDRESS),
    TEL_D, icon("phone"), MAILTO, icon("mail"),
    icon("close"), icon("left"), icon("right"), asset("assets/js/main.js"))

LD = """<script type="application/ld+json">
{"@context":"https://schema.org","@type":"HomeAndConstructionBusiness",
 "@id":"%(u)s#impresa","name":"Impresa Romanazzi Domenico",
 "description":"Piastrellisti e posatori a Rutigliano (BA): massetti, impermeabilizzazioni, pavimenti, rivestimenti, piatti doccia e gres laminato a grande formato.",
 "url":"%(u)s","image":"%(u)sassets/img/photos/bagno-lavabi-01-lg.jpg",
 "logo":"%(u)sassets/img/brand/logo-rd.png",
 "telephone":["+39%(t1)s","+39%(t2)s"],"email":"%(e)s",
 "address":{"@type":"PostalAddress","streetAddress":"Via Falcone 12","postalCode":"70018",
   "addressLocality":"Rutigliano","addressRegion":"BA","addressCountry":"IT"},
 "areaServed":{"@type":"AdministrativeArea","name":"Provincia di Bari"},
 "founder":{"@type":"Person","name":"Romanazzi Domenico"},
 "sameAs":["%(ig)s"],
 "openingHoursSpecification":[
   {"@type":"OpeningHoursSpecification","dayOfWeek":["Monday","Tuesday","Wednesday","Thursday","Friday"],"opens":"07:00","closes":"15:00"},
   {"@type":"OpeningHoursSpecification","dayOfWeek":"Saturday","opens":"07:00","closes":"13:00"}],
 "makesOffer":[
   {"@type":"Offer","itemOffered":{"@type":"Service","name":"Posa di pavimenti, rivestimenti e piatti doccia"}},
   {"@type":"Offer","itemOffered":{"@type":"Service","name":"Esecuzione di massetti"}},
   {"@type":"Offer","itemOffered":{"@type":"Service","name":"Impermeabilizzazione di superfici"}},
   {"@type":"Offer","itemOffered":{"@type":"Service","name":"Posa di gres laminato a grande formato"}}]}
</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"WebSite","@id":"%(u)s#sito",
 "name":"Impresa Romanazzi Domenico","alternateName":"Romanazzi Domenico",
 "url":"%(u)s","inLanguage":"it-IT","publisher":{"@id":"%(u)s#impresa"}}
</script>""" % {"u": SITE_URL, "t1": TEL_D, "t2": TEL_G, "e": EMAIL, "ig": IG_PROFILE}

# Deciso prima del primo disegno, così la pagina non lampeggia sotto l'apertura.
# Niente animazioni con "riduci movimento"; sessionStorage può non esistere
# (navigazione privata): in quel caso niente apertura, e il sito resta normale.
# Il timeout è una rete di sicurezza: se main.js non arriva, il velo sparisce.
HEAD_SCRIPT = """<script>
(function(d){var h=d.documentElement,m=window.matchMedia;
if(m&&m('(prefers-reduced-motion: reduce)').matches)return;
h.className+=' js-anim';
try{var s=window.sessionStorage,f=/[?&]intro(=|&|$)/.test(location.search),
k=f?'intro':(s.getItem('rd-nav')?'arrive':(s.getItem('rd-intro')?'':'intro'));
if(k){h.setAttribute('data-tiling',k);h.className+=' rd-cover';
if(k=='intro'){(new Image()).src='assets/img/photos/calacatta-parete-01-md.jpg';}
setTimeout(function(){h.classList.remove('rd-cover');},4500);}}catch(e){}
})(document);
</script>"""

FONTS = ("https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;700"
         "&family=Barlow:wght@400;600;700&display=swap")

def page(title, desc, current, body, og="bagno-lavabi-01", ld="", head_extra=""):
    url = SITE_URL + ("" if current == "index.html" else current)
    return """<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<meta name="description" content="%s">
<meta name="theme-color" content="#0B0B0B">
<link rel="canonical" href="%s">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Impresa Romanazzi Domenico">
<meta property="og:url" content="%s">
<meta property="og:title" content="%s">
<meta property="og:description" content="%s">
<meta property="og:image" content="%sassets/img/photos/%s-lg.jpg">
<meta property="og:image:width" content="1800">
<meta property="og:locale" content="it_IT">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/img/brand/logo-rd.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta name="apple-mobile-web-app-title" content="Romanazzi">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="%s" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="%s"></noscript>
%s
<link rel="stylesheet" href="%s">
%s
%s
</head>
<body>
%s
%s
<main id="main">
%s
</main>
%s
</body>
</html>
""" % (esc(title), esc(desc), url, url, esc(title), esc(desc), SITE_URL, og,
       FONTS.replace("&", "&amp;"), FONTS.replace("&", "&amp;"), head_extra,
       asset("assets/css/style.css"), ld, HEAD_SCRIPT,
       bar(), nav_overlay(current), body, footer())

# l'immagine più grande della home, richiesta subito: è quella che decide il
# tempo di caricamento percepito (LCP)
HERO_PRELOAD = """<link rel="preload" as="image" type="image/avif" fetchpriority="high" media="(min-width: 760px)"
  imagesrcset="assets/img/photos/bagno-lavabi-01-md.avif 1100w, assets/img/photos/bagno-lavabi-01-lg.avif 1800w" imagesizes="100vw">
<link rel="preload" as="image" type="image/avif" fetchpriority="high" media="(max-width: 759.98px)"
  imagesrcset="assets/img/photos/team-01-sm.avif 480w, assets/img/photos/team-01-md.avif 826w" imagesizes="100vw">"""

def write(name, content):
    if name.endswith(".html") and name != "404.html":
        t = html.unescape(_re.search(r"<title>(.*?)</title>", content).group(1))
        d = html.unescape(_re.search(r'<meta name="description" content="(.*?)"', content).group(1))
        if len(t) > 65: print("  ATTENZIONE %s: titolo di %d caratteri (Google ne mostra ~60)" % (name, len(t)))
        if len(d) > 160: print("  ATTENZIONE %s: descrizione di %d caratteri (Google ne mostra ~155)" % (name, len(d)))
    with open(os.path.join(ROOT, name), "w", encoding="utf-8") as f:
        f.write(content)
    print("scritto", name, len(content))

# ============================ PAGINE SERVIZIO ============================
# Una pagina per lavorazione: è ciò che fa trovare il sito a chi cerca
# "impermeabilizzazione terrazzo Bari" e non il nome dell'impresa.
# Le risposte tecniche restano su indicazioni generali e verificabili:
# niente prezzi, garanzie o tempi promessi che l'impresa non ha confermato.
SERVICE_PAGES = [
 {"file": "posa-pavimenti-rivestimenti.html", "short": "Pavimenti e rivestimenti",
  "title": "Posa pavimenti e rivestimenti a Rutigliano | Romanazzi",
  "desc": "Pavimenti e rivestimenti in gres e ceramica, effetto legno e marmo, e docce a filo pavimento a Rutigliano e provincia di Bari. Chiama: 347 176 9861.",
  "h1": ("Pavimenti", "e rivestimenti", '<span class="flare">posati a regola.</span>'),
  "lede": "Gres, ceramica, effetto legno ed effetto marmo: posiamo pavimenti e rivestimenti per case, bagni e locali commerciali a Rutigliano e in provincia di Bari, con piatti doccia a filo pavimento su misura.",
  "photo": "bagno-vasca-01", "label": "La lavorazione",
  "h2": "Le fughe dritte non sono un caso.",
  "paras": [
   "Una posa ben fatta si riconosce da tre cose: le fughe che corrono dritte da una parete all'altra, i tagli nascosti dove l'occhio non arriva e le pendenze che portano l'acqua allo scarico senza ristagni. Sono i dettagli su cui lavoriamo ogni giorno, che si tratti di un bagno o di un appartamento intero.",
   "Prima di iniziare tracciamo la posa sulla stanza: decidiamo da dove partire, come distribuire i tagli e come allineare pavimento e rivestimento, così che le fughe a terra proseguano sulle pareti. Per le docce a filo pavimento prepariamo il sottofondo con le pendenze giuste e lo impermeabilizziamo prima di posare."],
  "steps": [("Rilievo e tracciamento", "Misuriamo la stanza, verifichiamo squadre e livelli e decidiamo da dove partire con la posa."),
            ("Fondo", "Controlliamo planarità e consistenza del sottofondo; dove serve lo correggiamo prima di posare."),
            ("Posa", "Collante adatto al materiale e al formato, distanziatori e livellatori per fughe regolari e superfici complanari."),
            ("Stuccatura e pulizia", "Stucco del colore scelto, sigillature nei giunti di dilatazione e pulizia finale del cantiere.")],
  "shots": ["bagno-vasca-01", "bagno-specchio-01", "zona-pranzo-01", "corridoio-legno-01"],
  "faq": [("Si può posare un pavimento nuovo sopra quello vecchio?",
           "Spesso sì, se il vecchio pavimento è ben ancorato e planare e se l'aumento di spessore non crea problemi con porte e soglie. Lo verifichiamo al sopralluogo: altrimenti conviene demolire e rifare il sottofondo."),
          ("Quanto deve essere larga la fuga?",
           "Dipende dal materiale e dal formato. Le piastrelle rettificate permettono fughe sottili, quelle non rettificate ne vogliono di più larghe per assorbire le piccole differenze di misura. In ogni caso non si posa a fuga zero: serve sempre uno spazio per i movimenti del materiale."),
          ("Cos'è una doccia a filo pavimento?",
           "È una doccia senza gradino, rivestita con lo stesso materiale del pavimento o con un piatto ribassato. Richiede un sottofondo con le pendenze verso lo scarico e un'impermeabilizzazione accurata, che facciamo prima della posa.")]},

 {"file": "massetti.html", "short": "Massetti",
  "title": "Massetti cementizi e anidritici a Rutigliano | Romanazzi",
  "desc": "Massetti cementizi e anidritici per pavimenti nuovi e riscaldamento a pavimento, con verifica dell'umidità prima della posa. Rutigliano e provincia di Bari.",
  "h1": ("Massetti", '<span class="flare">in bolla.</span>'),
  "lede": "Realizziamo massetti cementizi e anidritici per pavimenti nuovi e ristrutturazioni: la base piana e solida su cui poggia ogni posa.",
  "photo": "posa-colla-01", "label": "La lavorazione",
  "h2": "Lo strato che non si vede decide tutto.",
  "paras": [
   "Il massetto è lo strato fra il solaio e il pavimento. Non si vede, ma decide quasi tutto: se è fuori livello la posa ne eredita i difetti, se non è asciutto l'umidità può staccare il pavimento o macchiarlo nel tempo.",
   "Lavoriamo con massetti a base cementizia, i più diffusi, e anidritici, molto fluidi e adatti soprattutto sopra i pannelli del riscaldamento a pavimento. Prima di posare misuriamo l'umidità residua: si posa solo quando il massetto è pronto."],
  "steps": [("Verifica del solaio", "Controlliamo quote, impianti e isolamenti e fissiamo il livello finito del pavimento."),
            ("Getto", "Stendiamo il massetto alle quote stabilite, con i giunti necessari fra un ambiente e l'altro."),
            ("Stagionatura", "Il massetto deve asciugare per il tempo che gli serve: accelerare questa fase è la causa più comune di problemi."),
            ("Controllo dell'umidità", "Prima della posa misuriamo l'umidità residua e confermiamo che il fondo sia pronto.")],
  "shots": ["posa-colla-01", "taglio-piastrella-01", "corridoio-legno-01", "ingresso-legno-01"],
  "video": {"name": "massetto-getto", "w": 720, "h": 1280,
            "label": "In cantiere", "h2": ("Il getto,", '<span class="flare">dal vivo.</span>'),
            "text": "Il massetto arriva dal tubo della pompa e viene steso subito alle quote stabilite: uno dei nostri cantieri, durante il getto.",
            "aria": "Video verticale di un cantiere: due operai stendono il massetto che esce dal tubo della pompa, accanto a un muro in pietra.",
            "caption": "Durante il getto del massetto, con la pompa."},
  "faq": [("Quanto tempo deve asciugare un massetto?",
           "Dipende dal tipo di massetto, dallo spessore e dall'ambiente. Per i massetti cementizi tradizionali si usa spesso come riferimento circa una settimana per ogni centimetro di spessore, ma l'unico modo affidabile è misurare l'umidità residua prima della posa."),
          ("Che differenza c'è fra massetto cementizio e anidritico?",
           "Il cementizio è il più diffuso e versatile. L'anidritico, a base di solfato di calcio, è molto fluido, si livella quasi da solo e avvolge bene i tubi del riscaldamento a pavimento; teme però l'acqua, quindi non va usato in ambienti umidi o esterni senza protezione."),
          ("Il massetto va bene con il riscaldamento a pavimento?",
           "Sì, sia il cementizio sia l'anidritico si usano sopra i pannelli radianti. Prima di posare il pavimento l'impianto va acceso e portato in temperatura gradualmente, secondo le indicazioni del produttore, per completare l'asciugatura.")]},

 {"file": "impermeabilizzazioni.html", "short": "Impermeabilizzazioni",
  "title": "Impermeabilizzazione terrazzi e bagni a Rutigliano | Romanazzi",
  "desc": "Impermeabilizzazione di terrazzi, balconi, bagni, docce e piscine con guaine liquide e membrane sotto piastrella, a Rutigliano e in provincia di Bari.",
  "h1": ("Impermeabiliz&shy;zazioni", '<span class="flare">che durano.</span>'),
  "lede": "Impermeabilizziamo terrazzi, balconi, bagni, docce e piscine prima della posa, con guaine liquide e membrane sotto piastrella.",
  "photo": "terrazzo-mapeguard-01", "label": "La lavorazione",
  "h2": "Un'infiltrazione si fa vedere dopo mesi.",
  "paras": [
   "Un'infiltrazione raramente si vede subito: l'acqua passa da una fuga o da un angolo trascurato e si manifesta mesi dopo, sul soffitto del piano di sotto o con piastrelle che si staccano. Per questo l'impermeabilizzazione va fatta bene la prima volta.",
   "Sotto la piastrella stendiamo guaine e membrane impermeabili, rinforziamo angoli e raccordi con le pareti con bandelle dedicate e trattiamo scarichi e passaggi degli impianti, che sono i punti più delicati. Solo dopo si posa il pavimento."],
  "steps": [("Ispezione", "Verifichiamo il supporto, le pendenze verso gli scarichi e lo stato di eventuali vecchie impermeabilizzazioni."),
            ("Preparazione", "Puliamo e consolidiamo il fondo; dove le pendenze non bastano, le correggiamo."),
            ("Angoli e scarichi", "Bandelle e pezzi speciali negli angoli, nei raccordi con le pareti e attorno agli scarichi."),
            ("Stesura e posa", "Guaina o membrana su tutta la superficie, rispettando i tempi del produttore, poi la posa del rivestimento.")],
  "shots": ["calacatta-rubinetteria-01", "wc-cabine-01", "bagno-vasca-02", "lavabo-oro-01"],
  "video": {"name": "terrazzo-drone", "w": 1080, "h": 916,
            "label": "Dal drone", "h2": ("Un terrazzo,", '<span class="flare">visto dall\'alto.</span>'),
            "text": "Uno dei nostri cantieri ripreso dal drone durante la posa: il terrazzo viene impermeabilizzato con il tappetino Mapei Mapeguard WP 200, steso su tutta la superficie prima del pavimento.",
            "aria": "Ripresa aerea con il drone di un terrazzo durante la posa del tappetino impermeabilizzante Mapei Mapeguard WP 200, con un operaio al lavoro.",
            "caption": "Durante la posa: tappetino impermeabilizzante Mapei Mapeguard WP 200."},
  "faq": [("Si può impermeabilizzare un terrazzo senza togliere il pavimento?",
           "Esistono prodotti da stendere sopra le piastrelle esistenti, utili in alcuni casi. Quando però l'acqua passa sotto il pavimento o le pendenze sono sbagliate, la soluzione che dura è rifare impermeabilizzazione e posa. Lo valutiamo al sopralluogo."),
          ("Anche la doccia va impermeabilizzata?",
           "Sì, soprattutto se è a filo pavimento o rivestita in piastrelle: fughe e stucchi da soli non sono impermeabili. La guaina sotto le piastrelle protegge muri e solai dall'acqua che filtra nel tempo."),
          ("Che cos'è una guaina liquida?",
           "È un prodotto che si stende a rullo o a pennello e, asciugando, forma uno strato continuo ed elastico, senza giunzioni. Si usa sotto le piastrelle in bagni, docce, balconi e terrazzi.")]},

 {"file": "grandi-formati.html", "short": "Grandi formati",
  "title": "Posa grandi formati e Kerlite a Rutigliano | Romanazzi",
  "desc": "Lastre in gres laminato sottile fino a tre metri su pareti, pavimenti, top e porte a filo muro. Attrezzatura certificata, Rutigliano e provincia di Bari.",
  "h1": ("Grandi formati", '<span class="flare">senza un salto.</span>'),
  "lede": "Posiamo lastre in gres laminato sottile fino a tre metri, come la Kerlite, su pareti, pavimenti, top e porte a filo muro, con attrezzatura certificata.",
  "photo": "calacatta-angolo-01", "label": "La lavorazione",
  "h2": "Poche fughe, nessun margine di errore.",
  "paras": [
   "Le lastre di grande formato cambiano un ambiente: poche fughe, superfici continue, venature che passano da un pezzo all'altro come in un blocco di marmo. Sono anche le più difficili da posare: sottili, grandi e pesanti, non perdonano un fondo fuori piano o un taglio sbagliato.",
   "Le movimentiamo con telai a ventosa, le tagliamo in cantiere con attrezzatura dedicata e le posiamo con doppia spalmatura di collante, sul fondo e sul retro della lastra, perché sotto non restino vuoti. Prima della posa scegliamo con te l'ordine delle lastre, così che la venatura prosegua dove deve."],
  "steps": [("Progetto delle lastre", "Decidiamo insieme ordine e orientamento delle lastre per far proseguire la venatura."),
            ("Fondo perfettamente piano", "Il grande formato vuole un supporto molto planare: lo verifichiamo e, se serve, lo correggiamo."),
            ("Movimentazione e taglio", "Telai a ventosa e attrezzatura certificata per trasportare, tagliare e forare le lastre senza rischi."),
            ("Doppia spalmatura", "Collante sul fondo e sul retro della lastra, per un appoggio pieno e senza vuoti.")],
  "shots": ["calacatta-angolo-01", "lastre-blu-corridoio-01", "panca-calacatta-01", "vano-scala-calacatta-01"],
  "video": {"name": "lastra-taglio", "w": 720, "h": 1280,
            "label": "Il taglio", "h2": ("Una lastra,", '<span class="flare">un taglio solo.</span>'),
            "text": "La lastra si incide con la guida di taglio, si apre con un colpo netto e se ne rifinisce il bordo a mano. Un errore qui significa buttare la lastra: per questo usiamo attrezzatura dedicata.",
            "aria": "Video verticale del taglio di una lastra in gres laminato: incisione con la guida, apertura del taglio e rifinitura del bordo.",
            "caption": "Taglio e rifinitura di una lastra in gres laminato."},
  "faq": [("Le lastre si possono posare sopra un vecchio rivestimento?",
           "In molti casi sì, ed è uno dei loro vantaggi: essendo sottili aggiungono pochi millimetri. Il supporto esistente però deve essere ben ancorato e molto planare. Lo verifichiamo al sopralluogo."),
          ("Perché serve la doppia spalmatura?",
           "Su una lastra grande anche un piccolo vuoto sotto la superficie può causare rotture o distacchi. Stendere il collante sia sul fondo sia sul retro della lastra garantisce un appoggio pieno su tutta la superficie."),
          ("Si possono rivestire anche porte e arredi?",
           "Sì: con il gres sottile realizziamo porte a filo muro, panche, top e piani rivestiti, con spigoli a 45 gradi che fanno sembrare il pezzo un blocco unico. Alcuni esempi sono nella galleria dei lavori.")]},
]

import json as _json, re as _re
def _plain(t): return _re.sub(r"<[^>]+>", "", t).replace("&shy;", "")

def ld_block(obj):
    return '<script type="application/ld+json">\n%s\n</script>' % _json.dumps(obj, ensure_ascii=False)

def breadcrumb(items):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": SITE_URL + u}
                                for i, (n, u) in enumerate(items)]}

def faq_ld(pairs):
    return {"@context": "https://schema.org", "@type": "FAQPage",
            "mainEntity": [{"@type": "Question", "name": q,
                            "acceptedAnswer": {"@type": "Answer", "text": _plain(a)}} for q, a in pairs]}

PROVIDER = {"@type": "HomeAndConstructionBusiness", "@id": SITE_URL + "#impresa",
            "name": "Impresa Romanazzi Domenico", "telephone": "+39" + TEL_D, "url": SITE_URL,
            "address": {"@type": "PostalAddress", "streetAddress": "Via Falcone 12", "postalCode": "70018",
                        "addressLocality": "Rutigliano", "addressRegion": "BA", "addressCountry": "IT"}}


# ============================ CONTENUTI CONDIVISI ============================
COUNTS = [("25","+","Anni di mestiere"),("10","+","Lavorazioni a catalogo"),
          ("1000","+","Clienti serviti"),("100","%","Clienti soddisfatti")]
counts = "".join(Template(
  '<div class="rise"><dt><span>$l</span><span class="ix">0$i</span></dt>'
  '<dd><span data-count="$n">$n</span><span class="u">$u</span></dd></div>'
).substitute(i=i, n=n, u=u, l=esc(l)) for i, (n, u, l) in enumerate(COUNTS, 1))

STEPS = [
 ("Chiamata","Un numero, non un modulo di contatto. Ci racconti cosa devi fare e in due minuti capiamo se siamo l'impresa giusta per quel lavoro."),
 ("Sopralluogo","Veniamo sul posto. Misuriamo, guardiamo i sottofondi e controlliamo cosa c'è sotto prima di promettere qualunque cosa."),
 ("Preventivo","Lavorazioni, materiali, tempi e costi messi per iscritto. Quello che leggi è quello che paghi."),
 ("Cantiere","Dalla firma si parte in uno o due mesi. Poi la squadra entra e non se ne va finché il lavoro non è chiuso."),
]
steps = "".join(Template(
  '<li class="step rise"><span class="n">0$i</span><h3>$t</h3><p>$d</p></li>'
).substitute(i=i, t=esc(t), d=esc(d)) for i, (t, d) in enumerate(STEPS, 1))

# ============================ HOME ============================
SERVICES = [
 ("Pavimenti, rivestimenti e piatti doccia",
  "Ambienti veri, dove nessun angolo è a novanta gradi. Tagliamo e montiamo sul posto pavimenti, rivestimenti a parete e piatti doccia su misura, con le fughe che filano diritte e le pendenze che scaricano davvero.",
  ["Formati su misura","Fughe allineate","Piatti doccia a filo"], "bagno-vasca-01"),
 ("Massetti cementizi e anidritici",
  "È il livello su cui poggia tutto quello che verrà dopo. Lo tiriamo in bolla, lo lasciamo asciugare per il tempo che serve e ne controlliamo l'umidità residua prima di consegnarlo alla posa.",
  ["Base cementizia","Base anidritica","Verifica dell'umidità"], "posa-colla-01"),
 ("Impermeabilizzazioni",
  "Terrazze, balconi, bagni e piscine. Guaine e membrane si posano una volta sola: le stendiamo come se dovessimo tornare noi, fra dieci anni, a rispondere di un'infiltrazione.",
  ["Terrazze e balconi","Box doccia","Vasche e piscine"], "terrazzo-mapeguard-01"),
 ("Gres laminato a grande formato",
  "Lastre sottili fino a tre metri, movimentate con telai a ventosa e tagliate con attrezzatura certificata. Pareti a tutta altezza, top monolitici, porte a filo muro e venature che proseguono da una lastra all'altra senza un salto.",
  ["Kerlite e gres sottile","Spigoli a 45°","Venatura continua"], "bagno-calacatta-lavabi-02"),
]
svc = ""
for i, (t, d, tags, ph) in enumerate(SERVICES, 1):
    tg = "".join("<li>%s</li>" % esc(x) for x in tags)
    link = SERVICE_PAGES[i - 1]["file"]
    svc += Template("""<article class="svc wipe">
      $im
      <div class="svc-body">
        <span class="num">0$i</span>
        <h3>$t</h3>
        <p>$d</p>
        <ul class="service-tags">$tg</ul>
        <a class="svc-more" href="$link">Come lo facciamo $iarrow<span class="visually-hidden">: $t</span></a>
      </div>
    </article>""").substitute(i=i, t=esc(t), d=esc(d), tg=tg, link=link, iarrow=icon("arrow"),
        im=img(ph, "md", sizes="(min-width:860px) 50vw, 100vw"))

# Schemi di posa: senza JavaScript l'elenco resta tutto leggibile;
# con JavaScript diventa un selettore e la tela ridisegna le piastrelle.
POSA = [
 ("dritta", "Dritta",
  "Le fughe si incrociano a croce, in linea perfetta. È la posa più pulita e moderna, e la più severa: ogni millimetro fuori squadra si vede.",
  "formati quadrati, bagni contemporanei, rivestimenti a parete."),
 ("verticale", "Verticale",
  "Listelli stretti e lunghi, come il 10x30, posati in piedi e allineati. Le fughe verticali portano lo sguardo verso l'alto e fanno sembrare la stanza più alta: per questo è una delle pose che ci chiedono di più nei bagni.",
  "rivestimenti dei bagni, box doccia, pareti dietro il lavabo."),
 ("sfalsata", "Sfalsata",
  "Ogni fila parte spostata rispetto alla precedente. Sui formati lunghi lo sfalsamento giusto è un terzo, non la metà: così la leggera curvatura delle lastre non crea scalini fra un pezzo e l'altro.",
  "effetto legno, formati rettangolari lunghi, corridoi."),
 ("spina", "Spina di pesce",
  "Listelli incastrati a V, inclinati di 45 gradi. Muove il pavimento e gli dà profondità, ma chiede un taglio preciso su ogni bordo della stanza.",
  "effetto parquet, soggiorni, ingressi di carattere."),
 ("diagonale", "Diagonale",
  "La griglia ruota di 45 gradi rispetto alle pareti. Allarga visivamente gli ambienti stretti e maschera i muri non perfettamente in squadra.",
  "stanze piccole o irregolari, cucine, ingressi."),
 ("grande", "Grande formato",
  "Poche lastre, pochissime fughe. La venatura prosegue da un pezzo all'altro come in un blocco unico: per questo ogni lastra va scelta e orientata prima della posa.",
  "pareti a tutta altezza, bagni in Calacatta, top e porte a filo."),
]
posa_items = "".join(Template(
  '<div class="posa-item" data-pattern="$k"><dt>$n</dt><dd><p>$d</p>'
  '<p class="posa-ideal"><strong>Ideale per</strong> $i</p></dd></div>'
).substitute(k=k, n=esc(n), d=esc(d), i=esc(i)) for k, n, d, i in POSA)

PROJECTS = [
 ("Bagno in Calacatta","Rivestimento a tutta altezza, lavabi in vetro ambra","bagno-lavabi-01"),
 ("Lastre blu metallizzate","Pareti e porte a filo muro in grande formato","lastre-blu-corridoio-01"),
 ("Vano scala monolitico","Gres a venatura continua, parapetto in vetro","vano-scala-calacatta-01"),
 ("Bagno padronale","Vasca freestanding e pavimento effetto legno","bagno-vasca-01"),
 ("Zona giorno","Parete attrezzata in gres effetto marmo","soggiorno-parete-tv-01"),
]
proj = ""
for i, (t, m, ph) in enumerate(PROJECTS, 1):
    proj += Template("""<li class="project rise">
      <a href="lavori.html" data-peek="$peek">
        <span class="n">0$i</span>
        <h3>$t</h3>
        <span class="meta">$m</span>
      </a>
    </li>""").substitute(i=i, t=esc(t), m=esc(m), peek=P + ph + "-sm.jpg")

home = Template("""
<section class="hero">
  <div class="hero-media" aria-hidden="true">
    <picture>
      <source media="(min-width: 760px)" type="image/avif"
        srcset="assets/img/photos/bagno-lavabi-01-md.avif 1100w, assets/img/photos/bagno-lavabi-01-lg.avif 1800w"
        sizes="100vw" width="1800" height="1200">
      <source media="(min-width: 760px)"
        srcset="assets/img/photos/bagno-lavabi-01-md.jpg 1100w, assets/img/photos/bagno-lavabi-01-lg.jpg 1800w"
        sizes="100vw" width="1800" height="1200">
      <source type="image/avif"
        srcset="assets/img/photos/team-01-sm.avif 480w, assets/img/photos/team-01-md.avif 826w"
        sizes="100vw" width="1350" height="1800">
      <img class="hero-base" src="assets/img/photos/team-01-md.jpg"
        srcset="assets/img/photos/team-01-sm.jpg 480w, assets/img/photos/team-01-md.jpg 826w"
        sizes="100vw" width="1350" height="1800" alt="" loading="eager" decoding="async" fetchpriority="high">
    </picture>
    <img class="hero-alt" data-hover-src="assets/img/photos/team-01-md.jpg"
      data-hover-srcset="assets/img/photos/team-01-md.avif 826w, assets/img/photos/team-01-lg.avif 1350w"
      sizes="100vw" width="1350" height="1800" alt=""
      loading="lazy" decoding="async" fetchpriority="low">
  </div>
  <div class="wrap hero-inner">
    <p class="label">Impresa Romanazzi Domenico — Rutigliano (BA)</p>
    <h1>$h1</h1>
    <div class="hero-foot">
      <p class="rise" style="--d:420ms">Piastrellisti e posatori da oltre venticinque anni. Massetti, impermeabilizzazioni, pavimenti, rivestimenti e lastre in gres da tre metri: tutto quello che sta fra il grezzo e la finitura.</p>
      <p class="hero-cta rise" style="--d:520ms">
        <a class="btn btn--flare" href="tel:+39$tel">$iphone Chiama ora</a>
        <a class="btn btn--line" href="lavori.html">$iarrow I lavori</a>
      </p>
    </div>
  </div>
</section>

<section class="sec" aria-labelledby="manifesto-h">
  <div class="wrap statement">
    <div>
      <p class="label rise">L'impresa</p>
      <h2 id="manifesto-h" style="margin-top:24px">$h2a</h2>
    </div>
    <div class="statement-copy">
      <p class="rise">Siamo un'impresa familiare di Rutigliano, in provincia di Bari. Due soci, una squadra fissa e nessun subappalto sulla parte che conta: chi viene a fare il sopralluogo è lo stesso che poi stende il collante.</p>
      <p class="rise">Lavoriamo su appartamenti privati, ristrutturazioni complete e spazi commerciali. Il nostro mestiere sta quasi tutto in quello che non si vedrà più: se dopo dieci anni una fuga non si è aperta e un balcone non gocciola, il merito è di lì.</p>
      <p class="rise" style="margin-top:16px"><a class="btn btn--line" href="impresa.html">$iarrow Chi siamo</a></p>
    </div>
  </div>
</section>

<section class="sec sec--dark sec--tight" aria-labelledby="numeri-h">
  <div class="wrap">
    <h2 id="numeri-h" class="visually-hidden">I numeri dell'impresa</h2>
    <dl class="counts">$counts</dl>
  </div>
</section>

<section class="sec" aria-labelledby="servizi-h">
  <div class="wrap">
    <p class="label rise">Cosa facciamo</p>
    <h2 id="servizi-h" class="rise" style="font-size:var(--d-2);margin:24px 0 24px">$h2b</h2>
    <p class="lede rise" style="margin-bottom:48px">Ogni lavorazione è una piastrella del cantiere. Le facciamo tutte noi, nello stesso ordine in cui si posano.</p>
    <div class="svc-grid">$svc</div>
  </div>
</section>

<section class="sec sec--dark" aria-labelledby="posa-h" data-posa>
  <div class="wrap posa">
    <div class="posa-copy">
      <p class="label rise">Schemi di posa</p>
      <h2 id="posa-h" class="rise" style="font-size:var(--d-2);margin:24px 0 24px">$h2posa</h2>
      <p class="lede rise">Il disegno della posa cambia una stanza più del colore della piastrella. Prova gli schemi che posiamo più spesso.</p>
      <div class="posa-tabs" role="group" aria-label="Scegli uno schema di posa" hidden></div>
    </div>
    <div class="posa-stage rise">
      <div class="posa-canvas" data-posa-canvas aria-hidden="true">
        <svg class="posa-vein" viewBox="0 0 100 75" preserveAspectRatio="none" focusable="false">
          <path pathLength="100" d="M-4 10 C 14 18, 26 4, 42 20 S 66 50, 82 40 S 98 58, 106 70"/>
          <path pathLength="100" d="M-4 46 C 10 40, 22 58, 38 52 S 58 30, 74 34 S 96 22, 106 18"/>
        </svg>
      </div>
      <dl class="posa-list">$posa</dl>
    </div>
  </div>
</section>

<section class="sec sec--paper2" aria-labelledby="video-h">
  <div class="wrap statement">
    <div>
      <p class="label rise">Il video</p>
      <h2 id="video-h" style="margin-top:24px">$h2e</h2>
      <p class="lede rise" style="margin-top:32px">Sedici secondi di cantieri veri: bagni in gres a tutta altezza, tagli, posa, finiture. Nessuna immagine di repertorio, sono tutti lavori nostri.</p>
      <p class="rise" style="margin-top:32px;display:flex;flex-wrap:wrap;gap:12px">
        <a class="btn btn--line" href="$igprofile" target="_blank" rel="noopener">$iarrow Seguici su Instagram</a>
      </p>
    </div>
    <figure class="video-card rise">
      <div class="video-frame wipe">
        <video class="rd-video" playsinline muted loop controls preload="none"
          poster="${videodir}rd-cantiere-poster.jpg" width="1280" height="720"
          aria-label="Video di presentazione dell'impresa: bagni rivestiti in gres effetto Calacatta, taglio e posa delle lastre in cantiere, e i recapiti dell'impresa.">
          <source src="${videodir}rd-cantiere-480.mp4" data-src-hd="${videodir}rd-cantiere-720.mp4" type="video/mp4">
          <p class="video-nofallback">Il tuo browser non riproduce questo video.
            <a href="${videodir}rd-cantiere-720.mp4">Scarica il video</a>.</p>
        </video>
      </div>
      <figcaption>Solido, preciso, impeccabile, duraturo &mdash; il nostro modo di lavorare.</figcaption>
    </figure>
  </div>
</section>

<section class="sec sec--dark" aria-labelledby="lavori-h">
  <div class="wrap">
    <p class="label rise">Selezione</p>
    <h2 id="lavori-h" class="rise" style="font-size:var(--d-2);margin:24px 0 56px">$h2c</h2>
    <ul class="projects">$proj</ul>
    <p class="rise" style="margin-top:48px"><a class="btn btn--flare" href="lavori.html">$iarrow Tutta la galleria</a></p>
  </div>
</section>

<section class="sec" aria-labelledby="metodo-h">
  <div class="wrap">
    <p class="label rise">Come si lavora</p>
    <h2 id="metodo-h" class="rise" style="font-size:var(--d-2);margin:24px 0 24px">$h2d</h2>
    <p class="lede rise" style="margin-bottom:48px">Quattro passaggi, posati in fila come le piastrelle di un corso. Nessuno si salta.</p>
    <ol class="steps">$steps</ol>
  </div>
</section>

<section class="sec sec--paper2 sec--tight" aria-labelledby="partner-h">
  <div class="wrap">
    <p class="label rise" id="partner-h">Materiali e attrezzature</p>
    <p class="lede rise" style="margin:24px 0 40px">Lavoriamo con marchi che conosciamo a fondo, perché su un cantiere il materiale sbagliato costa più del tempo perso.</p>
    <ul class="partners rise">
      <li><img src="assets/img/brand/partner-fassa.png" width="400" height="229" alt="Fassa Bortolo" loading="lazy"></li>
      <li><img src="assets/img/brand/partner-montolit.png" width="209" height="196" alt="Montolit" loading="lazy"></li>
      <li><img src="assets/img/brand/partner-raimondi.png" width="321" height="150" alt="Raimondi" loading="lazy"></li>
    </ul>
  </div>
</section>
""").substitute(
  h1=lines("Posa", '<span class="thin">senza</span>', '<span class="flare">compromessi.</span>'),
  tel=TEL_D, iphone=icon("phone"), iarrow=icon("arrow"),
  h2a=lines("Non vendiamo", "un servizio.", '<span class="flare">Vendiamo precisione.</span>'),
  h2b=lines("Quattro", "lavorazioni."),
  h2posa=lines("Stessa piastrella,", '<span class="flare">un\'altra stanza.</span>'),
  h2c=lines("Lavori", "recenti."),
  h2d=lines("Dal telefono", "alla consegna."),
  h2e=lines("Guardaci", '<span class="flare">lavorare.</span>'),
  igprofile=IG_PROFILE, videodir=VIDEO_DIR,
  counts=counts, svc=svc, posa=posa_items, proj=proj, steps=steps)

write("index.html", page(
  "Piastrellista a Rutigliano (BA) | Impresa Romanazzi Domenico",
  "Piastrellisti a Rutigliano: pavimenti, rivestimenti, docce, massetti, impermeabilizzazioni e grandi formati in provincia di Bari. Chiama: 347 176 9861.",
  "index.html", home, ld=LD, head_extra=HERO_PRELOAD))

# ============================ LAVORI ============================
GALLERY = [
 ("bagno-lavabi-01", True), ("calacatta-angolo-01", False), ("lastre-bronzo-porta-01", False),
 ("lavabo-oro-01", False), ("calacatta-parete-01", False), ("wc-cabine-01", True),
 ("lastre-blu-porta-02", False), ("lavabo-oro-dettaglio-01", False),
 ("lastre-blu-corridoio-01", True), ("scala-calacatta-01", False), ("panca-calacatta-01", False),
 ("calacatta-rubinetteria-01", False), ("bagno-lastre-blu-01", False),
 ("vano-scala-calacatta-01", True), ("lastre-blu-porta-01", False), ("bagno-lavabo-nicchia-01", False),
 ("lastre-blu-dettaglio-01", False), ("calacatta-dettaglio-01", False),
 ("bagno-vasca-01", False), ("bagno-specchio-01", False), ("bagno-vasca-02", False),
 ("soggiorno-parete-tv-01", True), ("soggiorno-parete-tv-02", False), ("zona-pranzo-01", False),
 ("corridoio-legno-01", False), ("ingresso-legno-01", False),
 ("scala-led-01", False), ("scala-vetro-alto-01", False), ("scala-vetro-alto-02", False),
 ("posa-colla-01", False), ("taglio-piastrella-01", False), ("team-01", False), ("team-02", False),
 ("bagno-calacatta-lavabi-02", True), ("terrazzo-mapeguard-01", True),
]
assert len(GALLERY) == len(PHOTOS), (len(GALLERY), len(PHOTOS))

FILTERS = [("all","Tutto"),("formati","Grandi formati"),("bagni","Bagni"),
           ("scale","Scale"),("interni","Interni"),("cantiere","Cantiere")]
filters = "".join(
  '<button class="filter" type="button" data-filter="%s" aria-pressed="%s">%s</button>'
  % (k, "true" if k == "all" else "false", esc(l)) for k, l in FILTERS)
gallery = "".join(shot(s, w) for s, w in GALLERY)

lavori = Template("""
<section class="page-head">
  <div class="wrap">
    <nav class="crumb" aria-label="Percorso"><ol><li><a href="index.html">Home</a></li><li aria-current="page">Lavori</li></ol></nav>
    <h1>$h1</h1>
    <p class="lede rise">Trentatré fotografie di cantieri chiusi. Bagni, scale, pareti in grande formato e interni completi. Tocca una foto per aprirla.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    <div class="filters" data-filters role="group" aria-label="Filtra per tipo di lavoro">$filters</div>
    <p class="gallery-status" data-gallery-status role="status" aria-live="polite"></p>
    <div class="gallery" data-gallery>$gallery</div>
  </div>
</section>

<section class="sec sec--dark" aria-labelledby="sotto-h">
  <div class="wrap statement">
    <div>
      <p class="label rise">Sotto la superficie</p>
      <h2 id="sotto-h" style="margin-top:24px">$h2</h2>
    </div>
    <div class="statement-copy">
      <p class="rise">Una posa si giudica dopo cinque anni, non il giorno della consegna. Per questo la parte del lavoro su cui siamo più pignoli è quella che sparisce: il massetto in bolla, il primer, la guaina negli angoli, il collante steso con la spatola giusta per il formato della lastra. Ne parliamo nelle pagine sui <a class="inline" href="massetti.html">massetti</a> e sulle <a class="inline" href="impermeabilizzazioni.html">impermeabilizzazioni</a>.</p>
      <p class="rise">Sono passaggi che non finiscono in nessuna fotografia. Ma sono gli unici che decidono se fra dieci anni quel pavimento sarà ancora al suo posto.</p>
      <p class="rise" style="margin-top:16px"><a class="btn btn--flare" href="contatti.html">$iarrow Chiedi un sopralluogo</a></p>
    </div>
  </div>
</section>
""").substitute(h1=lines("Cantieri", '<span class="flare">chiusi.</span>'),
                h2=lines("Il lavoro", "che non", "si vede."),
                filters=filters, gallery=gallery, iarrow=icon("arrow"))

write("lavori.html", page(
  "Lavori: bagni, scale e grandi formati | Romanazzi Domenico",
  "Cantieri chiusi a Rutigliano e in provincia di Bari: bagni in gres effetto Calacatta, lastre a grande formato, scale e pavimenti effetto legno.",
  "lavori.html", lavori, og="calacatta-angolo-01", ld=ld_block(breadcrumb([("Home", ""), ("Lavori", "lavori.html")]))))

# ============================ IMPRESA ============================
TEAM = [
 ("01","Domenico Romanazzi","Capo impresa · piastrellista e posatore",
  "Il fondatore. Venticinque anni di cantieri alle spalle e le mani ancora dentro ogni posa che conta."),
 ("02","Giuseppe Romanazzi","Socio · direttore operativo",
  "Tiene insieme squadra, forniture e calendario. È la parte dell'impresa che guarda al cantiere dopo il prossimo."),
]
team = "".join(Template(
 '<article class="member rise"><span class="n">$n</span><h3>$t</h3>'
 '<p class="role">$r</p><p>$b</p></article>'
).substitute(n=n, t=esc(t), r=esc(r), b=esc(b)) for n, t, r, b in TEAM)
team += Template("""<article class="member member--open rise">
      <span class="n">03</span><h3>Posto libero</h3>
      <p class="role">Piastrellista</p>
      <p>Cerchiamo chi sa già lavorare e vuole imparare il grande formato. Se ti riconosci, scrivici: guardiamo cosa hai fatto e ci sentiamo.</p>
      <p style="margin-top:auto;padding-top:24px"><a class="btn btn--line" href="mailto:$e?subject=Candidatura%20piastrellista">$im Candidati</a></p>
    </article>""").substitute(e=EMAIL, im=icon("mail"))

FAQ = [
 ("Qual è il modo più veloce per parlarvi?",
  'Il telefono. Domenico risponde al <a href="tel:+39%s">%s</a>; se è sotto una lastra e non sente, c\'è Giuseppe al <a href="tel:+39%s">%s</a>.' % (TEL_D, TEL_D, TEL_G, TEL_G)),
 ("Quanto si aspetta prima di iniziare?",
  "Dalla firma del preventivo passano di norma uno o due mesi. Ti diciamo la data vera, non quella che faresti prima a sentirti dire."),
 ("Come funziona, in pratica?",
  "Telefonata, sopralluogo sul posto, preventivo scritto. Se le condizioni ti stanno bene si fissa la data e la squadra entra in cantiere."),
 ("Lavorate anche fuori Rutigliano?",
  "Sì. Il grosso dei cantieri è a Rutigliano e nei comuni vicini, ma ci spostiamo in tutta la provincia di Bari. Chiedi in fase di telefonata."),
 ("E se qualcosa non va?",
  "Si sistema. Lavoriamo per non doverci tornare, ma se salta fuori un problema il numero da chiamare resta lo stesso."),
]
faq = "".join(Template(
 '<details><summary>$q<span class="sign" aria-hidden="true"></span></summary><div class="faq-body">$a</div></details>'
).substitute(q=esc(q), a=a) for q, a in FAQ)

impresa = Template("""
<section class="page-head">
  <div class="wrap">
    <nav class="crumb" aria-label="Percorso"><ol><li><a href="index.html">Home</a></li><li aria-current="page">Impresa</li></ol></nav>
    <h1>$h1</h1>
    <p class="lede rise">Due soci, una squadra fissa e un solo modo di lavorare: quello che regge nel tempo.</p>
  </div>
</section>

<section class="sec">
  <div class="wrap statement">
    <div class="wipe">$imgteam</div>
    <div class="statement-copy">
      <p class="label rise">Da dove veniamo</p>
      <p class="rise" style="font-family:var(--f-display);font-weight:700;font-size:var(--d-3);text-transform:uppercase;line-height:.92;margin-block:16px 8px">Un'impresa nata in cantiere, non in ufficio.</p>
      <p class="rise">Impresa Romanazzi Domenico è nata a Rutigliano, in provincia di Bari, come squadra di piastrellisti. Da allora è cresciuta senza cambiare metodo: poche persone, molta pratica e la scelta di non dare a nessun altro la parte delicata del lavoro.</p>
      <p class="rise">Oggi seguiamo appartamenti privati, ristrutturazioni complete e spazi commerciali. Dal massetto all'ultima fuga, ogni cantiere passa dalle stesse mani.</p>
    </div>
  </div>
</section>

<section class="sec sec--dark sec--tight" aria-labelledby="numeri-h">
  <div class="wrap">
    <h2 id="numeri-h" class="visually-hidden">I numeri dell'impresa</h2>
    <dl class="counts">$counts</dl>
  </div>
</section>

<section class="sec" aria-labelledby="team-h">
  <div class="wrap">
    <p class="label rise">La squadra</p>
    <h2 id="team-h" class="rise" style="font-size:var(--d-2);margin:24px 0 24px">$h2a</h2>
    <p class="lede rise" style="margin-bottom:56px">Impresa familiare: chi risponde al telefono è chi poi si presenta in cantiere.</p>
    <div class="team">$team</div>
  </div>
</section>

<section class="sec sec--paper2" aria-labelledby="metodo-h">
  <div class="wrap">
    <p class="label rise">Il metodo</p>
    <h2 id="metodo-h" class="rise" style="font-size:var(--d-2);margin:24px 0 56px">$h2b</h2>
    <ol class="steps">$steps</ol>
  </div>
</section>

<section class="sec" aria-labelledby="faq-h">
  <div class="wrap" style="max-width:1000px">
    <p class="label rise">Domande ricorrenti</p>
    <h2 id="faq-h" class="rise" style="font-size:var(--d-2);margin:24px 0 48px">$h2c</h2>
    <div class="faq rise">$faq</div>
  </div>
</section>
""").substitute(
  h1=lines("Chi", '<span class="flare">siamo.</span>'),
  imgteam=img("team-01","md",sizes="(min-width:1000px) 55vw, 100vw"),
  counts=counts, team=team, steps=steps, faq=faq,
  h2a=lines("Chi entra", "in cantiere."),
  h2b=lines("Quattro passaggi,", "nessuna sorpresa."),
  h2c=lines("Quello che", "ci chiedono."))

write("impresa.html", page(
  "Chi siamo: piastrellisti a Rutigliano | Romanazzi Domenico",
  "Chi siamo: impresa familiare di piastrellisti e posatori a Rutigliano (BA). La squadra, il metodo di lavoro e le risposte alle domande più frequenti.",
  "impresa.html", impresa, og="team-01",
  ld=ld_block(breadcrumb([("Home", ""), ("Impresa", "impresa.html")])) + "\n" + ld_block(faq_ld(FAQ))))

# ============================ CONTATTI ============================
contatti = Template("""
<section class="page-head">
  <div class="wrap">
    <nav class="crumb" aria-label="Percorso"><ol><li><a href="index.html">Home</a></li><li aria-current="page">Contatti</li></ol></nav>
    <h1>$h1</h1>
    <p class="lede rise">Niente moduli: un numero e una mail. Rispondiamo noi, non un centralino.</p>
  </div>
</section>

<section class="sec sec--dark">
  <div class="wrap">
    <dl class="contact-rows">
      <div class="contact-row rise">
        <dt>Telefono</dt>
        <dd>
          <a class="big" href="tel:+39$tel1">$tel1</a>
          <p class="note">Domenico. È il modo più rapido: in una telefonata capiamo se il lavoro è nelle nostre corde.</p>
        </dd>
      </div>
      <div class="contact-row rise">
        <dt>Secondo numero</dt>
        <dd>
          <a class="big" href="tel:+39$tel2">$tel2</a>
          <p class="note">Giuseppe. Da provare quando il primo squilla a vuoto: vuol dire che siamo sotto una lastra.</p>
        </dd>
      </div>
      <div class="contact-row rise">
        <dt>E-mail</dt>
        <dd>
          <a class="big" href="$mailto">$email</a>
          <p class="note">Il messaggio si apre già impostato con le domande che ci servono: compila le righe e allega qualche foto degli ambienti.</p>
        </dd>
      </div>
      <div class="contact-row rise">
        <dt>Dove siamo</dt>
        <dd>
          <a class="big" href="$maps" target="_blank" rel="noopener">$address</a>
          <p class="note">Base a Rutigliano. Lavoriamo nei comuni vicini e in tutta la provincia di Bari.</p>
        </dd>
      </div>
      <div class="contact-row rise">
        <dt>Orari</dt>
        <dd>
          <dl class="hours">
            <div><dt>Lunedì – Venerdì</dt><dd>7:00 – 15:00</dd></div>
            <div><dt>Sabato</dt><dd>7:00 – 13:00</dd></div>
            <div><dt>Domenica</dt><dd>Chiuso</dd></div>
          </dl>
          <p class="note">Fuori orario scrivi pure: leggiamo alla prima pausa utile.</p>
        </dd>
      </div>
    </dl>
  </div>
</section>

<section class="sec" aria-labelledby="prep-h">
  <div class="wrap">
    <p class="label rise">Prima di chiamare</p>
    <h2 id="prep-h" class="rise" style="font-size:var(--d-2);margin:24px 0 24px">$h2</h2>
    <p class="lede rise" style="margin-bottom:56px">Non è obbligatorio saperlo tutto. Ma con queste quattro informazioni il preventivo arriva molto prima.</p>
    <ol class="steps">
      <li class="step rise"><span class="n">01</span><h3>Che ambiente è</h3><p>Bagno, cucina, terrazzo, scala o casa intera: cambia la lavorazione e cambiano i materiali.</p></li>
      <li class="step rise"><span class="n">02</span><h3>Quanti metri quadri</h3><p>Anche a occhio va bene. Serve solo per capire l'ordine di grandezza del lavoro.</p></li>
      <li class="step rise"><span class="n">03</span><h3>Il materiale</h3><p>Se hai già scelto piastrelle o lastre, dicci formato e produttore: sui grandi formati fa la differenza.</p></li>
      <li class="step rise"><span class="n">04</span><h3>Quando vorresti partire</h3><p>Dalla firma passano uno o due mesi. Sapere la tua finestra ci aiuta a dirti subito se ci stiamo.</p></li>
    </ol>
  </div>
</section>
""").substitute(h1=lines("Parliamo", '<span class="flare">di lavoro.</span>'),
                tel1=TEL_D, tel2=TEL_G, email=EMAIL, mailto=MAILTO, maps=MAPS, address=esc(ADDRESS),
                h2=lines("Quattro cose", "da avere sotto mano."))

write("contatti.html", page(
  "Contatti e preventivi | Piastrellista a Rutigliano (BA)",
  "Chiama il 347 176 9861 o scrivi a domrom@hotmail.it per un sopralluogo e un preventivo: piastrellisti e posatori a Rutigliano e in provincia di Bari.",
  "contatti.html", contatti, og="calacatta-rubinetteria-01",
  ld=LD + "\n" + ld_block(breadcrumb([("Home", ""), ("Contatti", "contatti.html")]))))

def video_section(v):
    """Video in AV1 (più leggero) con ripiego H.264; 720 px di base e
    1080 px caricati solo sugli schermi larghi, quando il video entra in vista."""
    if not v: return ""
    d = VIDEO_DIR + v["name"]
    tall = v["h"] > v["w"]   # verticale: riquadro stretto, il 720 basta anche sugli schermi densi
    hd = "" if tall else ' data-src-hd="%s-1080.av1.mp4"' % d
    hd264 = "" if tall else ' data-src-hd="%s-1080.mp4"' % d
    return Template("""<section class="sec sec--paper2" aria-labelledby="video-h">
  <div class="wrap statement">
    <div>
      <p class="label rise">$label</p>
      <h2 id="video-h" style="margin-top:24px">$h2</h2>
      <p class="lede rise" style="margin-top:32px">$text</p>
    </div>
    <figure class="video-card$tallcls rise">
      <div class="video-frame wipe">
        <video class="rd-video" playsinline muted loop controls preload="none"
          poster="$d-poster.jpg" width="$w" height="$h" style="aspect-ratio:$w / $h"
          aria-label="$aria">
          <source src="$d-720.av1.mp4"$hd type='video/mp4; codecs="av01.0.08M.08"'>
          <source src="$d-720.mp4"$hd264 type="video/mp4">
          <p class="video-nofallback">Il tuo browser non riproduce questo video.
            <a href="$dl">Scarica il video</a>.</p>
        </video>
      </div>
      <figcaption>$caption</figcaption>
    </figure>
  </div>
</section>""").substitute(label=esc(v["label"]), h2=lines(*v["h2"]), text=esc(v["text"]), d=d,
                          w=v["w"], h=v["h"], aria=esc(v["aria"]), caption=esc(v["caption"]),
                          hd=hd, hd264=hd264, tallcls=" video-card--tall" if tall else "",
                          dl="%s-%s.mp4" % (d, "720" if tall else "1080"))

for sp in SERVICE_PAGES:
    others = "".join(Template("""<li class="project rise"><a href="$f"><span class="n">0$i</span><h3>$t</h3><span class="meta">Scopri la lavorazione</span></a></li>""")
                     .substitute(f=o["file"], i=i, t=esc(o["short"]))
                     for i, o in enumerate([x for x in SERVICE_PAGES if x is not sp], 1))
    sp_steps = "".join(Template('<li class="step rise"><span class="n">0$i</span><h3>$t</h3><p>$d</p></li>')
                       .substitute(i=i, t=esc(t), d=esc(d)) for i, (t, d) in enumerate(sp["steps"], 1))
    sp_faq = "".join(Template('<details><summary>$q<span class="sign" aria-hidden="true"></span></summary><div class="faq-body">$a</div></details>')
                     .substitute(q=esc(q), a=esc(a)) for q, a in sp["faq"])
    body = Template("""
<section class="page-head">
  <div class="wrap">
    <nav class="crumb" aria-label="Percorso"><ol><li><a href="index.html">Home</a></li><li aria-current="page">$short</li></ol></nav>
    <h1>$h1</h1>
    <p class="lede rise">$lede</p>
    <p class="rise" style="margin-top:32px;display:flex;flex-wrap:wrap;gap:12px">
      <a class="btn btn--flare" href="tel:+39$tel">$iphone Chiama per un sopralluogo</a>
      <a class="btn btn--line" href="lavori.html">$iarrow Guarda i lavori</a>
    </p>
  </div>
</section>

<section class="sec" aria-labelledby="intro-h">
  <div class="wrap statement">
    <div class="wipe">$photo</div>
    <div class="statement-copy">
      <p class="label rise">$label</p>
      <h2 id="intro-h" class="rise" style="font-size:var(--d-3);margin-block:16px 8px">$h2</h2>
      $paras
    </div>
  </div>
</section>

$videosec
<section class="sec sec--dark" aria-labelledby="come-h">
  <div class="wrap">
    <p class="label rise">Come lavoriamo</p>
    <h2 id="come-h" class="rise" style="font-size:var(--d-2);margin:24px 0 56px">$h2steps</h2>
    <ol class="steps">$steps</ol>
  </div>
</section>

<section class="sec" aria-labelledby="foto-h">
  <div class="wrap">
    <p class="label rise">Dai nostri cantieri</p>
    <h2 id="foto-h" class="rise" style="font-size:var(--d-2);margin:24px 0 48px">$h2photos</h2>
    <div class="gallery">$shots</div>
    <p class="rise" style="margin-top:40px"><a class="btn btn--line" href="lavori.html">$iarrow Tutta la galleria</a></p>
  </div>
</section>

<section class="sec sec--paper2" aria-labelledby="faq-h">
  <div class="wrap" style="max-width:1000px">
    <p class="label rise">Domande frequenti</p>
    <h2 id="faq-h" class="rise" style="font-size:var(--d-2);margin:24px 0 48px">$h2faq</h2>
    <div class="faq rise">$faq</div>
  </div>
</section>

<section class="sec sec--tight" aria-labelledby="altri-h">
  <div class="wrap">
    <p class="label rise" id="altri-h">Le altre lavorazioni</p>
    <ul class="projects" style="margin-top:32px">$others</ul>
  </div>
</section>
""").substitute(short=esc(sp["short"]), h1=lines(*sp["h1"]), lede=esc(sp["lede"]), tel=TEL_D,
                iphone=icon("phone"), iarrow=icon("arrow"),
                photo=img(sp["photo"], "md", sizes="(min-width:1000px) 55vw, 100vw"),
                label=esc(sp["label"]), h2=esc(sp["h2"]),
                paras="".join('<p class="rise">%s</p>' % esc(x) for x in sp["paras"]),
                h2steps=lines("Passo", "dopo passo."), steps=sp_steps,
                h2photos=lines("Lavori", "di questo tipo."),
                shots="".join(shot(x) for x in sp["shots"]),
                h2faq=lines("Le domande", "che ci fanno."), faq=sp_faq, others=others,
                videosec=video_section(sp.get("video")))
    url = SITE_URL + sp["file"]
    lds = "\n".join([
        ld_block({"@context": "https://schema.org", "@type": "Service", "name": sp["title"],
                  "serviceType": sp["short"], "description": sp["lede"], "url": url,
                  "image": SITE_URL + P + sp["photo"] + "-lg.jpg",
                  "areaServed": [{"@type": "City", "name": "Rutigliano"}, {"@type": "AdministrativeArea", "name": "Provincia di Bari"}],
                  "provider": PROVIDER}),
        ld_block(breadcrumb([("Home", ""), (sp["short"], sp["file"])])),
        ld_block(faq_ld(sp["faq"]))])
    write(sp["file"], page(sp["title"], sp["desc"], sp["file"], body,
                           og=sp["photo"], ld=lds))


# ============================ 404 ============================
nf = Template("""
<section class="page-head" style="border-bottom:0;min-height:70vh">
  <div class="wrap">
    <p class="label">Errore 404</p>
    <h1>$h1</h1>
    <p class="lede">La pagina che cercavi non c'è più o non c'è mai stata. Il sito è stato rinnovato: da qui trovi tutto.</p>
    <p style="margin-top:32px;display:flex;flex-wrap:wrap;gap:12px">
      <a class="btn btn--flare" href="index.html">$iarrow Torna alla home</a>
      <a class="btn btn--line" href="lavori.html">$iarrow I lavori</a>
      <a class="btn btn--line" href="tel:+39$tel">$iphone Chiama</a>
    </p>
  </div>
</section>""").substitute(h1=lines("Piastrella", '<span class="flare">mancante.</span>'),
                         iarrow=icon("arrow"), iphone=icon("phone"), tel=TEL_D)
write("404.html", page("Pagina non trovata | Romanazzi Domenico",
                       "La pagina richiesta non esiste. Torna alla home di Impresa Romanazzi Domenico.",
                       "404.html", nf, head_extra='<meta name="robots" content="noindex">'))

# ============================ robots / sitemap ============================
write("robots.txt", "User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: %ssitemap.xml\n" % SITE_URL)
today = datetime.date.today().isoformat()
PAGES = [("index.html", "1.0")] + [(sp["file"], "0.9") for sp in SERVICE_PAGES] + \
        [("lavori.html", "0.8"), ("impresa.html", "0.7"), ("contatti.html", "0.8")]
urls = "".join(
  '  <url><loc>%s%s</loc><lastmod>%s</lastmod><priority>%s</priority></url>\n'
  % (SITE_URL, "" if h == "index.html" else h, today, pr) for h, pr in PAGES)
write("sitemap.xml",
      '<?xml version="1.0" encoding="UTF-8"?>\n'
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s</urlset>\n' % urls)
