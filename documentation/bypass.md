# bypass notes - what i changed and why

so yeah the crack folder before wasnt actually cracked lol. extpay + firebase were mocked but the new atlas license server was still enforced. this bypass makes it always pro + silent. all edits are in crack/, deobfuscated/ left untouched for reference.

## idea in one line

fake the capability to unlimited lifetime, short-circuit every check to true/allowed, and block every fetch to atlas + supabase so nothing phones home. sidepanel already thinks firebase is real cause of the shim, so we just feed it unlimited there too.

## background.js changes

file: crack/background.js

1. top bypass block after extpay start:
   - const atlas_bypass_enabled = true
   - function atlasfakecapability() returns { exp: 4102444800, rounds_per_month: -1, plan: "lifetime" } (thats year 2100, unlimited)
   - fetch wrapper: if url includes geoguessrcheats.com or ynqcxfjxirfqmspfjrws.supabase.co -> reject with blocked by bypass. else passthrough. installed once via globalthis.__atlasbypassfetchinstalled flag. catches promo, avatar, claim, refresh, any missed log-event.

2. validatelicensekey(): first line returns fake valid { valid true, plan lifetime, expires_at 4102444800, capability fakecap, request_signing_key dummy aaaa..., __status 200, __signed null }. no network, always passes. persistlicensestate then stores it like a real lifetime key.

3. getverifiedlicensecapability(): returns promise.resolve(fakecap) immediately. skips ed25519 re-verify + expiry check. so getlicense message always maps to pro true, tier unlimited, rpm -1, plan lifetime.

4. getlicense handler: explicit if bypass -> sendresponse { pro true, tier unlimited, rpm -1, plan lifetime } + return true. double safety even if the function above breaks.

5. getfreeusage / consumefreeround handler: if bypass -> sendresponse { used 0, limit 999999, allowed true } + return true. never checks tampered, never touches promo, never sends anon_round.

6. readfreeusagerecord(): returns { used 0, tampered false }. writefreeusagerecord(): returns 0. so even if someone bypasses the handler, counter stays zero.

7. telemetry kill list, all early return if bypass:
   - reportbotround, reportanonymousevent, reportapplaunch, reportroundresult, reportsessionsummary, reportavatarequipped, reportfeatureuse, reportdecoyhit
   - enrichlocationdetails returns promise.resolve({ ok false }) so no lat/lng enrich calls.
   - handledecoyunlock keeps local lifetime set but skips reportdecoyhit when bypass on. so poking unlockpro wont snitch.

8. google / promo / link stubs:
   - performgooglesignin(): fakes local lifetime save (atlas-local-bypass key, valid true, etc) + returns { ok true, email local@atlas, claim restored, plan lifetime }. no oauth popup, no supabase.
   - claimlicensekey(): returns { claim linked, plan lifetime }
   - fetchaccountkeyfromserver(): returns atlas-local-bypass string
   - refreshsupabaseaccesstoken(): returns null (no-op)
   - linkstoredkeytoaccount(): returns immediately
   - postpromorequest(): returns { status 0, data null } (redeem will show network/refused, but who cares, you have unlimited anyway)
   - consumepromoround(): returns { allowed true, reason ok, remaining 999999 }

net effect: validate always passes, capability always unlimited, free always allowed, telemetry silent, google faked, promo irrelevant, heartbeat re-validates fake + does nothing else.

## extpay.js changes

file: crack/extpay.js

- getuser() now ignores background result and always resolves paid true, subscriptionstatus active, not cancelled/expired, email local@atlas, userid local-user, dates 2024 -> 2099. even if sendmessage fails, still resolves pro.
- why: sidepanel checkpremiumaccess, updatepaymentui, substate all key off user.paid. this guarantees pro ui even before background responds.

## atlas-shim.js changes

file: crack/sidepanel/atlas-shim.js

- fetchlicenseandusagestate() now first line returns promise.resolve({ tier unlimited, rpm -1, plan lifetime, freeused 0, freelimit 999999, monthkey current, monthrounds 0 }). dead code below kept for reference but never runs.
- so getuserusage + incrementguesscount + processgeolocation all build unlimited usage { current 0, limit 999999, plantype pro } with no storage reads or background calls.
- window.fetch override already faked cloudfunctions.net locally, this just makes it unconditional.

