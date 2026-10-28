/* Archivio: elenco di preventivi e conti salvati, con ricerca, filtro,
   riapertura per modificarli, duplicazione ed eliminazione. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var docs = [];
  var EUR = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', useGrouping: 'always' });
  var norm = function (t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  var el = function (tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  function errore(msg) { var e = $('#err'); e.textContent = msg || ''; e.hidden = !msg; }
  function dataIt(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }

  var ul = $('#lista'), q = $('#q');
  function render() {
    var t = norm(q.value).trim(), tipo = (document.querySelector('input[name=f]:checked') || {}).value || '';
    var vis = docs.filter(function (d) {
      return (!tipo || d.tipo === tipo) && (!t || norm(d.cliente_nome + ' ' + d.oggetto).indexOf(t) > -1);
    });
    ul.innerHTML = '';
    $('#conteggio').textContent = docs.length
      ? (vis.length === docs.length ? docs.length + (docs.length === 1 ? ' documento' : ' documenti') : vis.length + ' di ' + docs.length + ' documenti')
      : 'L\'archivio è vuoto: i documenti compaiono qui quando premi "Salva nell\'archivio" o scarichi un PDF.';
    vis.forEach(function (d) {
      var li = el('li', 'card');
      var tag = el('p', 'label', (d.tipo === 'conto' ? 'Conto lavori' : 'Preventivo') + (d.data ? ' · ' + dataIt(d.data) : ''));
      tag.style.margin = '0';
      li.appendChild(tag);
      li.appendChild(el('h3', null, d.cliente_nome || 'Senza cliente'));
      if (d.oggetto) li.appendChild(el('p', null, d.oggetto));
      var riga = [d.totale != null ? EUR.format(d.totale) : '', d.foto ? d.foto + (d.foto === 1 ? ' foto' : ' foto') : ''].filter(Boolean).join(' · ');
      if (riga) li.appendChild(el('p', 'muted', riga));
      var act = el('div', 'actions');
      var apri = el('a', 'btn btn--ink', 'Apri e modifica'); apri.href = '/admin/?doc=' + encodeURIComponent(d.id);
      var dup = el('a', 'btn', 'Duplica'); dup.href = '/admin/?doc=' + encodeURIComponent(d.id) + '&copia=1';
      var del = el('button', 'btn danger', 'Elimina'); del.type = 'button';
      del.addEventListener('click', function () {
        if (!confirm('Eliminare questo documento (' + (d.cliente_nome || 'senza cliente') + (d.data ? ', ' + dataIt(d.data) : '') + ')? Non si può annullare.')) return;
        window.Api('DELETE', '/api/documenti?id=' + encodeURIComponent(d.id)).then(function () {
          docs = docs.filter(function (x) { return x.id !== d.id; }); render();
        }).catch(function (e) { errore(e.message); });
      });
      act.appendChild(apri); act.appendChild(dup); act.appendChild(del);
      li.appendChild(act);
      ul.appendChild(li);
    });
  }

  q.addEventListener('input', render);
  document.querySelectorAll('input[name=f]').forEach(function (r) { r.addEventListener('change', render); });
  $('#conteggio').textContent = 'Carico l\'archivio…';
  window.Api('GET', '/api/documenti').then(function (j) { docs = j.documenti; render(); })
    .catch(function (e) { $('#conteggio').textContent = ''; errore(e.message); });
})();
