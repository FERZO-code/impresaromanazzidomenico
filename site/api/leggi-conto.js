import Anthropic from "@anthropic-ai/sdk";
import { isLoggedIn } from "./_lib/auth.js";

/* Riceve la foto di un conto scritto a penna e restituisce i dati in JSON,
   pronti per il modulo di controllo. Il PDF non si genera qui: prima una
   persona rilegge cifre e voci. */

const client = new Anthropic(); // legge ANTHROPIC_API_KEY dalle variabili d'ambiente

const MEDIA = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const numero = { anyOf: [{ type: "number" }, { type: "null" }] };

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["tipo", "data", "cliente", "cantiere", "oggetto", "voci", "iva_percentuale", "totale_scritto", "note", "dubbi"],
  properties: {
    tipo: { type: "string", enum: ["preventivo", "conto", "non_chiaro"] },
    data: { type: "string", description: "Data del documento in formato AAAA-MM-GG, stringa vuota se assente" },
    cliente: {
      type: "object",
      additionalProperties: false,
      required: ["nome", "indirizzo", "codice_fiscale_piva", "telefono"],
      properties: {
        nome: { type: "string" },
        indirizzo: { type: "string" },
        codice_fiscale_piva: { type: "string" },
        telefono: { type: "string" },
      },
    },
    cantiere: { type: "string", description: "Luogo dei lavori (indirizzo del cantiere), se scritto" },
    oggetto: { type: "string", description: "Oggetto del lavoro in poche parole, es. Ristrutturazione appartamento, se scritto o evidente" },
    voci: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["descrizione", "dettaglio", "unita", "quantita", "prezzo_unitario", "importo"],
        properties: {
          descrizione: { type: "string", description: "La lavorazione, in una frase" },
          dettaglio: { type: "string", description: "Precisazioni sulla voce (ambienti, posizione), stringa vuota se non ci sono" },
          unita: { type: "string", enum: ["mq", "ml", "pz", "cad", "h", "kg", "a corpo", ""] },
          quantita: numero,
          prezzo_unitario: numero,
          importo: numero,
        },
      },
    },
    iva_percentuale: numero,
    totale_scritto: numero,
    note: { type: "string" },
    dubbi: { type: "array", items: { type: "string" } },
  },
};

const ISTRUZIONI = `Trascrivi il conto scritto a mano nella foto. È un foglio di un'impresa di piastrellisti di Rutigliano (Bari): pavimenti, rivestimenti, massetti, impermeabilizzazioni, lastre in gres di grande formato, battiscopa, soglie, smontaggi, materiali.

Regole:
- Trascrivi quello che c'è scritto, senza aggiungere voci, prezzi o dati che non vedi. Se un campo manca lascia la stringa vuota o null.
- Le cifre sono la parte più importante: in italiano la virgola separa i decimali e il punto le migliaia ("1.250,50" = 1250.5). Restituisci i numeri come numeri.
- Per ogni voce indica quantità, unità (mq, ml, pz, cad, h, kg, "a corpo"), prezzo unitario e importo quando sono scritti. Se la voce elenca ambienti o posizioni (es. "fodera cucina, tramezzo bagno"), metti la lavorazione in "descrizione" e l'elenco in "dettaglio". Se l'importo scritto non corrisponde a quantità per prezzo, trascrivi comunque quello scritto e segnalalo nei dubbi.
- Riscrivi le descrizioni in italiano corretto e leggibile, sciogliendo le abbreviazioni ovvie ("pav." = pavimento, "riv." = rivestimento), senza cambiarne il significato.
- tipo: "preventivo" se il foglio stima lavori da fare, "conto" se riepiloga lavori eseguiti, "non_chiaro" se non si capisce.
- iva_percentuale: solo se è scritta. totale_scritto: il totale finale scritto sul foglio, se c'è.
- In "dubbi" elenca in frasi brevi ogni parola o cifra che hai letto con incertezza, indicando la voce, così chi controlla sa dove guardare.`;

export async function POST(request) {
  if (!(await isLoggedIn(request))) return Response.json({ errore: "Sessione scaduta: accedi di nuovo." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const m = body && typeof body.immagine === "string" && body.immagine.match(/^data:([\w/+.-]+);base64,(.+)$/);
  if (!m || !MEDIA.includes(m[1])) return Response.json({ errore: "Immagine mancante o in un formato non supportato." }, { status: 400 });

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "high", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } },
          { type: "text", text: ISTRUZIONI },
        ],
      }],
    });

    if (response.stop_reason === "refusal") return Response.json({ errore: "La foto non è stata elaborata. Riprova con un'altra foto." }, { status: 422 });
    if (response.stop_reason === "max_tokens") return Response.json({ errore: "Il conto è troppo lungo per una sola foto: dividilo in più foto." }, { status: 422 });

    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    return Response.json({ dati: JSON.parse(text) });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return Response.json({ errore: "Troppe richieste in poco tempo: riprova fra un minuto." }, { status: 429 });
    if (err instanceof Anthropic.AuthenticationError) return Response.json({ errore: "Chiave ANTHROPIC_API_KEY non valida o mancante." }, { status: 500 });
    if (err instanceof Anthropic.APIError) return Response.json({ errore: "Il servizio di lettura non risponde (" + err.status + "). Riprova." }, { status: 502 });
    console.error(err);
    return Response.json({ errore: "Errore imprevisto durante la lettura." }, { status: 500 });
  }
}
