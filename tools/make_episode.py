#!/usr/bin/env python3
"""Build one "Today's Walk, Let's Talk" episode from a script.json, with the free Kokoro voices.

  python3 make_episode.py script.json                 # test build into out/ (nothing published)
  python3 make_episode.py script.json --publish ..    # also add it to ../episodes.json, ../feed.xml and copy the mp3

script.json:
  {"id": "005" (optional, next number if missing), "title": "...", "date": "YYYY-MM-DD", "kind": "Table talk",
   "topic": "...", "summary": "...", "cast": ["andria", "hal", ...], "lines": [["andria", "text"], ...],
   "sources": {...same shape as episodes.json...}, "links": [], "hero": "table.jpg?v=2" (optional), "heroAlt": "..."}

Needs: pip install kokoro-onnx soundfile numpy; ffmpeg. The model files are downloaded once from GitHub releases.
The build REFUSES to publish when a standing rule is broken (see checks()).
"""
import argparse, datetime as dt, html, json, os, re, shutil, subprocess, sys, tempfile, urllib.request
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 24000
MODEL_DIR = os.environ.get('KOKORO_DIR', os.path.expanduser('~/kokoro'))
MODEL_URL = 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/'
SITE = 'https://igornasonkin.github.io/paws-talk/'

# More hard stops (private details) live in the private episode-maker instructions, not in public code.
BANNED = [
    (r'\brover\b', 'names another platform'),
    (r'\b(certified|licensed|board-certified|years of experience)\b', 'credential or experience claim'),
    (r'\bapproved\b', 'says something is "approved"'),
]


def checks(s):
    """Standing rules. Returns a list of problems (empty = OK to publish)."""
    p, lines = [], s.get('lines', [])
    if len(lines) < 4:
        return ['script has fewer than 4 lines']
    for i in (0, 1):
        if 'ai voice' not in lines[i][1].lower():
            p.append('line %d must say "AI voice" (AI disclosure up front)' % (i + 1))
    if not any('ai voices' in l[1].lower() for l in lines[-4:]):
        p.append('one of the last four lines must say "AI voices"')
    cast = s.get('cast', [])
    for who, _ in lines:
        if who not in cast:
            p.append('speaker %s is not in the cast' % who)
    text = ' '.join([s.get('title', ''), s.get('summary', '')] + [l[1] for l in lines])
    for rx, why in BANNED:
        if re.search(rx, text, re.I):
            p.append('hard stop: ' + why)
    return sorted(set(p))


def model():
    os.makedirs(MODEL_DIR, exist_ok=True)
    for f in ('kokoro-v1.0.onnx', 'voices-v1.0.bin'):
        path = os.path.join(MODEL_DIR, f)
        if not os.path.exists(path) or os.path.getsize(path) < 1000000:
            print('downloading', f, '...', flush=True)
            urllib.request.urlretrieve(MODEL_URL + f, path)
    from kokoro_onnx import Kokoro
    return Kokoro(os.path.join(MODEL_DIR, 'kokoro-v1.0.onnx'), os.path.join(MODEL_DIR, 'voices-v1.0.bin'))


def ff(inp, out, af):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', inp, '-af', af, '-ar', str(SR), '-ac', '1', out], check=True)


def say(k, v, text, tmp, n):
    a, sr = k.create(text, voice=v['kokoro'], speed=v.get('speed', 1.0), lang=v.get('lang', 'en-us'))
    raw = os.path.join(tmp, 'l%03d.wav' % n)
    sf.write(raw, a, sr)
    filt = []
    pitch = v.get('pitch', 1.0)
    if abs(pitch - 1) > 0.001:
        filt.append('asetrate=%d,aresample=%d,atempo=%.5f' % (round(sr * pitch), SR, 1 / pitch))
    else:
        filt.append('aresample=%d' % SR)
    if v.get('extra'):
        filt.append(v['extra'])
    out = os.path.join(tmp, 'p%03d.wav' % n)
    ff(raw, out, ','.join(filt))
    x, _ = sf.read(out, dtype='float32')
    x = np.trim_zeros(np.where(np.abs(x) < 1e-4, 0, x)) if np.any(np.abs(x) >= 1e-4) else x
    rms = np.sqrt(np.mean(x ** 2)) + 1e-9
    return x * (10 ** (-21 / 20) / rms)   # every voice at about the same loudness


def wav(path):
    x, sr = sf.read(path, dtype='float32')
    if x.ndim > 1:
        x = x.mean(axis=1)
    assert sr == SR, path
    return x


