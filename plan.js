/* Show Planner for "Today's Walk, Let's Talk" (owner only).
   One new episode a day; Journal Club on one chosen weekday. Dates left alone get a calm surprise topic picked on the day.
   Everything is kept on this phone (localStorage). The owner's number is typed once and are never in this code. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var LS = null; try { LS = window.localStorage; } catch (e) {}
  function lget(k, d) { try { var v = LS ? LS.getItem(k) : null; return v == null ? d : v; } catch (e) { return d; } }
  function lset(k, v) { try { if (LS) LS.setItem(k, v); } catch (e) {} }
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }

  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var FOCUS = ['Science', 'Practical tips', 'Irvine local', 'History', 'Fun facts', 'Myths vs facts'];
  var LENS = [{ m: 5, t: 'Short, about 5 min' }, { m: 8, t: 'Standard, about 8 min' }, { m: 15, t: 'Deep, about 15 min' }];
  var KIND_MIN = { 'Table talk': 8, 'Journal Club': 15, 'Debate': 8, 'Dog news': 5 };
  var SURPRISE = { 'Table talk': 'Surprise calm topic, picked on the day', 'Journal Club': 'A real dog science paper from the news or the journals, picked on the day',
    'Debate': 'Surprise calm debate topic, picked on the day', 'Dog news': 'A calm dog story in the news this week, picked on the day' };
  var HEAVY = /death|dying|grief|grieving|goodbye|hospice|palliative|euthan|cancer|oncolog|biops|tumou?r|poison|toxic|\bbite|attack|aggress|recall|cruel|neglect|emergency|seizure|epilep|bloat|heatstroke|danger|cloning|stem cell|anti-aging|cannabi|\bcbd\b|prong|coyote|rattlesnake|biosecurity|lawsuit|disease|cushing|cruciate|shelter crisis|no-kill|tail docking|matting pain|kennel cough|end-of-life|loss\b|surgery|import rescues|parasite|vaccin|supplements|over-vaccination|anticipatory|finding peace/i;
  var JC_CAST = ['andria', 'hal', 'mike', 'leo', 'ed'];
  var VOICES = [
    ['andria', 'Andria', 'Host'], ['hal', 'Hal', 'Host'], ['ed', 'Ed', 'Training'], ['clara', 'Clara', 'Health, not a vet'],
    ['mike', 'Mike', 'Genetics and science'], ['judy', 'Judy', 'Grooming and care'], ['charles', 'Charles', 'Irvine walks'],
    ['leo', 'Leo', 'Behavior'], ['maya', 'Maya', 'Sleep and rest'], ['rosie', 'Rosie', 'New puppy parent'], ['bea', 'Bea', 'Breeds']
  ];
  var ORDER = VOICES.map(function (v) { return v[0]; });
  function vname(id) { var v = VOICES.filter(function (x) { return x[0] === id; })[0]; return v ? v[1] : id; }
  function castText(c) { return c && c.length ? c.map(vname).join(', ') : 'picked to suit the topic'; }

  /* ---------- saved state ---------- */
  var ST;
  try { ST = JSON.parse(lget('wt_plan2', '') || '{}'); } catch (e) { ST = {}; }
  ST.slots = ST.slots || {}; ST.extra = ST.extra || [];
  ST.jc = ST.jc == null ? 5 : ST.jc;
  ST.on = ST.on || [true, true, true, true, true, true, true];
  var SHOW = 14;
  function save() { lset('wt_plan2', JSON.stringify(ST)); }

  /* ---------- owner check ---------- */
  function owner() { return lget('wt_owner', '0') === '1' || lget('wt_me', '0') === '1'; }
  $('notowner').hidden = owner();
  $('beowner').addEventListener('click', function () { lset('wt_owner', '1'); $('notowner').hidden = true; say('Owner tools are on for this phone.'); });

  /* ---------- where requests go (typed once, kept on this phone) ---------- */
  function num() { return lget('wt_req_to', ''); }
  function pretty(n) { var d = (n || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, ''); return d.length === 10 ? d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6) : n; }
  function drawNum() {
    var n = num();
    $('numnow').textContent = n ? 'Requests go by text to ' + pretty(n) + '.' : 'Type your number once. After that, Submit request opens Messages with it filled in.';
    $('numform').hidden = !!n; $('numchange').hidden = !n;
  }
  $('numsave').addEventListener('click', function () {
    var d = $('num').value.replace(/\D/g, '');
    if (d.length === 10) d = '1' + d;
    if (d.length < 11 || d.length > 15) { say('Please type the full number, 10 digits.'); $('num').focus(); return; }
    lset('wt_req_to', '+' + d); drawNum(); say('Saved. Requests will go to ' + pretty('+' + d) + '.');
  });
  $('numchange').addEventListener('click', function () { $('numform').hidden = false; $('numchange').hidden = true; $('num').value = pretty(num()); $('num').focus(); });
  drawNum();

  /* ---------- rhythm ---------- */
  var dz = $('days');
  DAYS.forEach(function (d, i) {
    var b = el('button', 'chip', d.slice(0, 3)); b.type = 'button'; b.setAttribute('aria-label', d); b.setAttribute('aria-pressed', String(ST.on[i]));
    b.addEventListener('click', function () { ST.on[i] = !ST.on[i]; b.setAttribute('aria-pressed', String(ST.on[i])); save(); draw(); say(d + (ST.on[i] ? ': new episode on.' : ': no new episode.')); });
    dz.appendChild(b);
  });
  var js = $('jcday');
  DAYS.forEach(function (d, i) { var o = el('option', null, d); o.value = i; js.appendChild(o); });
  js.value = ST.jc;
  js.addEventListener('change', function () { ST.jc = +js.value; save(); draw(); say('Journal Club is now on ' + DAYS[ST.jc] + '.'); });

  /* ---------- topics ---------- */
  var GROUPS = [], ALLT = [];

  /* ---------- dates ---------- */
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function parse(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); }
  function longDate(s) { return parse(s).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); }
  function today() { var t = new Date(); t.setHours(12, 0, 0, 0); return t; }

  function defaults(key) {
    var p = key.split(':'), date = p[1], kind = p[2] === 'jc' ? 'Journal Club' : 'Table talk';
    return { date: date, kind: kind, topic: '', focus: kind === 'Journal Club' ? ['Science', 'Practical tips'] : [],
      emph: '', len: KIND_MIN[kind], cast: kind === 'Journal Club' ? JC_CAST.slice() : [], p1: '', p2: '', notes: '' };
  }
  function keys(days) {
    var out = [], t = today(), end = new Date(t.getTime() + days * 864e5);
    for (var d = new Date(t); d < end; d.setDate(d.getDate() + 1)) {
      if (!ST.on[d.getDay()] && d.getDay() !== ST.jc) continue;
      out.push('d:' + iso(d) + ':' + (d.getDay() === ST.jc ? 'jc' : 'tt'));
    }
    ST.extra.forEach(function (k) { if (parse(k.split(':')[1]) >= t) out.push(k); });
    return out;
  }
  function slot(key) {
    var o = ST.slots[key] || {}, base = key.indexOf('x:') === 0 ? (o.base || defaults('d:' + key.split(':')[1] + ':tt')) : defaults(key), s = {};
    Object.keys(base).forEach(function (k) { s[k] = o[k] != null ? o[k] : base[k]; });
    s.key = key; s.status = o.status || 'Default'; s.sent = o.sent || ''; s.skip = !!o.skip;
    return s;
  }
  function setField(key, f, v) {
    var o = ST.slots[key] = ST.slots[key] || {};
    o[f] = v; o.status = o.status === 'Sent' || o.status === 'Edited after sending' ? 'Edited after sending' : 'Edited';
    save();
  }

  /* ---------- the request text ---------- */
  function text(s) {
    if (s.skip) return 'Date: ' + longDate(s.date) + '\nSKIP: no new episode on this date.';
    var L = ['Date: ' + longDate(s.date), 'Type: ' + s.kind + ', about ' + s.len + ' min', 'Topic: ' + (s.topic || SURPRISE[s.kind])];
    if (s.focus && s.focus.length) L.push('Focus: ' + s.focus.join(', '));
    if (s.emph) L.push('Emphasis: ' + s.emph);
    L.push('Voices: ' + castText(s.cast));
    if (s.kind === 'Journal Club') L.push('Papers: ' + ([s.p1, s.p2].filter(Boolean).join(' ; ') || 'please find one real peer-reviewed dog study from the news or the journals'));
    if (s.notes) L.push('Notes: ' + s.notes);
    return L.join('\n');
  }
  var FOOT = '\n\nSent from the Walk & Talk Show Planner.';
  function sms(body) {
    var n = num();
    if (!n) { need(); return false; }
    location.href = 'sms:' + n + '?&body=' + encodeURIComponent(body);
    return true;
  }
  function need() { say('First type your number at the top of this page.'); $('numform').hidden = false; $('setup').scrollIntoView({ block: 'start' }); $('num').focus(); }
  function copy(body) {
    function fb() { var t = el('textarea'); t.value = body; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); say('Copied. You can paste it anywhere.'); } catch (e) { say('Could not copy on this device.'); } t.remove(); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(body).then(function () { say('Copied. You can paste it anywhere.'); }, fb); else fb();
  }
  function share(body) { if (window.toClaude) { window.toClaude({ text: body }); return; } if (navigator.share) navigator.share({ text: body }).catch(function () {}); else { copy(body); say('Copied. Open the Claude app and paste it into a chat.'); } }
  function markSent(list) {
    var d = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    list.forEach(function (s) { var o = ST.slots[s.key] = ST.slots[s.key] || {}; o.status = 'Sent'; o.sent = d; });
    save(); setTimeout(draw, 400);
  }

  /* ---------- drawing ---------- */
  var openKey = null;
  function draw() {
    var ol = $('slots'); ol.textContent = '';
    keys(SHOW).map(slot).sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); }).forEach(function (s) { ol.appendChild(card(s)); });
    $('more').hidden = SHOW >= 56;
  }
  function badge(s) { return s.skip ? 'Skipped' : (s.status === 'Sent' ? 'Sent ' + s.sent : s.status); }
  function head(li, t) {
    li.querySelector('.sdate').textContent = longDate(t.date) + ' · ' + t.kind + ' · ' + t.len + ' min';
    li.querySelector('.stopic').textContent = t.topic || SURPRISE[t.kind];
    li.querySelector('.stopic').classList.toggle('auto', !t.topic);
    li.querySelector('.swho').textContent = 'Voices: ' + castText(t.cast);
    var b = li.querySelector('.sbadge'); b.textContent = badge(t); b.dataset.s = t.skip ? 'skip' : t.status.split(' ')[0].toLowerCase();
    li.classList.toggle('jc', t.kind === 'Journal Club'); li.classList.toggle('skipped', t.skip);
  }
  function card(s) {
    var li = $('slot-tpl').content.firstElementChild.cloneNode(true);
    li.dataset.key = s.key; head(li, s);
    var open = li.querySelector('.sopen'), ed = li.querySelector('.ed');
    open.addEventListener('click', function () { openKey = openKey === s.key ? null : s.key; draw(); var n = document.querySelector('[data-key="' + s.key + '"]'); if (n) n.scrollIntoView({ block: 'start' }); });
    if (openKey === s.key) { ed.hidden = false; open.setAttribute('aria-expanded', 'true'); open.textContent = 'Close'; fill(li, s); }
    return li;
  }

  function fill(li, s) {
    var q = function (c) { return li.querySelector(c); }, key = s.key;
    function ch(f, v) { setField(key, f, v); summary(); }
    function summary() {
      var t = slot(key); head(li, t);
      q('.f-papers-box').hidden = t.kind !== 'Journal Club';
      q('.curtopic').textContent = 'Chosen: ' + (t.topic || SURPRISE[t.kind]);
    }
    q('.f-date').value = s.date; q('.f-date').addEventListener('change', function () { if (this.value) ch('date', this.value); });
    q('.f-kind').value = s.kind; q('.f-kind').addEventListener('change', function () { ch('kind', this.value); ch('len', KIND_MIN[this.value]); drawLen(); });

    var tl = q('.tlist'), search = q('.f-search'), calm = q('.f-calm');
    function drawTopics() {
      tl.textContent = ''; var term = search.value.trim().toLowerCase(), n = 0, cur = slot(key).topic;
      var sp = el('button', 'topt sp', 'Surprise me: Claude picks a calm topic on the day'); sp.type = 'button'; sp.setAttribute('aria-pressed', String(!cur));
      sp.addEventListener('click', function () { ch('topic', ''); q('.f-own').value = ''; drawTopics(); }); tl.appendChild(sp);
      GROUPS.forEach(function (g) {
        var items = g.topics.filter(function (t) { return (!term || t.toLowerCase().indexOf(term) >= 0) && !(calm.checked && HEAVY.test(t)); });
        if (!items.length) return;
        tl.appendChild(el('p', 'tg', g.group));
        items.forEach(function (t) {
          var bt = el('button', 'topt', t); bt.type = 'button'; bt.setAttribute('aria-pressed', String(t === cur));
          bt.addEventListener('click', function () { ch('topic', t); q('.f-own').value = ''; drawTopics(); });
          tl.appendChild(bt); n++;
        });
      });
      if (!n && term) tl.appendChild(el('p', 'hint', 'No topic matches. Type your own below.'));
    }
    search.addEventListener('input', drawTopics); calm.addEventListener('change', drawTopics);
    q('.f-own').addEventListener('change', function () { var v = this.value.trim(); if (v) { ch('topic', v); drawTopics(); } });
    if (s.topic && ALLT.indexOf(s.topic) < 0) q('.f-own').value = s.topic;
    drawTopics();

    var fz = q('.f-focus');
    FOCUS.forEach(function (f) {
      var bt = el('button', 'chip', f); bt.type = 'button'; bt.setAttribute('aria-pressed', String(s.focus.indexOf(f) >= 0));
      bt.addEventListener('click', function () { var a = slot(key).focus.slice(), i = a.indexOf(f); if (i >= 0) a.splice(i, 1); else a.push(f); ch('focus', a); bt.setAttribute('aria-pressed', String(i < 0)); });
      fz.appendChild(bt);
    });
    q('.f-emph').value = s.emph; q('.f-emph').addEventListener('change', function () { ch('emph', this.value.trim()); });

    function drawLen() {
      var lz = q('.f-len'); lz.textContent = ''; var cur = slot(key).len;
      LENS.forEach(function (L) {
        var bt = el('button', 'chip', L.t); bt.type = 'button'; bt.setAttribute('aria-pressed', String(cur === L.m));
        bt.addEventListener('click', function () { ch('len', L.m); drawLen(); }); lz.appendChild(bt);
      });
    }
    drawLen();

    var vz = q('.f-voices');
    function drawVoices() {
      vz.textContent = ''; var cur = slot(key).cast;
      VOICES.forEach(function (v) {
        var bt = el('button', 'voice'); bt.type = 'button'; bt.setAttribute('aria-pressed', String(cur.indexOf(v[0]) >= 0));
        var im = el('img'); im.src = v[0] + '.jpg?v=2'; im.alt = ''; im.width = 56; im.height = 56; im.loading = 'lazy';
        bt.appendChild(im); var tx = el('span'); tx.appendChild(el('b', null, v[1])); tx.appendChild(el('small', null, v[2])); bt.appendChild(tx);
        bt.addEventListener('click', function () {
          var a = slot(key).cast.slice(), i = a.indexOf(v[0]);
          if (i >= 0) a.splice(i, 1);
          else { if (a.length >= 7) { say('Seven voices is the most that fit at the table.'); return; } a.push(v[0]); }
          a.sort(function (x, y) { return ORDER.indexOf(x) - ORDER.indexOf(y); });
          ch('cast', a); drawVoices();
        });
        vz.appendChild(bt);
      });
      var auto = el('button', 'chip', 'Let Claude pick the voices'); auto.type = 'button'; auto.setAttribute('aria-pressed', String(!cur.length));
      auto.addEventListener('click', function () { ch('cast', []); drawVoices(); }); vz.appendChild(auto);
    }
    drawVoices();

    q('.f-p1').value = s.p1; q('.f-p2').value = s.p2;
    q('.f-p1').addEventListener('change', function () { ch('p1', this.value.trim()); });
    q('.f-p2').addEventListener('change', function () { ch('p2', this.value.trim()); });
    q('.f-notes').value = s.notes; q('.f-notes').addEventListener('change', function () { ch('notes', this.value.trim()); });

    function flush() { Array.prototype.forEach.call(li.querySelectorAll('textarea,input[type=text],input[type=url]'), function (x) { x.dispatchEvent(new Event('change')); }); }
    q('.f-send').addEventListener('click', function () { flush(); var t = slot(key); if (sms('Walk & Talk request\n' + text(t) + FOOT)) markSent([t]); });
    q('.f-copy').addEventListener('click', function () { flush(); copy('Walk & Talk request\n' + text(slot(key)) + FOOT); });
    q('.f-share').addEventListener('click', function () { flush(); share('Make this Walk & Talk episode\n' + text(slot(key)) + FOOT); });
    q('.f-skip').textContent = s.skip ? 'Bring this date back' : 'Skip this date';
    q('.f-skip').addEventListener('click', function () {
      var o = ST.slots[key] = ST.slots[key] || {}; o.skip = !o.skip; if (o.status !== 'Sent') o.status = 'Edited'; save(); draw();
      say(o.skip ? 'Skipped. Press Send to Claude so the daily episode maker knows.' : 'This date is back in the plan.');
    });
    if (key.indexOf('x:') === 0) q('.f-reset').textContent = 'Remove this extra date';
    q('.f-reset').addEventListener('click', function () {
      if (key.indexOf('x:') === 0) { ST.extra = ST.extra.filter(function (k) { return k !== key; }); delete ST.slots[key]; openKey = null; save(); draw(); say('Extra date removed.'); return; }
      delete ST.slots[key]; save(); draw(); say('Back to the automatic plan for this date.');
    });
    q('.f-close').addEventListener('click', function () { flush(); openKey = null; draw(); });
    summary();
  }

  $('addslot').addEventListener('click', function () {
    var t = today(); t.setDate(t.getDate() + 1);
    var key = 'x:' + iso(t) + ':' + Date.now().toString(36);
    ST.extra.push(key); ST.slots[key] = { base: defaults('d:' + iso(t) + ':tt'), status: 'Edited' }; save();
    openKey = key; draw();
    var n = document.querySelector('[data-key="' + key + '"]'); if (n) { n.scrollIntoView({ block: 'start' }); var d = n.querySelector('.f-date'); if (d) d.focus(); }
    say('Extra episode added for tomorrow. Change its date and topic below.');
  });
  $('more').addEventListener('click', function () { SHOW = Math.min(56, SHOW + 14); draw(); });
  function changed() {
    return keys(28).map(slot).filter(function (s) { return s.status !== 'Default' && s.status !== 'Sent'; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  }
  function bundle(list) { return 'Walk & Talk request, ' + list.length + ' date' + (list.length === 1 ? '' : 's') + '\n\n' + list.map(function (s, i) { return (i + 1) + '. ' + text(s); }).join('\n\n') + FOOT; }
  $('sendall').addEventListener('click', function () { var l = changed(); if (!l.length) { say('Nothing changed yet. Open a date and change it first.'); return; } if (sms(bundle(l))) markSent(l); });
  $('claudeall').addEventListener('click', function () { var l = changed(); if (!l.length) { say('Nothing changed yet. Open a date and change it first.'); return; } share(bundle(l)); });

  var st;
  function say(m) { var s = $('status'); s.textContent = m; s.classList.add('on'); clearTimeout(st); st = setTimeout(function () { s.classList.remove('on'); }, 5000); }

  fetch('topics.json').then(function (r) { return r.json(); }).then(function (d) {
    GROUPS = (d.groups || []).filter(function (g) { return !/Meet this dog/i.test(g.group); });
    GROUPS.forEach(function (g) { g.topics.forEach(function (t) { ALLT.push(t); }); });
    draw();
  }).catch(function () { say('The topic list could not load. Check the connection and open the planner again.'); draw(); });
})();