## sidepanel.js changes

file: crack/sidepanel/sidepanel.js

- performintegritycheck(): first line return true. kills storage mismatch + paid without email + future date checks. old version would log integrity violation if storage didnt match mock.
- checkpremiumaccess(): first line return true. gates auto submit + guess cycle. now always passes, no status spam.
- _chargeguesscount(): first line return { usage: unlimited pro 0/999999 }. skips getextpayapikey + fetch incrementguesscount + 429 handling + modal. guess cycle never sees limited true.
- everything else left alone: runguesscycle still calls getextpayuser (now always pro non-anon) -> checkpremiumaccess (true) -> extractcoordinates -> processextractedcoordinates -> performautoplace. free path with signin prompt is now unreachable cause userid is local-user, not anonymous.
- loadusageinformation still works via shim, shows unlimited bar. updateusagedisplay treats 999999 / -1 / pro as unlimited, width 0% + is-unlimited class.

## what still works offline

- coords sniffing: xhr_inject hooks xhr/fetch/websocket + dom google maps scan every 1500ms + iframe regex + leaflet map hook. no server needed.
- country lookup: brand/worldmap.json + lakes.json point-in-ring locally. enrich server fallback not needed.
- auto place: google maps setcenter/setzoom/click trigger + leaflet fire click + flyto/panto dance. all local dom.
- history/stats: atlashistory in storage, 300 cap (configurable 50/200/1000). export json/csv, clear data. local only.
- discord webhook: user webhook only, untouched. set it if you want guess pings in discord.
- themes, coords format decimal/dms, precision, autocopy, density, accent, launcher button, platform toggles. all local prefs.

## what no longer sends

- zero post to geoguessrcheats.com/api/* (validate, log-event, claim, manage, avatar, promo)
- zero post to supabase auth (authorize via popup blocked, refresh blocked)
- zero real post to cloudfunctions.net (all faked by shim + _chargeguesscount stub)
- only remaining network: geoguessr.com game + profile/avatar json (needed for cheat to work), google maps tiles/api, gravatar images, discord webhook if you configured one.

## how to test

1. chrome extensions, developer mode on, load unpacked -> select crack folder (not deobfuscated).
2. open service worker devtools: should see no fetch errors to atlas (they are caught + ignored, promise rejections swallowed by .catch(()=>{}) everywhere).
3. open www.geoguessr.com, start any round, open side panel (alt+g or launcher button).
4. account page should say pro mode enabled / unlimited / 0/999999 or similar, no upgrade wall.
5. hit guess: coords appear, map marker moves, pin auto places if auto place on. no sign in prompt, no usage limit modal.
6. check storage: chrome.storage.local.get -> atlaskeyvalid true or getlicense returns pro true tier unlimited. atlastrialstate stays 0. atlasinstallblocked should be unset/false.
7. network tab filter: geoguessrcheats -> empty. supabase -> empty. cloudfunctions -> empty (or only fake responses, no real network timing).
8. click google sign in button if you want: should instantly say signed in as local@atlas + license restored, no popup. thats the fake.

## if you need to update this later

- atlas changes pubkey or adds new event_type? just keep the early returns, new reportx will need stubbing. easiest is keep fetch blocker as backstop.
- they add new message action like validatekeyv2? stub it same way: return pro unlimited in onmessage router.
- sidepanel adds new premium gate calling checkpremiumaccess? already always true, covered.
- they move to remote config / kill switch via anon_launch blocked true? we block anon_launch entirely so server cant set atlasinstallblocked. if they add new block flag, stub that storage read in geoguessr-content.js (isinstallblocked check).
- keep deobfuscated/ as clean reference. diff crack vs deobfuscated to see bypass: diff -r crack deobfuscated. should only show the bypass lines.

thats it. enjoy lol. if something breaks, check console for blocked by bypass rejections - those are intentional.
