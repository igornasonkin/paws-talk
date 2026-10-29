# Episode tools for "Today's Walk, Let's Talk"

These files make the episodes. Nothing here runs on the website.

- `pick_topic.py ..  [YYYY-MM-DD]` picks the day's calm topic at random, skipping topics already made. Fridays are Journal Club.
- `make_episode.py script.json --publish ..` records a script with the free Kokoro voices (`voices.json`), adds the show's opening and closing music (`theme/`), and adds the episode to `../episodes.json` and `../feed.xml`. An episode dated in the future waits: the app shows it under "Coming up" until its date, and the feed adds it on that day (`make_episode.py --sync-feed ..`).


The full step-by-step procedure, the Legal Desk review and the character guides are kept privately in the owner's Claude account (the "walk-talk-episode-maker" skill), not in this public folder.
