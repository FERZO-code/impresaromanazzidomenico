# Impresa Romanazzi Domenico — sito

Sito statico (HTML/CSS/JS, nessun framework).
Cartella da pubblicare: **`site/`**. Il resto è materiale di lavoro.

```
site/
  index.html      Home
  lavori.html     Galleria (35 foto, filtri + lightbox)
  impresa.html    Chi siamo, squadra, metodo, F.A.Q.
  contatti.html   Recapiti, orari, cosa preparare
  posa-pavimenti-rivestimenti.html  massetti.html
  impermeabilizzazioni.html         grandi-formati.html   (una pagina per lavorazione)
  404.html        Pagina d'errore
  robots.txt  sitemap.xml  .htaccess
  assets/css/style.css
  assets/js/main.js
  assets/js/vendor/   GSAP 3.15.1 (gsap, ScrollTrigger, SplitText)
  assets/img/photos/  35 foto × 3 misure × 2 formati (AVIF + JPEG di riserva)
  assets/img/brand/   logo RD + Fassa Bortolo, Montolit, Raimondi

_build/build.py      genera tutte le pagine HTML (testi, foto, struttura)
_versione-1/         prima versione del sito (non pubblicare)
_versione-2/         versione brutalista prima della "posa" (non pubblicare)
_sorgenti-originali/ immagini scaricate dal vecchio sito (non pubblicare)
```

## Pubblicazione

Carica il contenuto di `site/` nella root del dominio via FTP o pannello
hosting, **compreso il file nascosto `.htaccess`** (vedi sotto). Non servono
PHP, database o WordPress.

## Modificare testi e foto

Le pagine HTML non vanno toccate a mano: si rigenerano.

```bash
python3 _build/build.py
```

Testi, elenco foto, didascalie e struttura stanno in `_build/build.py`; stile
in `site/assets/css/style.css`; comportamento in `site/assets/js/main.js`.
**Dopo ogni modifica a CSS o JS va rilanciato il generatore**: calcola una
versione dei file (`style.css?v=...`) che costringe i browser dei visitatori
a scaricare quella nuova invece di usare la copia in cache.

### Cache e `.htaccess`

Durante le prove è successo davvero: il browser ha mostrato la pagina nuova
con il CSS vecchio rimasto in memoria. L'`.htaccess` incluso evita che capiti
ai visitatori: le pagine HTML vengono sempre ricontrollate, mentre CSS, JS e
immagini restano in cache a lungo (sicuro, perché l'indirizzo versionato
cambia a ogni modifica). Attiva anche la compressione dei file di testo.
Funziona sugli hosting Apache, quindi anche su Altervista.

Prova in locale:

```bash
python3 -m http.server 8811 --directory site
```

## Prestazioni

Misurate in Chrome sulla home e sulla galleria, prima e dopo:

| | prima | dopo |
|---|---|---|
| Immagini home, desktop | 710 KB | ~450 KB |
| Immagini home, telefono | 403 KB | ~335 KB |
| Galleria, prima schermata | 1.303 KB | 190 KB (13 foto su 33, il resto quando serve) |
| Risorse che bloccano il primo disegno | 2 | 1 (solo il nostro CSS) |
| File di font scaricati | 8 | 5 |

- **AVIF** per tutte le foto, con JPEG di riserva per i browser che non lo
  leggono: −60% sul peso complessivo.
- **Font non bloccanti** e ridotti ai pesi usati davvero.
- **Immagine principale precaricata** (quella che decide il tempo di
  caricamento percepito), nel formato e nella misura giusti per lo schermo.
- La foto della squadra per l'hover si scarica solo a pagina caricata.
- Cache e compressione via `.htaccess`, asset versionati.

**Due difetti trovati e corretti in questa fase**, entrambi invisibili a occhio
nudo durante lo sviluppo:

1. Le versioni AVIF medie avevano dimensioni dispari (733 e 825 px) e Chrome
   le caricava ma **non le disegnava**: buona parte delle foto, compresa
   l'immagine principale su quasi tutti i telefoni, sarebbe apparsa bianca.
   Ora tutte le immagini hanno dimensioni pari e il generatore si rifiuta di
   produrre le pagine se trova un file non conforme.
