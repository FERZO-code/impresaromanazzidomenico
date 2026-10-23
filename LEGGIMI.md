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
  assets/img/photos/  35 foto × 3 misure × 2 formati (AVIF + JPEG di riserva)
  assets/img/brand/   logo RD + Fassa Bortolo, Montolit, Raimondi

_build/build.py      genera le 4 pagine HTML (testi, foto, struttura)
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

Direzione **brutalista editoriale**, ispirata alla struttura e al ritmo di
jdgconstructions.com.au, riportata sull'identità RD:

- **Colore** — nero `#0B0B0B`, bianco, hairline grigie, più un bianco marmo
  `#ECE8E1` per le piastrelle. L'arancio del logo `#FF680B` è l'unico
  accento: la piastrella di partenza, i numeri, le parole chiave.
  Su fondo chiaro il testo arancione usa varianti più scure (`#E85400` per i
  titoli grandi, `#B94400` per i testi piccoli) per restare leggibile.
- **Tipografia** — Barlow Condensed per i titoli (maiuscolo, fino a 9vw) e
  Barlow per il testo.
- **Griglia a vista** — hairline verticali fisse che attraversano tutta la
  pagina, come nel riferimento.
- **Spigoli vivi** — nessun raggio di curvatura, blocchi pieni, righe nette.
- **La posa come linguaggio** — numeri, servizi e passaggi del metodo sono
  piastrelle separate da fughe nere di 4 px; le etichette delle sezioni
  iniziano con un quadratino arancione al posto della lineetta.

## L'esperienza "posa"

Il filo conduttore del sito è il mestiere stesso: tutto si apre, si copre e
si rivela come una superficie piastrellata.

**L'apertura.** Alla prima visita della sessione lo schermo si riempie di
piastrelle di Calacatta — un'unica foto di una vostra parete, divisa fra
tutte, così la venatura prosegue da una piastrella all'altra. Vengono posate
una alla volta in diagonale partendo dall'angolo in basso a sinistra, come fa
un posatore; la prima è arancione. Al centro il logo e il contatore
"Posa in corso 25 / 50". Quando l'ultima è a terra, le fughe si aprono e le
piastrelle si sollevano dal centro scoprendo la home; solo allora partono i
titoli dell'hero. Dura circa 2,5 secondi.

- Si salta in ogni momento: pulsante "Salta l'apertura", un tasto qualsiasi,
  un tocco o la rotella del mouse.
- Una volta per sessione: aprendo altre pagine non ricompare.
- Per rivederla c'è il link **"Rivedi l'apertura"** nel piè di pagina
  (equivale ad aggiungere `?intro` all'indirizzo).
- Non parte con "riduci animazioni", senza JavaScript, in navigazione privata
  con memoria di sessione bloccata, o se la pagina è aperta in una scheda in
  secondo piano.

**Il cambio pagina.** Cliccando un link interno, piastrelle scure coprono lo
schermo a onda partendo esattamente dal punto in cui si è cliccato (la prima,
sotto il dito, è arancione); la pagina nuova arriva coperta e si apre dal
centro. Funziona anche da tastiera (l'onda parte dal link). Esclusi i link
esterni, telefono, e-mail, quelli aperti in una nuova scheda e quelli con
tasti modificatori. Tornando indietro col browser la pagina si ripulisce.

**Le immagini.** Foto dei servizi, del team, della galleria e il video sono
coperte da tessere del colore della sezione che si sollevano in diagonale
quando entrano nello schermo, lasciando vedere la foto attraverso le fughe
che si allargano.

**Gli schemi di posa.** Sezione interattiva della home: sei pulsanti —
dritta, verticale (listelli 10x30 in piedi, tipici dei bagni), sfalsata,
spina di pesce, diagonale, grande formato — e una tela su
cui le stesse piastrelle si spostano, ruotano e si ridimensionano per
ricomporre lo schema scelto; sotto la tela compaiono la descrizione e
l'indicazione "Ideale per". La piastrella arancione al centro richiama il
punto di partenza della posa; nel grande formato non c'è, e due venature
attraversano le tre lastre per mostrare la venatura continua. Ogni schema è stato verificato numericamente: copre tutta
la tela senza un buco né una sovrapposizione (30.000 punti campionati per
schema). La sfalsata è a un terzo, non a metà, come si fa davvero sui
formati lunghi. Senza JavaScript la sezione resta un elenco leggibile dei
sei schemi.

### Animazioni

Tutte scritte a mano, senza librerie: titoli che salgono da una maschera,
immagini che si scoprono a tessere, contatori che scorrono, anteprima che
segue il cursore sulle righe dei lavori, menu a schermo intero che si apre a
tendina. La fascia arancione in scorrimento continuo è stata tolta: le linee
guida sconsigliano animazioni decorative che non si fermano mai.

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

1. **Indirizzo.** `Via Falcone 12, 70018 Rutigliano (BA)` non compariva sul
   vecchio sito: proviene da un elenco aziende online. Se è sbagliato va
   corretto nel footer, nel menu, in `contatti.html` e nei dati strutturati
   JSON-LD di `index.html` e `contatti.html`.
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
- `api/pdf.js` + `api/_lib/pdf.js`: crea il PDF (pdf-lib)
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
- Il PDF usa Helvetica: i caratteri fuori dall'alfabeto latino (per esempio le emoji) vengono tolti.
- `robots.txt` esclude /admin/ e /api/, e le pagine hanno `noindex`.
- La bozza in corso resta salvata nel browser fino a "Nuovo conto".
- **Anteprima**: il pulsante "Anteprima" crea il PDF senza scaricarlo. Su computer lo mostra in una finestra sopra il modulo, con Stampa, Scarica e Chiudi. Su iPhone, iPad e Android lo apre nel visualizzatore PDF del telefono, perché lì un PDF dentro la pagina mostrerebbe solo la prima pagina; da quel visualizzatore si stampa o si condivide con Condividi.
- **Foto dei lavori**: nel modulo si possono aggiungere fino a 24 foto, con didascalia e ordine modificabile. Nel PDF compaiono dopo le firme in pagine "Foto dei lavori", due per riga e sei per pagina, senza tagli (verticali e orizzontali dentro piastrelle color marmo). Il browser riduce le foto a 1200 px. Se tutte insieme superano il limite di 4,5 MB per richiesta di Vercel, per quell'invio vengono ridotte ancora. Restano salvate nel browser (IndexedDB) insieme alla bozza. Esempio: `docs/esempio-conto-foto.pdf`.
