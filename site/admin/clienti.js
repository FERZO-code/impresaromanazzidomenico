/* Rubrica clienti: elenco, ricerca, modifica, eliminazione e
   "Nuovo conto" che apre il modulo con il cliente già compilato. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var clienti = [];
  var CAMPI = ['nome', 'telefono', 'email', 'indirizzo', 'codice_fiscale_piva', 'note'];
  var norm = function (t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };

  function errore(el, msg) { el.textContent = msg || ''; el.hidden = !msg; }
  /* ---------- elenco ---------- */
  var ul = $('#rubrica'), q = $('#q');
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function render() {
    var t = norm(q.value).trim();
    var vis = clienti.filter(function (c) { return !t || norm([c.nome, c.telefono, c.indirizzo, c.email].join(' ')).indexOf(t) > -1; });
    ul.innerHTML = '';
    $('#conteggio').textContent = clienti.length
      ? (t ? vis.length + ' di ' + clienti.length + ' clienti' : clienti.length + (clienti.length === 1 ? ' cliente' : ' clienti'))
      : 'La rubrica è vuota: aggiungi il primo cliente, oppure salvalo dal modulo del conto.';
    vis.forEach(function (c) {
      var li = el('li', 'card');
      li.appendChild(el('h3', null, c.nome));
      if (c.telefono) { var p = el('p'); var a = el('a', null, c.telefono); a.href = 'tel:' + c.telefono.replace(/[^\d+]/g, ''); p.appendChild(a); li.appendChild(p); }
      if (c.email) { var pe = el('p'); var ae = el('a', null, c.email); ae.href = 'mailto:' + c.email; pe.appendChild(ae); li.appendChild(pe); }
      if (c.indirizzo) li.appendChild(el('p', null, c.indirizzo));
      if (c.codice_fiscale_piva) li.appendChild(el('p', 'muted', 'C.F./P.IVA ' + c.codice_fiscale_piva));
      if (c.note) li.appendChild(el('p', 'muted', c.note));
      var act = el('div', 'actions');
      var nuovo = el('a', 'btn btn--ink', 'Nuovo conto'); nuovo.href = '/admin/?cliente=' + encodeURIComponent(c.id);
      var mod = el('button', 'btn', 'Modifica'); mod.type = 'button'; mod.addEventListener('click', function () { apri(c); });
      act.appendChild(nuovo); act.appendChild(mod);
      li.appendChild(act);
      ul.appendChild(li);
    });
  }

  function carica() { clienti = window.Rubrica.lista(); render(); }
  q.addEventListener('input', render);

  /* ---------- modifica ---------- */
  var dlg = $('#dlg'), f = $('#f'), corrente = null;
  function apri(c) {
    corrente = c || null;
    f.reset();
    errore($('#dlg-err'));
    CAMPI.forEach(function (k) { f.elements[k].value = (c && c[k]) || ''; });
    $('#dlg-titolo').textContent = c ? 'Modifica cliente' : 'Nuovo cliente';
    $('#dlg-elimina').hidden = !c;
    dlg.showModal();
    f.elements.nome.focus();
  }
  $('#nuovo-cliente').addEventListener('click', function () { apri(null); });
  $('#dlg-annulla').addEventListener('click', function () { dlg.close(); });

  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var c = { id: corrente ? corrente.id : undefined };
    CAMPI.forEach(function (k) { c[k] = f.elements[k].value.trim(); });
    if (!c.nome) { errore($('#dlg-err'), 'Il nome è obbligatorio.'); f.elements.nome.focus(); return; }
    try {
      window.Rubrica.salva(c);
      carica();
      dlg.close();
    } catch (e2) { errore($('#dlg-err'), e2.message); }
  });

  $('#dlg-elimina').addEventListener('click', function () {
    if (!corrente || !confirm('Eliminare ' + corrente.nome + ' dalla rubrica? I PDF già creati non cambiano.')) return;
    window.Rubrica.elimina(corrente.id);
    carica();
    dlg.close();
  });

  /* ---------- file della rubrica ---------- */
  var info = $('#file-info');
  $('#esporta').addEventListener('click', function () {
    var n = window.Rubrica.esporta();
    info.textContent = 'Scaricato clienti-rd.json (' + n + (n === 1 ? ' cliente' : ' clienti') + '). Conservalo in un posto sicuro, per esempio iCloud Drive.';
  });
  $('#importa-file').addEventListener('change', function (e) {
    var file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    errore($('#err'));
    window.Rubrica.importa(file).then(function (r) {
      carica();
      var n = function (k, uno, piu) { return k + ' ' + (k === 1 ? uno : piu); };
      info.textContent = r.nuovi || r.aggiornati
        ? 'Importati: ' + n(r.nuovi, 'cliente nuovo', 'clienti nuovi') + (r.aggiornati ? ', ' + n(r.aggiornati, 'aggiornato', 'aggiornati') : '') + '.'
        : 'Nessuna novità: la rubrica era già aggiornata.';
    }).catch(function (e2) { errore($('#err'), e2.message); });
  });

  carica();
})();