2. Le larghezze dichiarate per le foto verticali erano quelle delle
   orizzontali (es. 1100 invece di 733): il browser sceglieva file troppo
   piccoli e le foto verticali uscivano sgranate. Esisteva dalla prima versione.

**Aggiungere una foto**: crea le tre misure (lato lungo 640, 1100, 1800 px,
dimensioni pari) in JPEG e in AVIF, poi aggiungila a `PHOTOS` in
`_build/build.py`. Il controllo all'avvio del generatore segnala eventuali
errori di dimensione.

## SEO

- **Quattro pagine dedicate alle lavorazioni**, ognuna con titolo e testo
  pensati per le ricerche locali (es. "impermeabilizzazione terrazzi
  Rutigliano"), passaggi del lavoro, foto pertinenti e domande frequenti con
  risposte tecniche verificabili. Ogni pagina è collegata da tutte le altre.
- **Titoli e descrizioni** riscritti per stare nello spazio che Google mostra
  (il generatore avvisa se si sfora).
- **Dati strutturati**: scheda dell'impresa (indirizzo, orari, telefono),
  servizi, percorso di navigazione e domande frequenti.
- **Redirect 301** dai vecchi indirizzi WordPress (`/chi-siamo/`,
  `/contact/`) alle pagine nuove, pagina 404 dedicata, sitemap con le 8
  pagine, anteprime per WhatsApp e social complete.
- **Menu**: la voce "Lavorazioni" apre una tendina con le quattro pagine
  servizio; sulle pagine servizio la tendina è già aperta, con la pagina
  corrente evidenziata.

Quello che il codice non può fare da solo — e che per un'impresa locale pesa
più di tutto il resto:

1. **Profilo dell'attività su Google** (Google Business Profile): è ciò che
   fa comparire l'impresa sulla mappa nelle ricerche "piastrellista vicino a
   me". Va creato o rivendicato dal titolare.
2. **Recensioni vere** dei clienti su quel profilo. Sul sito non ne ho messe:
   inventarle è vietato da Google e controproducente.
3. **Google Search Console**: si verifica il dominio e si invia
   `sitemap.xml`, per sapere come e quando il sito viene indicizzato.
4. **HTTPS**: in `.htaccess` c'è il reindirizzamento pronto, commentato.
   Va attivato solo dopo aver controllato che il certificato sia attivo.

Nessuno può garantire il primo posto su Google; queste sono le basi tecniche
e di contenuto che un sito di questo tipo può avere.

## Conversioni

- **Barra fissa su telefono** con "Chiama" e "Scrivi": compare dopo
  l'immagine iniziale, sparisce quando in fondo ci sono già gli stessi
  pulsanti, non intralcia il focus da tastiera.
- **E-mail di richiesta precompilata** con le domande che servono al
  preventivo (ambiente, metri quadri, materiale, comune, tempi, telefono).
- **Ogni lavorazione in home porta alla sua pagina**, e ogni pagina servizio
  si apre con "Chiama per un sopralluogo".

Per sapere se queste scelte funzionano servono dei numeri: oggi il sito non
misura visite né clic sul telefono. Si può aggiungere uno strumento di
statistiche rispettoso della privacy che non richiede il banner dei cookie.

## Impostazione grafica

Restyling di novembre 2026: un'identità da **cantiere curato**, costruita sul
mestiere e non su un modello. I riferimenti di metodo (pile di servizi,
anteprime che seguono il cursore, piè di pagina con la parola gigante) vengono
da 21st.dev, riscritti a mano in HTML, CSS e GSAP: nessun componente React.

- **Colore** — calce `#E8E9E4` (fondo), bianco `#FAFAF7`, ardesia `#1C2226`
  (testo), petrolio `#143039` (sezioni scure, menu, piè di pagina), cemento
  `#5B6360` (testo secondario), velo `#A7B9BD` (testo secondario su petrolio).
  L'arancio del logo `#FF680B` è l'unico accento; come testo su fondo chiaro
  si usa `#B34500`. Sull'arancio il testo è sempre scuro. Contrasti verificati
  (tutti ≥ 4,5:1).
- **Tipografia** — Archivo a larghezza variabile: titoli stretti
  (`font-stretch: 86%`), etichette larghe (`116%`). La parola in evidenza dei
  titoli è in Libre Caslon Text corsivo (classe `.flare`).
- **La crocetta** — il distanziatore delle piastrelle è la firma grafica:
  apre le etichette, sta agli incroci delle lastre dell'hero e agli angoli
  delle foto in galleria.
- **Forme** — pulsanti a pastiglia con l'icona in un tondo; lastre con fughe.

## Il movimento

Tutto con **GSAP 3.15.1** (ScrollTrigger e SplitText), copiato nel sito in
`site/assets/js/vendor/` e caricato senza CDN. GSAP è gratuito anche per uso
commerciale secondo la licenza standard di GreenSock (gsap.com/standard-license).

**L'apertura.** Alla prima pagina della sessione una griglia di lastre petrolio,
con il logo su una lastra arancio al centro, si posa e poi si solleva
scoprendo la pagina. Un tocco la accelera. Non ricompare nelle pagine
successive; `?intro` nell'indirizzo la riforza.

**La home.** Hero con cinque lastre posate una alla volta (sul bagno grande,
al passaggio del mouse, compare la foto della squadra); nastro scorrevole delle
lavorazioni che accelera con lo scorrimento; manifesto con le parole che si
accendono leggendo; numeri che contano; lavorazioni come lastre impilate che
arretrano (da 1000 px); elenco lavori con anteprima che segue il cursore;
passaggi con un filo arancione che avanza; "Romanazzi" gigante nel piè di
pagina che sale lettera per lettera.

**Gli schemi di posa.** Sezione interattiva della home: sei pulsanti —
dritta, verticale (listelli 10x30 in piedi, tipici dei bagni), sfalsata,
spina di pesce, diagonale, grande formato — e una tela su cui le stesse
piastrelle si spostano per ricomporre lo schema scelto. Ogni schema copre la
tela senza buchi né sovrapposizioni; la sfalsata è a un terzo. Senza
JavaScript resta un elenco leggibile.

**Regole.** Si animano solo trasformazioni e opacità. Con "riduci animazioni"
non parte nulla e tutto è visibile; senza JavaScript tutto è visibile, e un
timeout di 4 secondi nello script di testa scopre comunque la pagina.

Nella prima schermata della home l'immagine cambia in base al dispositivo:

- **Da 760 px in su** l'hero mostra il bagno in Calacatta; passando il mouse
  (o entrando con il focus da tastiera) la **foto principale della squadra**
  compare in dissolvenza da 900 ms.
- **Sotto i 760 px** l'hero è direttamente la foto della squadra: è verticale,
  quindi su uno schermo di telefono regge molto meglio dello scatto
  orizzontale, che si sarebbe tagliato.

Lo scambio è gestito con `<picture>`: ogni dispositivo scarica **una sola**
delle due immagini. La seconda, quella dell'hover, viene caricata da
JavaScript solo dove un hover può davvero avvenire, quindi su telefono non
viene mai richiesta.

Con `prefers-reduced-motion` attivo si spengono tutte e i contenuti restano
fermi e visibili.

## Il video

Nella home, fra i lavori e il metodo, c'è il video di presentazione
(`Video RD IG.mov`, 16 secondi). L'incorporamento di Instagram è stato tolto:
niente più script esterni, niente cookie di terze parti, nessun banner di
consenso da aggiungere. Il video è ospitato direttamente sul sito.

```
assets/video/
  rd-cantiere-720.mp4     4,3 MB — usato dai 760 px in su
  rd-cantiere-480.mp4     2,0 MB — usato sotto i 760 px
  rd-cantiere-poster.jpg   60 KB — fotogramma di anteprima
```

L'originale era 18 MB in HEVC, un formato che diversi browser non riproducono:
è stato riconvertito in H.264, il formato che funziona ovunque.

**Come si comporta**

- Non viene scaricato all'apertura della home: parte solo quando la sezione
  entra nello schermo. Verificato — in cima alla pagina le richieste del file
  video sono zero.
- Dai 760 px in su parte da solo, **senza audio**, e si mette in pausa quando
  esce dallo schermo, per non consumare rete e batteria.
- Sotto i 760 px non parte da solo: su telefono sarebbero megabyte di dati
  consumati senza che nessuno li abbia chiesti. Resta il fotogramma di
  anteprima e parte al tocco.
- Con "riduci animazioni" o "risparmio dati" attivi resta fermo sull'anteprima.
- I controlli sono sempre presenti: si può mettere in pausa, riavvolgere,
  attivare l'audio e andare a schermo intero. Una pausa decisa da chi guarda
  viene rispettata e lo scorrimento non la annulla.

**Video del drone (pagina Impermeabilizzazioni)** — terrazzo durante la posa del tappetino impermeabilizzante Mapei Mapeguard WP 200. L'originale era 52 MB in
HEVC, 2548×2160. Ora ci sono quattro versioni senza audio: AV1 da 720 e 1080 px
(2,7 e 5,4 MB) e H.264 da 720 e 1080 px (3,5 e 7,5 MB) come ripiego per i
browser che non leggono AV1, più il fotogramma di anteprima. Stesso
comportamento del video della home: nessun download finché non entra in
vista, versione 1080 solo su schermi larghi, avvio automatico muto solo da
760 px in su, al tocco su telefono. Il formato quasi quadrato è rispettato.

**Per sostituire il video** basta rigenerare i tre file con gli stessi nomi.
I comandi usati:

```bash
ffmpeg -i originale.mov -vf scale=1280:720 -c:v libx264 -preset slow -crf 24 \
  -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k rd-cantiere-720.mp4
ffmpeg -i originale.mov -vf scale=854:480 -c:v libx264 -preset slow -crf 26 \
  -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 96k rd-cantiere-480.mp4
ffmpeg -ss 1.8 -i originale.mov -frames:v 1 -vf scale=1280:720 -q:v 6 rd-cantiere-poster.jpg
```

**Una nota sull'hosting.** Il server di prova locale non gestisce le richieste
parziali (Range), quindi in locale la barra di avanzamento può non permettere
i salti. Sugli hosting veri (Apache, nginx) funziona senza fare nulla.

## Contenuti

Tutti i testi sono stati **riscritti da zero**. Dal vecchio sito sono stati
mantenuti solo i fatti: i quattro servizi, i numeri (25+, 10+, 1000+, 100%),
la squadra, gli orari, i recapiti, i tempi di attesa e le domande frequenti.
Nessuna frase è ripresa alla lettera.

## Da verificare prima di pubblicare

1. **Indirizzo.** L'indirizzo della sede (via e CAP) è stato tolto dal sito vetrina:
   da footer, menu, pagina Contatti e dati strutturati. Resta solo il comune
   (Rutigliano, BA), che serve a Google per le ricerche locali. Nei PDF dei
   preventivi l'indirizzo della sede è invece ancora stampato
   (`site/api/_lib/impresa.js`).
2. **Telefono.** Il vecchio footer riportava `347169861` (9 cifre) contro
   `3471769861` in testata. Ho usato ovunque quest'ultimo.
3. **Newsletter.** Non ricreata: richiedeva un servizio lato server. Se serve,
   va collegato un servizio esterno (es. Mailchimp).
4. **Mappa.** L'indirizzo apre Google Maps con un link; non c'è mappa
   incorporata, così non servono banner cookie di terze parti.
5. **Foto della squadra.** Entrambe ritraggono Domenico e Giuseppe insieme,
   quindi sono usate come immagine di gruppo e le schede dei due soci sono
   tipografiche. Con due ritratti singoli si possono rimettere le foto.

## Verifiche già fatte

- Apertura: ciclo completo (posa, contatore, sollevamento, rimozione),
  salto con un tasto, assenza alla seconda pagina e con "riduci animazioni".
- Cambio pagina: catena completa clic → copertura → navigazione → arrivo
  coperto → apertura, con memoria di sessione ripulita.
- Schemi di posa: copertura geometrica verificata; pulsanti con stato
  premuto e spiegazione annunciata ai lettori di schermo.
- Tutte le 99 immagini AVIF disegnate correttamente in Chrome (prova su canvas).
- Barra fissa: nascosta in cima, attiva dopo l'hero, nascosta sul piè di pagina.
- Dati strutturati validi su ogni pagina, nessun canonical duplicato, nessun
  link interno rotto.
- Nessuno scorrimento orizzontale a 375, 768 e 1280 px, su tutte le pagine.
- Contrasto testo/sfondo conforme AA su tutte e quattro le pagine.
- Titoli h1→h2→h3 senza salti; ogni immagine ha un testo alternativo.
- Menu a schermo intero: apertura, blocco dello scorrimento, focus sul primo
  link, Tab che resta dentro il menu, Esc che chiude e riporta il focus al
  pulsante.
- Lightbox: apertura da tastiera, frecce ←/→, Esc, focus che torna sulla
  miniatura di partenza.
- Filtri galleria con conteggio annunciato ai lettori di schermo.
- `prefers-reduced-motion`: animazioni spente, contenuti visibili.
- Senza JavaScript: pagine complete e leggibili, contatori con i valori reali.
- Video: nessuna richiesta del file finché non si scorre fino alla sezione;
  dai 760 px in su parte muto e si ferma fuori schermo, sotto i 760 px non
  parte da solo.
- Hero: testo leggibile su entrambe le immagini (9:1 il titolo bianco,
  4,2:1 la riga arancione). Verificato che a 375 px si scarichi solo la foto
  della squadra e a 1280 px solo il bagno più, per l'hover, la squadra.

**Foto dal drone del terrazzo (terrazzo-mapeguard-01)** — usata come foto principale della pagina Impermeabilizzazioni (e per l'anteprima social), nel riquadro Impermeabilizzazioni della home e in fondo alla galleria Lavori (filtro "Cantiere"). La foto ricevuta era a 1242×982 e già compressa da un social: è stata ingrandita a 1800×1424 con ricampionamento lanczos, con una leggera riduzione degli artefatti e un aumento di nitidezza, contrasto e saturazione. Le proporzioni sono diverse dalle altre foto orizzontali, per questo nel generatore c'è un nuovo formato "W" (1800×1424).

**Foto del bagno in lastre Calacatta (bagno-calacatta-lavabi-02)**: ricavata da `20260711-_MG_0123.jpg` (6703×4469, 23 MB) e ridotta a 1800/1100/640 px. È la foto del riquadro "Gres laminato a grande formato" in home; prima c'era `calacatta-angolo-01`, che resta nella pagina Grandi formati e in galleria. È anche in galleria, in formato largo.

**Video verticali (Massetti e Grandi formati)**: `massetto-getto` (da IMG_5505.MOV, 31 s, getto con la pompa) e `lastra-taglio` (da IMG_2016.MOV, 60 s, taglio di una lastra). Gli originali erano in HDR (HLG), quindi sono stati convertiti in SDR bt709 con VideoToolbox (`scale_vt`) per evitare colori slavati. Esiste solo la versione 720×1280 a 30 fps, senza audio, in AV1 (4,3 e 3,4 MB) e H.264 (6,7 e 7,6 MB): il riquadro verticale (`.video-card--tall`) è largo al massimo 360 px, quindi il 1080 non serve e il generatore non lo collega quando l'altezza del video supera la larghezza.

## Area riservata /admin: dal conto a penna al PDF

Pagina protetta da password. Si carica la foto di un conto o di un preventivo scritto a mano e Claude (modello `claude-opus-5-5`) ne legge cliente, voci, quantità, prezzi, IVA e totale. I dati compaiono in un modulo da ricontrollare, con accanto la foto originale e gli avvisi sulle cifre incerte o sul totale che non torna. Alla fine si scarica il PDF con logo e colori RD, come "Preventivo" o "Conto lavori".

File:
- `admin/login.html`, `admin/index.html`, `admin/app.js`: le pagine (stile in `assets/css/admin.css`)
- `middleware.js`: senza login, tutto ciò che sta sotto /admin rimanda alla pagina di accesso
- `api/login.js`, `api/logout.js`: sessione con cookie firmato (12 ore), nessun database
- `api/leggi-conto.js`: invia la foto a Claude e restituisce i dati in JSON
- `api/pdf.js` + `api/_lib/pdf.js`: crea il PDF (pdf-lib + fontkit), identico al modello "Preventivo - Coniugi Didonna.pdf": testata nera con logo, riquadro cliente / luogo dei lavori / date, oggetto, tabella con N., descrizione (con dettaglio in grigio), U.M. e Q.tà (prezzi per voce facoltativi), Condizioni Generali, totali con sconto facoltativo (in % o in €, sul totale lavori, prima dell'IVA; gli oneri per la sicurezza non si scontano), oneri per la sicurezza, acconti e firme. Caratteri Barlow e Barlow Condensed incorporati da `api/_lib/fonts/` (licenza OFL, file `OFL.txt`). Le misure del modello sono in px CSS e la larghezza delle lettere è arrotondata al pixel come fa Chrome, così righe e a capo coincidono.
- `api/_lib/impresa.js`: **dati dell'impresa stampati sul PDF: inserire qui P.IVA e codice fiscale**
- `vercel.json`: durata massima della lettura, redirect del vecchio sito e regole di cache (su Vercel il file `.htaccess` non viene usato)

Pubblicazione su Vercel:
1. Nel progetto Vercel impostare **Root Directory = `site`**.
2. In Settings > Environment Variables aggiungere:
   - `ADMIN_PASSWORD`: la password di accesso (lunga, non riutilizzata altrove)
   - `ADMIN_SESSION_SECRET`: una stringa casuale di almeno 32 caratteri (genera con `openssl rand -base64 48`). Cambiandola si chiudono tutte le sessioni aperte.
   - `ANTHROPIC_API_KEY`: la chiave creata su console.anthropic.com
3. Ridistribuire. L'area è su https://www.impresaromanazzidomenico.it/admin/

Note:
- La lettura usa i fallback lato server di Anthropic (`fallbacks: "default"`): se il modello rifiuta una richiesta, ne subentra un altro in automatico.
- Il costo è di pochi centesimi per foto. Le foto vengono ridotte a 2000 px prima dell'invio.
- Condizioni Generali: nel modulo, una per riga. "Salva come predefinite" le memorizza su quel dispositivo per i documenti successivi, "Ripristina originali" torna a quelle del modello. Se una voce del foglio ha solo le quantità, il totale scritto a penna diventa il "Totale lavori a corpo".
- I caratteri che Barlow non contiene (per esempio le emoji) vengono tolti dal PDF.
- `robots.txt` esclude /admin/ e /api/, e le pagine hanno `noindex`.
- La bozza in corso resta salvata nel browser fino a "Nuovo conto".
- **Archivio e clienti nel database**: preventivi, conti e clienti sono salvati su **Neon (Postgres)**, collegato da Vercel, quindi uguali dal telefono e dal computer. Codice: `api/_lib/db.js` (le tabelle `clienti` e `documenti` si creano da sole alla prima richiesta), API `api/clienti.js` e `api/documenti.js`, pagine `admin/archivio.html` e `admin/clienti.html`.
  - **Salva nell'archivio** salva il documento (voci, acconti, condizioni, foto comprese). **Scarica il PDF** lo salva in automatico e poi scarica; se il database non risponde il PDF si scarica comunque.
  - **Archivio** elenca i documenti, con ricerca per cliente o oggetto e filtro Preventivi / Conti. **Apri e modifica** li riapre nel modulo, **Duplica** ne crea una copia nuova (senza acconti e con data di oggi), **Elimina** li cancella.
  - **Clienti**: aggiunta, ricerca, modifica ed eliminazione; "Nuovo conto" apre il modulo con il cliente già compilato. Nel modulo, "Cerca tra i clienti salvati" compila i dati, "Salva in rubrica" crea o aggiorna il cliente conservando email e note, che non vanno nel PDF.
  - **Copia di sicurezza**: nella pagina Clienti "Esporta file" scarica `clienti-rd.json`, "Importa file" lo carica. Il file contiene dati personali: va tenuto in un posto privato (es. iCloud Drive) e non nel repository (è già in `.gitignore`). I clienti che erano stati salvati nel browser prima del database compaiono in un riquadro con il pulsante "Sposta nell'archivio".
  - **Attivare il database**: su Vercel, nel progetto, **Storage → Create Database → Neon** (piano gratuito, senza carta), collegalo al progetto e fai **Redeploy**. Vercel crea la variabile `DATABASE_URL`. Finché il database non è collegato, le pagine mostrano un avviso e il resto continua a funzionare.
- **Spostare le voci**: ogni voce ha le frecce ↑ ↓ accanto alla ×; le voci si scambiano di posto e la numerazione del PDF segue l'ordine. Le frecce si disattivano sulla prima e sull'ultima voce.
- **Anteprima**: il pulsante "Anteprima" crea il PDF senza scaricarlo. Su computer lo mostra in una finestra sopra il modulo, con Stampa, Scarica e Chiudi. Su iPhone, iPad e Android lo apre nel visualizzatore PDF del telefono, perché lì un PDF dentro la pagina mostrerebbe solo la prima pagina; da quel visualizzatore si stampa o si condivide con Condividi.
- **Foto dei lavori**: nel modulo si possono aggiungere fino a 24 foto, con didascalia e ordine modificabile. Nel PDF compaiono dopo le firme in pagine "Foto dei lavori", due per riga e sei per pagina, senza tagli (verticali e orizzontali dentro piastrelle color marmo). Il browser riduce le foto a 1200 px. Se tutte insieme superano il limite di 4,5 MB per richiesta di Vercel, per quell'invio vengono ridotte ancora. Restano salvate nel browser (IndexedDB) insieme alla bozza. Esempio: `docs/esempio-conto.pdf` (dati di fantasia).


## Risultati estesi su Google (sitelink)

L'elenco con le pagine interne sotto il risultato principale lo decide Google: non esiste un'impostazione per attivarlo. Il sito gli dà tutti gli elementi che usa per costruirlo:
- **Struttura chiara.** Menu e piè di pagina collegano da ogni pagina le 4 lavorazioni, Lavori, Impresa e Contatti.
- **Titoli brevi e diversi per ogni pagina.** Google li usa come titoli dei sitelink.
- **Dati strutturati.** `WebSite` (nome del sito, alternativa "Romanazzi Domenico") e `HomeAndConstructionBusiness` in home, `BreadcrumbList` e `Service` nelle pagine interne.
- **`sitemap.xml`** con le 8 pagine e **canonical** su `https://www.impresaromanazzidomenico.it/`.

Da fare fuori dal codice:
1. **Vercel → Settings → Domains.** Il dominio principale deve essere `www.impresaromanazzidomenico.it` e quello senza www deve reindirizzare lì (308), così Google vede un solo sito, coerente con i canonical.
2. **Google Search Console.** Aggiungere la proprietà di tipo *Dominio* (verifica tramite record DNS) e inviare `sitemap.xml`. Poi, con *Controllo URL*, chiedere l'indicizzazione della home e delle pagine interne.
3. **Profilo dell'attività su Google (Maps)**, con il sito collegato: rafforza le ricerche per nome.
I sitelink compaiono di solito quando qualcuno cerca il nome dell'impresa, dopo alcune settimane dall'indicizzazione.

**Sitemap e date.** `sitemap.xml` elenca le 8 pagine da indicizzare. La data `lastmod` di ogni pagina cambia solo quando cambia il suo contenuto (i numeri di versione di CSS e JS non contano): lo stato è in `_build/lastmod.json`, che va committato insieme al sito. Il campo `priority` è stato tolto perché Google lo ignora. Non vanno nella sitemap: `404.html`, `admin/`, `api/` e il file di verifica `google9060c3e3fdefe24c.html`, che va lasciato dov'è.

**Menu visibile in barra (computer).** Da 1100 px di larghezza la barra in alto mostra Lavorazioni (con tendina sulle 4 pagine di servizio), Lavori, Impresa e Contatti, oltre al telefono e al pulsante del menù a schermo intero. Sotto 1100 px resta solo il pulsante. Sono link normali già presenti nel codice di ogni pagina (`bar_nav()` in `build.py`, stile in `style.css`, apertura della tendina in `main.js`); la voce della pagina corrente è sottolineata.

**Massetti.** La pagina Massetti e il riquadro in home parlano ora anche di massetti autolivellanti e solette alleggerite (titolo, descrizione, testi, passaggi, due nuove domande frequenti e dati strutturati per Google).