def build(s, outdir):
    V = json.load(open(os.path.join(HERE, 'voices.json')))['voices']
    k = model()
    tmp = tempfile.mkdtemp()
    opener, closing = wav(os.path.join(HERE, 'theme', 'opener.wav')), wav(os.path.join(HERE, 'theme', 'closing.wav'))
    parts, t, times, prev = [opener, np.zeros(int(0.25 * SR), 'float32')], len(opener) / SR + 0.25, [], None
    for n, (who, text) in enumerate(s['lines']):
        if prev is not None:
            gap = 0.30 if who == prev else 0.50
            parts.append(np.zeros(int(gap * SR), 'float32')); t += gap
        times.append(round(t, 2))
        x = say(k, V[who], text, tmp, n)
        parts.append(x); t += len(x) / SR; prev = who
        print('  %3d/%d %-8s %6.1fs' % (n + 1, len(s['lines']), who, t), flush=True)
    parts += [np.zeros(int(0.7 * SR), 'float32'), closing]
    mix = np.concatenate(parts)
    os.makedirs(outdir, exist_ok=True)
    w = os.path.join(tmp, 'mix.wav'); sf.write(w, mix, SR)
    mp3 = os.path.join(outdir, 'ep%s.mp3' % s['id'])
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', w, '-af', 'alimiter=limit=0.668:level=false', '-ar', str(SR), '-ac', '1',
                    '-codec:a', 'libmp3lame', '-b:a', '56k', mp3], check=True)
    dur = round(len(mix) / SR, 1)
    shutil.rmtree(tmp, ignore_errors=True)
    ep = {'id': s['id'], 'title': s['title'], 'date': s['date'], 'duration': dur, 'summary': s['summary'], 'audio': 'ep%s.mp3' % s['id'],
          'kind': s.get('kind', 'Table talk'), 'topic': s.get('topic', s['title']),
          'cast': [{'id': c, 'name': V[c]['name'], 'role': V[c]['role']} for c in s['cast']],
          'links': s.get('links', []),
          'lines': [{'who': w_, 't': times[i], 'text': tx} for i, (w_, tx) in enumerate(s['lines'])]}
    for f in ('sources', 'hero', 'heroAlt'):
        if s.get(f):
            ep[f] = s[f]
    json.dump(ep, open(os.path.join(outdir, 'ep%s.json' % s['id']), 'w'), indent=1, ensure_ascii=False)
    print('built', mp3, '%.1f s' % dur, os.path.getsize(mp3), 'bytes')
    return ep, mp3


def mmss(d):
    d = int(round(d)); return '%d:%02d' % (d // 60, d % 60)


def feed_item(ep, size):
    d = dt.datetime.strptime(ep['date'], '%Y-%m-%d').replace(hour=12)
    desc = html.escape(ep['summary'] + " AI voices sharing general information, not veterinary advice. For your dog's health, ask your vet.", quote=False)
    return ('<item>\n      <title>%s</title>\n      <link>%s?ep=%s&amp;s=feed</link>\n      <guid isPermaLink="false">paws-talk-%s</guid>\n'
            '      <pubDate>%s 12:00:00 -0700</pubDate>\n      <description>%s</description>\n      <itunes:summary>%s</itunes:summary>\n'
            '      <enclosure url="https://op3.dev/e/igornasonkin.github.io/paws-talk/%s" length="%d" type="audio/mpeg"/>\n'
            '      <itunes:duration>%s</itunes:duration>\n      <itunes:episode>%d</itunes:episode>\n      <itunes:explicit>false</itunes:explicit>\n    </item>\n') % (
        html.escape(ep['title'], quote=False), SITE, ep['id'], ep['id'], d.strftime('%a, %d %b %Y'), desc, desc, ep['audio'], size,
        mmss(ep['duration']), int(ep['id']))


def sync_feed(repo, today=None):
    """Add a feed item for every episode whose date has arrived and that is not in feed.xml yet (newest first)."""
    today = today or dt.date.today().isoformat()
    f = os.path.join(repo, 'feed.xml'); x = open(f).read()
    eps = json.load(open(os.path.join(repo, 'episodes.json')))['episodes']
    added = []
    for ep in sorted(eps, key=lambda e: (e['date'], e['id'])):
        if ep['date'] > today or ('paws-talk-%s</guid>' % ep['id']) in x:
            continue
        i = x.index('<item>') if '<item>' in x else x.index('</channel>')
        x = x[:i] + feed_item(ep, os.path.getsize(os.path.join(repo, ep['audio']))) + '    ' + x[i:]
        added.append(ep['id'])
    open(f, 'w').write(x)
    return added


def publish(ep, mp3, repo):
    shutil.copy(mp3, os.path.join(repo, ep['audio']))
    p = os.path.join(repo, 'episodes.json'); d = json.load(open(p))
    d['episodes'] = [e for e in d['episodes'] if e['id'] != ep['id']] + [ep]
    d['episodes'].sort(key=lambda e: e['id'])
    json.dump(d, open(p, 'w'), indent=1, ensure_ascii=False)
    f = os.path.join(repo, 'feed.xml'); x = open(f).read()
    x = re.sub(r'<item>\s*<title>[^<]*</title>\s*<link>[^<]*</link>\s*<guid isPermaLink="false">paws-talk-%s</guid>.*?</item>\s*' % ep['id'], '', x, flags=re.S)
    open(f, 'w').write(x)
    added = sync_feed(repo)
    print('published into', repo, '(episodes.json, %s); feed items added: %s' % (ep['audio'], added or 'none yet, the date has not arrived'))


def next_id(repo):
    try:
        ids = [int(e['id']) for e in json.load(open(os.path.join(repo, 'episodes.json')))['episodes']]
        return '%03d' % (max(ids) + 1)
    except Exception:
        return '001'


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('script'); ap.add_argument('--publish', metavar='REPO'); ap.add_argument('--out', default=os.path.join(HERE, 'out'))
    ap.add_argument('--check-only', action='store_true'); ap.add_argument('--sync-feed', metavar='REPO', help='only add feed items for episodes whose date has arrived')
    a = ap.parse_args()
    if a.sync_feed:
        print('feed items added:', sync_feed(a.sync_feed)); sys.exit(0)
    s = json.load(open(a.script))
    if not s.get('id'):
        s['id'] = next_id(a.publish or os.path.dirname(HERE))
    probs = checks(s)
    for q in probs:
        print('RULE PROBLEM:', q)
    if a.check_only:
        sys.exit(1 if probs else 0)
    if probs and a.publish:
        sys.exit('Refusing to publish until the rule problems above are fixed.')
    ep, mp3 = build(s, a.out)
    if a.publish:
        publish(ep, mp3, a.publish)
