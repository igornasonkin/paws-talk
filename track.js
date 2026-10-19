/* Private, anonymous counters for TurtleRock Paws. No names, no emails, no IP address stored, no ad tracking.
   Never blocks the page or the audio. Respects Global Privacy Control and Do Not Track.
   Owners switch their own device off by tapping the show title three times. */
(function () {
  'use strict';
  var URL_B = 'https://www.irvinedogboarding.net/_functions/b';
  var LS = null, SS = null;
  try { LS = window.localStorage; } catch (e) {}
  try { SS = window.sessionStorage; } catch (e) {}
  function gs(st, k) { try { return st ? st.getItem(k) : null; } catch (e) { return null; } }
  function ss(st, k, v) { try { if (st) st.setItem(k, v); } catch (e) {} }
  function slug(v, n) { return String(v == null ? '' : v).toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, n || 32); }

  var off = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1';
  try { if (/^Europe\//.test(Intl.DateTimeFormat().resolvedOptions().timeZone || '')) off = true; } catch (e) {}
  // With a privacy signal (or a European time zone) nothing is stored and nothing is sent.
  if (off) { window.WT = { ready: function () {}, send: function () {} }; return; }
  function me() { return gs(LS, 'wt_me') === '1'; }

  // Where did this visit come from? (?s=<placement> from a QR card or tagged link; remembered for this visit.)
  var SRC = 'direct';
  try {
    var q = new URLSearchParams(location.search), sv = slug((q.get('s') || '').replace(/[^a-z0-9-]/gi, ''), 24);
    if (sv) { SRC = sv; ss(SS, 'wt_src', sv); } else { SRC = gs(SS, 'wt_src') || 'direct'; }
  } catch (e) {}

  // Anonymous random id kept on this device only, to tell new from returning visitors.
  function rnd(n) {
    var s = '', a = 'abcdefghijklmnopqrstuvwxyz0123456789';
    try { var u = new Uint8Array(n); crypto.getRandomValues(u); for (var i = 0; i < n; i++) s += a.charAt(u[i] % 36); }
    catch (e) { for (var j = 0; j < n; j++) s += a.charAt(Math.floor(Math.random() * 36)); }
    return s;
  }
  var vid = gs(LS, 'wt_v');
  if (!vid) { vid = rnd(12); ss(LS, 'wt_v', vid); ss(SS, 'wt_new', '1'); }
  if (!gs(SS, 'wt_s')) { ss(SS, 'wt_s', '1'); ss(LS, 'wt_c', String((+gs(LS, 'wt_c') || 0) + 1)); }
  var visitNo = Math.min(99, +gs(LS, 'wt_c') || 1);

  var ua = navigator.userAgent || '';
  var dev = /iPhone|iPad|iPod/.test(ua) ? 'ios' : (/Android/.test(ua) ? 'and' : 'desk');
  var mode = (window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches)) ? 'app' : 'web';
  var lang = slug((navigator.language || '').slice(0, 2), 5);
  var refc = (function () {
    var r = document.referrer || '', h = '';
    try { h = new URL(r).hostname; } catch (e) {}
    if (!h) return 'none';
    if (/instagram/.test(h)) return 'ig';
    if (/facebook|fb\.com|fb\.me/.test(h)) return 'fb';
    if (/nextdoor/.test(h)) return 'nd';
    if (/google/.test(h)) return 'goog';
    if (/bing/.test(h)) return 'bing';
    if (/irvinedogboarding/.test(h)) return 'site';
    if (/t\.co$|twitter|x\.com/.test(h)) return 'x';
    if (/github\.io/.test(h)) return 'self';
    return 'other';
  })();

  var epId = '';
  function send(t, o) {
    if (off || me()) return;
    o = o || {};
    var d = { t: t, s: SRC, e: o.e != null ? o.e : epId, v: vid, n: gs(SS, 'wt_new') === '1' ? 1 : 0, d: dev, m: mode, r: refc, l: lang, g: o.g || '', x: o.x || 0 };
    var body = JSON.stringify(d);
    try { fetch(URL_B, { method: 'POST', body: body, keepalive: true, mode: 'no-cors', credentials: 'omit' }); }
    catch (e) { try { navigator.sendBeacon(URL_B, body); } catch (e2) {} }
  }

  // Page view, once per page load, as soon as the player knows which episode is showing.
  var pvDone = false;
  function pv() { if (pvDone) return; pvDone = true; send('pv', { x: visitNo }); }
  window.WT = { ready: function (id) { epId = slug(id, 24); pv(); }, send: send };
  setTimeout(pv, 4000);

  // Owner switch: tap the show title three times (on each phone and browser you use).
  var taps = [];
  function toast(msg) {
    try {
      var t = document.createElement('div'); t.setAttribute('role', 'status'); t.textContent = msg;
      t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#5b0a3c;color:#fdf8ec;padding:12px 18px;border-radius:12px;font:16px/1.3 system-ui,sans-serif;z-index:99;max-width:90%;text-align:center';
      document.body.appendChild(t); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 4500);
    } catch (e) {}
  }
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('#title')) {
      var now = Date.now(); taps = taps.filter(function (x) { return now - x < 1000; }); taps.push(now);
      if (taps.length >= 3) { taps = []; var on = !me(); ss(LS, 'wt_me', on ? '1' : '0'); toast(on ? 'This device is now left out of the counts.' : 'This device is counted again.'); }
    }
  });

  // Clicks: website, studio, feed, studies, episode list, share, speed, seek, transcript.
  var once = {};
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t || !t.closest) return;
    var a = t.closest('a'), b = t.closest('button');
    if (a) {
      var h = a.getAttribute('href') || '', full = a.href || '';
      if (full.indexOf('https://www.irvinedogboarding.net') === 0) {
        if (/privacy-policy/.test(full)) { /* not a business click */ } else if (/suggest-a-voice/.test(full)) send('sv'); else send('wc', { g: a.closest('header') ? 'top' : (a.closest('footer') ? 'foot' : 'body') });
      } else if (/(^|\/)studio\.html/.test(h)) send('st');
      else if (/feed\.xml/.test(h)) send('fd');
      else if (a.closest('#srclist')) { var host = ''; try { host = new URL(full).hostname.replace(/^www\./, ''); } catch (x) {} send('sl', { g: host }); }
      else if (a.closest('#pick') || a.closest('#archive')) { var m = h.match(/ep=([a-z0-9_-]+)/i); send('ep', { g: m ? m[1] : '' }); }
      return;
    }
    if (b) {
      if (b.id === 'share') send('sh', { g: navigator.share ? 'sheet' : 'copy' });
      else if (b.id === 'speed') setTimeout(function () { send('sp', { g: (b.textContent || '').replace('×', '') }); }, 0);
      else if (b.id === 'back15') send('sk', { g: 'back15' });
      else if (b.classList.contains('ln') && !once.tr) { once.tr = 1; send('tr'); }
    }
  }, true);

  // Listening: starts, 60 seconds, quarters, finished, seconds listened.
  function audioWire() {
    var au = document.getElementById('audio'); if (!au) return;
    var started = false, listened = 0, last = null, flushed = 0, mk = {};
    function dur() { return au.duration && isFinite(au.duration) ? au.duration : (window.WT_DUR || 0); }
    function flush() { var u = listened - flushed; if (u >= 3) { send('ls', { x: Math.round(u) }); flushed = listened; } }
    au.addEventListener('play', function () { if (!started) { started = true; send('ps'); } last = au.currentTime; });
    au.addEventListener('seeked', function () { last = au.currentTime; });
    au.addEventListener('timeupdate', function () {
      if (au.paused || last == null) { last = au.currentTime; return; }
      var d = au.currentTime - last; last = au.currentTime;
      if (d > 0 && d < 3 * (au.playbackRate || 1)) listened += d;
      if (listened >= 60 && !mk.p60) { mk.p60 = 1; send('p60'); }
      var D = dur(); if (!D) return; var pc = listened / D * 100;
      [25, 50, 75].forEach(function (k) { if (pc >= k && !mk['p' + k]) { mk['p' + k] = 1; send('p' + k); } });
    });
    au.addEventListener('pause', flush);
    au.addEventListener('ended', function () { var D = dur(); if (D && listened >= 0.6 * D && !mk.p100) { mk.p100 = 1; send('p100'); } flush(); });
    var sk = document.getElementById('seek'); if (sk) sk.addEventListener('change', function () { send('sk', { g: 'scrub' }); });
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });
  }

  // Time on the page and how far down people scroll.
  var vis = 0, since = null;
  function tick() { if (since != null) { vis += (Date.now() - since) / 1000; since = null; } }
  function openClock() { if (document.visibilityState === 'visible') since = Date.now(); }
  function sendTime() { tick(); if (vis >= 3) { send('tp', { x: Math.min(3600, Math.round(vis)) }); vis = 0; } }
  openClock();
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') sendTime(); else openClock(); });
  window.addEventListener('pagehide', sendTime);
  var sdm = {}, sdt = null;
  window.addEventListener('scroll', function () {
    if (sdt) return;
    sdt = setTimeout(function () {
      sdt = null;
      var de = document.documentElement, p = (window.pageYOffset + window.innerHeight) / Math.max(1, de.scrollHeight) * 100;
      [25, 50, 75, 100].forEach(function (k) { if (p >= k - 2 && !sdm[k]) { sdm[k] = 1; send('sd', { x: k }); } });
    }, 400);
  }, { passive: true });

  // The research section came into view.
  function watchSources() {
    var s = document.getElementById('sources'); if (!s || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting && !once.so) { once.so = 1; send('so'); io.disconnect(); } }); }, { threshold: 0.3 });
    io.observe(s);
  }
  window.addEventListener('appinstalled', function () { send('ins'); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { audioWire(); setTimeout(watchSources, 1500); });
  else { audioWire(); setTimeout(watchSources, 1500); }
})();
