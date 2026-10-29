(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var PHONE = '+19253512104';
  var mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function longD(v) { if (!v) return ''; var p = v.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' }); }
  function text() {
    var name = $('m-name').value.trim(), dogs = $('m-dogs').value.trim(), kind = (document.querySelector('input[name=m-kind]:checked') || {}).value || 'Boarding';
    var from = longD($('m-from').value), to = longD($('m-to').value), note = $('m-note').value.trim();
    var L = ['Hi TurtleRock Paws! I would like to arrange a meet and greet.'];
    if (name) L.push('My name: ' + name);
    if (dogs) L.push('My dog: ' + dogs);
    L.push('I need: ' + kind);
    if (from || to) L.push('Dates: ' + (from || '?') + (to ? ' to ' + to : ''));
    if (note) L.push('Good to know: ' + note);
    return L.join('\n');
  }
  function say(m) { $('m-msg').textContent = m; }
  function copy(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(function () { say('Copied. Paste it into a text to 925-351-2104.'); }, function () { say(t); });
    say(t);
  }
  $('m-send').addEventListener('click', function () {
    if (!$('m-dogs').value.trim()) { say('Please add your dog\'s name and age.'); $('m-dogs').focus(); return; }
    if (!mobile) { copy(text()); say('On a computer: the text is copied. Send it from your phone to 925-351-2104.'); return; }
    location.href = 'sms:' + PHONE + '?&body=' + encodeURIComponent(text());
  });
  $('m-copy').addEventListener('click', function () { copy(text()); });
  var t = new Date(); var iso = t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2);
  $('m-from').min = iso; $('m-to').min = iso;
  $('m-from').addEventListener('change', function () { $('m-to').min = this.value || iso; });
  $('sharebtn').addEventListener('click', function () {
    var url = 'https://igornasonkin.github.io/paws-talk/paws/?s=share';
    if (navigator.share) navigator.share({ title: 'TurtleRock Paws', text: 'In-home dog boarding in Turtle Rock, Irvine', url: url }).catch(function () {});
    else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { $('sharebtn').textContent = 'Link copied'; }, function () {});
  });
})();
