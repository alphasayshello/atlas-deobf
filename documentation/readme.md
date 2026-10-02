# atlas docs - start here

hey so this folder is just my notes on how the crack folder actually works. its all the auth stuff, the server calls, the old plugin stuff, and the bypass i added. everything is written lowercase on purpose cause it reads more chill that way.

quick heads up on casing:
in the real code a lot of stuff is uppercase like atlas-xxxx keys, promo-xxxxx-xxxxx codes, headers like x-atlas-sig, storage stuff like atlasmachineid, etc. in here i lowercased everything so there are zero caps. if you copy paste from here into code, fix the casing by looking at the real files. the real values live in crack/background.js, crack/extpay.js, crack/sidepanel/sidepanel.js and crack/sidepanel/atlas-shim.js.

what this extension even is:
its atlas for geoguessr. its a chrome side panel cheat. you open a geoguessr round (or openguessr, worldguessr, freeguessr, etc), it sniffs the real coords out of network traffic / google maps objects / iframes, shows them in the panel, and can auto place the pin + auto guess for you. paid thing normally, with free rounds to hook you.

file map (all inside crack/):
- manifest.json - permissions, sites it runs on, side panel setup, csp rules. basically what chrome allows it to do.
- background.js - the boss. all license checks, all server talk, free trial counting, google sign in, promo codes, telemetry. this is where 95% of the auth lives.
- extpay.js - tiny shim for the old extpay plugin. in this version its already mocked to just ask background.js if we are pro.
- sidepanel/sidepanel.js - all the ui. guess button, auto place, smart zoom, range, delays, settings, account page, stats, history, discord settings, all that.
- sidepanel/atlas-shim.js - fetch hijack. it catches any call to *.cloudfunctions.net and fakes it locally so the old firebase backend never gets hit.
- sidepanel/sidepanel.html - just the layout, loads extpay.js then atlas-shim.js then sidepanel.js in that order.
- geoguessr-content.js - content script, isolated world. holds coords in memory, talks to the page script over a messagechannel port.
- xhr_inject.js - runs in main world. hooks xhr, fetch, websocket, scans dom + google maps for lat/lng, sends coords + round results over the port.
- round_extract.js - tiny parser. takes geoguessr classic / duels json and pulls out score + distance per round.
- brand/worldmap.json + lakes.json - offline country shapes for local country lookup so it doesnt need server for that.

the short version of auth:
- license key like atlas-xxxxx gets posted to https://geoguessrcheats.com/api/validate-key with machine_id + hashed browser bits. server replies with json + ed25519 sig. extension only trusts it if the sig checks out with the hardcoded pubkey.
- once valid it stores a capability like exp + rounds_per_month + plan, plus a request_signing_key. every later log call is hmac signed with that key.
- no key = free mode. 7 rounds free, 14 if you sign in with google. counted locally with hmac tamper seal, plus anon pings to server.
- old system was extpay + firebase cloud functions (createuser, getuserusage, incrementguesscount, etc). thats still in sidepanel.js but atlas-shim.js fakes it now so it never leaves the browser.
- google sign in is via supabase oauth, then claim-key / manage-key to link or restore your atlas key.
- there is also a decoy trap: unlockpro / activateoffline / devunlock messages set you to lifetime locally but also snitch with a decoy_hit event if you still have a real key. dont touch those on a real install lol.

where to read next:
- auth.md - full new atlas auth, validate, hmac, supabase, promos, free limits, avatar, enrich, heartbeat.
- plugins.md - old extpay + firebase plugin auth, how sidepanel uses it, how the shim + extpay mock kill it, plus discord webhook.
- telemetry.md - every single thing sent to geoguessrcheats.com, when, what fields, anon vs authed.
- bypass.md - le crack.

how to load it to test:
- chrome -> extensions -> developer mode on -> load unpacked -> pick the crack folder.
- open www.geoguessr.com, start a round, open the side panel, hit guess. with bypass it should just work with no key, no sign in, usage shows like 0/999999 or unlimited.
- open devtools network tab for the service worker + side panel. you should see zero calls to geoguessrcheats.com or supabase or cloudfunctions.net. only geoguessr + google maps + discord if you set a webhook yourself.
