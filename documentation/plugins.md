# old plugin auth - extpay + firebase, and how its dead now

this is the legacy system thats still half in the code. new atlas license (see auth.md) is the real gate now, but sidepanel.js still talks to extpay + firebase cloud functions for usage counting and ui state. in the crack folder both are already neutered. heres how they worked and what kills them.

## extpay plugin

files: crack/extpay.js (mock), crack/sidepanel/sidepanel.js uses it as const extpay = extpay("atlas-geoguessr")

real extpay normally gives you:
- getuser() -> { paid bool, paidat date, email, userid, trialstartedat, trialended, subscriptionstatus active/past_due/canceled/none, subscriptioncancelled, subscriptionexpired, etc }
- onpaid.addlistener / ontrialstarted.addlistener
- openpaymentpage(), opentrialpage(), openloginpage(), startbackground(), getplans()

in this repo extpay.js is already a fake:
- defaultmockuser is hardcoded paid true, email local@atlas, userid local-user, sub active till 2099, etc.
- createextpayclient().getuser() sends chrome.runtime message { action: "getlicense" } to background.js, and sets paid = (res && res.pro === true)
- onpaid / ontrialstarted listeners are empty functions, openpaymentpage etc do nothing, getplans returns []
- startbackground does nothing

so extpay auth = just a proxy to background getlicense. if background says pro true, sidepanel thinks you paid. thats why the background bypass is enough to make extpay say pro.

sidepanel helpers around it:
- getextpayuser() wraps extpay.getuser(), caches _extpayispro
- getextpayapikey() looks in chrome.storage.sync/local for extensionpay_api_key, returns null + console warn if missing. only used for old incrementguesscount call.
- performintegritycheck() used to compare getuser().paid vs storage extensionpay_user.paid, plus check paidat not in future / before 2020, warn if trial still active for paid user. in bypass i stubbed this to just return true, so it never yells.
- onextpayactivation() used to call syncsubscriptiontofirebase + checkpaymentstatus + fire extpay-state-changed event. still wired to onpaid/ontrialstarted at top of sidepanel.js but those never fire now cause the mock never emits.
- startextpaywindowmonitoring() polls getuser() every 2s for 10min after you click upgrade, to catch return from payment tab. calls window.refreshuistate when fast response seen. irrelevant when bypassed.
- installfocusrefreshers() re-runs checkpaymentstatus on window focus, visibility change, storage change with extpay/payment/subscription/trial/user in key, custom event, settings visible mutation, plus periodic 10s fast then 60s slow. so ui stays fresh. with bypass it just re-confirms pro over and over.
- installextpaylisteners() wires onpaid -> syncsubscriptiontofirebase + checkpaymentstatus + status text. same, dead code now.

payment ui logic:
- substate(user): reads window.backendsubscriptionflags (set from firebase usage) + user.paid + subscriptionstatus. returns { pastdue, cancelled, active: paid && !pastdue, trial: trialstartedat && !paid, backendpastdue }
- updatepaymentui(user), updateupgradecardheader(user), checkcancelledsubscriptionwarning (now just removes warning), reorder settings sections. if active true -> hides payment section, shows manage plan button + pro mode enabled header. thats what you see with bypass.
- checkpremiumaccess() is the gate for auto submit + guess cycle. old code required active || trial, else showed status need premium + returned false. bypassed to return true always.
- handleextpayedgecases() + checkpaymentstatus() + initializepaymentstatuswithedgecases() handle trial-expired, payment-failed, past-due, cancelled, expired, many-attempts notes. all driven by getuser(). with always-paid they just return paid user and show pro ui.
- showusagelimitexceededmodal() + showsigninprompt() are the paywalls. first shows when incrementguesscount returns 429 or free usage exhausted. second shows when getfreeusage says no rounds left. with bypass they never trigger cause usage is always unlimited (see below).

## firebase cloud functions plugin

base: https://us-central1-atlas-geoguessr-ext.cloudfunctions.net/
functions seen in sidepanel.js:
- createuser { extpayuserid, email }
- getuserusage { extpayuserid }
- incrementguesscount { extpayuserid, extpayapikey }
- updatesubscription { extpayuserid, subscriptionstatus, subscriptiontype, iscancelled, ispastdue }
- processgeolocation (old coords solver, returns { result: { coordinates, location }, usage })

callcloudfn(name, data) in sidepanel.js:
- post base+name, headers content-type application/json, origin chrome-extension://<id>, x-extension-id <id>, x-request-id random uuid, x-timestamp now
- body { data: <payload> }
- returns raw fetch response, callers do .json() -> .result

