/* "Add to Home Screen" helper: a step-by-step pop-up with pictures, chosen for the visitor's device.
   Usage: <script src="install.js" data-app="App name" data-url="https://..."></script>
   Any element with [data-install] opens the pop-up. A small reminder bar shows once on phones that have not installed the app. */
(function () {
  'use strict';
  var me = document.currentScript || document.querySelector('script[src*="install.js"]');
  var APP = (me && me.getAttribute('data-app')) || 'this app';
  var ua = navigator.userAgent || '', plat = navigator.platform || '';
  var iOS = /iPhone|iPad|iPod/.test(ua) || (plat === 'MacIntel' && navigator.maxTouchPoints > 1);
  var android = /Android/i.test(ua);
  var inApp = /Instagram|FBAN|FBAV|FB_IAB|Line\/|Snapchat|TikTok|LinkedInApp/i.test(ua);
  var iosOther = iOS && /CriOS|FxiOS|EdgiOS/.test(ua);
  var macSafari = !iOS && /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg\//.test(ua);
  var installed = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var deferred = null;
  var LS = null; try { LS = localStorage; } catch (e) {}
  function lget(k) { try { return LS ? LS.getItem(k) : null; } catch (e) { return null; } }
  function lset(k, v) { try { if (LS) LS.setItem(k, v); } catch (e) {} }

  var ICON = {
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l-4 4h3v8h2V7h3z"/><path d="M6 10h3v2H7v8h10v-8h-2v-2h3a1 1 0 011 1v10a1 1 0 01-1 1H6a1 1 0 01-1-1V11a1 1 0 011-1z"/></svg>',
    add: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm0 2v14h14V5zm6 3h2v3h3v2h-3v3h-2v-3H8v-2h3z"/></svg>',
    dots: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/></svg>',
    vdots: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="12" cy="19" r="2.2"/></svg>',
    cam: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4l-1.5 2H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-3.5L15 4zm3 4a5 5 0 110 10 5 5 0 010-10zm0 2a3 3 0 100 6 3 3 0 000-6z"/></svg>',
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3z"/></svg>',
    ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5z"/></svg>'
  };
  function step(icon, html) { return '<li><span class="ins-ic">' + ICON[icon] + '</span><span>' + html + '</span></li>'; }

  function steps() {
    if (installed) return { title: 'It is already on your Home Screen', body: '<ol class="ins-steps">' + step('ok', 'You opened ' + APP + ' from its Home Screen icon. Nothing else to do.') + '</ol>' };
    if (inApp) return { title: 'First, open this page in your browser', body: '<p class="ins-p">You are inside another app (for example Instagram or Facebook). Their built-in browser cannot add apps to your Home Screen.</p><ol class="ins-steps">' +
      step(iOS ? 'dots' : 'vdots', 'Tap the <b>&bull;&bull;&bull;</b> button (top or bottom corner of the screen).') +
      step('share', 'Choose <b>' + (iOS ? 'Open in Safari' : 'Open in browser') + '</b>' + (iOS ? ' (it may say <b>Open in external browser</b>)' : '') + '.') +
      step('add', 'Then tap <b>Show me how</b> again and follow the steps.') + '</ol>' };
    if (iOS) return { title: 'Add ' + APP + ' to your Home Screen', body: '<p class="ins-p">Apple does not allow a one-tap install for web apps, so it takes 3 taps. You only do this once.</p><ol class="ins-steps">' +
      step('share', 'Tap the <b>Share</b> button. It is a square with an arrow pointing up' + (iosOther ? ', next to the address bar.' : ', at the bottom of the screen (on iPad, at the top). If you only see <b>&bull;&bull;&bull;</b>, tap it first, then <b>Share</b>.')) +
      step('add', 'Scroll down the list and tap <b>Add to Home Screen</b>. If you do not see it, tap <b>View More</b> or <b>Edit Actions</b> first.') +
      step('ok', 'Tap <b>Add</b> in the top right corner.') +
      step('home', 'Done. Look for the <b>' + APP + '</b> icon on your Home Screen. Tap it any time; no sign-in needed.') + '</ol>' };
    if (android) return { title: 'Add ' + APP + ' to your phone', body: (deferred ? '<p class="ins-p">One tap:</p><p><button class="ins-go" type="button" data-ins-go>Install ' + APP + '</button></p><p class="ins-p">Or do it by hand:</p>' : '') + '<ol class="ins-steps">' +
      step('vdots', 'Tap the <b>&#8942;</b> menu (three dots, top right of Chrome).') +
      step('add', 'Tap <b>Add to Home screen</b> or <b>Install app</b>.') +
      step('ok', 'Tap <b>Install</b> or <b>Add</b>. The icon appears on your Home screen.') + '</ol>' };
    if (macSafari) return { title: 'Add ' + APP + ' to your Mac', body: '<ol class="ins-steps">' +
      step('share', 'In the menu bar, click <b>File</b>, then <b>Add to Dock</b>.') + step('ok', 'Click <b>Add</b>. It opens like an app from your Dock.') + '</ol>' };
    return { title: 'Add ' + APP + ' to this computer', body: (deferred ? '<p><button class="ins-go" type="button" data-ins-go>Install ' + APP + '</button></p>' : '') + '<ol class="ins-steps">' +
      step('add', 'In Chrome or Edge, click the small <b>install</b> icon at the right end of the address bar (a screen with a down arrow), or open the <b>&#8942;</b> menu and choose <b>Install</b>' + ' / <b>Apps</b>.') +
      step('ok', 'Click <b>Install</b>. It opens in its own window.') +
      step('cam', 'On a phone: point the camera at the QR code on this page, then follow the steps there.') + '</ol>' };
  }

  var css = '.ins-back{position:fixed;inset:0;background:rgba(43,16,32,.55);z-index:1000;display:flex;align-items:flex-end;justify-content:center}' +
    '@media (min-width:640px){.ins-back{align-items:center}}' +
    '.ins-box{background:#fffdf6;color:#2b1020;width:100%;max-width:520px;max-height:92vh;overflow:auto;border-radius:22px 22px 0 0;padding:22px 20px calc(22px + env(safe-area-inset-bottom));font:19px/1.45 system-ui,-apple-system,sans-serif;box-shadow:0 -8px 30px rgba(0,0,0,.25)}' +
    '@media (min-width:640px){.ins-box{border-radius:22px}}' +
    '.ins-box h2:focus{outline:none}.ins-box h2{margin:0 0 10px;font:700 24px/1.2 system-ui,-apple-system,sans-serif;color:#5b0a3c}' +
    '.ins-p{margin:0 0 12px}.ins-steps{list-style:none;counter-reset:s;margin:0 0 16px;padding:0;display:grid;gap:14px}' +
    '.ins-steps li span:last-child{min-width:0;overflow-wrap:anywhere}.ins-steps li{counter-increment:s;display:flex;gap:14px;align-items:flex-start;background:#fff;border:2px solid #f6c9e4;border-radius:16px;padding:12px 14px}' +
    '.ins-ic{position:relative;flex:none;width:52px;height:52px;border-radius:14px;background:#fde4f3;display:grid;place-items:center}' +
    '.ins-ic::after{content:counter(s);position:absolute;top:-8px;left:-8px;width:26px;height:26px;border-radius:50%;background:#5b0a3c;color:#fff;font:700 15px/26px system-ui,sans-serif;text-align:center}' +
    '.ins-ic svg{width:32px;height:32px;fill:#5b0a3c}' +
    '.ins-x,.ins-go{display:block;width:100%;min-height:54px;border-radius:999px;border:2px solid #5b0a3c;font:700 19px system-ui,sans-serif;cursor:pointer}' +
    '.ins-x{background:#fff;color:#5b0a3c}.ins-go{background:#5b0a3c;color:#fff;margin-bottom:12px}' +
    '.ins-bar{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:999;display:flex;gap:10px;align-items:center;background:#5b0a3c;color:#fff;border-radius:18px;padding:12px 12px 12px 16px;font:600 17px/1.3 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3);max-width:560px;margin:0 auto}' +
    '.ins-bar span{flex:1;min-width:0}.ins-bar button{min-height:48px;border-radius:999px;border:0;font:700 16px system-ui,sans-serif;padding:0 16px;cursor:pointer}' +
    '.ins-bar .y{background:#e3a53a;color:#2b1020}.ins-bar .n{background:transparent;color:#fff;border:2px solid rgba(255,255,255,.6);min-width:48px}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var lastFocus = null;
  function open() {
    var s = steps(), back = document.createElement('div');
    back.className = 'ins-back'; back.innerHTML = '<div class="ins-box" role="dialog" aria-modal="true" aria-labelledby="ins-t"><h2 id="ins-t">' + s.title + '</h2>' + s.body + '<button class="ins-x" type="button">Close</button></div>';
    lastFocus = document.activeElement;
    function close() { back.remove(); document.removeEventListener('keydown', esc); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
    function esc(e) { if (e.key === 'Escape') close(); }
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    back.querySelector('.ins-x').addEventListener('click', close);
    var go = back.querySelector('[data-ins-go]');
    if (go) go.addEventListener('click', function () { if (!deferred) return; deferred.prompt(); deferred.userChoice.then(function () { deferred = null; close(); }); });
    document.addEventListener('keydown', esc);
    document.body.appendChild(back); back.querySelector('h2').setAttribute('tabindex', '-1'); back.querySelector('h2').focus();
    hideBar();
  }
  window.WTInstall = { open: open };

  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; });
  window.addEventListener('appinstalled', function () { installed = true; hideBar(); lset('ins_done', '1'); });
  document.addEventListener('click', function (e) { var t = e.target && e.target.closest && e.target.closest('[data-install]'); if (t) { e.preventDefault(); open(); } });

  // Hide the "add to phone" buttons when the app is already installed.
  function tidy() { if (installed) Array.prototype.forEach.call(document.querySelectorAll('.getapp'), function (n) { n.hidden = true; }); }

  var bar = null;
  function hideBar() { if (bar) { bar.remove(); bar = null; } }
  function maybeBar() {
    if (installed || !(iOS || android) || lget('ins_bar_seen') === '1') return;
    lset('ins_bar_seen', '1');
    bar = document.createElement('div'); bar.className = 'ins-bar'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Add to Home Screen');
    bar.innerHTML = '<span>Add ' + APP + ' to your Home Screen</span><button class="y" type="button">Show me how</button><button class="n" type="button" aria-label="Not now">&times;</button>';
    bar.querySelector('.y').addEventListener('click', open); bar.querySelector('.n').addEventListener('click', hideBar);
    document.body.appendChild(bar);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { tidy(); setTimeout(maybeBar, 2500); });
  else { tidy(); setTimeout(maybeBar, 2500); }
})();
