/* Area riservata: foto del conto → lettura → controllo → PDF. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var BOZZA = 'rd-admin-bozza';
  var foto = null; // data URL dell'immagine ridotta

  /* ---------- numeri all'italiana ---------- */
  function parseNum(s) {
    s = String(s == null ? '' : s).replace(/[\s€]/g, '');
    if (!s) return null;
    if (s.indexOf(',') > -1) s = s.replace(/\./g, '').replace(',', '.');
    var n = Number(s);
    return isFinite(n) ? n : null;
  }
  function fmtNum(n) { return n == null ? '' : String(n).replace('.', ','); }
  var EUR = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', useGrouping: 'always' });
  var r2 = function (n) { return Math.round(n * 100) / 100; };

  /* ---------- memoria locale: la bozza sopravvive a una ricarica ---------- */
  function store(fn) { try { return fn(window.localStorage); } catch (e) { return null; } }
  function saveDraft() { store(function (ls) { ls.setItem(BOZZA, JSON.stringify(leggiForm())); }); }
  function loadDraft() { return store(function (ls) { return JSON.parse(ls.getItem(BOZZA) || 'null'); }); }
  function clearDraft() { store(function (ls) { ls.removeItem(BOZZA); }); }

  /* ---------- 1. foto ---------- */
  var file = $('#file'), drop = $('#drop'), preview = $('#preview'), leggi = $('#leggi');
  var errFoto = $('#err-foto');
  function errore(el, msg) { el.textContent = msg || ''; el.hidden = !msg; }

  /* La foto del telefono pesa diversi MB: la riduciamo a 2000 px sul lato
     lungo, abbastanza per leggere la penna e sotto il limite di invio. */
  function riduci(f) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(f);
      var img = new Image();
      img.onload = function () {
        var k = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k);
        c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.88));
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('formato')); };
      img.src = url;
    });
  }

  function scegli(f) {
    errore(errFoto);
    if (!f) return;
    if (!/^image\//.test(f.type) && !/\.(heic|heif)$/i.test(f.name)) { errore(errFoto, 'Il file scelto non è un\'immagine.'); return; }
    riduci(f).then(function (d) {
      foto = d;
      preview.src = d; preview.hidden = false;
      leggi.disabled = false;
    }, function () {
      errore(errFoto, 'Questo browser non riesce ad aprire la foto (succede con le foto HEIC su computer). Prova dal telefono o salvala come JPG.');
    });
  }
  file.addEventListener('change', function () { scegli(file.files[0]); });
  ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
  ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function () { drop.classList.remove('is-over'); }); });
  drop.addEventListener('drop', function (e) { e.preventDefault(); scegli(e.dataTransfer.files[0]); });

  function sessioneScaduta(res) {
    if (res.status === 401) { location.href = '/admin/login.html'; return true; }
    return false;
  }

  leggi.addEventListener('click', function () {
    if (!foto) return;
    leggi.disabled = true; $('#vuoto').disabled = true;
    $('#wait').classList.add('is-on');
    errore(errFoto);
    fetch('/api/leggi-conto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ immagine: foto }) })
      .then(function (res) {
        if (sessioneScaduta(res)) return null;
        return res.json().then(function (j) { if (!res.ok) throw new Error(j.errore || 'Errore ' + res.status); return j.dati; });
      })
      .then(function (dati) { if (dati) apriEditor(dati); })
      .catch(function (e) { errore(errFoto, e.message || 'La lettura non è riuscita. Riprova.'); })
      .then(function () { leggi.disabled = !foto; $('#vuoto').disabled = false; $('#wait').classList.remove('is-on'); });
  });

  $('#vuoto').addEventListener('click', function () { apriEditor({ voci: [{}] }); });

  var bozza = loadDraft();
  if (bozza && (bozza.voci || []).length) {
    $('#riprendi').hidden = false;
    $('#riprendi').addEventListener('click', function () { apriEditor(bozza, true); });
  }

  /* ---------- 2. editor ---------- */
  var form = $('#form'), righe = $('#righe');
  var UNITA = [['mq', 'm²'], ['ml', 'ml'], ['pz', 'pz'], ['h', 'ore'], ['a corpo', 'a corpo'], ['', '—']];

  function riga(v) {
    v = v || {};
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td class="desc" data-l="Descrizione"><textarea rows="1" aria-label="Descrizione"></textarea></td>' +
      '<td data-l="U.M."><select aria-label="Unità di misura">' + UNITA.map(function (u) { return '<option value="' + u[0] + '">' + u[1] + '</option>'; }).join('') + '</select></td>' +
      '<td class="num" data-l="Q.tà"><input inputmode="decimal" aria-label="Quantità"></td>' +
      '<td class="num" data-l="Prezzo €"><input inputmode="decimal" aria-label="Prezzo unitario"></td>' +
      '<td class="num" data-l="Importo €"><input inputmode="decimal" aria-label="Importo"></td>' +
      '<td><button class="del" type="button" aria-label="Rimuovi voce">×</button></td>';
    var f = tr.querySelectorAll('textarea, select, input');
    f[0].value = v.descrizione || '';
    f[1].value = v.unita != null ? v.unita : 'mq';
    f[2].value = fmtNum(v.quantita);
    f[3].value = fmtNum(v.prezzo_unitario);
    f[4].value = fmtNum(v.importo);
    righe.appendChild(tr);
    return tr;
  }

  function leggiRiga(tr) {
    var f = tr.querySelectorAll('textarea, select, input');
    return { descrizione: f[0].value.trim(), unita: f[1].value, quantita: parseNum(f[2].value), prezzo_unitario: parseNum(f[3].value), importo: parseNum(f[4].value) };
  }

  function leggiForm() {
    var g = function (n) { var el = form.elements[n]; return el ? el.value.trim() : ''; };
    return {
      tipo: (form.querySelector('input[name="tipo"]:checked') || {}).value || 'preventivo',
      numero: g('numero'), data: g('data'),
      cliente: { nome: g('cliente.nome'), indirizzo: g('cliente.indirizzo'), codice_fiscale_piva: g('cliente.codice_fiscale_piva'), telefono: g('cliente.telefono') },
      cantiere: g('cantiere'),
      voci: Array.prototype.map.call(righe.children, leggiRiga).filter(function (v) { return v.descrizione || v.importo != null || v.quantita != null; }),
      iva_percentuale: parseNum(g('iva_percentuale')),
      note: form.elements.note.value.trim(),
      totale_scritto: form.dataset.totaleScritto ? Number(form.dataset.totaleScritto) : null,
    };
  }

  /* Importo = quantità × prezzo quando ci sono entrambi: in quel caso il
     campo importo si blocca e mostra il calcolo, così non ci sono due
     cifre diverse per la stessa voce. */
  function aggiorna() {
    var imponibile = 0;
    Array.prototype.forEach.call(righe.children, function (tr) {
      var v = leggiRiga(tr), imp = tr.querySelectorAll('input')[2];
      if (v.quantita != null && v.prezzo_unitario != null) {
        var calc = r2(v.quantita * v.prezzo_unitario);
        imp.value = fmtNum(calc); imp.readOnly = true; imp.title = 'Calcolato da quantità × prezzo';
        imponibile += calc;
      } else {
        imp.readOnly = false; imp.title = '';
        imponibile += v.importo || 0;
      }
    });
    imponibile = r2(imponibile);
    var al = parseNum(form.elements.iva_percentuale.value);
    var iva = al == null ? 0 : r2(imponibile * al / 100);
    var tot = r2(imponibile + iva);
    $('#totali').innerHTML =
      '<div><span>Imponibile</span><span>' + EUR.format(imponibile) + '</span></div>' +
      (al == null ? '' : '<div><span>IVA ' + fmtNum(al) + '%</span><span>' + EUR.format(iva) + '</span></div>') +
      '<div class="big"><span>Totale</span><b>' + EUR.format(tot) + '</b></div>';

    /* confronto con il totale scritto a penna: se non torna, va guardato */
    var ts = form.dataset.totaleScritto ? Number(form.dataset.totaleScritto) : null;
    var diff = $('#diff');
    if (ts != null && Math.abs(ts - tot) > 0.01 && Math.abs(ts - imponibile) > 0.01) {
      diff.textContent = 'Sul foglio il totale scritto è ' + EUR.format(ts) + ', il calcolo dà ' + EUR.format(tot) + '. Controlla quantità e prezzi.';
      diff.hidden = false;
    } else diff.hidden = true;
    saveDraft();
  }

  function apriEditor(d, daBozza) {
    form.reset();
    righe.innerHTML = '';
    var tipo = d.tipo === 'conto' ? 'conto' : 'preventivo';
    form.querySelector('input[name="tipo"][value="' + tipo + '"]').checked = true;
    form.elements.numero.value = d.numero || '';
    form.elements.data.value = d.data || new Date().toISOString().slice(0, 10);
    var c = d.cliente || {};
    ['nome', 'indirizzo', 'codice_fiscale_piva', 'telefono'].forEach(function (k) { form.elements['cliente.' + k].value = c[k] || ''; });
    form.elements.cantiere.value = d.cantiere || '';
    form.elements.iva_percentuale.value = d.iva_percentuale != null && [4, 10, 22].indexOf(d.iva_percentuale) > -1 ? String(d.iva_percentuale) : '';
    form.elements.note.value = d.note || '';
    if (d.totale_scritto != null) form.dataset.totaleScritto = d.totale_scritto; else delete form.dataset.totaleScritto;
    (d.voci && d.voci.length ? d.voci : [{}]).forEach(riga);

    var dubbi = $('#dubbi');
    var lista = (d.dubbi || []).slice();
    if (d.tipo === 'non_chiaro') lista.unshift('Non è chiaro se sia un preventivo o un conto: scegli tu il tipo.');
    if (d.iva_percentuale != null && [4, 10, 22].indexOf(d.iva_percentuale) === -1) lista.push('Sul foglio c\'è un\'IVA del ' + d.iva_percentuale + '%: scegli l\'aliquota corretta.');
    if (lista.length && !daBozza) {
      dubbi.innerHTML = '<b>Da ricontrollare sul foglio:</b><ul></ul>';
      lista.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; dubbi.querySelector('ul').appendChild(li); });
      dubbi.hidden = false;
    } else dubbi.hidden = true;

    $('#side').hidden = !foto;
    if (foto) $('#side-img').src = foto;
    $('#step-foto').hidden = true;
    $('#step-dati').hidden = false;
    aggiorna();
    window.scrollTo(0, 0);
    $('#step-dati h1').setAttribute('tabindex', '-1');
    $('#step-dati h1').focus();
  }

  form.addEventListener('input', aggiorna);
  form.addEventListener('change', aggiorna);
  righe.addEventListener('click', function (e) {
    var b = e.target.closest('.del');
    if (!b) return;
    b.closest('tr').remove();
    if (!righe.children.length) riga();
    aggiorna();
  });
  $('#aggiungi').addEventListener('click', function () {
    var tr = riga();
    tr.querySelector('textarea').focus();
    aggiorna();
  });
  $('#nuovo').addEventListener('click', function () {
    if (!confirm('Iniziare un nuovo conto? I dati inseriti qui verranno cancellati.')) return;
    clearDraft();
    location.reload();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var dati = leggiForm(), err = $('#err-pdf');
    errore(err);
    if (!dati.voci.length) { errore(err, 'Aggiungi almeno una voce.'); return; }
    var btn = $('#crea');
    btn.disabled = true; btn.textContent = 'Creo il PDF…';
    fetch('/api/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dati) })
      .then(function (res) {
        if (sessioneScaduta(res)) return null;
        if (!res.ok) return res.json().then(function (j) { throw new Error(j.errore || 'Errore ' + res.status); });
        var nome = (/filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '') || [])[1] || 'conto.pdf';
        return res.blob().then(function (b) {
          var a = document.createElement('a');
          a.href = URL.createObjectURL(b);
          a.download = nome;
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 60000);
        });
      })
      .catch(function (e2) { errore(err, e2.message || 'Il PDF non è stato creato. Riprova.'); })
      .then(function () { btn.disabled = false; btn.textContent = 'Scarica il PDF'; });
  });
})();
