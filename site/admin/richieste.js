/* Richieste di preventivo arrivate dal modulo del sito: elenco, stato
   (nuova / letta / gestita), eliminazione e "Crea preventivo" che apre
   il modulo con cliente e lavoro già compilati. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var richieste = [];
  var ul = $('#lista'), q = $('#q');
  var norm = function (t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function errore(msg) { $('#err').textContent = msg || ''; $('#err').hidden = !msg; }
  var DATA = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

  function api(metodo, url, corpo) {
    return fetch(url, { method: metodo, headers: corpo ? { 'Content-Type': 'application/json' } : {}, body: corpo ? JSON.stringify(corpo) : undefined })
      .then(function (r) {
        if (r.status === 401) { location.href = '/admin/login.html'; throw new Error('Sessione scaduta.'); }
        return r.json().then(function (j) { if (!r.ok) throw new Error(j.errore || 'Errore'); return j; });
      });
  }
  function stato(r, s) {
    return api('PATCH', '/api/richieste?id=' + encodeURIComponent(r.id), { stato: s })
      .then(function () { r.stato = s; render(); }).catch(function (e) { errore(e.message); });
  }

  function render() {
    var t = norm(q.value).trim();
    var f = (document.querySelector('input[name="f"]:checked') || {}).value || '';
    var vis = richieste.filter(function (r) {
      if (f === 'nuova' && r.stato === 'gestita') return false;
      if (f === 'gestita' && r.stato !== 'gestita') return false;
      return !t || norm([r.nome, r.telefono, r.comune, r.email, r.lavoro].join(' ')).indexOf(t) > -1;
    });
    var nuove = richieste.filter(function (r) { return r.stato === 'nuova'; }).length;
    $('#conteggio').textContent = richieste.length
      ? richieste.length + (richieste.length === 1 ? ' richiesta' : ' richieste') + (nuove ? ' · ' + nuove + ' da leggere' : '')
      : 'Nessuna richiesta per ora: arriveranno qui dal modulo della pagina Contatti.';
    ul.innerHTML = '';
    vis.forEach(function (r) {
      var li = el('li', 'card' + (r.stato === 'nuova' ? ' is-new' : ''));
      var h = el('h3', null, r.nome);
      if (r.stato === 'nuova') h.appendChild(el('span', 'badge', 'Nuova'));
      if (r.stato === 'gestita') h.appendChild(el('span', 'badge badge--ok', 'Gestita'));
      li.appendChild(h);
      li.appendChild(el('p', 'muted', DATA.format(new Date(r.creato))));
      var p = el('p'); var a = el('a', null, r.telefono); a.href = 'tel:' + r.telefono.replace(/[^\d+]/g, ''); p.appendChild(a); li.appendChild(p);
      if (r.email) { var pe = el('p'); var ae = el('a', null, r.email); ae.href = 'mailto:' + r.email; pe.appendChild(ae); li.appendChild(pe); }
      li.appendChild(el('p', null, [r.lavoro, r.comune, r.mq ? r.mq + ' m²' : '', r.quando].filter(Boolean).join(' · ')));
      if (r.messaggio) li.appendChild(el('p', 'muted msg', r.messaggio));
      var act = el('div', 'actions');
      var crea = el('button', 'btn btn--ink', 'Crea preventivo'); crea.type = 'button';
      crea.addEventListener('click', function () {
        try { sessionStorage.setItem('rd-richiesta', JSON.stringify(r)); } catch (e) { /* niente */ }
        (r.stato === 'nuova' ? stato(r, 'letta') : Promise.resolve()).then(function () { location.href = '/admin/?richiesta=1'; });
      });
      act.appendChild(crea);
      var g = el('button', 'btn', r.stato === 'gestita' ? 'Riapri' : 'Segna gestita'); g.type = 'button';
      g.addEventListener('click', function () { stato(r, r.stato === 'gestita' ? 'letta' : 'gestita'); });
      act.appendChild(g);
      var del = el('button', 'btn danger', 'Elimina'); del.type = 'button';
      del.addEventListener('click', function () {
        if (!confirm('Eliminare la richiesta di ' + r.nome + '? Non si può annullare.')) return;
        api('DELETE', '/api/richieste?id=' + encodeURIComponent(r.id))
          .then(function () { richieste = richieste.filter(function (x) { return x !== r; }); render(); })
          .catch(function (e) { errore(e.message); });
      });
      act.appendChild(del);
      li.appendChild(act);
      ul.appendChild(li);
    });
  }

  q.addEventListener('input', render);
  document.querySelectorAll('input[name="f"]').forEach(function (i) { i.addEventListener('change', render); });
  api('GET', '/api/richieste').then(function (j) { richieste = j.richieste || []; render(); }).catch(function (e) { errore(e.message); });
})();
