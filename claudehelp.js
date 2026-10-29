/* "Send to Claude" helper: a big, plain guide shown just before the iPhone share list opens.
   Use: window.toClaude({ text: '...', files: [...] }, onSent) */
(function () {
  'use strict';
  var css = '' +
    '.ch-back{position:fixed;inset:0;background:rgba(43,16,32,.6);z-index:9999;display:flex;align-items:flex-end;justify-content:center}' +
    '.ch-box{background:#fffdf6;color:#2b1020;width:100%;max-width:560px;max-height:100%;overflow:auto;border-radius:22px 22px 0 0;padding:24px 20px 30px;box-sizing:border-box;font:21px/1.4 -apple-system,system-ui,sans-serif}' +
    '.ch-box h2{font-size:28px;line-height:1.2;margin:0 0 14px;color:#5b0a3c}' +
    '.ch-box ol{margin:0 0 16px;padding-left:30px}.ch-box li{margin:0 0 14px}' +
    '.ch-box b{color:#5b0a3c}' +
    '.ch-row{display:flex;gap:10px;align-items:center;margin:4px 0 6px;font-size:15px;color:#5f4656}' +
    '.ch-row span{display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:13px;background:#e9e3e6;flex:none}' +
    '.ch-row .ch-c{background:#d97757;color:#fff;font-size:30px;outline:4px solid #e3a53a;outline-offset:2px}' +
    '.ch-row .ch-arrow{background:none;width:auto;font-size:26px;color:#5b0a3c}' +
    '.ch-go{display:block;width:100%;min-height:64px;margin:6px 0 12px;border:0;border-radius:32px;background:#5b0a3c;color:#fff;font:700 23px/1.2 -apple-system,system-ui,sans-serif}' +
    '.ch-alt{display:block;width:100%;min-height:56px;margin:0 0 10px;border:2px solid #5b0a3c;border-radius:30px;background:#fff;color:#5b0a3c;font:600 20px/1.2 -apple-system,system-ui,sans-serif}' +
    '.ch-steps{list-style:none;padding:0;margin:0 0 18px;counter-reset:s}.ch-steps li{counter-increment:s;font-size:30px;line-height:1.3;margin:0 0 16px;display:block}.ch-steps li:before{content:counter(s);display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;background:#fde4f3;color:#5b0a3c;font-weight:800;margin-right:12px;vertical-align:middle}.ch-steps small{font-size:19px;color:#5f4656;margin-left:56px;display:inline-block}' +
    '.ch-c{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:10px;background:#d97757;color:#fff;font-size:26px;vertical-align:middle}' +
    '.ch-go{font-size:34px!important;min-height:84px!important}';

  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }

  function copyText(text, done) {
    function fb() {
      var t = el('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) {} t.remove(); done(ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, fb); else fb();
  }

  window.toClaude = function (data, onSent) {
    if (!document.getElementById('ch-css')) { var st = el('style'); st.id = 'ch-css'; st.textContent = css; document.head.appendChild(st); }
    var back = el('div', 'ch-back'), box = el('div', 'ch-box');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Send this to Claude');
    box.innerHTML =
      '<ol class="ch-steps">' +
      '<li>Tap <b>Go</b></li>' +
      '<li>Tap <span class="ch-c" aria-hidden="true">&#10033;</span> <b>Claude</b><br><small>(slide the apps left if you do not see it)</small></li>' +
      '<li>Tap <b>New session</b></li>' +
      '</ol>';
    var go = el('button', 'ch-go', 'Go'); go.type = 'button';
    var no = el('button', 'ch-alt', 'Cancel'); no.type = 'button';
    box.appendChild(go); box.appendChild(no);
    back.appendChild(box); document.body.appendChild(back);
    var prev = document.activeElement; go.focus();
    function close() { back.remove(); if (prev && prev.focus) try { prev.focus(); } catch (e) {} }
    no.addEventListener('click', close);
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    go.addEventListener('click', function () {
      close();
      if (navigator.share) {
        navigator.share(data).then(function () { if (onSent) onSent(); }).catch(function (e) { if (e && e.name !== 'AbortError') window.toClaude.copyHelp(data.text); });
      } else window.toClaude.copyHelp(data.text);
    });
  };

  // Plan B: copy the message, then explain how to paste it in the Claude app.
  window.toClaude.copyHelp = function (text) {
    copyText(text, function (ok) {
      var back = el('div', 'ch-back'), box = el('div', 'ch-box');
      box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
      box.innerHTML = ok
        ? '<h2>Copied. Now paste it in Claude</h2><ol>' +
          '<li>Go to your Home Screen and open the <b>Claude</b> app (orange square, white star).</li>' +
          '<li>Tap the box at the bottom where you type. Tap it once more and choose <b>Paste</b>.</li>' +
          '<li>Tap <b>Send</b> (the arrow).</li></ol>'
        : '<h2>Could not copy</h2><p>Please take a screenshot of the message and send it to Claude, or ask Claude for help.</p>';
      var ok2 = el('button', 'ch-go', 'OK'); ok2.type = 'button';
      ok2.addEventListener('click', function () { back.remove(); });
      box.appendChild(ok2); back.appendChild(box); document.body.appendChild(back); ok2.focus();
    });
  };
})();
