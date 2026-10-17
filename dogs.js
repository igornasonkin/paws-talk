/* Two little cartoon dogs wander across the round table while an episode plays.
   They sniff, wag, stretch, roll and nap, and leave paw prints that fade away.
   Decorative only: no clicks, hidden from screen readers, calm when reduced motion is on. */
(function () {
  var table = document.getElementById('table'), audio = document.getElementById('audio');
  if (!table || !audio) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cv = document.createElement('canvas');
  cv.className = 'dogs'; cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:2';   /* inline so it never depends on a cached stylesheet */
  var ctx = cv.getContext('2d');
  var W = 0, H = 0, dpr = 1, S = 1;           /* canvas size, pixel ratio, dog scale */
  var oval = { cx: 0, cy: 0, a: 1, b: 1 };     /* the tabletop ellipse */
  var playing = false, prints = [], last = 0, acc = 0;

  function attach() { if (cv.parentNode !== table) table.appendChild(cv); }
  new MutationObserver(attach).observe(table, { childList: true });
  attach();

  function measure() {
    var r = table.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    S = Math.max(0.85, Math.min(1.3, W / 400));
    var pct = table.classList.contains('multi') ? 0.82 : 0.66;
    var oh = H * pct, bottom = 6;
    oval.cx = W / 2; oval.a = W / 2; oval.b = oh / 2; oval.cy = H - bottom - oh / 2;
    dogs.forEach(function (d) { clampIn(d); });
    draw();
  }
  function inside(x, y, k) { var u = (x - oval.cx) / oval.a, v = (y - oval.cy) / oval.b; return u * u + v * v <= k * k; }
  function clampIn(d) {
    if (inside(d.x, d.y, 0.8)) return;
    d.x = oval.cx + (d.x - oval.cx) * 0.8; d.y = oval.cy + Math.max(0.5 * oval.b, (d.y - oval.cy) * 0.8);
  }
  function pickSpot(except) {
    for (var i = 0; i < 14; i++) {
      var x = oval.cx + (Math.random() * 2 - 1) * oval.a * 0.74;
      var y = oval.cy + (0.5 + Math.random() * 0.36) * oval.b;
      if (!inside(x, y, 0.8)) continue;
      if (except && Math.hypot(x - except.x, y - except.y) < 95 * S) continue;
      return { x: x, y: y };
    }
    return { x: oval.cx, y: oval.cy + 0.45 * oval.b };
  }

  var palettes = [
    { body: '#d9a05b', belly: '#efc88f', ear: '#a8672a', snout: '#efc88f', paw: '#d9a05b', name: 'gold' },
    { body: '#4b3b37', belly: '#4b3b37', ear: '#2c2220', snout: '#c99a6b', paw: '#f6efe6', chest: '#f6efe6', name: 'dark' }
  ];
  function mk(p, dir) { return { p: p, x: 0, y: 0, dir: dir, st: 'lie', t: 0, dur: 1, tx: 0, ty: 0, ph: Math.random() * 6, nap: true, step: 0, side: 1, hold: 0, wake: 0, lastIdle: '' }; }
  var dogs = [mk(palettes[0], 1), mk(palettes[1], -1)];

  function place() {
    dogs[0].x = oval.cx - oval.a * 0.42; dogs[0].y = oval.cy + 0.66 * oval.b; clampIn(dogs[0]);
    dogs[1].x = oval.cx + oval.a * 0.40; dogs[1].y = oval.cy + 0.6 * oval.b; clampIn(dogs[1]);
  }

  function setState(d, st, dur) { d.st = st; d.t = 0; d.dur = dur; }
  function goWalk(d, other) { var s = pickSpot(other); d.tx = s.x; d.ty = s.y; setState(d, 'walk', 99); }
  function nextAfterWalk(d, other) {
    var r = Math.random(), choices = [['sniff', 28], ['wag', 16], ['lie', 14], ['bow', 12], ['roll', 8], ['walk', 22]], tot = 0, i;
    choices = choices.filter(function (c) { return c[0] !== d.lastIdle; });
    choices.forEach(function (c) { tot += c[1]; }); r *= tot;
    for (i = 0; i < choices.length; i++) { r -= choices[i][1]; if (r <= 0) break; }
    var pick = (choices[Math.min(i, choices.length - 1)] || ['walk'])[0];
    d.lastIdle = pick;
    if (pick === 'sniff') setState(d, 'sniff', 2.2 + Math.random() * 1.6);
    else if (pick === 'wag') setState(d, 'wag', 2 + Math.random() * 1.6);
    else if (pick === 'lie') setState(d, 'lie', 4 + Math.random() * 3);
    else if (pick === 'bow') setState(d, 'bow', 2.2);
    else if (pick === 'roll') setState(d, 'roll', 2.8);
    else goWalk(d, other);
  }
  function afterIdle(d, other) { if (Math.random() < 0.85) goWalk(d, other); else nextAfterWalk(d, other); }

  function sleepAll() { dogs.forEach(function (d) { d.nap = true; setState(d, 'lie', 99); }); }
  function wakeAll() {
    dogs.forEach(function (d, i) { d.nap = false; d.wake = 0.35 + i * 0.8; setState(d, 'bow', 2); d.lastIdle = 'bow'; });
  }

  function update(dt) {
    var now = performance.now() / 1000;
    prints = prints.filter(function (p) { return now - p.t0 < 3.6; });
    dogs.forEach(function (d, i) {
      var other = dogs[1 - i];
      d.t += dt; d.ph += dt;
      if (d.nap) return;
      if (d.wake > 0) { d.wake -= dt; d.t = 0; return; }
      if (d.st === 'walk') {
        var dx = d.tx - d.x, dy = d.ty - d.y, dist = Math.hypot(dx, dy), sp = 26 * S * dt;
        if (dist <= sp + 1) { nextAfterWalk(d, other); return; }
        d.x += dx / dist * sp; d.y += dy / dist * sp * 0.7;
        if (Math.abs(dx) > 3) d.dir = dx > 0 ? 1 : -1;
        if (Math.hypot(other.x - d.x, other.y - d.y) < 40 * S) { goWalk(d, other); }
        d.step += sp;
        if (d.step > 15 * S) {
          d.step = 0; d.side = -d.side;
          prints.push({ x: d.x - d.dir * 4 * S, y: d.y + d.side * 3 * S, a: Math.atan2(dy, dx), t0: now, s: S });
          if (prints.length > 70) prints.shift();
        }
      } else if (d.t > d.dur) { afterIdle(d, other); }
    });
  }

  /* ---------- drawing ---------- */
  function ell(x, y, rx, ry, rot, fill) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, 6.2832); ctx.fillStyle = fill; ctx.fill(); }
  function leg(x1, y1, x2, y2, col, paw) {
    ctx.lineCap = 'round'; ctx.strokeStyle = col; ctx.lineWidth = 4.4;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ell(x2 + 0.6, y2, 3.1, 2.2, 0, paw || col);
  }
  function drawDog(d, nowS) {
    var p = d.p, st = d.st, t = d.t, ph = d.ph;
    var sy = 1, bodyY = -17, bodyRot = 0, headX = 0, headY = 0, headRot = 0, wag = 0, wagAmp = 0.35, eyes = 'open', tongue = false;
    var swing = 0, legsMode = 'stand', zz = false;
    if (st === 'walk') { swing = 1; wag = Math.sin(ph * 9) * 0.25; bodyY = -17 + Math.sin(ph * 12) * 0.9; tongue = ((ph | 0) % 5) === 0; }
    else if (st === 'sniff') {
      headY = 11; headX = 6; headRot = 0.5; wag = Math.sin(ph * 5) * 0.2; bodyRot = 0.05;
      swing = 0; headY += Math.sin(ph * 14) * 0.9;
    }
    else if (st === 'wag') { wag = Math.sin(ph * 22) * 0.75; wagAmp = 0.75; tongue = true; headRot = Math.sin(ph * 2) * 0.12; headY = -1; }
    else if (st === 'lie') {
      legsMode = 'lie'; bodyY = -8.5; headX = 3; headY = 11; headRot = 0.08;
      wag = d.nap ? Math.sin(ph * 1.6) * 0.1 : Math.sin(ph * 4) * 0.3;
      if (d.nap || (st === 'lie' && t > d.dur - 0.01)) eyes = 'closed';
      if (d.nap) zz = true; else if (Math.sin(ph * 0.9) > 0.92) eyes = 'closed';
    }
    else if (st === 'bow') {
      var u = Math.min(1, t / d.dur), e = Math.sin(Math.min(1, u * 1.15) * Math.PI);
      legsMode = 'bow'; bodyRot = 0.42 * e; bodyY = -17 + 3 * e; headY = 6 * e; headRot = -0.25 * e;
      wag = Math.sin(ph * 18) * 0.7; wagAmp = 0.7; tongue = e > 0.5;
    }
    else if (st === 'roll') {
      legsMode = 'roll'; bodyY = -8.5; headY = 10; headRot = 0.1; wag = 0;
      var q = t / d.dur;
      if (q < 0.22) sy = Math.cos(Math.PI * q / 0.22);
      else if (q < 0.78) sy = -1;
      else sy = -Math.cos(Math.PI * Math.min(1, (q - 0.78) / 0.22));
      tongue = q > 0.25 && q < 0.75;
    }
    /* blink */
    if (eyes === 'open' && Math.sin(nowS * 1.9 + d.x) > 0.985) eyes = 'closed';

    ctx.save();
    ctx.translate(d.x, d.y); ctx.scale(d.dir * S, S);
    /* shadow */
    ell(0, 0.5, 21 * (sy < 0 ? 1 : 1), 3.4, 0, 'rgba(60,25,10,.18)');
    var py = (legsMode === 'lie' || legsMode === 'roll') ? -7 : 0;   /* flip pivot for rolling */
    ctx.translate(0, py); ctx.scale(1, sy); ctx.translate(0, -py);

    /* tail (behind body) */
    var tb = { x: -13.5, y: bodyY - 3 };
    var up = (legsMode === 'lie' || legsMode === 'roll') ? 0.4 : 1;
    var tipx = tb.x - 9 * Math.cos(0.7 + wag * wagAmp * 1.2) , tipy = tb.y - 11 * up * Math.sin(0.9 + wag * 0.5) - 2;
    ctx.strokeStyle = p.body; ctx.lineWidth = 3.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(tb.x, tb.y); ctx.quadraticCurveTo(tb.x - 7, tb.y - 2 * up, tipx, tipy); ctx.stroke();

    ctx.save();
    /* body rotation about the shoulders (play bow) */
    if (bodyRot) { ctx.translate(10, -12); ctx.rotate(bodyRot); ctx.translate(-10, 12); }

    /* far legs first */
    var L = function (hx, k, off) { return Math.sin(ph * 12 + off) * 6 * k; };
    var hipY = bodyY + 3.5;
    if (legsMode === 'stand') {
      leg(-8 + L(0, swing, 3.1), hipY - 0.0, -9 + L(0, swing, 3.1) * 1.1, -1.2 - Math.max(0, Math.cos(ph * 12 + 3.1)) * 2.2 * swing, p.body, p.paw);
      leg(10 + L(0, swing, 0), hipY, 10 + L(0, swing, 0) * 1.1, -1.2 - Math.max(0, Math.cos(ph * 12)) * 2.2 * swing, p.body, p.paw);
    }
    /* body */
    ell(0, bodyY, 15.5, legsMode === 'lie' || legsMode === 'roll' ? 8 : 8.6, 0, p.body);
    if (p.name === 'gold') ell(1, bodyY + 3.4, 11, 4.4, 0, p.belly);
    if (p.chest) ell(11, bodyY + 1, 5, 6, 0, p.chest);
    /* near legs */
    if (legsMode === 'stand') {
      leg(-6 + L(0, swing, 0), hipY, -7 + L(0, swing, 0) * 1.1, -1.2 - Math.max(0, Math.cos(ph * 12)) * 2.2 * swing, p.body, p.paw);
      leg(12 + L(0, swing, 3.1), hipY, 12 + L(0, swing, 3.1) * 1.1, -1.2 - Math.max(0, Math.cos(ph * 12 + 3.1)) * 2.2 * swing, p.body, p.paw);
    } else if (legsMode === 'lie') {
      ell(-8, bodyY + 3, 7, 5, 0, p.body);                          /* haunch */
      leg(10, -5.5, 22, -2.6, p.body, p.paw); leg(8, -4.5, 19, -1.8, p.body, p.paw);
    } else if (legsMode === 'bow') {
      leg(-8, hipY, -8, -1.2, p.body, p.paw); leg(-5, hipY, -5, -1.2, p.body, p.paw);
      leg(11, -9, 17, -1.2, p.body, p.paw); leg(9, -9, 14, -1.2, p.body, p.paw);
    } else if (legsMode === 'roll') {
      var wig = Math.sin(ph * 15) * 3;
      ell(-8, bodyY + 3, 7, 5, 0, p.body);
      leg(-6, bodyY + 4, -9 + wig, bodyY + 15, p.body, p.paw); leg(-1, bodyY + 4, -2 - wig, bodyY + 16, p.body, p.paw);
      leg(9, bodyY + 4, 11 - wig, bodyY + 15, p.body, p.paw); leg(14, bodyY + 4, 17 + wig, bodyY + 14, p.body, p.paw);
    }

    /* head */
    var hx = 17 + headX, hy = bodyY - 9 + headY;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(headRot);
    ell(0, 0, 8, 7.4, 0, p.body);                                     /* skull */
    ell(7.2, 2.3, 6.2, 4.3, 0.12, p.snout);                           /* snout */
    ell(12.3, 0.8, 2.1, 1.7, 0, '#2a1a16');                           /* nose */
    ell(-3.2, -1.2, 3.4, 6.4, 0.25 + (st === 'walk' ? Math.sin(ph * 12) * 0.12 : 0) + (st === 'sniff' ? 0.2 : 0), p.ear); /* ear */
    if (eyes === 'closed') {
      ctx.strokeStyle = '#2a1a16'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(3.6, -1.6, 1.6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    } else { ell(3.8, -1.8, 1.5, 1.7, 0, '#2a1a16'); ell(4.3, -2.3, 0.5, 0.5, 0, '#fff'); }
    if (tongue) { ell(8.8, 6.6, 1.9, 3, 0.1, '#f08aa6'); }
    ctx.restore();
    ctx.restore();                                                    /* body rotation */
    ctx.restore();                                                    /* dog transform */

    if (zz) {                                                         /* sleepy z's */
      var zt = (nowS * 0.5 + d.x * 0.01) % 1;
      ctx.save(); ctx.font = 'italic 700 ' + Math.round(11 * S) + 'px Georgia,serif'; ctx.fillStyle = 'rgba(91,10,60,' + (0.75 * (1 - zt)) + ')';
      ctx.fillText('z', d.x + d.dir * 22 * S + zt * 8, d.y - 30 * S - zt * 18);
      ctx.fillText('z', d.x + d.dir * 28 * S + zt * 8, d.y - 38 * S - zt * 14);
      ctx.restore();
    }
  }
  function drawPrint(p, now) {
    var age = now - p.t0, a = Math.max(0, 1 - age / 3.4); a = a * a * 0.5;
    if (a <= 0.01) return;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.scale(p.s, p.s * 0.8);
    ctx.fillStyle = 'rgba(92,48,22,' + a + ')';
    ctx.beginPath(); ctx.ellipse(0, 0, 3.1, 2.5, 0, 0, 6.2832); ctx.fill();
    [[-3.6, -3.4], [-1.2, -4.8], [1.5, -4.8], [3.9, -3.4]].forEach(function (c) {
      ctx.beginPath(); ctx.arc(c[0] + 2.2, c[1] * 0.9 + 0.2, 1.35, 0, 6.2832); ctx.fill();
    });
    ctx.restore();
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    var now = performance.now() / 1000;
    prints.forEach(function (p) { drawPrint(p, now); });
    dogs.slice().sort(function (a, b) { return a.y - b.y; }).forEach(function (d) { drawDog(d, now); });
  }

  /* ---------- loop ---------- */
  function frame(ts) {
    requestAnimationFrame(frame);
    var t = ts / 1000, dt = Math.min(0.05, t - (last || t)); last = t;
    var idle = !playing && !prints.length;
    if (idle) { acc += dt; if (acc < 0.1) return; dt = acc; acc = 0; }
    update(dt); draw();
  }
  audio.addEventListener('play', function () { if (!playing) { playing = true; if (!reduce) wakeAll(); } });
  audio.addEventListener('pause', function () { playing = false; sleepAll(); });
  audio.addEventListener('ended', function () { playing = false; sleepAll(); });

  new ResizeObserver(function () { measure(); }).observe(table);
  measure(); place(); sleepAll(); draw();
  if (!reduce) requestAnimationFrame(frame);
  window.__dogs = { dogs: dogs, wake: wakeAll, sleep: sleepAll };
})();
