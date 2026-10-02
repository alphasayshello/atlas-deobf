# how the atlas auth actually works

so yeah this is the new atlas system. forget extpay for a sec, thats the old thing. this is what background.js does now. all paths are crack/background.js unless i say otherwise.

## base urls

- site: https://geoguessrcheats.com
- post /api/validate-key - check a key
- post /api/log-event - telemetry + metering + enrich, everything funnels here with different event_type
- post /api/claim-key - link a key to a google account, needs bearer supabase jwt
- post /api/manage-key?action=mykey - get your key back for an account, body is just {}, needs bearer
- post /api/avatar-equipped - send your geoguessr character loadout
- post /api/admin?route=promo-redeem - redeem a promo-xxxxx-xxxxx code
- post /api/admin?route=promo-consume - burn one promo round
- supabase: https://ynqcxfjxirfqmspfjrws.supabase.co/auth/v1/authorize?provider=google + /auth/v1/token?grant_type=refresh_token, anon apikey is sb_publishable_wmmqjlf-xsvue-f_zwp2gq_hlmgqgcb (lowercased here, real one has caps, check the file)

csp in manifest.json only allows connect to self + discord.com + discordapp.com + geoguessrcheats.com + that supabase url. so thats the full phone-home surface.

## machine fingerprint

two bits:

1. atlasmachineid in chrome.storage.local. if missing or not matching ^[a-f0-9]{8,128}$ it makes 18 random bytes -> hex (36 chars) and saves it. function getorgeneratemachineid. this is sent as machine_id and device_id basically everywhere.

2. machine_components in validate call. function collectmachinecomponents. it sha256 hexes:
   - ua: + navigator.useragent
   - lang: + navigator.language
   - cpu: + hardwareconcurrency
   - plat: + platform
   - tz: + intl.datetimeformat timezone
   all hashed like sha256("ua:" + value) so server never sees raw values, just hashes. sneaky but whatever.

there is also atlastrace token (12 random bytes -> hex, 24 chars) used only for decoy_hit tracing, and atlasinstallsalt + atlastrialstate for free rounds, covered below.

## validate-key

function validatelicensekey(key):

request:
post https://geoguessrcheats.com/api/validate-key
headers: content-type: application/json
body: { key: "atlas-xxxxx (lowercased here)", machine_id: "36 hex chars", machine_components: { ua, lang, cpu, plat, tz } }

server replies with raw text body + header x-atlas-sig: ed25519=<base64 sig>.

client does verifyed25519signature(body, header):
- strips ed25519= prefix, base64 to bytes for sig + pubkey
- pubkey hardcoded: mpe44raaxfmfumbbld9brzrk5oyu+0sv2o8/1crarju= (lowercased here, real has caps)
- imports as raw ed25519 key via crypto.subtle.importkey, verifies over utf8 bytes of body
- if that fails -> { valid: false, error: "signature" }. no trust without sig. network fail -> error network. json parse fail -> error parse.

if sig ok, parses json, tags __status = http status, keeps __signed = { body, sig } if valid true.

then persistlicensestate(key, result):
- if valid true: saves atlaskey, atlaskeyvalid=true, atlasplan, atlaskeyexp, atlascapability, atlassignedlicense (__signed), atlasrequestsigningkey, atlasvalidatedat=datanow
- if valid false and definitive (not network/signature/parse, not 429 or 5xx): saves atlaskeyvalid=false, clears capability + signedlicense. so soft fails dont nuke you, hard fails do.
- else: do nothing, keep old state.

validatekey message from sidepanel: sidepanel sends { action: "validatelicensekey-ish", key }, background runs validate + persist, then if ok calls reportapplaunch + linkstoredkeytoaccount. returns the json straight to ui.

## capability + getlicense gate

server capability looks like: { exp: unix seconds, rounds_per_month: number, plan: "lifetime" etc }

function getverifiedlicensecapability:
- reads atlassignedlicense { body, sig } from storage
- re-verifies ed25519 sig locally
- parses body, checks parsed.valid true + capability.exp*1000 > now
- returns capability or null. so you cant just hand-edit storage, sig would break.