flows:
- initializefirebaseuser(): getuser -> userid/email or anonymous -> call createuser (fire and forget) -> after 500ms loadusageinformation(userid)
- loadusageinformation(userid): uses _usagecache 30s ttl, else call getuserusage. on 429 retry 3x exponential. on ok: if extpay paid, force usage.subscriptiontype/plantype = pro, updatepaymentui + header, cache to _usagecache + window.backendsubscriptionflags, updateusagedisplay(usage)
- syncsubscriptiontofirebase(user): maps paid+status to free/pro + inactive/active/past_due/trial, posts updatesubscription, then reloads usage after 1s
- _chargeguesscount(): the per-guess meter. gets userid, throws if anonymous, runs performintegritycheck (now stubbed), gets apikey, posts incrementguesscount. on 429 -> showusagelimitexceededmodal + return { limited true }. on ok -> parse { result: { usage } }, updateusagedisplay, invalidateusagecache, return { usage }. bypassed in crack to just return { usage: { current 0, limit 999999, plantype pro, etc } } with no fetch.
- updateusagedisplay(usage): renders 0/7 vs 0/unlimited bar, badge free mode / pro / etc. treats limit 999999 or -1 or plantype pro/standard as unlimited.
- processgeolocation path is dead, atlas-shim fakes it from extractedcoordinates if anything calls it.

usage object shape everywhere: { current, limit, plantype free/pro/plan, subscriptiontype, subscriptionstatus active/inactive, iscancelled, ispastdue }

## how atlas-shim.js kills firebase

file: crack/sidepanel/atlas-shim.js, loaded after extpay.js, before sidepanel.js. overrides window.fetch.

logic:
- if url has no cloudfunctions.net -> passthrough to original fetch
- if createuser -> return json { result: { success true } } immediately, no network
- if getuserusage -> call fetchlicenseandusagestate() -> return { result: getusageobject(state) }
- if incrementguesscount -> same state lookup:
  - unlimited tier -> return { result: { usage: unlimited 0/999999 pro } }
  - metered tier -> if monthrounds >= rpm -> 429 resource_exhausted + usage, else monthrounds+1, save atlasusagemonth/rounds to storage, send botround message to background, return metered usage
  - free tier -> send consumefreeround to background, if allowed -> 200 + free usage, else 429 + free usage
- if updatesubscription -> return success true, no network
- if processgeolocation -> read extractedcoordinates from storage (or fallback 40.3487,-74.6593 princeton lol), plus license state, return { result: { result: { coordinates, location: "atlas prediction" }, usage } }
- else fallback -> return usage object for state

fetchlicenseandusagestate():
- sends getlicense to background, gets { tier, rpm, plan }
- sends getfreeusage to background, gets { used, limit }
- reads atlasusagemonth/rounds from storage
- resolves { tier, rpm, plan, freeused, freelimit, monthkey, monthrounds }
- getusageobject maps: unlimited -> unlimited 0/999999 pro, metered -> metered monthrounds/rpm, free -> free freeused/freelimit
- in bypass i stubbed this whole thing to return unlimited directly, so even if background messages fail it still says pro.

so sidepanel thinks its talking to firebase, but its just talking to itself. no tokens, no api keys, no cors, nothing leaves the browser for those urls. you can verify in devtools: filter cloudfunctions.net, should be zero real requests (they are all fake response objects).

## discord webhook (bonus plugin, not auth)

not license related, just user notifications. settings in discord page:
- storage discordwebhook, discordnotifyguess, disordinclcoords (lol typo kept), discordincountry
- _discordvalid checks ^https://(discord|discordapp).com/api/webhooks/
- _discordpost posts { embeds: [{ title, description, color 16737792, fields }] }
- senddiscordguess(lat,lng,words,country) called from recordguess() on every successful guess if webhook set + notify true. includes country + coords fields depending on toggles.
- initdiscord wires save/show/test buttons. test sends atlas connected embed.
- manifest csp allows connect to discord.com + discordapp.com so this works even with strict csp.
- this one is untouched by bypass, works as normal. if you dont set a webhook, nothing sends.

## summary 

- extpay = old pay gate, now just asks background getlicense. background bypass = extpay always paid true.
- firebase = old usage counter, now faked by atlas-shim fetch hijack + _chargeguesscount stub. always 0/999999 pro.
- supabase/google + geoguessrcheats.com = new real gate (see auth.md). background bypass fakes validate + capability + blocks fetch, so it never phones home.
- discord = optional, user-controlled, not part of license.
