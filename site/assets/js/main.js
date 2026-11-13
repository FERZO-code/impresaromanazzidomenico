/* Impresa Romanazzi Domenico — interazioni e movimento
   Menu · video · schemi di posa · galleria e lightbox · barra di chiamata,
   e tutto il movimento con GSAP: apertura, comparse allo scorrimento,
   lastre impilate, nastro, anteprima dei lavori.
   Regola di base: senza script, o con "riduci movimento", tutto resta
   visibile e fermo. */
(function () {
  'use strict';

  var root = document.documentElement;
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
     Menu in barra (computer): la tendina "Lavorazioni" si apre al clic
     (utile anche su tablet, dove non c'è il passaggio del mouse) e si
     chiude con Esc o toccando fuori. Con il mouse si apre anche al passaggio.
     ========================================================= */
  (function () {
    var wrap = document.querySelector('.bar-sub');
    if (!wrap) return;
    var btn = wrap.querySelector('button');
    var set = function (open) { btn.setAttribute('aria-expanded', String(open)); wrap.classList.toggle('is-open', open); };
    btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) set(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && wrap.classList.contains('is-open')) { set(false); btn.focus(); }
    });
  })();


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

  /* =========================================================
     Barra: fondo pieno dopo i primi pixel, si ritira scendendo e
     torna salendo, cambia tinta sopra le sezioni scure.
     ========================================================= */
  var bar = document.querySelector('.site-bar');
  if (bar) {
    var darkZones = Array.prototype.slice.call(document.querySelectorAll('.sec--dark, .site-footer'));
    var lastY = window.pageYOffset;
    var syncBar = throttled(function () {
      var y = window.pageYOffset;
      var h = bar.offsetHeight;
      bar.classList.toggle('is-solid', y > 24);
      if (Math.abs(y - lastY) > 6) {
        bar.classList.toggle('is-away', y > lastY && y > 480 && !document.body.classList.contains('is-locked'));
        lastY = y;
      }
      root.classList.toggle('theme-dark', darkZones.some(function (z) {
        var r = z.getBoundingClientRect();
        return r.top <= h / 2 && r.bottom >= h / 2;
      }));
    });
    window.addEventListener('scroll', syncBar, { passive: true });
    window.addEventListener('resize', syncBar);
    bar.addEventListener('focusin', function () { bar.classList.remove('is-away'); });
    syncBar();
  }

  /* =========================================================
     MOVIMENTO — GSAP
     Durate e curve in un posto solo, così il sito si muove tutto
     allo stesso modo.
     ========================================================= */
  var G = window.gsap;
  var ST = window.ScrollTrigger;
  var SP = window.SplitText;
  var EASE = 'power3.out';
  var SETTLE = 'expo.out';

  function showAll() { root.classList.remove('rd-wait', 'rd-cover'); }

  if (!animate || !G || !ST) { showAll(); return; }
  G.registerPlugin(ST);
  if (SP) G.registerPlugin(SP);

  var toArray = G.utils.toArray;
  var scope = document.querySelector('.hero') || document.querySelector('.page-head');
  var inScope = function (el) { return scope && scope.contains(el); };

  /* ---------- Entrata della prima schermata ---------- */
  function enter() {
    root.classList.remove('rd-wait');
    if (!scope) return;
    var tl = G.timeline({ defaults: { ease: SETTLE } });
    tl.from(scope.querySelectorAll('.reveal-line > span'), { yPercent: 112, duration: 1.15, stagger: 0.1 }, 0)
      .from(scope.querySelectorAll('.label, .crumb'), { autoAlpha: 0, y: 14, duration: 0.7, ease: EASE }, 0.05)
      .from(scope.querySelectorAll('.lede, .hero-cta, .btn-row'), { autoAlpha: 0, y: 24, duration: 0.95, stagger: 0.09, ease: EASE }, 0.35);

    var lastre = scope.querySelectorAll('.lastra');
    if (lastre.length) {
      /* le lastre vengono posate una alla volta: arrivano dall'alto, appena
         ruotate, e si assestano; per ultime entrano le crocette */
      var tilt = [-2.5, 2, -1.5, 2.5, -2];
      tl.from(lastre, {
        autoAlpha: 0, y: -46, scale: 1.06, duration: 1.2, stagger: 0.1,
        rotation: function (i) { return tilt[i % tilt.length]; }
      }, 0.12)
        .from(scope.querySelectorAll('.croce'), { scale: 0, rotation: -90, duration: 0.6, ease: 'back.out(2.4)', stagger: 0.08 }, '-=0.5');
    }
  }

  /* ---------- Apertura: solo alla prima pagina della sessione ---------- */
  function playIntro() {
    var narrow = window.innerWidth < 700;
    var cols = narrow ? 3 : 6;
    var rows = narrow ? 5 : 4;
    var mid = Math.floor((rows - 1) / 2) * cols + Math.floor((cols - 1) / 2);
    var el = document.createElement('div');
    el.className = 'intro';
    el.setAttribute('aria-hidden', 'true');
    el.style.setProperty('--cols', cols);
    el.style.setProperty('--rows', rows);
    for (var i = 0; i < cols * rows; i++) {
      var t = document.createElement('i');
      if (i === mid) {
        t.className = 'intro-mark';
        var logo = new Image();
        logo.src = 'assets/img/brand/logo-rd.png';
        logo.alt = '';
        t.appendChild(logo);
      }
      el.appendChild(t);
    }
    document.body.appendChild(el);
    document.body.classList.add('is-intro');
    root.classList.remove('rd-cover');
    try { window.sessionStorage.setItem('rd-intro', '1'); } catch (e) { /* navigazione privata */ }

    var mark = el.querySelector('.intro-mark');
    var tl = G.timeline({
      onComplete: function () { el.remove(); document.body.classList.remove('is-intro'); ST.refresh(); }
    });
    tl.from(el.children, { scale: 0.9, autoAlpha: 0, duration: 0.5, ease: EASE, stagger: { grid: [rows, cols], from: mid, amount: 0.35 } })
      .from(mark.firstChild, { scale: 0.6, autoAlpha: 0, duration: 0.6, ease: 'back.out(1.8)' }, 0.25)
      .set(el, { backgroundColor: 'transparent' }, '+=0.35')
      .add(enter, '<0.2')
      .to(el.children, {
        yPercent: -104, rotation: function (i) { return (i % 2 ? 1 : -1) * 3; }, autoAlpha: 0,
        duration: 0.9, ease: 'power3.inOut',
        stagger: { grid: [rows, cols], from: mid, amount: 0.5 }
      }, '<');
    /* un tocco e si entra subito */
    el.addEventListener('click', function () { tl.timeScale(4); });
  }

  if (root.classList.contains('rd-cover')) playIntro();
  else enter();

  /* ---------- Titoli a righe fuori dalla prima schermata ---------- */
  var headings = [];
  toArray('.reveal-line').forEach(function (line) {
    var h = line.parentNode;
    if (!inScope(h) && headings.indexOf(h) === -1) headings.push(h);
  });
  headings.forEach(function (h) {
    G.from(h.querySelectorAll('.reveal-line > span'), {
      yPercent: 112, duration: 1.1, ease: SETTLE, stagger: 0.1,
      scrollTrigger: { trigger: h, start: 'top 90%', end: 'bottom top', once: true }
    });
  });

  /* ---------- Blocchi che salgono ---------- */
  var rises = toArray('.rise').filter(function (el) { return !inScope(el) && !el.querySelector('.reveal-line'); });
  if (rises.length) {
    G.set(rises, { autoAlpha: 0, y: 28 });
    ST.batch(rises, {
      start: 'top 92%', once: true,
      onEnter: function (batch) { G.to(batch, { autoAlpha: 1, y: 0, duration: 0.95, ease: EASE, stagger: 0.08, overwrite: true }); }
    });
  }

  /* ---------- Immagini: la lastra si scopre dal basso ---------- */
  toArray('.wipe, .svc-media').forEach(function (box) {
    var im = box.querySelector('img');
    var tl = G.timeline({ scrollTrigger: { trigger: box, start: 'top 90%', end: 'bottom top', once: true } });
    tl.fromTo(box, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.25, ease: SETTLE, clearProps: 'clipPath' });
    if (im) tl.fromTo(im, { scale: 1.22 }, { scale: 1, duration: 1.7, ease: SETTLE }, 0);
  });

  /* ---------- Galleria ---------- */
  var shots = toArray('.shot');
  if (shots.length) {
    G.set(shots, { autoAlpha: 0, y: 44 });
    ST.batch(shots, {
      start: 'top 94%', once: true,
      onEnter: function (batch) { G.to(batch, { autoAlpha: 1, y: 0, duration: 0.9, ease: EASE, stagger: 0.07, overwrite: true }); }
    });
    var fb = document.querySelector('[data-filters]');
    if (fb) fb.addEventListener('click', function (e) {
      if (!e.target.closest('.filter')) return;
      window.setTimeout(function () {
        G.fromTo(shots.filter(function (s) { return !s.hidden; }),
          { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.55, ease: EASE, stagger: 0.03, overwrite: true });
        ST.refresh();
      }, 0);
    });
  }

  /* ---------- Hero: le foto scorrono dentro le lastre ---------- */
  var heroPosa = document.querySelector('.hero-posa');
  var mm = G.matchMedia();
  if (heroPosa) {
    mm.add('(min-width: 760px)', function () {
      G.fromTo(heroPosa.querySelectorAll('.lastra img'), { yPercent: -5, scale: 1.12 }, {
        yPercent: 5, scale: 1.12, ease: 'none',
        scrollTrigger: { trigger: heroPosa, start: 'top bottom', end: 'bottom top', scrub: 0.6 }
      });
    });
  }

  /* ---------- Nastro: va da solo, e segue la mano che scorre ---------- */
  var track = document.querySelector('.nastro-track');
  if (track) {
    var loop = G.to(track, { xPercent: -50, ease: 'none', duration: 46, repeat: -1 });
    ST.create({
      trigger: document.body, start: 'top top', end: 'bottom bottom',
      onUpdate: function (self) {
        var boost = 1 + Math.min(Math.abs(self.getVelocity()) / 500, 6);
        G.to(loop, { timeScale: boost * self.direction, duration: 0.25, overwrite: true });
        G.to(loop, { timeScale: self.direction, duration: 1.4, delay: 0.25, ease: 'power2.out' });
      }
    });
  }

  /* ---------- Manifesto: le parole si accendono scorrendo ---------- */
  var fills = toArray('[data-fill]');
  if (fills.length && SP) {
    var splitFills = function () {
      fills.forEach(function (p) {
        var split = new SP(p, { type: 'words' });
        G.fromTo(split.words, { opacity: 0.16 }, {
          opacity: 1, ease: 'none', stagger: 0.5,
          scrollTrigger: { trigger: p, start: 'top 84%', end: 'bottom 58%', scrub: 0.5 }
        });
      });
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(splitFills); else splitFills();
  }

  /* ---------- Numeri ---------- */
  toArray('[data-count]').forEach(function (el) {
    var end = parseInt(el.getAttribute('data-count'), 10);
    if (isNaN(end)) return;
    var state = { v: 0 };
    el.textContent = '0';
    G.to(state, {
      v: end, duration: 1.8, ease: 'power2.out',
      onUpdate: function () { el.textContent = String(Math.round(state.v)); },
      scrollTrigger: { trigger: el, start: 'top 92%', once: true }
    });
  });

  /* ---------- Lavorazioni: ogni lastra arretra sotto la successiva ---------- */
  mm.add('(min-width: 1000px)', function () {
    var cards = toArray('.svc');
    cards.forEach(function (card, i) {
      if (i === cards.length - 1) return;
      G.to(card, {
        scale: 1 - (cards.length - 1 - i) * 0.028, ease: 'none',
        scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 22%', scrub: true }
      });
    });
  });

  /* ---------- Passaggi: il filo avanza con lo scorrimento ---------- */
  toArray('.steps').forEach(function (el) {
    G.fromTo(el, { '--p': 0 }, {
      '--p': 1, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 84%', end: 'top 36%', scrub: 0.5 }
    });
  });

  /* ---------- Anteprima dei lavori: la foto segue il cursore ---------- */
  var peek = document.querySelector('.peek');
  var peekRows = toArray('[data-peek]');
  if (peek && peekRows.length && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var peekImg = peek.querySelector('img');
    G.set(peek, { xPercent: -50, yPercent: -50, scale: 0.8 });
    var px = G.quickTo(peek, 'x', { duration: 0.6, ease: 'power3' });
    var py = G.quickTo(peek, 'y', { duration: 0.6, ease: 'power3' });
    var pr = G.quickTo(peek, 'rotation', { duration: 0.8, ease: 'power3' });
    var lastX = 0;
    peekRows.forEach(function (a) {
      a.addEventListener('mouseenter', function (e) {
        peekImg.src = a.getAttribute('data-peek');
        lastX = e.clientX;
        G.set(peek, { x: e.clientX + 210, y: e.clientY });
        G.to(peek, { autoAlpha: 1, scale: 1, duration: 0.5, ease: EASE, overwrite: 'auto' });
      });
      a.addEventListener('mousemove', function (e) {
        px(Math.min(e.clientX + 210, window.innerWidth - 180));
        py(e.clientY);
        pr(Math.max(-7, Math.min(7, (e.clientX - lastX) * 0.5)));
        lastX = e.clientX;
      });
      a.addEventListener('mouseleave', function () {
        G.to(peek, { autoAlpha: 0, scale: 0.8, duration: 0.3, ease: 'power2.in', overwrite: 'auto' });
        pr(0);
      });
    });
  }

  /* ---------- Piè di pagina: il nome sale lettera per lettera ---------- */
  var word = document.querySelector('.foot-word');
  if (word && SP) {
    var chars = new SP(word, { type: 'chars' }).chars;
    G.from(chars, {
      yPercent: 100, duration: 1.3, ease: SETTLE, stagger: 0.05,
      scrollTrigger: { trigger: word, start: 'top 98%', once: true }
    });
  }

  window.addEventListener('load', function () { ST.refresh(); });
})();