message getlicense:
- calls that, maps to { pro, tier, rpm, plan }
- rpm == -1 -> tier unlimited -> pro true
- rpm > 0 -> tier metered -> pro true
- else -> tier free -> pro false, rpm 0
this is what extpay.js + atlas-shim.js + sidepanel checkpremiumaccess all end up asking. single choke point.

## request signing for log-event

once you have atlasrequestsigningkey (base64, comes inside validate response):

function signclientrequest(signingkeyb64, key, eventtype):
- timestamp = floor(now/1000) as string
- nonce = 8 random bytes -> hex (16 chars)
- message = uppercasekey + "|" + eventtype + "|" + timestamp + "|" + nonce (in docs i lowercased but code uppercases the key first)
- hmac-sha256 with raw signing key over utf8 message -> hex
- header: hmac=<hex>; ts=<timestamp>; nonce=<nonce>
sent as x-atlas-sig on authed log-event posts. server can verify you hold the signing key without you sending the key in clear every time. key still in body too tho: { key, event_type, details / lat / lng }.

different event types all go to same /api/log-event url, just different event_type + signing. see telemetry.md for full list.

## google + supabase link

flow performgooglesignin:
1. redirecturl = chrome.identity.getredirecturl()
2. authurl = supabase/auth/v1/authorize?provider=google&redirect_to=<that>
3. chrome.identity.launchwebauthflow interactive true -> resulturl with #access_token=...&refresh_token=...&expires_in=...
4. pull tokens from fragment, if no access_token -> fail no_token
5. decode email from jwt payload middle part (base64url -> json -> .email). function extractemailfromjwt.
6. save atlasaccountemail, atlasaccountlinkedat, atlassessionrefresh, atlassessionexp
7. if no stored atlaskey: try restoreaccountkey(access_token):
   - post manage-key?action=mykey with authorization: bearer <jwt>, body {}
   - if returns { key: "atlas-..." } and matches ^atlas-, then validate it + persist + save atlaslinkedkey
   - return { ok true, email, claim restored/nokey }
8. if key exists: claimlicensekey(access_token, key):
   - post claim-key with bearer, body { key }
   - ok + { ok true } -> linked, 409 already -> already, else claim_failed
   - if linked/already -> save atlaslinkedkey = key
   - return { ok true, email, claim, plan, detail }

refresh:
- refreshsupabaseaccesstoken reads atlassessionrefresh, posts to supabase/auth/v1/token?grant_type=refresh_token with apikey header + { refresh_token }. on ok updates atlassessionrefresh + exp, returns new access_token. else null.

auto link:
- linkstoredkeytoaccount(key) skips if atlaslinkedkey already equals key, else tries refresh -> claim -> save. called after validate + on heartbeat if accountemail set but linkedkey mismatch.
- heartbeat alarm atlaslicenseheartbeat every 15min: if key -> re-validate + persist, plus maybe link. if no key but accountemail -> try refresh -> restore. also oninstalled (install -> set smartzoom false, rangeenabled false, open site, anon_install ping, set uninstall url) + onstartup -> reportapplaunch. ensureheartbeatalarm makes sure the 15min alarm exists.

so basically google account is just a container to hold / recover your atlas key. free users get 14 rounds instead of 7 once atlasaccountemail exists (see below), even without a paid key.

## free trial counting (no key path)

keys in storage:
- atlasinstallsalt in local + sync. 24 random bytes -> hex (48 chars) if missing/invalid. secret for hmac.
- atlastrialstate in local + sync. shape { iid: machine_id, n: usedcount, v: 1, sig }

signfreerecord(secret, record): hmac-sha256 with utf8 secret over "iid|n|v" -> hex. stored as sig.

readfreeusagerecord:
- loads local + sync copies, takes highest n that has correct iid + valid sig
- returns { used: highest, tampered: hasrecord && !hasvalidsig }
- so reinstall / sync games are handled, and editing n manually breaks sig -> tampered true -> blocked.

writefreeusagerecord(n): builds { iid, n, v:1 } + sig, writes to both local + sync.

