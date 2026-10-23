# Impresa Romanazzi Domenico

Sito di [impresaromanazzidomenico.it](https://www.impresaromanazzidomenico.it): piastrellisti e posatori a Rutigliano (BA).

Sito statico generato da uno script Python, pubblicato su Vercel, con un'area riservata `/admin` che trasforma la foto di un conto scritto a penna in un preventivo o conto lavori in PDF.

## Struttura

```
_build/build.py   generatore: scrive le pagine HTML, robots.txt e sitemap.xml in site/
site/             tutto ciò che va online (Root Directory del progetto Vercel)
  assets/         CSS, JS, immagini (AVIF + JPEG) e video
  admin/          area riservata: login e conversione conto → PDF
  api/            funzioni Vercel (login, lettura con Claude, PDF); api/_lib/ codice condiviso
  middleware.js   protegge /admin
  vercel.json     redirect, cache e durata delle funzioni
docs/             esempio di PDF generato
LEGGIMI.md        documentazione completa: design, prestazioni, SEO, video, area /admin
```

## Lavorare sul sito

Le pagine HTML in `site/` sono generate: si modifica `_build/build.py` e poi si rigenera.

```bash
python3 _build/build.py
```

Anteprima locale delle pagine statiche:

```bash
python3 -m http.server 8811 --directory site
```

## Pubblicazione (Vercel)

- **Root Directory:** `site`
- **Variabili d'ambiente** (Settings → Environment Variables, segnate come *Sensitive*):
  - `ADMIN_PASSWORD`: password dell'area `/admin`
  - `ADMIN_SESSION_SECRET`: stringa casuale di almeno 32 caratteri (`openssl rand -base64 48`)
  - `ANTHROPIC_API_KEY`: chiave della console Anthropic, usata per leggere le foto dei conti

Nessun segreto va scritto nel codice o committato: `.env*` è escluso da `.gitignore`.

## Cosa non è nel repository

Le foto originali ad alta risoluzione (`_foto-originali/`), i backup delle versioni precedenti (`_versione-1/`, `_versione-2/`) e il materiale del vecchio sito (`_sorgenti-originali/`) restano solo sul computer: pesano centinaia di MB e il sito usa già le versioni ottimizzate in `site/assets/`.
