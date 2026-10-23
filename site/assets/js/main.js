/* Impresa Romanazzi Domenico — interazioni
   Apertura e cambio pagina a piastrelle · nav a schermo intero · comparse
   allo scorrimento con tessere sulle immagini · contatori · schemi di posa
   · anteprima progetti · video · filtri galleria · lightbox accessibile
   Regola di base: senza JS, o se qualcosa non parte, tutto resta visibile. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var animate = document.documentElement.classList.contains('js-anim');

  /* Esegue `fn` al massimo una volta per frame. requestAnimationFrame è la
     via normale, ma in una scheda in secondo piano (o in certi ambienti di
     test) è congelato: il setTimeout è la rete di sicurezza, così la
     correttezza non dipende mai dal frame. */
  function throttled(fn) {
    var queued = false;
    var timer = null;
    var run = function () {
      if (!queued) return;
      queued = false;
      if (timer) { window.clearTimeout(timer); timer = null; }
      fn();
    };
    return function () {
      if (queued) return;
      queued = true;
      if (window.requestAnimationFrame) window.requestAnimationFrame(run);
      timer = window.setTimeout(run, 120);
    };
  }

  /* Il browser legge l'AVIF? Lo sappiamo provando a decodificare un'immagine
     di 2x2 pixel. Serve dove l'immagine la sceglie lo script (lightbox, foto
     della squadra al passaggio del mouse): altrove ci pensa <picture>. */
  var avifReady = null;
  var avifQueue = [];
  function withAvif(fn) {
    if (avifReady !== null) { fn(avifReady); return; }
    avifQueue.push(fn);
  }
  (function () {
    var probeImg = new Image();
    var done = function (ok) {
      if (avifReady !== null) return;
      avifReady = ok;
      avifQueue.splice(0).forEach(function (f) { f(ok); });
    };
    probeImg.onload = function () { done(probeImg.width === 2); };
    probeImg.onerror = function () { done(false); };
    window.setTimeout(function () { done(false); }, 1500);
    probeImg.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAE1pUHJhdmlmbWlhZm1pZjEAAAFebWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAAAAAAAkZGluZgAAABxkcmVmAAAAAAAAAAEAAAAMdXJsIAAAAAEAAAAOcGl0bQAAAAAAAQAAADhpaW5mAAAAAAACAAAAFWluZmUCAAAAAAEAAGF2MDEAAAAAFWluZmUCAAABAAIAAEV4aWYAAAAAGmlyZWYAAAAAAAAADmNkc2MAAgABAAEAAACBaXBycAAAAGBpcGNvAAAAE2NvbHJuY2x4AAIAAgAGgAAAAAxjbGxpAMsAQAAAABRpc3BlAAAAAAAAAAIAAAACAAAACWlyb3QAAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABlpcG1hAAAAAAAAAAEAAQaBAgMFhoQAAAAsaWxvYwAAAABEAAACAAEAAAABAAAB3AAAACAAAgAAAAEAAAGOAAAATgAAAAFtZGF0AAAAAAAAAH4AAAAGRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAAqADAAQAAAABAAAAAgAAAAASAAoMAAAAAAZ//AgQEDQgMg4QAZIACCCCIABo0hUugA==';
  })();

  function stopAnimating() {
    document.documentElement.classList.remove('js-anim');
    animate = false;
  }
  if (reduce.matches || document.visibilityState !== 'visible') stopAnimating();
  window.addEventListener('beforeprint', stopAnimating);

  /* =========================================================
     La posa: apertura a piastrelle e cambio pagina
     Lo script in testa alla pagina decide se serve (data-tiling) e
     stende un velo nero; qui si costruiscono le piastrelle.
     Ogni fase è a tempo (setTimeout), mai legata alla fine di
     un'animazione: se un'animazione non parte, lo stato finale arriva
     comunque e la pagina non resta mai coperta.
     ========================================================= */
  var root = document.documentElement;
  var tilingMode = root.classList.contains('rd-cover') ? root.getAttribute('data-tiling') : null;
  if (!animate) { root.classList.remove('rd-cover'); tilingMode = null; }
  var opened = !tilingMode;
  var openQueue = [];

  /* ciò che deve partire quando la pagina si scopre (titoli, zoom dell'hero) */
  function whenOpen(fn) { if (opened) fn(); else openQueue.push(fn); }
  function markOpen() {
    if (opened) return;
    opened = true;
    openQueue.splice(0).forEach(function (fn) {
      try { fn(); } catch (e) { /* una funzione rotta non deve bloccare le altre */ }
    });
  }

  /* sessionStorage può mancare (navigazione privata, cookie bloccati) */
  function store(key, val) {
    try {
      if (val === null) window.sessionStorage.removeItem(key);
      else window.sessionStorage.setItem(key, val);
      return true;
    } catch (e) { return false; }
  }

  var MARBLE = 'assets/img/photos/calacatta-parete-01-md.jpg';

  function buildTiling(kind) {
    var vw = window.innerWidth, vh = window.innerHeight;
    var size = vw < 760 ? 96 : 132;
    var cols = Math.max(4, Math.round(vw / size));
    var rows = Math.max(4, Math.round(vh / size));
    var el = document.createElement('div');
    el.className = 'tiling tiling--' + kind;
    var grid = document.createElement('div');
    grid.className = 'tiling-grid';
    grid.setAttribute('aria-hidden', 'true');
    grid.style.setProperty('--cols', cols);
    grid.style.setProperty('--rows', rows);
    /* indirizzo assoluto: un url() dentro una variabile CSS verrebbe risolto
       rispetto al foglio di stile, non alla pagina */
    if (kind === 'intro') grid.style.setProperty('--marble-img', 'url("' + new URL(MARBLE, document.baseURI).href + '")');
    var cells = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var i = document.createElement('i');
        i.style.setProperty('--c', c);
        i.style.setProperty('--r', r);
        grid.appendChild(i);
        cells.push({ el: i, c: c, r: r });
      }
    }
    el.appendChild(grid);
    document.body.appendChild(el);
    return { el: el, grid: grid, cells: cells, cols: cols, rows: rows };
  }

  /* ritardi a onda: più una piastrella è lontana dall'origine, più aspetta */
  function wave(t, prop, ox, oy, spread) {
    var far = 0;
    t.cells.forEach(function (cell) {
      far = Math.max(far, Math.sqrt((cell.c - ox) * (cell.c - ox) + (cell.r - oy) * (cell.r - oy)));
    });
    var step = spread / (far || 1), max = 0;
    t.cells.forEach(function (cell) {
      var d = Math.round(Math.sqrt((cell.c - ox) * (cell.c - ox) + (cell.r - oy) * (cell.r - oy)) * step);
      cell.el.style.setProperty(prop, d + 'ms');
      if (d > max) max = d;
    });
    return max;
  }

  function finish(t) {
    if (t.el.parentNode) t.el.parentNode.removeChild(t.el);
    document.body.classList.remove('is-tiling');
  }

  function openTiling(t, fast) {
    var max = wave(t, '--open', (t.cols - 1) / 2, (t.rows - 1) / 2, fast ? 200 : 420);
    if (fast) t.el.classList.add('is-fast');
    t.el.classList.add('is-opening');
    markOpen();
    window.setTimeout(function () { finish(t); }, max + (fast ? 300 : 520) + 80);
  }

  /* Prima visita della sessione: le piastrelle vengono posate una alla volta,
     partendo dall'angolo in basso a sinistra come farebbe un posatore,
     poi si sollevano dal centro e scoprono il sito. Saltabile in ogni
     momento: un tasto, un tocco, la rotella, o il pulsante. */
  function runIntro() {
    store('rd-intro', '1');
    store('rd-nav', null);
    var t = buildTiling('intro');
    root.classList.remove('rd-cover');
    document.body.classList.add('is-tiling');

    var total = t.cells.length;
    var LAY = 1000;
    var maxK = (t.cols - 1) + (t.rows - 1) || 1;
    t.cells.forEach(function (cell) {
      cell.lay = Math.round((cell.c + (t.rows - 1 - cell.r)) / maxK * LAY);
      cell.el.style.setProperty('--lay', cell.lay + 'ms');
    });
    t.cells[(t.rows - 1) * t.cols].el.classList.add('is-origin');

    var badge = document.createElement('div');
    badge.className = 'tiling-badge';
    badge.setAttribute('aria-hidden', 'true');
    badge.innerHTML =
      '<div class="tb-brand"><img src="assets/img/brand/logo-rd.png" width="44" height="44" alt="">' +
      '<div><b>Romanazzi Domenico</b><small>Piastrellisti e posatori</small></div></div>' +
      '<p class="tb-count"><span>Posa in corso</span><strong><span data-n>00</span> / ' + total + '</strong></p>' +
      '<div class="tb-bar"><i></i></div>';
    t.el.appendChild(badge);
    var counter = badge.querySelector('[data-n]');
    var progress = badge.querySelector('.tb-bar i');

    var skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'tiling-skip';
    skip.textContent = 'Salta l\'apertura';
    t.el.appendChild(skip);

    var t0 = Date.now();
    var timers = [];
    var done = false;
    var SKIP_EVENTS = ['keydown', 'wheel', 'touchmove', 'pointerdown'];

    var paint = function (n) {
      counter.textContent = (n < 10 ? '0' : '') + n;
      progress.style.setProperty('--p', n / total);
    };
    var tick = function () {
      var elapsed = Date.now() - t0, n = 0;
      for (var i = 0; i < t.cells.length; i++) if (t.cells[i].lay + 190 <= elapsed) n++;
      paint(n);
      if (n < total && !done) timers.push(window.setTimeout(tick, 50));
    };
    var onSkip = function (e) {
      if (e.type === 'keydown' && /^(Shift|Control|Alt|Meta)$/.test(e.key)) return;
      open(true);
    };
    var open = function (fast) {
      if (done) return;
      done = true;
      timers.forEach(window.clearTimeout);
      SKIP_EVENTS.forEach(function (ev) { window.removeEventListener(ev, onSkip, true); });
      paint(total);
      openTiling(t, fast);
      /* ?intro serve solo a rivederla: non deve ripartire a ogni ricarica */
      if (/[?&]intro(=|&|$)/.test(window.location.search) && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + window.location.hash);
      }
    };

    skip.addEventListener('click', function () { open(true); });
    SKIP_EVENTS.forEach(function (ev) { window.addEventListener(ev, onSkip, { capture: true, passive: true }); });

    t.grid.classList.add('is-laying');
    tick();
    timers.push(window.setTimeout(function () { open(false); }, LAY + 380 + 260));
  }

  /* Arrivo da un'altra pagina del sito: si parte coperti e si apre dal centro */
  function runArrive() {
    store('rd-nav', null);
    var t = buildTiling('cover');
    t.el.classList.add('is-covered');
    root.classList.remove('rd-cover');
    document.body.classList.add('is-tiling');
    window.setTimeout(function () { openTiling(t, false); }, 60);
  }

  /* Uscita verso un'altra pagina: le piastrelle si posano a onda partendo
     dal punto in cui si è cliccato, e solo dopo si cambia pagina. */
  function leaveTo(href, x, y) {
    var t = buildTiling('cover');
    document.body.classList.add('is-tiling');
    var ox = Math.min(t.cols - 1, Math.max(0, Math.floor(x / (window.innerWidth / t.cols))));
    var oy = Math.min(t.rows - 1, Math.max(0, Math.floor(y / (window.innerHeight / t.rows))));
    var max = wave(t, '--in', ox, oy, 300);
    t.cells[oy * t.cols + ox].el.classList.add('is-origin');
    t.el.classList.add('is-closing');
    window.setTimeout(function () {
      t.el.classList.add('is-covered');
      store('rd-nav', '1');
      window.location.href = href;
    }, max + 340);
    /* se la nuova pagina non arriva (navigazione annullata), si torna liberi */
    window.setTimeout(function () { store('rd-nav', null); finish(t); }, max + 6000);
  }

  if (tilingMode === 'intro') runIntro();
  else if (tilingMode === 'arrive') runArrive();

  /* cambio pagina a piastrelle solo per i link interni a pagine del sito,
     e solo se possiamo ricordarcelo fra una pagina e l'altra */
  if (animate && store('rd-probe', '1') && store('rd-probe', null)) {
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      var raw = a.getAttribute('href');
      if (!raw || raw.charAt(0) === '#') return;
      var url;
      try { url = new URL(a.href, window.location.href); } catch (err) { return; }
      if (url.origin !== window.location.origin) return;
      if (!/(\.html|\/)$/.test(url.pathname)) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return;
      e.preventDefault();
      var x = e.clientX, y = e.clientY;
      if (!e.detail) { /* attivato da tastiera: l'onda parte dal link */
        var rect = a.getBoundingClientRect();
        x = rect.left + rect.width / 2; y = rect.top + rect.height / 2;
      }
      leaveTo(url.href, x, y);
    });
  }

  /* tornando indietro, il browser può ripristinare la pagina com'era al
     momento dell'uscita, cioè coperta: la ripuliamo */
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    Array.prototype.forEach.call(document.querySelectorAll('.tiling'), function (n) {
      n.parentNode.removeChild(n);
    });
    document.body.classList.remove('is-tiling');
    root.classList.remove('rd-cover');
    store('rd-nav', null);
  });

  /* =========================================================
     Nav a schermo intero
     ========================================================= */
  var burger = document.querySelector('.burger');
  var overlay = document.getElementById('nav-overlay');

  if (burger && overlay) {
    var lastFocus = null;

    var focusablesIn = function (root) {
      return Array.prototype.filter.call(
        root.querySelectorAll('a[href], button:not(:disabled)'),
        function (el) {
          /* esclude i link della tendina chiusa (visibility: hidden) */
          return (el.offsetParent !== null && window.getComputedStyle(el).visibility !== 'hidden') ||
                 el === document.activeElement;
        }
      );
    };

    var openNav = function () {
      lastFocus = document.activeElement;
      overlay.hidden = false;
      /* force a reflow so the clip-path transition runs from its start value */
      void overlay.offsetWidth;
      overlay.classList.add('is-open');
      burger.setAttribute('aria-expanded', 'true');
      document.body.classList.add('is-locked');
      var first = focusablesIn(overlay)[0];
      if (first) first.focus();
    };

    var closeNav = function (restore) {
      overlay.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('is-locked');
      var hide = function () { overlay.hidden = true; };
      if (animate) window.setTimeout(hide, 520); else hide();
      if (restore !== false) burger.focus();
    };

    burger.addEventListener('click', function () {
      if (burger.getAttribute('aria-expanded') === 'true') closeNav();
      else openNav();
    });

    overlay.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeNav(false);
    });

    document.addEventListener('keydown', function (e) {
      if (burger.getAttribute('aria-expanded') !== 'true') return;
      if (e.key === 'Escape') { e.preventDefault(); closeNav(); return; }
      if (e.key !== 'Tab') return;
      /* trappola del focus */
      var items = focusablesIn(overlay);
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    /* tendina "Lavorazioni" */
    Array.prototype.forEach.call(overlay.querySelectorAll('.nav-sub-toggle'), function (btn) {
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', String(open));
        btn.parentNode.classList.toggle('is-open', open);
      });
    });

    /* stagger dei link */
    Array.prototype.forEach.call(overlay.querySelectorAll('.nav-list li'), function (li, i) {
      li.style.setProperty('--d', (60 + i * 70) + 'ms');
    });
  }

  /* =========================================================
     Tessere sopra le immagini: si sollevano in diagonale quando
     l'immagine entra in vista, poi vengono tolte dal documento.
     ========================================================= */
  if (animate) {
    Array.prototype.forEach.call(document.querySelectorAll('.wipe'), function (box) {
      var spec = (box.getAttribute('data-mosaic') || '4x3').split('x');
      var mc = parseInt(spec[0], 10) || 4, mr = parseInt(spec[1], 10) || 3;
      var m = document.createElement('span');
      m.className = 'mosaic';
      m.setAttribute('aria-hidden', 'true');
      m.style.setProperty('--mc', mc);
      m.style.setProperty('--mr', mr);
      for (var y = 0; y < mr; y++) {
        for (var x = 0; x < mc; x++) {
          var cell = document.createElement('i');
          cell.style.setProperty('--k', x + y);
          m.appendChild(cell);
        }
      }
      box.appendChild(m);
    });
  }
  function retireMosaic(el) {
    var m = el.querySelector(':scope > .mosaic');
    if (!m) return;
    window.setTimeout(function () { if (m.parentNode) m.parentNode.removeChild(m); }, 2200);
  }

  /* =========================================================
     Reveal deterministico (scroll + resize, niente observer)
     ========================================================= */
  var revealables = Array.prototype.slice.call(
    document.querySelectorAll('.rise, .wipe, .rule--draw, .reveal-line, [data-reveal]')
  );

  if (animate && revealables.length) {
    revealables.forEach(function (el) {
      if (el.style.getPropertyValue('--d')) return;
      var group = Array.prototype.filter.call(el.parentNode.children, function (c) {
        return c.nodeType === 1 && c.className && /\b(rise|wipe|reveal-line)\b/.test(c.className);
      });
      var i = group.indexOf(el);
      if (i > 0) el.style.setProperty('--d', Math.min(i, 6) * 70 + 'ms');
    });

    var pending = revealables.slice();

    var sweep = function () {
      if (!opened) return; /* sotto le piastrelle non si anima niente */
      var limit = window.innerHeight * 0.92;
      var next = [];
      for (var i = 0; i < pending.length; i++) {
        var el = pending[i];
        if (el.getBoundingClientRect().top < limit) {
          el.classList.add('is-in');
          retireMosaic(el);
          /* i contatori vivono dentro l'elemento rivelato, non su di esso */
          Array.prototype.forEach.call(el.querySelectorAll('[data-count]'), countUp);
          if (el.dataset.count !== undefined) countUp(el);
        } else next.push(el);
      }
      pending = next;
      if (!pending.length) {
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
      }
    };

    var schedule = throttled(sweep);

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('load', schedule);
    whenOpen(sweep);
  } else {
    /* niente animazioni: i contatori mostrano subito il valore finale */
    Array.prototype.forEach.call(document.querySelectorAll('[data-count]'), function (el) {
      el.textContent = el.dataset.count;
    });
  }

  /* Contatori */
  function countUp(el) {
    var target = parseInt(el.dataset.count, 10);
    if (isNaN(target)) return;
    if (el.dataset.done) return;
    el.dataset.done = '1';
    var start = null;
    var dur = 1100;
    var done = false;
    var finish = function () {
      if (done) return;
      done = true;
      el.textContent = target;
    };
    var tick = function (t) {
      if (done) return;
      if (start === null) start = t;
      var p = Math.min((t - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) window.requestAnimationFrame(tick);
      else finish();
    };
    window.requestAnimationFrame(tick);
    /* Se i frame non arrivano (scheda in secondo piano) il numero non deve
       restare a zero: dopo la durata prevista lo scriviamo comunque. */
    window.setTimeout(finish, dur + 400);
  }

  /* =========================================================
     Barra: tema scuro sopra le sezioni scure
     ========================================================= */
  var bar = document.querySelector('.site-bar');
  var darkZones = Array.prototype.slice.call(document.querySelectorAll('.hero, .sec--dark, .site-footer'));
  if (bar && darkZones.length) {
    var syncBar = function () {
      var probe = bar.getBoundingClientRect().bottom - 2;
      var dark = darkZones.some(function (z) {
        var r = z.getBoundingClientRect();
        return r.top <= probe && r.bottom >= probe;
      });
      document.documentElement.classList.toggle('theme-dark', dark);
    };
    var barSchedule = throttled(syncBar);
    window.addEventListener('scroll', barSchedule, { passive: true });
    window.addEventListener('resize', barSchedule);
    syncBar();
  }

  /* Hero: avvia lo zoom-out una volta montato */
  var hero = document.querySelector('.hero');
  if (hero) whenOpen(function () { window.setTimeout(function () { hero.classList.add('is-ready'); }, 0); });

  /* Sopra i 760px l'hero mostra il bagno e la squadra compare in dissolvenza
     al passaggio del mouse; sotto, la squadra è già l'immagine dell'hero.
     Scarichiamo la seconda immagine solo dove quell'hover può avvenire. */
  var heroAlt = document.querySelector('.hero-alt[data-hover-src]');
  if (heroAlt && window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 760px)').matches) {
    /* non deve contendere la banda all'immagine principale: parte dopo il
       caricamento della pagina, quando il browser è libero */
    var loadAlt = function () {
      withAvif(function (ok) {
        if (ok && heroAlt.dataset.hoverSrcset) heroAlt.srcset = heroAlt.dataset.hoverSrcset;
        heroAlt.src = heroAlt.dataset.hoverSrc;
      });
    };
    var later = function () {
      if (window.requestIdleCallback) window.requestIdleCallback(loadAlt, { timeout: 3000 });
      else window.setTimeout(loadAlt, 1200);
    };
    if (document.readyState === 'complete') later();
    else window.addEventListener('load', later);
  }

  /* =========================================================
     Anteprima che segue il cursore sulle righe progetto
     ========================================================= */
  var peek = document.querySelector('.peek');
  var rows = document.querySelectorAll('[data-peek]');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  if (peek && rows.length && finePointer.matches && !reduce.matches) {
    var peekImg = peek.querySelector('img');
    var mx = 0, my = 0, px = 0, py = 0, raf = null, active = false;

    var loop = function () {
      px += (mx - px) * 0.16;
      py += (my - py) * 0.16;
      peek.style.transform = 'translate3d(' + px + 'px,' + py + 'px,0) scale(' + (active ? 1 : 0.94) + ')';
      if (active || Math.abs(mx - px) > 0.5) raf = window.requestAnimationFrame(loop);
      else raf = null;
    };

    document.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (!raf && active) raf = window.requestAnimationFrame(loop);
    }, { passive: true });

    Array.prototype.forEach.call(rows, function (row) {
      row.addEventListener('mouseenter', function () {
        var src = row.getAttribute('data-peek');
        if (!src) return;
        peekImg.src = src;
        peekImg.alt = '';
        active = true;
        peek.classList.add('is-on');
        px = mx; py = my;
        if (!raf) raf = window.requestAnimationFrame(loop);
      });
      row.addEventListener('mouseleave', function () {
        active = false;
        peek.classList.remove('is-on');
      });
    });
  }

  /* =========================================================
     Video di presentazione
     - sorgente più grande solo sugli schermi che la meritano
     - parte da sola, senza audio, quando entra nello schermo
     - si ferma quando esce, per non consumare rete e batteria
     - con "riduci animazioni" o "risparmio dati" resta fermo sul poster
     I controlli nativi sono sempre presenti: chi vuole può
     mettere in pausa, riavvolgere o attivare l'audio.
     ========================================================= */
  var conn = navigator.connection || {};
  var frugal = conn.saveData === true || /^(slow-)?2g$/.test(conn.effectiveType || '');

  Array.prototype.forEach.call(document.querySelectorAll('.rd-video'), function (video) {
    var mayAutoplay = !reduce.matches && !frugal;

    /* Su telefono non parte da solo: sarebbero megabyte di dati
       consumati senza che nessuno li abbia chiesti. Resta il poster
       con i controlli, e parte al tocco. */
    var wideEnough = window.innerWidth >= 760;
    mayAutoplay = mayAutoplay && wideEnough;

    /* La versione HD (data-src-hd su ogni <source>) e il caricamento vero
       avvengono solo quando serve: `video.load()` scarica il file, quindi
       chiamarlo subito vanificherebbe preload="none". */
    var prepared = false;
    var prepare = function () {
      if (prepared) return;
      prepared = true;
      /* Nessun avvio automatico con l'audio: l'attributo `muted` da solo
         non basta, va imposto anche sulla proprietà prima del play.
         Dopo il primo avvio l'utente è libero di attivarlo dai controlli. */
      video.muted = true;
      if (!wideEnough) return;
      var swapped = false;
      Array.prototype.forEach.call(video.querySelectorAll('source[data-src-hd]'), function (src) {
        src.src = src.getAttribute('data-src-hd');
        swapped = true;
      });
      if (swapped) { video.load(); video.muted = true; }
    };

    var vSync = function () {
      var r = video.getBoundingClientRect();
      var visible = r.bottom > 0 && r.top < window.innerHeight;
      if (visible && mayAutoplay && video.paused && !video.dataset.userPaused) {
        prepare();
        var p = video.play();
        if (p && p.catch) p.catch(function () { /* il browser ha detto no: resta il poster */ });
      } else if (!visible && !video.paused) {
        video.pause();
      }
    };
    var vSchedule = throttled(vSync);

    /* Una pausa decisa dall'utente vince sullo scorrimento e non deve più
       essere annullata. Ma il browser mette in pausa anche da solo (scheda in
       secondo piano, telefonata in arrivo, batteria): quelle pause non vanno
       scambiate per una scelta. Le distinguiamo dal fatto che una pausa
       voluta arriva subito dopo un tocco o un tasto sui controlli. */
    var lastInteract = 0;
    ['pointerdown', 'keydown'].forEach(function (ev) {
      video.addEventListener(ev, function () { lastInteract = Date.now(); });
    });
    video.addEventListener('pause', function () {
      if (Date.now() - lastInteract < 800) video.dataset.userPaused = '1';
    });
    video.addEventListener('play', function () { delete video.dataset.userPaused; });

    window.addEventListener('scroll', vSchedule, { passive: true });
    window.addEventListener('resize', vSchedule);
    /* In una scheda in secondo piano requestAnimationFrame è congelato,
       quindi lo scorrimento non fa scattare nessun controllo: ricontrolliamo
       direttamente quando la pagina torna in primo piano. */
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') vSync();
    });
    vSync();
  });

  /* =========================================================
     Schemi di posa
     La tela misura 100 x 75 unità; ogni piastrella ha centro (x, y),
     lati (w, h) e rotazione r. Le piastrelle sono sempre le stesse:
     cambiando schema ognuna scivola, ruota e si ridimensiona verso il
     nuovo posto (solo transform e opacity). Ogni schema è stato
     verificato: copre tutta la tela, senza buchi né sovrapposizioni.
     Senza JavaScript resta l'elenco completo, tutto leggibile.
     ========================================================= */
  var posaSec = document.querySelector('[data-posa]');
  if (posaSec) {
    var canvas = posaSec.querySelector('[data-posa-canvas]');
    var tabsBox = posaSec.querySelector('.posa-tabs');
    var posaList = posaSec.querySelector('.posa-list');
    var entries = Array.prototype.slice.call(posaSec.querySelectorAll('.posa-item'));

    var CW = 100, CH = 75;

    /* tiene la piastrella solo se il suo ingombro (ruotato) tocca la tela */
    function keep(t) {
      var a = t.r * Math.PI / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
      var hx = (t.w * c + t.h * s) / 2, hy = (t.w * s + t.h * c) / 2;
      return t.x + hx > 0 && t.x - hx < CW && t.y + hy > 0 && t.y - hy < CH;
    }

    var PATTERNS = {
      dritta: function () {
        var s = 12.5, out = [];
        for (var y = 0; y < CH; y += s) for (var x = 0; x < CW; x += s)
          out.push({ x: x + s / 2, y: y + s / 2, w: s, h: s, r: 0 });
        return out;
      },
      verticale: function () {
        /* listelli 1:3 in piedi e allineati, come il 10x30 nei bagni */
        var w = 6.25, h = 18.75, out = [];
        for (var y = 0; y < CH; y += h) for (var x = 0; x < CW; x += w)
          out.push({ x: x + w / 2, y: y + h / 2, w: w, h: h, r: 0 });
        return out;
      },
      sfalsata: function () {
        /* sfalsamento di un terzo: sui formati lunghi evita gli scalini */
        var l = 30, h = 10, out = [];
        for (var j = 0; j * h < CH; j++) {
          var off = (j % 3) * l / 3;
          for (var x = -l + off; x < CW + l; x += l) {
            var t = { x: x + l / 2, y: j * h + h / 2, w: l, h: h, r: 0 };
            if (keep(t)) out.push(t);
          }
        }
        return out;
      },
      diagonale: function () {
        var s = 12, d = s * Math.SQRT2, out = [];
        for (var j = -2; j * d / 2 < CH + d; j++)
          for (var i = -2; i * d < CW + d; i++) {
            var t = { x: i * d + (j % 2 ? d / 2 : 0), y: j * d / 2, w: s, h: s, r: 45 };
            if (keep(t)) out.push(t);
          }
        return out;
      },
      spina: function () {
        /* scala di listelli L = 3W allineata agli assi, ripetuta lungo (-L, L),
           poi ruotata di 45° attorno al centro della tela */
        var W = 6.5, L = 3 * W, cx = CW / 2, cy = CH / 2, out = [];
        var cos = Math.SQRT1_2, sin = Math.SQRT1_2;
        for (var k = -14; k <= 14; k++) {
          for (var n = -24; n <= 24; n++) {
            var ox = -k * L, oy = k * L;
            var pieces = [
              { x: ox + n * W + L / 2, y: oy + n * W + W / 2, w: L, h: W },
              { x: ox + n * W + W / 2, y: oy + n * W + W + L / 2, w: W, h: L }
            ];
            for (var p = 0; p < 2; p++) {
              var a = pieces[p];
              var t = { x: cx + a.x * cos - a.y * sin, y: cy + a.x * sin + a.y * cos, w: a.w, h: a.h, r: 45 };
              if (keep(t)) out.push(t);
            }
          }
        }
        return out;
      },
      grande: function () {
        var w = CW / 3, out = [];
        for (var i = 0; i < 3; i++) out.push({ x: w * i + w / 2, y: CH / 2, w: w, h: CH, r: 0 });
        return out;
      }
    };

    var byRow = function (a, b) { return (a.y - b.y) || (a.x - b.x); };
    var layouts = {}, POOL = 0;
    Object.keys(PATTERNS).forEach(function (k) {
      layouts[k] = PATTERNS[k]().sort(byRow);
      POOL = Math.max(POOL, layouts[k].length);
    });

    var SHADES = ['#EDE9E2', '#E5E0D7', '#F2EFEA', '#E0DACF', '#E9E4DC'];
    var pool = [];
    for (var pi = 0; pi < POOL; pi++) {
      var tile = document.createElement('span');
      tile.className = 'posa-tile';
      tile.style.setProperty('--tc', SHADES[(pi * 7) % SHADES.length]);
      tile.style.setProperty('--op', 0);
      canvas.appendChild(tile);
      pool.push(tile);
    }

    var show = function (key, still) {
      var tiles = layouts[key];
      var grout = key === 'grande' ? 0.6 : 0.8;
      if (still) canvas.classList.add('is-still');
      /* la piastrella più vicina al centro è il punto di partenza; nel grande
         formato no: una lastra intera arancione coprirebbe la venatura */
      var origin = -1, best = Infinity;
      if (key !== 'grande') tiles.forEach(function (t, i) {
        var d = (t.x - CW / 2) * (t.x - CW / 2) + (t.y - CH / 2) * (t.y - CH / 2);
        if (d < best) { best = d; origin = i; }
      });
      pool.forEach(function (el, i) {
        var t = tiles[i];
        if (t) {
          el.style.setProperty('--tx', (t.x - 5).toFixed(3));
          el.style.setProperty('--ty', (t.y - 5).toFixed(3));
          el.style.setProperty('--tr', t.r + 'deg');
          el.style.setProperty('--sx', ((t.w - grout) / 10).toFixed(4));
          el.style.setProperty('--sy', ((t.h - grout) / 10).toFixed(4));
          el.style.setProperty('--op', 1);
          el.style.setProperty('--td', Math.round(Math.max(0, Math.min(CW, t.x)) * 3.2) + 'ms');
        } else {
          /* non servono in questo schema: spariscono dove sono */
          el.style.setProperty('--sx', 0.01);
          el.style.setProperty('--sy', 0.01);
          el.style.setProperty('--op', 0);
          el.style.setProperty('--td', '0ms');
        }
        el.classList.toggle('is-origin', i === origin);
      });
      canvas.classList.toggle('is-grande', key === 'grande');
      if (still) {
        void canvas.offsetWidth;
        canvas.classList.remove('is-still');
      }
    };

    var select = function (key, still) {
      Array.prototype.forEach.call(tabsBox.children, function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-pattern') === key));
      });
      entries.forEach(function (item) { item.hidden = item.getAttribute('data-pattern') !== key; });
      show(key, still);
    };

    entries.forEach(function (item) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'posa-tab';
      b.textContent = item.querySelector('dt').textContent;
      b.setAttribute('data-pattern', item.getAttribute('data-pattern'));
      tabsBox.appendChild(b);
    });
    tabsBox.addEventListener('click', function (e) {
      var b = e.target.closest('.posa-tab');
      if (b) select(b.getAttribute('data-pattern'), false);
    });
    tabsBox.hidden = false;
    posaList.setAttribute('aria-live', 'polite');
    canvas.classList.add('is-live');
    select('dritta', true);
  }

  /* =========================================================
     Barra fissa su telefono (Chiama / Scrivi)
     ========================================================= */
  var callbar = document.querySelector('[data-callbar]');
  var footEl = document.querySelector('.site-footer');
  if (callbar && footEl) {
    var narrow = window.matchMedia('(max-width: 759.98px)');
    var syncCall = function () {
      if (!narrow.matches) {
        callbar.hidden = true;
        root.classList.remove('has-callbar');
        return;
      }
      callbar.hidden = false;
      root.classList.add('has-callbar');
      var past = window.scrollY > window.innerHeight * 0.6;
      var footerSeen = footEl.getBoundingClientRect().top < window.innerHeight;
      var on = past && !footerSeen;
      callbar.classList.toggle('is-on', on);
      /* fuori schermo non deve ricevere il focus da tastiera */
      Array.prototype.forEach.call(callbar.querySelectorAll('a'), function (a) {
        if (on) a.removeAttribute('tabindex'); else a.setAttribute('tabindex', '-1');
      });
      callbar.setAttribute('aria-hidden', on ? 'false' : 'true');
    };
    var callSchedule = throttled(syncCall);
    window.addEventListener('scroll', callSchedule, { passive: true });
    window.addEventListener('resize', callSchedule);
    syncCall();
  }

  /* =========================================================
     Filtri galleria
     ========================================================= */
  var filterBar = document.querySelector('[data-filters]');
  var galleryEl = document.querySelector('[data-gallery]');
  var status = document.querySelector('[data-gallery-status]');

  function applyFilter(value) {
    if (!galleryEl) return;
    var shown = 0;
    Array.prototype.forEach.call(galleryEl.querySelectorAll('.shot'), function (fig) {
      var cats = (fig.getAttribute('data-cat') || '').split(' ');
      var match = value === 'all' || cats.indexOf(value) !== -1;
      fig.hidden = !match;
      if (match) shown++;
    });
    if (status) {
      status.textContent = shown === 1 ? '1 fotografia in mostra' : shown + ' fotografie in mostra';
    }
  }

  if (filterBar && galleryEl) {
    filterBar.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter');
      if (!btn) return;
      Array.prototype.forEach.call(filterBar.querySelectorAll('.filter'), function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      applyFilter(btn.getAttribute('data-filter'));
    });
    applyFilter('all');
  }

  /* =========================================================
     Lightbox
     ========================================================= */
  var dialog = document.getElementById('lightbox');

  if (dialog && typeof dialog.showModal === 'function') {
    var stage = dialog.querySelector('[data-lb-image]');
    var caption = dialog.querySelector('[data-lb-caption]');
    var counter = dialog.querySelector('[data-lb-count]');
    var btnPrev = dialog.querySelector('[data-lb-prev]');
    var btnNext = dialog.querySelector('[data-lb-next]');
    var btnClose = dialog.querySelector('[data-lb-close]');
    var opener = null;
    var items = [];
    var index = 0;

    var collect = function () {
      items = Array.prototype.filter.call(
        document.querySelectorAll('[data-lb-open]'),
        function (btn) {
          var fig = btn.closest('.shot');
          return !fig || !fig.hidden;
        }
      );
    };

    var render = function () {
      var btn = items[index];
      if (!btn) return;
      stage.src = (avifReady && btn.getAttribute('data-full-avif')) || btn.getAttribute('data-full');
      stage.alt = btn.getAttribute('data-alt') || '';
      stage.width = Number(btn.getAttribute('data-w')) || 1800;
      stage.height = Number(btn.getAttribute('data-h')) || 1200;
      caption.textContent = btn.getAttribute('data-caption') || '';
      counter.textContent = (index + 1) + ' / ' + items.length;
      var single = items.length < 2;
      btnPrev.disabled = single;
      btnNext.disabled = single;
    };

    var go = function (step) {
      if (!items.length) return;
      index = (index + step + items.length) % items.length;
      render();
    };

    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-lb-open]');
      if (!btn) return;
      collect();
      index = items.indexOf(btn);
      if (index < 0) index = 0;
      opener = btn;
      render();
      dialog.showModal();
      btnClose.focus();
    });

    btnPrev.addEventListener('click', function () { go(-1); });
    btnNext.addEventListener('click', function () { go(1); });
    btnClose.addEventListener('click', function () { dialog.close(); });

    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });

    dialog.addEventListener('click', function (e) {
      if (e.target === dialog || e.target.classList.contains('lb-stage')) dialog.close();
    });

    dialog.addEventListener('close', function () {
      stage.removeAttribute('src');
      var target = opener;
      opener = null;
      if (!target) return;
      /* fuori dal ciclo corrente: il ripristino nativo del focus
         lascerebbe altrimenti il focus su un controllo ormai nascosto */
      window.requestAnimationFrame(function () {
        if (document.contains(target)) target.focus();
      });
    });
  } else if (dialog) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-lb-open]'), function (btn) {
      btn.addEventListener('click', function () {
        window.open(btn.getAttribute('data-full'), '_blank', 'noopener');
      });
    });
  }

  /* Anno corrente */
  Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
