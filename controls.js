(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var LS = null; try { LS = localStorage; } catch (e) {}
  function g(k) { try { return LS ? LS.getItem(k) : null; } catch (e) { return null; } }
  function s(k, v) { try { if (LS) LS.setItem(k, v); } catch (e) {} }
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  var st;
  function say(m) { var n = $('status'); n.textContent = m; n.classList.add('on'); clearTimeout(st); st = setTimeout(function () { n.classList.remove('on'); }, 5000); }

  $('notowner').hidden = g('wt_owner') === '1' || g('wt_me') === '1';
  $('beowner').addEventListener('click', function () { s('wt_owner', '1'); $('notowner').hidden = true; say('Owner tools are on for this phone.'); });

  // Every instruction goes to the Claude app through the share sheet (Claude cannot read texts).
  function send(text) {
    if (navigator.share) { navigator.share({ text: text }).catch(function () {}); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { say('Copied. Open the Claude app and paste it into a chat.'); }, function () { say(text); });
    else say(text);
  }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-say]'); if (b) send(b.getAttribute('data-say')); });

  $('usepaper').addEventListener('click', function () {
    var u = $('paper').value.trim();
    if (!/^https?:\/\/\S+/.test(u)) { say('Please paste the full link first, starting with https://'); $('paper').focus(); return; }
    send('Walk & Talk control: use this paper for the next Friday Journal Club: ' + u + ' (read the full text if it is free; if not, tell me the options).');
  });

  function to12(hhmm) { var p = hhmm.split(':'), h = +p[0], m = p[1]; return (h % 12 || 12) + ':' + m + (h < 12 ? ' AM' : ' PM'); }

  function job(j) {
    var d = el('div', 'job' + (j.on ? '' : ' off'));
    d.appendChild(el('h3', null, j.title));
    d.appendChild(el('p', 'when', j.when));
    d.appendChild(el('span', 'state', j.on ? 'ON' : 'OFF'));
    d.appendChild(el('p', null, j.what));
    var row = el('div', 'btns');
    var now = el('button', 'big', 'Do it now'); now.type = 'button';
    now.addEventListener('click', function () { send('Walk & Talk control: run the scheduled task "' + j.name + '" now.'); });
    var tog = el('button', 'big alt', j.on ? 'Turn off' : 'Turn on'); tog.type = 'button';
    tog.addEventListener('click', function () { send('Walk & Talk control: turn ' + (j.on ? 'OFF' : 'ON') + ' the scheduled task "' + j.name + '".'); });
    row.appendChild(now); row.appendChild(tog); d.appendChild(row);
    var tr = el('div', 'timerow');
    var lab = el('label', 'lbl', 'New time'); var tin = el('input', 'inp'); tin.type = 'time'; tin.id = 't-' + j.id; lab.htmlFor = tin.id;
    var tb = el('button', 'big alt', 'Change the time'); tb.type = 'button';
    tb.addEventListener('click', function () {
      if (!tin.value) { say('Choose a time first.'); tin.focus(); return; }
      send('Walk & Talk control: change the time of the scheduled task "' + j.name + '" to ' + to12(tin.value) + ' Pacific time, same days as now.');
    });
    tr.appendChild(lab); tr.appendChild(tin); tr.appendChild(tb); d.appendChild(tr);
    return d;
  }

  fetch('controls.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (c) {
    $('updated').textContent = 'As last set on ' + new Date(c.updated + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + '. Times are Pacific time.';
    var jz = $('jobs'); (c.jobs || []).forEach(function (j) { jz.appendChild(job(j)); });
    var iz = $('ideas');
    (c.ideas || []).forEach(function (t) {
      var li = el('li'); li.appendChild(el('p', null, t));
      var b = el('button', 'big alt', 'Let’s do this one'); b.type = 'button';
      b.addEventListener('click', function () { send('Walk & Talk control: let’s work on this item from my ideas list: "' + t + '". Tell me the first step.'); });
      li.appendChild(b); iz.appendChild(li);
    });
  }).catch(function () { say('Could not load the list. Check the connection and open this page again.'); });
})();
