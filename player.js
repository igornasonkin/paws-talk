(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ep, BENCH = null, audio = $('audio'), active = -1, speeds = [1, 1.25, 0.85], si = 0;

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

  fetch('episodes.json').then(function (r) { return r.json(); }).then(function (d) {
    var id = new URLSearchParams(location.search).get('ep');
    BENCH = d.bench || null;
    ep = d.episodes.filter(function (e) { return e.id === id; })[0] || d.episodes[d.episodes.length - 1];
    render(); archive(d.episodes);
  }).catch(function () { $('title').textContent = 'This episode could not load. Please refresh.'; });

  function render() {
    document.title = ep.title + " | Today's Walk, Let's Talk";
    $('title').textContent = ep.title;
    $('meta').textContent = fmt(ep.duration) + ' listen · ' + new Date(ep.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    $('summary').textContent = ep.summary;
    var hero = document.querySelector('.hero img');
    if (hero && ep.hero) { hero.src = ep.hero; if (ep.heroAlt) hero.alt = ep.heroAlt; }

    var table = $('table'); table.textContent = '';
    var n = ep.cast.length, cols = n <= 4 ? n : (n <= 8 ? Math.ceil(n / 2) : Math.ceil(n / 3));
    table.style.setProperty('--cols', cols); table.classList.toggle('multi', n > 4);
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
    var direct = ep.audio, counted = false;
    if (location.protocol === 'https:' && /github\.io$/.test(location.hostname)) {
      counted = true; audio.src = 'https://op3.dev/e/' + location.host + location.pathname.replace(/[^\/]*$/, '') + ep.audio;
      audio.addEventListener('error', function fb() { if (counted) { counted = false; var t = audio.currentTime; audio.src = direct; audio.currentTime = t; } });
    } else { audio.src = direct; }
    $('dur').textContent = fmt(ep.duration);
    $('player').hidden = false;
    wire();
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: ep.title, artist: "Today's Walk, Let's Talk", album: 'TurtleRock Paws' });
      navigator.mediaSession.setActionHandler('play', toggle); navigator.mediaSession.setActionHandler('pause', toggle);
      navigator.mediaSession.setActionHandler('seekbackward', function () { seekTo(audio.currentTime - 15); });
      navigator.mediaSession.setActionHandler('seekforward', function () { seekTo(audio.currentTime + 15); });
    }
  }

  function archive(list) {
    ['archive', 'pick'].forEach(function (oid) {
      var ol = $(oid); if (!ol) return; ol.textContent = '';
      list.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).forEach(function (e) {
        var li = el('li'); var a = el('a', e.id === ep.id ? 'cur' : null); a.href = '?ep=' + e.id;
        var when = new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        a.appendChild(el('span', 'ad', when)); a.appendChild(el('b', null, e.title)); a.appendChild(el('span', 'am', fmt(e.duration) + ' listen'));
        if (e.id === ep.id) a.setAttribute('aria-current', 'page');
        li.appendChild(a); ol.appendChild(li);
      });
    });
  }


  // Share button: the phone's own share sheet when there is one, otherwise copy the link.
  var shareBtn = $('share');
  if (shareBtn) shareBtn.addEventListener('click', function () {
    var url = location.href.split('#')[0], msg = $('sharemsg');
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

  function wire() {
    $('play').addEventListener('click', toggle);
    $('back15').addEventListener('click', function () { seekTo(audio.currentTime - 15); });
    $('speed').addEventListener('click', function () { si = (si + 1) % speeds.length; audio.playbackRate = speeds[si]; $('speed').textContent = speeds[si] + '×'; });
    $('seek').addEventListener('input', function () { seekTo((this.value / 1000) * (audio.duration || ep.duration)); });
    audio.addEventListener('play', function () { $('play').classList.add('playing'); $('play').setAttribute('aria-label', 'Pause episode'); $('table').classList.add('live'); });
    audio.addEventListener('pause', function () { $('play').classList.remove('playing'); $('play').setAttribute('aria-label', 'Play episode'); });
    audio.addEventListener('ended', function () { $('table').classList.remove('live'); setActive(-1); $('nowspeaking').textContent = "That's the walk. Thanks for listening."; });
    audio.addEventListener('timeupdate', update);
    audio.addEventListener('loadedmetadata', function () { $('dur').textContent = fmt(audio.duration); if (pending != null) { audio.currentTime = pending; pending = null; update(); } });
    document.addEventListener('keydown', function (e) {
      if (e.code === 'Space' && !/INPUT|BUTTON|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); toggle(); }
    });
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