limits in getfreeusage / consumefreeround handler:
- baselimit = atlasaccountemail ? 14 : 7
- promo = getstoredpromo (atlaspromo { code, rounds }) -> totallimit = baselimit + promo.rounds
- getfreeusage: if used < baselimit -> { used, limit: baselimit, allowed true }. else -> { used, limit: totallimit, allowed: !!promo }
- consumefreeround: if used >= baselimit:
  - no promo -> { used, limit: baselimit, allowed false } -> ui shows sign in prompt
  - with promo -> post promo-consume { code, device_id } -> if allowed true -> { used, limit: totallimit, allowed true, promo true } + anon_round ping. if exhausted -> clear atlaspromo, return allowed false + reason.
  else (still free left): write n+1 -> { used: next, limit: totallimit, allowed true } + anon_round ping.
- tampered -> { used: baselimit, limit: baselimit, allowed false, tampered true } straight up.

so anon users burn local counter + send anon_round each guess. signed-in anons just get double base. promo codes stack extra on top but each guess after base still hits server to consume.

promo code format enforced client side: ^promo-[a-hj-np-z2-9]{5}-[a-hj-np-z2-9]{5}$ (lowercased here). redeem flow redeempromo message: checks regex, posts promo-redeem { code, device_id }, on 200 + { ok true, rounds } saves atlaspromo { code, rounds }. else returns { ok false, reason }.

## avatar + enrich

reportavatarequipped(items):
- sanitize: must be array, each { id: ^[a-z0-9_]{3,64}$ (lowercased, real allows a-z), slot: int 1-24 }, unique slots, max 30
- needs atlaskey + atlaskeyvalid true + avatarsync != false
- throttle: skip if now - atlas_avatar_sent_at < 3600000 (1h)
- hash sorted ids joined by | via sha256, skip send if same as atlas_avatar_hash
- post avatar-equipped { key, equipped: sanitized }. on ok save hash.
- trigger: geoguessr-content.js asks xhr_inject.js for avatar_request over port, xhr_inject fetches /api/v4/avatar/user (geoguessr own api, with cookies) + parses equipped + emotelots, sends avatar_equipped back, content forwards to background avatarequipped message.

enrichlocationdetails(lat,lng):
- needs key + signingkey + valid capability
- signs enrich event, posts log-event { key, event_type: "enrich", lat, lng } with 5s abort
- on { ok true, label / country_code } returns it, else { ok false }
- sidepanel calls it via enrichlocation message to get pretty location words. falls back to local country lookup from brand/worldmap.json if it fails. so enrich is optional luxury, not required for coords.

## decoy trap (dont poke this on real)

messages unlockpro / activateoffline / devunlock all go to handledecoyunlock(name):
- sets atlaskeyvalid true, atlasplan lifetime, atlaskeyexp now+10y in storage
- calls reportdecoyhit(name) which (if you have real key+signingkey) signs decoy_hit with marker + atlastrace token + version + browser and posts to log-event
- resolves { success true, pro true, plan lifetime, tier unlimited }
so it looks unlocked locally but snitches if you were authed. sidepanel never sends these in normal flow. they are just tripwires for people poking in devtools. with bypass we neuter the report part.

## storage keys cheat sheet

- atlasmachineid - your device id, hex
- atlasinstallsalt - free secret, hex
- atlastrialstate - { iid, n, v, sig }
- atlaspromo - { code, rounds }
- atlastrace (lowercased in docs: atlastrace) - decoy trace hex
- atlaskey, atlaskeyvalid, atlasplan, atlaskeyexp, atlascapability, atlassignedlicense, atlasrequestsigningkey, atlasvalidatedat - license state
- atlasaccountemail, atlasaccountlinkedat, atlassessionrefresh, atlassessionexp, atlaslinkedkey - google link
- atlasusagemonth, atlasusagerounds - cached monthly metered count from bot_round response
- atlasinstallblocked - true if server replied blocked true to anon_launch, kills coords handling
- atlas_avatar_hash, atlas_avatar_sent_at, avatarsync - avatar dedup
- extractedcoordinates, coordinatestimestamp - last coords from content script, 2min expiry
- plus a ton of ui prefs: smartzoom, rangeenabled, autoplace, autosubmit, autonext, guessdelay*, mapzoomlevel, showlauncher, platformgg, platformog, etc.
