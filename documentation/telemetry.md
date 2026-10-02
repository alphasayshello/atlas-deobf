# everything sent to the server, event by event

all of this is post https://geoguessrcheats.com/api/log-event unless noted. content-type application/json. authed ones add x-atlas-sig hmac header (see auth.md). anon ones send anon true + machine_id instead. background.js is the sender, xhr_inject.js + geoguessr-content.js are the collectors.

quick legend:
- machine_id = atlasmachineid hex, always sent anon side, never authed side (key is the id there)
- browser = chrome / edge / opera / firefox / other from useragent sniff
- client = extension always
- v = manifest version like 1.6.5

## anon_launch

when: chrome.runtime.onstartup if no key+signingkey, also startup reportapplaunch fallback. basically every browser restart for free users.
payload anon: { anon true, event_type anon_launch, machine_id, client extension, browser, v }
server can reply { blocked true } -> saved as atlasinstallblocked true -> geoguessr-content.js drops all coords. so server can brick free installs remotely lol.

## anon_install

when: chrome.runtime.oninstalled reason install. one time.
same shape as anon_launch but event_type anon_install. plus it opens atlas site in a tab + sets uninstall url to atlas site + defaults smartzoom false, rangeenabled false.

## anon_round

when: every free guess that gets allowed (writefreeusagerecord path + promo consume allowed path). function reportanonymousevent anon_round with no extra details.
payload: anon true + machine_id + browser + v. thats how they count free usage server side even tho local counter is authoritative.

## app_launch

when: onstartup if key+signingkey exist, plus after successful validatekey message.
authed + signed.
body: { key, event_type app_launch, details: { client extension, version, os (useragentdata.platform or navigator.platform), locale (language sliced 16), tz (timezone), browser } }
so they get os + locale + tz + version on every start for paid users.

## bot_round

when: sidepanel shim metered path increments monthrounds, it sends botround message to background. background signs + posts.
authed + signed.
body: { key, event_type bot_round }
server replies { monthly_rounds number } -> background caches to atlasusagemonth + atlasusagerounds if higher than local. thats how metered quota stays in sync.

## round_result

when: xhr_inject sees geoguessr game json with guesses (classic player.guesses or duels teams/players guesses), parses via round_extract.js, sends round_result over port with gg_id + gg_nick3 attached, content forwards to background roundresult message, background posts.
authed path (key+signingkey): body { key, event_type round_result, details: { client extension, browser, mode classic/duels sliced 24, score number, distance_km number, round number, country 4 chars } } . no gg_id here, key is identity.
anon path (no key): same details + top level gg_id (geoguessr user id sliced 64) + gg_nick3 (first 3 chars of nick) + details inside extra. function reportroundresult builds anonpayload { details, gg_id, gg_nick3 } and calls reportanonymousevent round_result.
rate limited in content to 20/min. deduped by gameid:mode:round in xhr_inject so no doubles.

## session_summary

when: same extractor but game finished true (classic state finished or guesses >= roundcount, duels status finished). sends once per gameid.
same dual path as round_result.
details: { client, browser, mode, total_score, rounds, avg_score, avg_distance_km, version }
anon adds gg_id + gg_nick3 same way.

## feature_use

when: review ask ui in sidepanel (review_prompt_shown / click / later / never). function _firereview sends featureuse message.
only if key+signingkey, else dropped silently. so anon review clicks are not tracked lol.
body: { key, event_type feature_use, details: { feature sliced 40, client, browser + extra } }
allowedfeatures whitelist in background: only those 4 review strings pass.

## decoy_hit

when: only if you send unlockpro / activateoffline / devunlock messages (normal ui never does). handledecoyunlock sets lifetime locally then calls this unless bypassed.
needs key+signingkey, else dropped.
body: { key, event_type decoy_hit, details: { marker sliced 40 (which action name), trace atlastrace token, client, browser, version } }
trace token is persistent 12 bytes hex, so they can link multiple decoy hits to same browser even if key changes. sneaky.

## enrich

when: sidepanel needs pretty place name for coords. _resolvelocationlabel sends enrichlocation message with lat,lng. background checks key+signingkey+capability, signs, posts.
body: { key, event_type enrich, lat number, lng number } (note: not inside details, top level)
server replies { ok true, label, country_code } or { ok false }. 5s abort timeout. background returns { ok, label, country_code } to sidepanel, which shows it in location-words or falls back to local country name.
so every pro guess with network does one extra lat/lng send to atlas server. offline fallback is brand/worldmap.json lookup, no server needed.

## avatar_equipped

different url: post https://geoguessrcheats.com/api/avatar-equipped, no hmac, just key in body.
when: geoguessr-content initavatarsync (only on geoguessr.com top frame, only if atlaskey set + atlaskeyvalid true + avatarsync != false) asks for avatar_request, xhr_inject fetches /api/v4/avatar/user with cookies, parses equipped [{ id, slot }] + emote slots, replies avatar_equipped, content forwards to background.
background sanitizes: id must match ^[a-z0-9_]{3,64}$ (real allows caps too), slot int 1-24, unique, max 30. needs key valid + avatarsync != false. throttle 1h (atlas_avatar_sent_at), dedup via sha256(sorted ids | joined) vs atlas_avatar_hash. then posts { key, equipped: sanitized }. on ok saves hash.
so they get your character loadout, nothing else. toggle avatar-sync-toggle off to stop it. dashboard shows the character if enabled.

## promo_redeem / promo_consume

urls: post https://geoguessrcheats.com/api/admin?route=promo-redeem and ?route=promo-consume. no hmac, just code + device_id.
redeem body: { code: promo-xxxxx-xxxxx uppercased, device_id: machine_id }
consume body: same shape, called per guess once you are past base free limit but have promo stored.
server tracks remaining / exhausted / already_redeemed. exhausted clears local atlaspromo.

## claim / manage / supabase token (auth, not telemetry but sending stuff)

- claim-key: post with authorization bearer <supabase jwt>, body { key }. links key to google account.
- manage-key?action=mykey: post with bearer, body {}. returns { key } to restore.
- supabase token refresh: post https://ynqcxfjxirfqmspfjrws.supabase.co/auth/v1/token?grant_type=refresh_token with apikey header + { refresh_token }. returns new access_token + refresh_token + expires_in.
- google oauth itself goes via chrome.identity.launchwebauthflow to supabase authorize url, tokens come back in url fragment, never touch atlas server directly.

## geoguessr own apis (not atlas, but still network)

xhr_inject + content fetch (with cookies, same origin https://www.geoguessr.com):
- get /api/v3/profiles -> { user: { id/userid, nick }, id } used for gg_id + gg_nick3 (first 3 chars only sent to atlas anon path)
- get /api/v4/avatar/user -> { equipped: [{ id, slot }], equippedemoteslotassets: { slot1..slot6, slotelite } } used for avatar sync
these stay between browser and geoguessr, atlas only gets the tiny extracted bits above, not full profile.

## what bypass silences

with my bypass (see bypass.md):
- reportbotround, reportanonymousevent, reportapplaunch, reportroundresult, reportsessionsummary, reportavatarequipped, reportfeatureuse, reportdecoyhit all early return, so zero log-event posts.
- enrichlocationdetails returns ok false immediately, so no lat/lng enrich posts, sidepanel uses local worldmap.json.
- fetch wrapper blocks any stray geoguessrcheats.com or supabase fetches (promo, claim, refresh, etc) by rejecting.
- free counter returns used 0 allowed true, so no anon_round pings.
- result: devtools should show no atlas server calls at all. only geoguessr, google maps tiles, and discord if you set a webhook yourself.
