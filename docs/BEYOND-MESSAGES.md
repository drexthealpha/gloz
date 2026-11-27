# Beyond messages

Gloz's job is reading and answering messages on the glasses; the README covers that. This page holds the rest: the day screen past the last message, and the complaints only Even Realities can fix.

## Your day, past the last message

| You | Gloz |
|---|---|
| swipe down past the last message | your day, one line at a time: next meeting, tasks due, weather, now playing, a stock, your latest note, what you are reading, your script, directions, a server command; tap opens it |
| hold on that screen and say anything | "add task ...", "note ...", "directions to ...", "timer 5 minutes", "weather", "news", "read ...", "prompter", "run ...", "play", or any question, even "how does example.com's search work?" (Gloz reads that site's own code first); Gloz does it, or opens it with your words; the timer runs on the glasses with no signal, and weather and news keep their last answer |
| double tap in any of them | back home |

## Complaints only Even Realities can fix

These 69 complaints are about the hardware, the Even app, the store or the company, so no glasses app can fix them. What Gloz does for these owners: on the phone screen, "Fix my glasses" asks what is wrong, the order number and since when, then opens Even Realities' own support form with the subject and a full description already written (what that form asks for), so the first request for a repair, replacement or refund is complete. For each complaint: what owners said, the best solution found today, and the number to beat.

| # | What owners said | Best solution today | Number to beat |
|---|---|---|---|
| 1 | "My g2 glasses and r1 ring will not stay connected to the app" (10 Jul 2026, App Store) | Android Companion Device Manager; iOS State Restoration with AccessorySetupKit | None published |
| 2 | "Once it drops from memory the connection to the glasses are lost" (28 Feb 2026, Google Play) | Android CompanionDeviceService; iOS State Restoration relaunch | None published |
| 3 | "The glass doesn't connect to the app after removing from the case and wearing it..." (15 Mar 2026, Google Play) | Android startObservingDevicePresence; iOS State Restoration background relaunch | None published |
| 4 | "If it drops while charging, it errors and won't charge until I reset or reseat..." (tr) (8 Aug 2026, Google Play) | No published solution | None published |
| 5 | "Drops easily in busy streets and on the Yamanote line" (tr) (3 Jul 2026, Google Play) | Bluetooth LE Coded PHY (S=8), a stronger link than LE 1M | 12 dB link budget gain over LE 1M |
| 6 | "when i connect my earbuds, the ring constantly disconnects and reconnects" (10 Aug 2026, App Store) | No published solution; Android 10 and later batch BLE connection requests (method only) | None published |
| 7 | "connection with the phone is often lost when several apps are open" (tr) (3 Aug 2026, Google Play) | Google Play vitals memory limits plus Android CompanionDeviceService | 1.50 GB background memory on an 8 GB phone (Google Play vitals) |
| 9 | "The app will not allow you to enter if your internet is bad." (31 May 2026, App Store) | An open-source wearable companion app: 691 wearable models, no account, no vendor server | None published |
| 10 | "App keeps crashing and refuses to start. Using One UI 9.0 latest version..." (26 Oct 2026, Google Play) | Google Play Android vitals per-device crash and ANR limits | Under 8% crash rate on every single phone model (Google Play Android vitals) |
| 11 | "can't login to the app half the time, which means you can't access features..." (30 Oct 2026, Google Play) | Auth0 (Okta) enterprise login with a contractual availability guarantee | 99.99% login availability (Auth0) |
| 12 | "requires login for basic functionality including '100% local ai terminal mode' and notifications." (30 Oct 2026, Google Play) | An open-source companion app runs the Even Realities G1 with no account | 0 accounts needed for local features |
| 13 | "having to login every single time you want to use the glasses" (14 Feb 2025, Google Play) | Google OAuth refresh tokens, valid until six months unused | 6 months without forced re-login (Google OAuth) |
| 14 | "it enters special characters every time as standard which isn't supported in your password..." (3 Nov 2026, App Store) | Passkeys (FIDO): no password, no emailed code | 93% sign-in success (passkeys) |
| 15 | "Don't force us to link a device that we don't have..." (21 Apr 2025, Google Play) | An open-source companion app opens and runs with no device and no account | None published |
| 16 | "Within just one hour of waking up, my iPhone battery drops to approximately 80%..." (13 Nov 2026, App Store) | Google Play wake-lock limit plus Companion Device presence instead of scanning | Under 5% of sessions with more than 2 hours of wake locks per day (Google Play) |
| 17 | "...location checking it uses a little more than 15% of my 20,000mAh battery..." (22 Feb 2026, Google Play) | Android Companion Device Manager pairing without location permission | 0 location permissions needed for Bluetooth pairing and scanning |
| 18 | "...try to reconnect later, the app will be forever stuck in a crash loop" (18 Oct 2026, Google Play) | Crash-free sessions of top apps (Luciq 2026 benchmarks) | 99.99% crash-free sessions (Luciq, 2026) |
| 19 | "The 2.2.7 upgrade completely knocked out a perfectly performing AI teleprompter feature..." (2 Aug 2026, App Store) | Apple App Store phased release over 7 days | 1% of users on the first day of a release (Apple App Store) |
| 20 | "It will download it, but it won't install." (22 Jul 2026, App Store) | Android A/B system updates, which fall back to the old partition | None published |
| 21 | "...but the display sometimes becomes completely black." (18 Jul 2026, Google Play) | No published solution; nearest is an Ultrahuman device fleet with Memfault diagnostics | None published |
| 22 | "The next morning I opened the case and both lenses had cracks in them." (22 Sep 2026, App Store) | US FDA drop-ball rule for lenses; a display-glasses maker offers two frame sizes | 50 inch drop-ball pass per lens (US FDA); 2 frame sizes |
| 23 | "battery life on both diminish after 3 months on both G2 & R1." (22 Aug 2026, Google Play) | Apple iPhone 15 and later batteries rated for over 1,000 cycles | 80% capacity after 1,000 cycles (Apple) |
| 25 | "found the ring loose and bouncing around inside the box." (28 Feb 2026, Google Play) | Oura Ring 4 free sizing kit with Size Later | 12 sizes with a free sizing kit (Oura) |
| 26 | "Solo faltaría la integración de los datos de R1 con Google health connect." (17 Oct 2026, Google Play) | Oura writes ring health data types to Google Health Connect | 9 health data types written to Health Connect (Oura) |
| 39 | "It needs the internet even for conversation (transcription)." (26 Jul 2026, Google Play) | Cohere Labs Transcribe offline model; Apple Live Translation on-device | 5.42% word error rate from a model that can run offline (Cohere Labs) |
| 47 | "plugins like the voice recorder require the phone app to remain open, limiting usability." (8 Jun 2026, Google Play) | Android NotificationListenerService and Apple ANCS, both absent from the G2 SDK | None published |
| 49 | "Contacting support has been problematic and only seems to be a remote AI." (9 Apr 2026, Google Play) | Zappos 365-day return policy | 365-day return window (Zappos) |
| 50 | "The order took over 8 weeks to deliver (2 months)" (28 Apr 2026, App Store) | An optical retail chain makes prescription glasses in one day | 2 business days for prescription glasses |
| 51 | "No longer supports the G1 generation glasses. what am I supposed to do..." (23 Jun 2026, Google Play) | Fairphone Gen. 6 software support until 2033 | 8 years of software support (Fairphone) |
| 54 | "the goodwill offer presented to me was just $10 toward accessories" (16 Nov 2026, Trustpilot) | EU Sale of Goods Directive 2019/771 legal guarantee | 2 years of free repair, replacement or refund for a faulty item (EU, 2019) |
| 55 | "FedEx then left my $619 order at someone else's door" (14 Nov 2026, Trustpilot) | Amazon A-to-z Guarantee for undelivered parcels | 48 hours from first contact to resolution (Amazon) |
| 56 | "Neither phone number connects to anyone, and email support replies about once a day..." (14 Nov 2026, Trustpilot) | Chewy 24/7 phone, email and live chat (Form 10-K) | Under 10 seconds to answer a phone call, 24 hours a day (Chewy) |
| 57 | "after being forced to send them a video of the failure, upload logs, etc..." (14 Aug 2026, Trustpilot) | Memfault remote diagnostics from devices in the field | 19% lower customer support cost (Memfault) |
| 58 | "they want me to pay $80 for the inspection plus $40 shipping ($120 upfront)." (29 Sep 2026, Trustpilot) | Back Market Express Replacement, no hold or deposit | $0 paid and $0 held for a warranty replacement (Back Market) |
| 59 | "...the G1 model I purchased had been discontinued days after shipment..." (30 Mar 2026, Trustpilot) | Framework Laptop 13: every mainboard fits the original chassis | Every mainboard generation fits the original chassis (Framework) |
| 60 | "they shipped me an empty box" (9 Jul 2026, Trustpilot) | ColdTrack scanned picking with a pack accuracy guarantee | 99.9% pack accuracy (ColdTrack) |
| 61 | "Nose bridge snapped at 7 months... both arms on the NEW pair are peeling apart." (28 Oct 2026, Trustpilot) | ISO 12870:2024 frame standard; a sunglasses maker's 2-year frame warranty | 2-year frame warranty; no measured failure rate found |
| 62 | "in a sunny day impossible to see" (17 Aug 2026, Trustpilot) | A display-glasses maker rates its display at 6,000 nits peak | 6,000 nits peak (maker's rating) |
| 63 | "Instead, they refused to take responsibility, stating that their warranty does not cover accessories." (15 Aug 2026, Trustpilot) | Peak Design lifetime warranty including accessories | Lifetime warranty on accessories (Peak Design) |
| 64 | "I was never told my glasses would be made and shipped from China." (10 Nov 2026, Trustpilot) | EU GPSR Article 19: manufacturer address on every listing | None published (rule: manufacturer address on 100% of listings) |
| 65 | "...nearly 3 months after i initially sent them for a 'repair'" (7 Apr 2026, Trustpilot) | Back Market Express Replacement, next-business-day shipping | 3 business days from approval to replacement in hand (Back Market) |
| 66 | "the focal point on the progressive lenses is far too narrow..." (23 Jun 2026, Trustpilot) | A lens maker's progressive lens series, tested on 73 wearers | 69 of 73 wearers (95%) adapted on day one |
| 67 | "their checkout never actually captured the +/- sign of the prescription" (6 Jun 2026, Trustpilot) | Optical retailers check prescriptions by upload or with the doctor, and remake wrong lenses free | None published (rule: $0 to remake a wrong lens) |
| 68 | "a week sitting on my order while asking me questions relating to my prescription..." (18 Nov 2026, Trustpilot) | US FTC Contact Lens Rule passive verification | 8 business hours to verify a prescription (US FTC) |
| 69 | "the ring has no durability and shattered when clapping" (4 Oct 2026, Trustpilot) | Samsung Galaxy Ring titanium body, IP68 | None published (100 m water rating is the only measured figure) |
| 70 | "The price displayed on your website was significantly lower than the amount shown at checkout" (25 Feb 2026, Trustpilot) | UK DMCC Act 2024 drip-pricing ban | $0 between the first price shown and the price charged (UK, 2024) |
| 71 | "Prescription orders can't be cancelled after 24 hours, but some customers are reporting..." (9 Feb 2026, Trustpilot) | An online glasses retailer lets buyers cancel until shipping begins | Cancel any time before shipping, no 24-hour cutoff |
| 72 | "...NOW they say it is beyond the return period and offer a 'clip' as reimbursement." (25 Sep 2025, Trustpilot) | EU Sale of Goods Directive two-year claim period | 1 year in which the seller must prove the fault was not there at delivery (EU) |
| 73 | "Without connection with smartphone, it is useless." (2 Aug 2026, Trustpilot) | Apple Watch with cellular works away from the iPhone | None published |
| 74 | "...their technical team believed the issue was 'most likely caused by battery swelling'" (6 Aug 2026, Trustpilot) | Apple iPhone 15 and later charge limit, set from 80% to 100% | 80% capacity after 1,000 cycles (Apple); no measured swelling rate found |
| 75 | "...they would 'restrict access to the Even Realities App' if I didn't comply." (9 Feb 2026, Trustpilot) | An open-source companion app runs the G1 without the vendor app or an account | 0 vendor accounts needed to use the glasses |
| 76 | "...I was charged $57 immediately for the first month. After that, basically nothing happened." (7 Oct 2026, Trustpilot) | Amazon charges when the order ships | $0 charged before shipment (Amazon) |
| 77 | "They refuse to ship to military addresses and will attempt to charge you additional fee's..." (23 May 2026, Trustpilot) | USPS delivery to APO, FPO and DPO addresses at domestic prices | Domestic postage price to a military address (USPS) |
| 78 | "...I didn't want my order cancel I just want to change my payment method" (14 May 2026, Trustpilot) | US FTC Mail Order Rule refund deadline | 7 working days to refund (US FTC) |
| 82 | "The charging case makes a high-pitched whistling sound..." (10 Feb 2026, Trustpilot) | MPS audible-noise design methods: move resonance above 20 kHz | None published (design target: resonance above 20 kHz) |
| 84 | "No headphones / bone transducers." (5 Feb 2026, Trustpilot) | A display-glasses maker builds in two open-ear speakers | 2 open-ear speakers; no measured loudness found |
| 86 | "In regular use, the device feels slow and unresponsive, with noticeable lag between interactions." (7 Jan 2026, Trustpilot) | A mixed-reality headset's see-through display latency, measured by OptoFidelity | 11 ms measured display latency (OptoFidelity) |
| 90 | "4 star because there are no camera." (27 Jul 2026, Trustpilot) | A display-glasses maker's 12 MP ultra-wide camera | 12 MP camera on display glasses |
| 95 | No quote found in the raw files (18 Mar, year not shown, App Store) | A display-glasses maker shows the phone's playing music as a live activity | None published |
| 99 | "Would you guys consider adding different colors to the display itself instead of green?" (21 Nov 2026, X) | A display-glasses maker's full-color MicroLED waveguide display | Full color at 6,000 nits peak (maker's rating) |
| 105 | "The prescription version has a major issue. Humidity/moisture." (22 Jun 2026, X) | Industrial smart glasses rated IP67 | IP67 rating |
| 106 | "the glasses' coating peeled off" (tr) (17 Nov 2026, X) | A lens maker's premium UV lens coating | Bayer ratio 16 |
| 107 | "I kept failing and getting irritated" (tr) (16 Nov 2026, X) | Slide-on nose pads: three steps, no tools | None published |
| 108 | "...wouldn't it be best if the ring could be stored inside the glasses case..." (6 Jul 2026, X) | Oura Charging Case, up to five ring charges | 5 full ring charges in a pocket case (Oura) |
| 109 | "wiping with alcohol is forbidden" (tr) (19 Nov 2026, X) | Apple allows 70% isopropyl alcohol wipes on its displays | 70% isopropyl alcohol allowed on the display (Apple) |
| 110 | "it looks like it could ruin my eyes" (tr) (17 Nov 2026, X) | A display-glasses maker's TÜV Rheinland Eye Comfort 5 Star certification | TÜV Rheinland Eye Comfort 5 Star; no measured values published |
| 111 | "after upgrade, all apps are gone. even hub is unreachable." (10 May 2026, Google Play) | Cloudflare Business SLA, 100% content serving | 100% uptime under a written SLA (Cloudflare) |
| 112 | "release was delayed about a month" (tr) (7 May 2026, X) | Apple App Review timing, expedited review and an appeals board | 90% of submissions reviewed in under 48 hours (Apple) |
| 113 | "paid apps on Even Hub should be allowed right away" (tr) (11 Apr 2026, X) | Epic Games Store revenue share: developer keeps the first $1M | 100% of the first $1M per app per year to the developer (Epic Games Store) |


Owner: drexthealpha · reviewed 2026-11-27
