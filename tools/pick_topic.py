#!/usr/bin/env python3
"""Pick today's calm topic at random (the same answer all day), skipping topics already made.
  python3 pick_topic.py ../paws-talk [YYYY-MM-DD]
Prints JSON: {"date", "kind", "topic", "group", "cast"}. Fridays (or the --jc-day) are Journal Club."""
import json, os, random, re, sys, datetime as dt
HEAVY = re.compile(r"death|dying|grief|grieving|goodbye|hospice|palliative|euthan|cancer|oncolog|biops|tumou?r|poison|toxic|\bbite|attack|aggress|recall|cruel|neglect|emergency|seizure|epilep|bloat|heatstroke|danger|cloning|stem cell|anti-aging|cannabi|\bcbd\b|prong|coyote|rattlesnake|biosecurity|lawsuit|disease|cushing|cruciate|shelter crisis|no-kill|tail docking|matting pain|kennel cough|end-of-life|loss\b|surgery|import rescues|parasite|vaccin|supplements|over-vaccination|anticipatory|finding peace|medic|pill|drug|probiotic|osteosarcoma|lymphoma|treatment|quality of life|toxin|injur|fear|anxiety|separation|rescue|shelter|puppy mill|ban|cropping|flat-faced|should we continue|cruel|neglect|lost|missing|stolen|heat|hot pavement|wildlife|snake|foxtail", re.I)
# Automatic picks come only from the calmest groups (Igor can still choose any topic himself in the planner or Studio).
SAFE_GROUPS = re.compile(r"^(Behavior & training|Behavior, psychology & training|Irvine & SoCal|Travel & boarding|Fun & culture|Grooming, care & daily lifestyle|Boarding, daycare & socialization|Genetics, evolution & breed history|Culture, history & famous canines|Lifestyle, gear, training & quirks|Today's picks from the table|Human-dog culture, news & society|Breeds & genetics)$", re.I)
SCIENCE = re.compile(r"genetic|psycholog|behavior", re.I)
GUESTS = [(r"food|nutrition", ["clara", "mike"]), (r"behavior|psycholog", ["leo", "ed"]), (r"irvine", ["charles", "rosie"]),
          (r"breed|genetic", ["bea", "mike"]), (r"travel|boarding|daycare", ["rosie", "ed"]), (r"grooming", ["judy", "rosie"]),
          (r"health|veterin|special needs", ["clara", "leo"]), (r"gear|lifestyle", ["ed", "judy"]),
          (r"culture|history|fun|famous", ["charles", "bea"]), (r"today", ["rosie", "judy"])]
repo = sys.argv[1]; day = sys.argv[2] if len(sys.argv) > 2 else dt.date.today().isoformat()
d = dt.date.fromisoformat(day)
topics = json.load(open(os.path.join(repo, 'topics.json')))['groups']
made = {(e.get('topic') or e['title']).lower() for e in json.load(open(os.path.join(repo, 'episodes.json')))['episodes']}
jc = d.weekday() == 4
pool = [(g['group'], t) for g in topics if SAFE_GROUPS.search(g['group']) for t in g['topics']
        if not HEAVY.search(t) and t.lower() not in made and (not jc or SCIENCE.search(g['group']))]
random.seed(day)
group, topic = random.choice(pool)
cast = ["andria", "hal", "mike", "leo", "ed"] if jc else next((["andria", "hal"] + c for rx, c in GUESTS if re.search(rx, group + ' ' + topic, re.I)), ["andria", "hal", "ed", "rosie"])
print(json.dumps({"date": day, "kind": "Journal Club" if jc else "Table talk", "topic": topic, "group": group, "cast": cast,
                  "note": "Journal Club: find one real peer-reviewed dog paper on this theme (or one in the news this week), full text free to read." if jc else ""}, indent=1))
