(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ep, ALL = [], FUTURE = [], BENCH = null, audio = $('audio'), active = -1, speeds = [1, 1.25, 0.85], si = 0, wired = false;

  /* ---------- small device memory (this phone only; nothing leaves the device) ---------- */
  var LS = null; try { LS = window.localStorage; } catch (e) {}
  function lget(k, d) { try { var v = LS ? LS.getItem(k) : null; return v == null ? d : v; } catch (e) { return d; } }
  function lset(k, v) { try { if (LS) LS.setItem(k, v); } catch (e) {} }
  function doneList() { try { return JSON.parse(lget('wt_done', '[]')) || []; } catch (e) { return []; } }
  function markDone(id) { var d = doneList(); if (d.indexOf(id) < 0) { d.push(id); lset('wt_done', JSON.stringify(d)); } }
  function isOwner() { return lget('wt_owner', '0') === '1' || lget('wt_me', '0') === '1'; }

  // Where did this visit come from? A link or QR card may carry ?s=<placement>. Remember it for this visit only,
  // then remove it from the address bar so a link copied by hand does not pass the tag on to a friend.
  var SRC = 'direct';
  try {
    var qp = new URLSearchParams(location.search), sv = (qp.get('s') || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24);
    if (sv) {
      SRC = sv; sessionStorage.setItem('wt_src', sv); qp.delete('s');
      var rest = qp.toString();
      history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '') + location.hash);
    } else { SRC = sessionStorage.getItem('wt_src') || 'direct'; }
  } catch (e) {}
  // Links to the TurtleRock Paws website carry source tags, so the business site can tell which visits the podcast sent.
  function tagSiteLinks() {
    if (!ep) return;
    Array.prototype.forEach.call(document.querySelectorAll('a[href^="https://www.irvinedogboarding.net"]'), function (a) {
      try {
        var u = new URL(a.getAttribute('data-base') || a.href);
        a.setAttribute('data-base', u.href);
        u.searchParams.set('utm_source', 'podcast'); u.searchParams.set('utm_medium', 'player'); u.searchParams.set('utm_campaign', ep.id);
        if (SRC !== 'direct') u.searchParams.set('s', SRC);
        a.href = u.href;
      } catch (e) {}
    });
  }

  // Neutral letter badge when a voice has no portrait yet (never show a broken picture).
  function portrait(img, name) {
    img.onerror = function () {
      img.onerror = null;
      var ch = (name || '?').charAt(0).toUpperCase();
      img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#efe6d6"/><text x="60" y="78" font-size="52" font-family="Georgia,serif" text-anchor="middle" fill="#8a6a3f">' + ch + '</text></svg>');
    };
  }
  function fmt(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function longDate(d) { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); }
  function shortDate(d) { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); }
  function names(e) { return (e.cast || []).map(function (c) { return c.name; }); }
  function listNames(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function firstSentence(t) { t = t || ''; var m = t.match(/^.*?[.!?](\s|$)/); return (m ? m[0] : t).trim(); }

  fetch('episodes.json').then(function (r) { return r.json(); }).then(function (d) {
    var id = new URLSearchParams(location.search).get('ep');
    BENCH = d.bench || null;
    // An episode made ahead of time waits for its date: it shows under "Coming up" until then.
    var todayIso = new Date().toLocaleDateString('en-CA');
    ALL = (d.episodes || []).filter(function (e) { return e.date <= todayIso; });
    FUTURE = (d.episodes || []).filter(function (e) { return e.date > todayIso; });
    if (!ALL.length) { ALL = d.episodes || []; FUTURE = []; }
    var first = ALL.filter(function (e) { return e.id === id; })[0] || newest();
    setEpisode(first, false);
    loadSchedule();
  }).catch(function () { $('title').textContent = 'This episode could not load. Please refresh.'; });

  function newest() { return ALL.slice().sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : (a.id < b.id ? 1 : -1)); })[0]; }
  function byDateDesc() { return ALL.slice().sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : (a.id < b.id ? 1 : -1)); }); }

  /* Up next: the newest episode this listener has not finished. If all are finished, the next older one, then wrap to the newest. */
  function nextAfter(cur) {
    if (!cur || ALL.length < 2) return null;
    var list = byDateDesc(), done = doneList();
    var fresh = list.filter(function (e) { return e.id !== cur.id && done.indexOf(e.id) < 0; });
    if (fresh.length) return fresh[0];
    var i = list.map(function (e) { return e.id; }).indexOf(cur.id);
    return list[(i + 1) % list.length] === cur ? null : list[(i + 1) % list.length];
  }
  function prevBefore(cur) {
    var list = byDateDesc(), i = list.map(function (e) { return e.id; }).indexOf(cur.id);
    return i > 0 ? list[i - 1] : null;
  }

  /* ---------- show one episode (can be called again to switch without reloading) ---------- */
  function setEpisode(e, autoplay) {
    ep = e; active = -1;
    render(); archive(ALL); tagSiteLinks();
    try { var u = new URL(location.href); u.searchParams.set('ep', ep.id); history.replaceState(null, '', u.pathname + u.search + u.hash); } catch (x) {}
    window.WT_DUR = ep.duration; if (window.WT) window.WT.ready(ep.id);
    if (autoplay) {
      var p = audio.play();
      if (p && p.catch) p.catch(function () { $('nowspeaking').textContent = 'Tap the big play button to start ' + ep.title + '.'; });
    }
  }

  function render() {
    document.title = ep.title + " | Today's Walk, Let's Talk";
    $('title').textContent = ep.title;
    var isToday = ep.date === new Date().toLocaleDateString('en-CA');
    $('meta').textContent = (isToday ? "Today's episode · " : '') + fmt(ep.duration) + ' listen · ' + shortDate(ep.date);
    $('summary').textContent = ep.summary;
    var hero = document.querySelector('.hero img');
    if (hero) { if (!hero.getAttribute('data-base')) { hero.setAttribute('data-base', hero.getAttribute('src')); hero.setAttribute('data-basealt', hero.alt); } hero.src = ep.hero || hero.getAttribute('data-base'); hero.alt = ep.heroAlt || hero.getAttribute('data-basealt'); }

    var table = $('table'); Array.prototype.slice.call(table.querySelectorAll('.seat')).forEach(function (n) { n.remove(); });
    var n = ep.cast.length, cols = n <= 4 ? n : (n <= 8 ? Math.ceil(n / 2) : Math.ceil(n / 3));
    table.style.setProperty('--cols', cols); table.classList.toggle('multi', n > 4); table.classList.remove('live');
    ep.cast.forEach(function (c) {
      var s = el('div', 'seat'); s.dataset.who = c.id;
      var img = el('img'); portrait(img, c.name); img.src = c.id + '.jpg?v=2'; img.alt = c.name + ', ' + c.role; img.width = 116; img.height = 116; img.decoding = 'async';
      s.appendChild(img); s.appendChild(el('span', 'nm', c.name)); s.appendChild(el('span', 'rl', c.role));
      table.appendChild(s);
    });

    var bl = $('bench'); bl.textContent = '';
    (BENCH || ep.cast).forEach(function (c) {
      var li = el('li'); var im = el('img'); portrait(im, c.name); im.src = c.id + '.jpg?v=2'; im.alt = ''; im.width = 84; im.height = 84; im.loading = 'lazy';
      li.appendChild(im); li.appendChild(el('b', null, c.name)); li.appendChild(el('span', null, c.role)); bl.appendChild(li);
    });

    var ol = $('lines'); ol.textContent = '';
    ep.lines.forEach(function (l, i) {
      var li = el('li'); var b = el('button', 'ln'); b.type = 'button'; b.dataset.who = l.who; b.dataset.i = i;
      var nm = ep.cast.filter(function (c) { return c.id === l.who; })[0];
      b.appendChild(el('b', null, nm ? nm.name : l.who)); b.appendChild(document.createTextNode(l.text));
      b.addEventListener('click', function () { seekTo(l.t, true); });
      li.appendChild(b); ol.appendChild(li);
    });

    $('links').textContent = '';
    (ep.links || []).forEach(function (k) {
      if (k.type !== 'youtube') return;
      var b = el('button', 'yt'); b.type = 'button'; b.setAttribute('aria-label', 'Play video: ' + k.title);
      var im = el('img'); im.loading = 'lazy'; im.alt = ''; im.src = 'https://i.ytimg.com/vi/' + k.id + '/hqdefault.jpg';
      b.appendChild(im); b.appendChild(el('span', null, '▶ ' + k.title));
      b.addEventListener('click', function () {
        var f = el('iframe'); f.src = 'https://www.youtube-nocookie.com/embed/' + k.id + '?autoplay=1'; f.allow = 'autoplay; encrypted-media'; f.allowFullscreen = true; f.title = k.title;
        b.replaceWith(f);
      });
      $('links').appendChild(b);
    });

    var sr = ep.sources, sx = $('sources');
    if (sr && sr.items && sr.items.length) {
      $('srcintro').textContent = sr.intro || ''; var ul = $('srclist'); ul.textContent = '';
      sr.items.forEach(function (it) {
        var li = el('li'); li.appendChild(el('span', 'kind', it.kind));
        var a = el('a', null, it.title); a.href = it.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; li.appendChild(a);
        li.appendChild(el('span', 'cite', it.cite)); li.appendChild(el('p', null, it.supports)); ul.appendChild(li);
      });
      $('srcnote').textContent = sr.notes || ''; $('srcdate').textContent = sr.checked ? 'Links checked ' + sr.checked + '. This is general information, not veterinary advice.' : '';
      sx.hidden = false;
    } else { sx.hidden = true; }

    // Count plays with OP3 (free, no cookies). If OP3 ever fails, fall back to the direct file.
    var direct = ep.audio;
    audio.dataset.direct = direct;
    if (location.protocol === 'https:' && /github\.io$/.test(location.hostname)) {
      audio.dataset.counted = '1'; audio.src = 'https://op3.dev/e/' + location.host + location.pathname.replace(/[^\/]*$/, '') + ep.audio;
    } else { audio.dataset.counted = ''; audio.src = direct; }
    $('dur').textContent = fmt(ep.duration); $('cur').textContent = '0:00'; $('seek').value = 0;
    $('play').classList.remove('playing'); $('play').setAttribute('aria-label', 'Play episode');
    $('player').hidden = false;

    // Pick up where this listener stopped last time.
    pending = null;
    var saved = parseFloat(lget('wt_pos_' + ep.id, '0')) || 0;
    if (saved > 10 && saved < (parseFloat(ep.duration) || 0) - 15) {
      pending = saved;
      $('nowspeaking').textContent = 'Welcome back. Press play to continue from ' + fmt(saved) + '.';
    } else { $('nowspeaking').textContent = 'Press play to join the table.'; }

    wire();
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({ title: ep.title, artist: "Today's Walk, Let's Talk", album: 'TurtleRock Paws',
          artwork: [{ src: 'icon-512.png', sizes: '512x512', type: 'image/png' }] });
      } catch (x) {}
    }
  }

  function archive(list) {
    var done = doneList();
    ['archive', 'pick'].forEach(function (oid) {
      var ol = $(oid); if (!ol) return; ol.textContent = '';
      byDateDesc().forEach(function (e) {
        var li = el('li'); var a = el('a', e.id === ep.id ? 'cur' : null); a.href = '?ep=' + e.id;
        a.appendChild(el('span', 'ad', shortDate(e.date) + (done.indexOf(e.id) >= 0 ? ' · heard' : '')));
        a.appendChild(el('b', null, e.title)); a.appendChild(el('span', 'am', fmt(e.duration) + ' listen'));
        if (e.id === ep.id) a.setAttribute('aria-current', 'page');
        // Switch in place, so the next episode can keep playing on the lock screen.
        a.addEventListener('click', function (ev) { ev.preventDefault(); var playing = !audio.paused; setEpisode(e, playing); scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });
        li.appendChild(a); ol.appendChild(li);
      });
    });
  }

  /* ---------- Coming up: the next confirmed new episode (schedule.json, written when Igor confirms a plan) ---------- */
  function loadSchedule() {
    var box = $('comingup'); if (!box) return;
    fetch('schedule.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (s) {
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var ids = ALL.map(function (e) { return e.id; });
      var slots = ((s && s.slots) || []).filter(function (x) {
        return x.status === 'confirmed' && new Date(x.date + 'T12:00:00') >= today && ids.indexOf(x.episode || '') < 0;
      });
      FUTURE.forEach(function (e) { slots.push({ date: e.date, kind: e.kind || 'New episode', topic: e.title, cast: (e.cast || []).map(function (c) { return c.id; }) }); });
      var next = slots.sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0];
      if (!next) { box.hidden = true; return; }
      var who = (next.cast || []).map(function (id) { var p = (BENCH || []).filter(function (b) { return b.id === id; })[0]; return p ? p.name : id; });
      $('cu-when').textContent = longDate(next.date) + ' · ' + (next.kind || 'New episode');
      $('cu-topic').textContent = next.topic ? 'Topic: ' + next.topic : 'Topic to be announced';
      $('cu-who').textContent = who.length ? 'At the table: ' + listNames(who) + '.' : '';
      box.hidden = false;
    }).catch(function () { box.hidden = true; });
  }

  /* owner tools: a big Show Planner button only on the owner's own devices */
  function ownerBar() { if ($('ownerbar')) $('ownerbar').hidden = !isOwner(); }
  ownerBar();
  // Three taps on the show title turn owner tools on or off (track.js stores the flag); refresh right after.
  document.addEventListener('click', function (e) { if (e.target && e.target.closest && e.target.closest('#title')) setTimeout(ownerBar, 60); });

  // Share button: the phone's own share sheet when there is one, otherwise copy the link.
  var shareBtn = $('share');
  if (shareBtn) shareBtn.addEventListener('click', function () {
    var su = new URL(location.href), epid = su.searchParams.get('ep'); su.search = ''; su.hash = '';
    if (epid) su.searchParams.set('ep', epid);
    su.searchParams.set('s', 'share');
    var url = su.href, msg = $('sharemsg');
    var data = { title: "Today's Walk, Let's Talk", text: ep ? ep.title : "Today's Walk, Let's Talk", url: url };
    function note(t) { if (msg) { msg.textContent = t; setTimeout(function () { msg.textContent = ''; }, 4000); } }
    if (navigator.share) { navigator.share(data).catch(function () {}); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(url).then(function () { note('Link copied. Paste it anywhere.'); }, function () { note('Copy this link: ' + url); }); }
    else { note('Copy this link: ' + url); }
  });

  function toggle() { if (audio.paused) { audio.play(); } else { audio.pause(); } }
  var pending = null;
  function seekTo(t, play) {
    t = Math.max(0, t);
    if (audio.readyState < 1) {            /* audio not loaded yet (saves data until first play) */
      pending = t; audio.load();
      if (play) audio.play();
      return;
    }
    audio.currentTime = t; if (play && audio.paused) audio.play(); update();
  }

  var lastSave = 0;
  function wire() {
    if (wired) return; wired = true;
    $('play').addEventListener('click', toggle);
    $('back15').addEventListener('click', function () { seekTo(audio.currentTime - 15); });
    $('speed').addEventListener('click', function () { si = (si + 1) % speeds.length; audio.playbackRate = speeds[si]; $('speed').textContent = speeds[si] + '×'; });
    $('seek').addEventListener('input', function () { seekTo((this.value / 1000) * (audio.duration || ep.duration)); });
    audio.addEventListener('play', function () { if (pending != null && audio.readyState >= 1) { audio.currentTime = pending; pending = null; } audio.playbackRate = speeds[si]; $('play').classList.add('playing'); $('play').setAttribute('aria-label', 'Pause episode'); $('table').classList.add('live'); });
    audio.addEventListener('pause', function () { $('play').classList.remove('playing'); $('play').setAttribute('aria-label', 'Play episode'); if (audio.currentTime > 0 && !audio.ended) lset('wt_pos_' + ep.id, String(Math.floor(audio.currentTime))); });
    audio.addEventListener('ended', function () {
      $('table').classList.remove('live'); setActive(-1);
      markDone(ep.id); lset('wt_pos_' + ep.id, '0'); archive(ALL);
      $('nowspeaking').textContent = "That's the walk. Thanks for listening. Check back soon for a new one.";
    });
    audio.addEventListener('error', function () {
      if (audio.dataset.counted === '1') { audio.dataset.counted = ''; var t = audio.currentTime; audio.src = audio.dataset.direct; audio.currentTime = t; }
    });
    audio.addEventListener('timeupdate', function () {
      update();
      var now = Date.now(); if (now - lastSave > 5000 && audio.currentTime > 0) { lastSave = now; lset('wt_pos_' + ep.id, String(Math.floor(audio.currentTime))); }
    });
    audio.addEventListener('loadedmetadata', function () { $('dur').textContent = fmt(audio.duration); if (pending != null) { audio.currentTime = pending; pending = null; update(); } });
    document.addEventListener('keydown', function (e) {
      if (e.code === 'Space' && !/INPUT|BUTTON|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); toggle(); }
    });
    if ('mediaSession' in navigator) {
      var ms = navigator.mediaSession;
      function h(a, f) { try { ms.setActionHandler(a, f); } catch (x) {} }
      h('play', function () { audio.play(); }); h('pause', function () { audio.pause(); });
      h('seekbackward', function () { seekTo(audio.currentTime - 15); });
      h('seekforward', function () { seekTo(audio.currentTime + 15); });
      h('nexttrack', function () { var n = nextAfter(ep); if (n) setEpisode(n, true); });
      h('previoustrack', function () { if (audio.currentTime > 5) { seekTo(0, true); return; } var p = prevBefore(ep); if (p) setEpisode(p, true); else seekTo(0, true); });
    }
  }

  function setActive(i) {
    if (i === active) return; active = i;
    var seats = document.querySelectorAll('.seat'); var btns = document.querySelectorAll('.ln');
    var who = i >= 0 ? ep.lines[i].who : null;
    Array.prototype.forEach.call(seats, function (s) { s.classList.toggle('on', s.dataset.who === who); });
    Array.prototype.forEach.call(btns, function (b, k) { b.classList.toggle('on', k === i); b.removeAttribute('aria-current'); });
    if (i >= 0) {
      var b = btns[i]; b.setAttribute('aria-current', 'true');
      var c = ep.cast.filter(function (x) { return x.id === who; })[0];
      $('nowspeaking').textContent = (c ? c.name : who) + ' is speaking';
      var box = b.closest('.transcript');
      if (box && box.scrollHeight > box.clientHeight + 2) b.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    }
  }

  function update() {
    var t = audio.currentTime, dur = audio.duration || ep.duration, i = -1;
    for (var k = 0; k < ep.lines.length; k++) { if (ep.lines[k].t <= t + 0.05) i = k; else break; }
    if (!audio.paused || t > 0) setActive(i);
    $('cur').textContent = fmt(t);
    $('seek').value = Math.round((t / dur) * 1000);
  }
})();
