(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  var people = [], seated = [], photos = [], MAXP = 4;

  fetch('episodes.json').then(function (r) { return r.json(); }).then(function (d) {
    people = d.bench || (d.episodes[d.episodes.length - 1].cast); draw();
  }).catch(function () { $('status').textContent = 'Could not load the voices. Please refresh.'; });

  function byId(id) { return people.filter(function (p) { return p.id === id; })[0]; }
  function chip(p, seatedChip) {
    var c = el('div', 'chip' + (seatedChip ? ' seated' : '')); c.dataset.id = p.id; c.tabIndex = 0; c.setAttribute('role', 'button');
    c.setAttribute('aria-label', p.name + ', ' + p.role + (seatedChip ? '. At the table. Press to remove.' : '. Press to add to the table.'));
    var im = el('img'); im.src = p.id + '.jpg'; im.alt = ''; c.appendChild(im); c.appendChild(el('b', null, p.name));
    return c;
  }
  function draw() {
    var t = $('stable'), tray = $('tray');
    Array.prototype.slice.call(t.querySelectorAll('.chip')).forEach(function (n) { n.remove(); });
    tray.textContent = '';
    seated.forEach(function (id) { t.appendChild(chip(byId(id), true)); });
    people.forEach(function (p) { var c = chip(p, false); if (seated.indexOf(p.id) >= 0) c.classList.add('used'); tray.appendChild(c); });
    $('empty').style.display = seated.length ? 'none' : '';
    $('count').textContent = seated.length + (seated.length === 1 ? ' at the table' : ' at the table');
    Array.prototype.forEach.call(document.querySelectorAll('.chip'), wireChip);
  }

  function wireChip(c) {
    var startX, startY, moved, ghost, id = c.dataset.id, fromTable = c.classList.contains('seated');
    c.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button > 0) return;
      startX = e.clientX; startY = e.clientY; moved = false; c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', function (e) {
      if (startX == null) return;
      if (!moved && Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) < 8) return;
      if (!moved) {
        moved = true; c.classList.add('dragging');
        ghost = el('div', 'ghost'); var im = el('img'); im.src = id + '.jpg'; ghost.appendChild(im); document.body.appendChild(ghost);
      }
      ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px';
      var z = zone(e.clientX, e.clientY);
      $('stable').classList.toggle('over', z.kind === 'table' || z.kind === 'seat');
      $('tray').classList.toggle('over', z.kind === 'tray');
      Array.prototype.forEach.call(document.querySelectorAll('.chip.target'), function (n) { n.classList.remove('target'); });
      if (z.kind === 'seat' && z.id !== id) z.node.classList.add('target');
    });
    function end(e, cancel) {
      if (startX == null) return; startX = null;
      $('stable').classList.remove('over'); $('tray').classList.remove('over');
      Array.prototype.forEach.call(document.querySelectorAll('.chip.target'), function (n) { n.classList.remove('target'); });
      c.classList.remove('dragging');
      if (!moved) { if (!cancel) toggle(id); return; }
      if (ghost) ghost.remove();
      if (cancel) return;
      var z = zone(e.clientX, e.clientY), i = seated.indexOf(id);
      if (z.kind === 'seat' && z.id !== id) {
        if (i >= 0) seated.splice(i, 1);
        seated.splice(seated.indexOf(z.id), 0, id);
      } else if (z.kind === 'table') {
        if (i < 0) seated.push(id);
      } else if (z.kind === 'tray' || z.kind === 'none') {
        if (i >= 0 && fromTable) seated.splice(i, 1);
      }
      draw();
    }
    c.addEventListener('pointerup', function (e) { end(e, false); });
    c.addEventListener('pointercancel', function (e) { end(e, true); });
    c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(id); } });
  }

  function zone(x, y) {
    var n = document.elementsFromPoint(x, y);
    for (var k = 0; k < n.length; k++) {
      var e = n[k];
      if (e.classList && e.classList.contains('ghost')) continue;
      var ch = e.closest ? e.closest('.chip.seated') : null;
      if (ch) return { kind: 'seat', id: ch.dataset.id, node: ch };
      if (e.closest && e.closest('#stable')) return { kind: 'table' };
      if (e.closest && e.closest('#tray')) return { kind: 'tray' };
    }
    return { kind: 'none' };
  }
  function toggle(id) { var i = seated.indexOf(id); if (i >= 0) seated.splice(i, 1); else seated.push(id); draw(); }

  /* photos */
  function addFiles(list) {
    Array.prototype.forEach.call(list, function (f) {
      if (!/^image\//.test(f.type) || photos.length >= MAXP) return;
      photos.push({ file: f, url: URL.createObjectURL(f) });
    });
    drawPhotos();
  }
  function drawPhotos() {
    var ul = $('thumbs'); ul.textContent = '';
    photos.forEach(function (p, i) {
      var li = el('li'); var im = el('img'); im.src = p.url; im.alt = 'Dog photo ' + (i + 1); li.appendChild(im);
      var b = el('button', null, '×'); b.type = 'button'; b.setAttribute('aria-label', 'Remove photo ' + (i + 1));
      b.addEventListener('click', function () { URL.revokeObjectURL(p.url); photos.splice(i, 1); drawPhotos(); });
      li.appendChild(b); ul.appendChild(li);
    });
  }
  $('files').addEventListener('change', function () { addFiles(this.files); this.value = ''; });
  var drop = $('drop');
  ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { if (e.dataTransfer) addFiles(e.dataTransfer.files); });


  /* ---------- topics and papers: scroll lists + drag onto cards ---------- */
  var topicSel = '', papersOn = [], papersAll = [], MAXPAPERS = 2, pid = 0, justDragged = false;
  var selEl = $('topic');

  function dragify(node, label, onDrop) {
    var sx, sy, moved = false, ghost = null, pdown = false, over = null;
    node.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button > 0) return;
      if (e.pointerType === 'touch' && !e.target.closest('.grip')) return;
      if (e.target.closest('button.x')) return;
      sx = e.clientX; sy = e.clientY; moved = false; pdown = true; try { node.setPointerCapture(e.pointerId); } catch (x) {}
    });
    node.addEventListener('pointermove', function (e) {
      if (!pdown) return;
      if (!moved && Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) < 8) return;
      if (!moved) { moved = true; node.classList.add('dragging'); ghost = el('div', 'ghost2', label()); document.body.appendChild(ghost); }
      ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px';
      var d = dropAt(e.clientX, e.clientY);
      if (over && over !== d) over.classList.remove('over');
      over = d; if (d) d.classList.add('over');
    });
    function end(e, cancel) {
      if (!pdown) return; pdown = false;
      if (over) over.classList.remove('over'); over = null;
      node.classList.remove('dragging');
      if (ghost) { ghost.remove(); ghost = null; }
      if (!moved) return;
      justDragged = true; setTimeout(function () { justDragged = false; }, 60);
      if (cancel) return;
      var d = dropAt(e.clientX, e.clientY); onDrop(d ? d.dataset.drop : 'none');
    }
    node.addEventListener('pointerup', function (e) { end(e, false); });
    node.addEventListener('pointercancel', function (e) { end(e, true); });
  }
  function dropAt(x, y) {
    var n = document.elementsFromPoint(x, y);
    for (var k = 0; k < n.length; k++) { if (n[k].classList && n[k].classList.contains('ghost2')) continue; var d = n[k].closest ? n[k].closest('[data-drop]') : null; if (d) return d; }
    return null;
  }

  /* topics */
  var HEAVY = /death|dying|grief|grieving|goodbye|hospice|palliative|euthan|cancer|oncolog|biops|tumou?r|poison|toxic|\bbite|attack|aggress|recall|cruel|neglect|emergency|seizure|epilep|bloat|heatstroke|danger|cloning|stem cell|anti-aging|cannabi|\bcbd\b|prong|coyote|rattlesnake|biosecurity|lawsuit|disease|cushing|cruciate|shelter crisis|no-kill|tail docking|matting pain|kennel cough|end-of-life|loss\b|surgery|import rescues|parasite|vaccin|supplements|over-vaccination|anticipatory|finding peace/i;
  function applyTopicFilter() {
    var q = $('tsearch').value.trim().toLowerCase(), calm = $('calm').checked, any = false, shown = 0, hid = 0;
    Array.prototype.forEach.call(document.querySelectorAll('#tlist .tg'), function (g) {
      var vis = 0;
      Array.prototype.forEach.call(g.querySelectorAll('.card'), function (c) {
        var heavy = c.dataset.heavy === '1', show = (!q || c.dataset.text.indexOf(q) >= 0) && !(calm && heavy);
        if (calm && heavy && (!q || c.dataset.text.indexOf(q) >= 0)) hid++;
        c.hidden = !show; if (show) { vis++; shown++; }
      });
      g.hidden = vis === 0; if (vis) any = true;
    });
    var en = document.querySelector('#tlist .empty-note'); if (en) en.hidden = any;
    $('calmnote').textContent = calm ? '(' + hid + ' heavier topics hidden)' : '(showing all)';
  }
  function buildTopics() {
    var box = $('tlist'); box.textContent = '';
    Array.prototype.forEach.call(selEl.querySelectorAll('optgroup'), function (g) {
      var wrap = el('div', 'tg'); wrap.appendChild(el('h4', 'gh', g.label));
      var list = el('div', 'tgroup');
      Array.prototype.forEach.call(g.querySelectorAll('option'), function (o) {
        var text = o.textContent, c = el('div', 'card'); c.setAttribute('role', 'listitem'); c.tabIndex = 0; c.dataset.text = text.toLowerCase(); c.dataset.heavy = HEAVY.test(text) ? '1' : '';
        c.appendChild(el('span', 'grip', '⋮⋮')); c.appendChild(el('span', 'ct', text));
        if (text === topicSel) c.classList.add('picked');
        c.addEventListener('click', function () { if (!justDragged) setTopic(text === topicSel ? '' : text); });
        c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTopic(text === topicSel ? '' : text); } });
        dragify(c, function () { return text; }, function (z) { if (z === 'topic') setTopic(text); });
        list.appendChild(c);
      });
      wrap.appendChild(list); box.appendChild(wrap);
    });
    box.appendChild(el('p', 'empty-note', 'No topic matches. Try fewer letters, or write your own idea below.')).hidden = true;
  }
  function setTopic(t) {
    topicSel = t;
    var has = Array.prototype.some.call(selEl.options, function (o) { return o.value === t; });
    selEl.value = has ? t : '';
    drawTopicSlot();
    Array.prototype.forEach.call(document.querySelectorAll('#tlist .card'), function (c) { c.classList.toggle('picked', c.querySelector('.ct').textContent === t); });
  }
  function drawTopicSlot() {
    var b = $('tbox'); b.textContent = '';
    if (!topicSel) { b.appendChild(el('span', 'slot-empty', 'Drop a topic here')); return; }
    var s = el('div', 'sel'); s.appendChild(el('span', 't', topicSel));
    var x = el('button', 'x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Remove topic'); x.addEventListener('click', function () { setTopic(''); });
    s.appendChild(x); b.appendChild(s);
    dragify(s, function () { return topicSel; }, function (z) { if (z === 'tlist' || z === 'none') setTopic(''); });
  }
  selEl.addEventListener('change', function () { setTopic(selEl.value === 'other' ? '' : selEl.value); });
  $('tsearch').addEventListener('input', applyTopicFilter);
  $('calm').addEventListener('change', applyTopicFilter);

  /* papers */
  function normalizeLink(s) {
    s = (s || '').trim(); if (!s) return null;
    var doi = s.replace(/^doi:\s*/i, '').match(/^(10\.\d{4,9}\/\S+)$/i);
    if (doi) return { url: 'https://doi.org/' + doi[1], label: 'DOI ' + doi[1] };
    if (!/^https?:\/\//i.test(s)) { if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(s)) s = 'https://' + s; else return null; }
    try {
      var u = new URL(s), host = u.hostname.replace(/^www\./, ''), pm = u.pathname.match(/\/(\d{5,9})\/?$/);
      var lab = /pubmed\.ncbi/.test(host) && pm ? 'PubMed ' + pm[1] : (/pmc\.ncbi/.test(host) ? 'PubMed Central article' : host + (u.pathname.length > 1 ? u.pathname.slice(0, 28) + (u.pathname.length > 28 ? '…' : '') : ''));
      return { url: u.href, label: lab };
    } catch (e) { return null; }
  }
  function addPaper(p) {
    if (papersAll.length >= 6) { $('status').textContent = 'The paper list is full (6). Remove one first.'; return; }
    if (p.url && papersAll.some(function (q) { return q.url === p.url; })) return;
    p.id = 'p' + (++pid); papersAll.push(p);
    if (papersOn.length < MAXPAPERS) papersOn.push(p.id);
    drawPapers();
  }
  function paperById(id) { return papersAll.filter(function (p) { return p.id === id; })[0]; }
  function drawPapers() {
    var tray = $('ptray'); tray.textContent = '';
    if (!papersAll.length) tray.appendChild(el('p', 'empty-note', 'Papers you add will appear here.'));
    papersAll.forEach(function (p) { var c = paperCard(p, false); if (papersOn.indexOf(p.id) >= 0) c.classList.add('picked'); tray.appendChild(c); });
    var b = $('pbox'); b.textContent = '';
    if (!papersOn.length) b.appendChild(el('span', 'slot-empty', 'Drop a paper here'));
    papersOn.forEach(function (id) { var p = paperById(id); if (p) b.appendChild(paperCard(p, true)); });
    $('pcount').textContent = '(' + papersOn.length + ' of ' + MAXPAPERS + ')';
  }
  function paperCard(p, onTable) {
    var c = el('div', 'card'); c.tabIndex = 0;
    c.appendChild(el('span', 'grip', '⋮⋮')); c.appendChild(el('span', 'ct', (p.file ? 'PDF: ' : '') + p.label));
    var x = el('button', 'x', '×'); x.type = 'button'; x.setAttribute('aria-label', onTable ? 'Take this paper off the table' : 'Delete this paper');
    x.style.cssText = 'flex:none;width:30px;margin:4px;border:0;border-radius:50%;background:var(--plum);color:#fff;font-size:17px;cursor:pointer';
    x.addEventListener('click', function (e) { e.stopPropagation(); if (onTable) { papersOn.splice(papersOn.indexOf(p.id), 1); } else { papersAll.splice(papersAll.indexOf(p), 1); var i = papersOn.indexOf(p.id); if (i >= 0) papersOn.splice(i, 1); } drawPapers(); });
    c.appendChild(x);
    c.addEventListener('click', function () { if (justDragged || onTable) return; togglePaper(p.id); });
    dragify(c, function () { return p.label; }, function (z) {
      if (!onTable && z === 'paper') { if (papersOn.indexOf(p.id) < 0) { if (papersOn.length >= MAXPAPERS) papersOn.shift(); papersOn.push(p.id); } drawPapers(); }
      else if (onTable && (z === 'plist' || z === 'none')) { papersOn.splice(papersOn.indexOf(p.id), 1); drawPapers(); }
    });
    return c;
  }
  function togglePaper(id) { var i = papersOn.indexOf(id); if (i >= 0) papersOn.splice(i, 1); else { if (papersOn.length >= MAXPAPERS) papersOn.shift(); papersOn.push(id); } drawPapers(); }
  function addLinkText(s) {
    var n = normalizeLink(s); if (!n) { $('status').textContent = 'That does not look like a link or a DOI. Please check it.'; return false; }
    $('status').textContent = ''; addPaper(n); return true;
  }
  $('padd').addEventListener('click', function () { if (addLinkText($('plink').value)) $('plink').value = ''; });
  $('plink').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); $('padd').click(); } });
  function addPdfs(list) { Array.prototype.forEach.call(list, function (f) { if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) addPaper({ file: f, label: f.name }); }); }
  $('pfile').addEventListener('change', function () { addPdfs(this.files); this.value = ''; });
  var pd = $('pdrop');
  ['dragenter', 'dragover'].forEach(function (ev) { pd.addEventListener(ev, function (e) { e.preventDefault(); pd.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { pd.addEventListener(ev, function (e) { e.preventDefault(); pd.classList.remove('over'); }); });
  pd.addEventListener('drop', function (e) {
    if (!e.dataTransfer) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length) addPdfs(e.dataTransfer.files);
    var t = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain'); if (t) addLinkText(t.split('\n')[0]);
  });

  buildTopics(); drawTopicSlot(); drawPapers(); applyTopicFilter();
  $('tsearch').placeholder = 'Search ' + document.querySelectorAll('#tlist .card').length + ' topics, or scroll the list';

  /* send */
  function plan() {
    var tv = $('topic').value, note = $('note').value.trim();
    var names = seated.map(function (id) { var p = byId(id); return p.name + ' (' + p.role + ')'; });
    var topic = tv === 'other' ? '(my own idea, below)' : (tv || topicSel || '(not chosen)');
    var pl = papersOn.map(function (id) { var p = paperById(id); return p ? (p.url ? p.label + ' ' + p.url : 'PDF attached: ' + p.label) : ''; }).filter(Boolean);
    return "New episode request for Today's Walk, Let's Talk\n\nAt the table (" + seated.length + '): ' + (names.join(', ') || 'not chosen') +
      '\nTopic: ' + topic + (pl.length ? '\nPapers to discuss (' + pl.length + '): ' + pl.join('; ') : '') + (note ? '\nMy idea or question: ' + note : '') + '\nDog photos attached: ' + photos.length;
  }
  $('send').addEventListener('click', function () {
    var st = $('status');
    if (seated.length < 2) { st.textContent = 'Please seat at least two voices.'; return; }
    if (!$('topic').value && !topicSel && !papersOn.length && !$('note').value.trim()) { st.textContent = 'Please pick a topic or write your own idea.'; return; }
    var text = plan(), data = { title: "Today's Walk, Let's Talk: episode request", text: text };
    var files = photos.map(function (p) { return p.file; }).concat(papersOn.map(paperById).filter(function (p) { return p && p.file; }).map(function (p) { return p.file; }));
    try { if (files.length && navigator.canShare && navigator.canShare({ files: files })) data.files = files; } catch (e) {}
    if (navigator.share) {
      navigator.share(data).then(function () { st.textContent = 'Sent. Thank you!'; }).catch(function (e) { if (e && e.name !== 'AbortError') fallback(text); });
    } else { fallback(text); }
  });
  function fallback(text) {
    var st = $('status');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { st.textContent = 'Plan copied. Paste it into a message to send.'; }, function () { location.href = 'mailto:?subject=' + encodeURIComponent("Episode request") + '&body=' + encodeURIComponent(text); });
    } else { location.href = 'mailto:?subject=' + encodeURIComponent('Episode request') + '&body=' + encodeURIComponent(text); }
  }
  /* ---------- owner: date, type, emphasis, and "Make this episode" (share to the Claude app) ---------- */
  (function () {
    var LS2 = null; try { LS2 = localStorage; } catch (e) {}
    function g(k) { try { return LS2 ? LS2.getItem(k) : null; } catch (e) { return null; } }
    function s2(k, v) { try { if (LS2) LS2.setItem(k, v); } catch (e) {} }
    var isOwner = g('wt_owner') === '1' || g('wt_me') === '1';
    if (!isOwner) return;
    $('ownermake').hidden = false; $('send').hidden = true;
    var t = new Date(); t.setDate(t.getDate() + 1);
    $('mkdate').value = t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2);
    $('mkkind').addEventListener('change', function () { $('mklen').value = this.value === 'Journal Club' ? '15' : (this.value === 'Dog news' ? '5' : '8'); });
    if (!g('wt_req_to')) $('mknumbox').hidden = false;
    function longD(v) { var p = v.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); }
    function req() {
      var st = $('status');
      if (seated.length && seated.length < 2) { st.textContent = 'Please seat at least two voices, or none and Claude picks them.'; return null; }
      var tv = $('topic').value, note = $('note').value.trim();
      var topic = tv === 'other' ? '' : (tv || topicSel || '');
      var pl = papersOn.map(function (id) { var p = paperById(id); return p ? (p.url ? p.label + ' ' + p.url : 'PDF attached: ' + p.label) : ''; }).filter(Boolean);
      var L = ['Make this Walk & Talk episode', 'Play it on: ' + ($('mkdate').value ? longD($('mkdate').value) : 'the next free day'),
        'Type: ' + $('mkkind').value + ', about ' + $('mklen').value + ' min',
        'Topic: ' + (topic || (note ? 'my own idea, below' : 'surprise me with a calm topic')),
        'Voices: ' + (seated.length ? seated.map(function (id) { return byId(id).name; }).join(', ') : 'pick them to suit the topic')];
      var em = $('mkemph').value.trim(); if (em) L.push('Emphasis: ' + em);
      if (pl.length) L.push('Papers: ' + pl.join('; '));
      if (note) L.push('My idea: ' + note);
      if (photos.length) L.push('Dog photos attached: ' + photos.length);
      return L.join('\n');
    }
    $('make').addEventListener('click', function () {
      var text = req(); if (!text) return; var st = $('status');
      var data = { text: text };
      var files = photos.map(function (p) { return p.file; }).concat(papersOn.map(paperById).filter(function (p) { return p && p.file; }).map(function (p) { return p.file; }));
      try { if (files.length && navigator.canShare && navigator.canShare({ files: files })) data.files = files; } catch (e) {}
      if (window.toClaude) { window.toClaude(data, function () { st.textContent = 'Sent. Claude will make it and it shows up in the episode list.'; }); return; }
      if (navigator.share) navigator.share(data).then(function () { st.textContent = 'Sent. Claude will make it and it shows up in the episode list.'; }).catch(function (e) { if (e && e.name !== 'AbortError') fallback(text); });
      else fallback(text);
    });
    $('textme').addEventListener('click', function () {
      var text = req(); if (!text) return; var n = g('wt_req_to');
      if (!n) {
        var d = ($('mknum').value || '').replace(/\D/g, ''); if (d.length === 10) d = '1' + d;
        if (d.length < 11 || d.length > 15) { $('mknumbox').hidden = false; $('status').textContent = 'Type your 10-digit number first.'; $('mknum').focus(); return; }
        n = '+' + d; s2('wt_req_to', n); $('mknumbox').hidden = true;
      }
      location.href = 'sms:' + n + '?&body=' + encodeURIComponent(text);
    });
  })();
})();
