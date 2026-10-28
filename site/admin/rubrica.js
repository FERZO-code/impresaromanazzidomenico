/* Rubrica clienti nell'archivio online (database Neon, tramite /api/clienti):
   gli stessi clienti dal telefono e dal computer. Restano l'esportazione
   in un file JSON come copia di sicurezza e l'importazione, anche dei
   clienti salvati in passato nel browser di questo dispositivo. */
(function () {
  'use strict';
  var VECCHIA = 'rd-rubrica'; // dove stavano i clienti prima del database

  function api(method, url, body) {
    return fetch(url, { method: method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })
      .then(function (res) {
        if (res.status === 401) { location.href = '/admin/login.html'; return new Promise(function () {}); }
        return res.json().then(function (j) { if (!res.ok) throw new Error(j.errore || 'Errore ' + res.status); return j; });
      });
  }

  window.Api = api;
  window.Rubrica = {
    lista: function () { return api('GET', '/api/clienti').then(function (j) { return j.clienti; }); },
    salva: function (c) {
      if (!c.nome || !c.nome.trim()) return Promise.reject(new Error('Il nome del cliente è obbligatorio.'));
      return api('POST', '/api/clienti', { cliente: c }).then(function (j) { return j.cliente; });
    },
    elimina: function (id) { return api('DELETE', '/api/clienti?id=' + encodeURIComponent(id)); },

    /* copia di sicurezza: clienti-rd.json */
    esporta: function () {
      return this.lista().then(function (clienti) {
        var dati = { tipo: 'rubrica-rd', versione: 1, esportato: new Date().toISOString(), clienti: clienti };
        var url = URL.createObjectURL(new Blob([JSON.stringify(dati, null, 2)], { type: 'application/json' }));
        var a = document.createElement('a');
        a.href = url; a.download = 'clienti-rd.json';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
        return clienti.length;
      });
    },
    importa: function (file) {
      return file.text().then(function (t) {
        var j;
        try { j = JSON.parse(t); } catch (e) { throw new Error('Il file non è una rubrica valida.'); }
        var clienti = Array.isArray(j) ? j : j && j.clienti;
        if (!Array.isArray(clienti)) throw new Error('Il file non è una rubrica valida.');
        return api('POST', '/api/clienti', { clienti: clienti }).then(function (r) { return r.importati; });
      });
    },

    /* clienti rimasti nel browser dalla versione senza database */
    vecchi: function () {
      try { var v = JSON.parse(localStorage.getItem(VECCHIA) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
    },
    trasferisciVecchi: function () {
      var v = this.vecchi();
      return api('POST', '/api/clienti', { clienti: v }).then(function (r) {
        try { localStorage.removeItem(VECCHIA); } catch (e) { /* niente */ }
        return r.importati;
      });
    },
  };
})();
