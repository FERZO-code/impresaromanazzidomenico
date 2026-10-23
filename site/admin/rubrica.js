/* Rubrica clienti salvata nel browser di questo dispositivo, con
   esportazione e importazione in un file JSON (clienti-rd.json).
   Niente server: i dati dei clienti non lasciano il telefono o il
   computer, se non nel file che esporti tu. */
(function () {
  'use strict';
  var KEY = 'rd-rubrica';

  function leggi() {
    try { var v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function scrivi(lista) {
    try { localStorage.setItem(KEY, JSON.stringify(lista)); }
    catch (e) { throw new Error('Il browser non permette di salvare (navigazione privata?): esporta il file per non perdere i dati.'); }
  }
  var ordina = function (l) { return l.sort(function (a, b) { return a.nome.localeCompare(b.nome, 'it', { sensitivity: 'base' }); }); };
  var nuovoId = function () { return (crypto.randomUUID && crypto.randomUUID()) || Date.now().toString(36) + Math.random().toString(36).slice(2); };
  var s = function (v, max) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; };

  function pulisci(c) {
    return {
      id: s(c.id, 60) || nuovoId(),
      nome: s(c.nome, 200),
      indirizzo: s(c.indirizzo, 300),
      codice_fiscale_piva: s(c.codice_fiscale_piva, 40),
      telefono: s(c.telefono, 40),
      email: s(c.email, 200),
      note: s(c.note, 2000),
      aggiornato: c.aggiornato || new Date().toISOString(),
    };
  }

  window.Rubrica = {
    lista: function () { return ordina(leggi()); },

    salva: function (c) {
      if (!s(c.nome, 200)) throw new Error('Il nome del cliente è obbligatorio.');
      var x = pulisci(Object.assign({}, c, { aggiornato: new Date().toISOString() }));
      scrivi(leggi().filter(function (y) { return y.id !== x.id; }).concat(x));
      return x;
    },

    elimina: function (id) { scrivi(leggi().filter(function (y) { return y.id !== id; })); },

    /* Scarica clienti-rd.json con tutta la rubrica. */
    esporta: function () {
      var dati = { tipo: 'rubrica-rd', versione: 1, esportato: new Date().toISOString(), clienti: ordina(leggi()) };
      var url = URL.createObjectURL(new Blob([JSON.stringify(dati, null, 2)], { type: 'application/json' }));
      var a = document.createElement('a');
      a.href = url; a.download = 'clienti-rd.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
      return dati.clienti.length;
    },

    /* Unisce un file esportato alla rubrica: per lo stesso cliente vince
       la versione modificata più di recente, così importare il file del
       telefono sul computer (e viceversa) non cancella niente. */
    importa: function (file) {
      return file.text().then(function (t) {
        var j;
        try { j = JSON.parse(t); } catch (e) { throw new Error('Il file non è una rubrica valida.'); }
        var arrivati = Array.isArray(j) ? j : j && j.clienti;
        if (!Array.isArray(arrivati)) throw new Error('Il file non è una rubrica valida.');
        var mappa = {};
        leggi().forEach(function (c) { mappa[c.id] = c; });
        var nuovi = 0, aggiornati = 0;
        arrivati.forEach(function (raw) {
          if (!raw || !s(raw.nome, 200)) return;
          var c = pulisci(raw), prima = mappa[c.id];
          if (!prima) { mappa[c.id] = c; nuovi++; }
          else if ((c.aggiornato || '') > (prima.aggiornato || '')) { mappa[c.id] = c; aggiornati++; }
        });
        scrivi(Object.keys(mappa).map(function (k) { return mappa[k]; }));
        return { nuovi: nuovi, aggiornati: aggiornati };
      });
    },
  };
})();
