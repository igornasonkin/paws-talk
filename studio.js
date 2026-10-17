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

  /* send */
  function plan() {
    var tv = $('topic').value, note = $('note').value.trim();
    var names = seated.map(function (id) { var p = byId(id); return p.name + ' (' + p.role + ')'; });
    var topic = tv === 'other' ? '(my own idea, below)' : (tv || '(not chosen)');
    return "New episode request for Today's Walk, Let's Talk\n\nAt the table (" + seated.length + '): ' + (names.join(', ') || 'not chosen') +
      '\nTopic: ' + topic + (note ? '\nMy idea or question: ' + note : '') + '\nDog photos attached: ' + photos.length;
  }
  $('send').addEventListener('click', function () {
    var st = $('status');
    if (seated.length < 2) { st.textContent = 'Please seat at least two voices.'; return; }
    if (!$('topic').value && !$('note').value.trim()) { st.textContent = 'Please pick a topic or write your own idea.'; return; }
    var text = plan(), data = { title: "Today's Walk, Let's Talk: episode request", text: text };
    var files = photos.map(function (p) { return p.file; });
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
})();
