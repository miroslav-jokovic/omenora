# OMENORA — App Store Listing & ASO

> Built from 2026 ASO research. Three indexed fields (Title > Subtitle > Keyword field), zero keyword duplication across them (Apple cross-references, so repeating wastes characters). Description is NOT indexed on iOS — it's pure conversion. Paste each field into App Store Connect → App Information / the version's App Store tab.

---

## THE THREE INDEXED FIELDS (ranking)

### App Name / Title — 30 char max
```
OMENORA: AI Astrology
```
**21 chars.** Brand leads (for ad-driven branded search), then the two strongest *winnable* terms: **AI** (rising, less-contested, OMENORA's real differentiator) + **astrology** (head term). Deliberately NOT chasing "horoscope" here — it's dominated by Co-Star/Nebula/Astrology.com and unwinnable for a new app; we put it in the subtitle instead where it still indexes.

### Subtitle — 30 char max
```
Birth Chart & Daily Horoscope
```
**29 chars.** Four high-volume terms not in the title: **birth, chart, daily, horoscope**. "birth chart" and "daily horoscope" are two of the biggest category phrases; Apple combines the words so we rank for both phrases AND the singles. No overlap with the title.

### Keyword field — 100 char max, comma-separated, NO SPACES after commas
```
zodiac,natal,tarot,astrologer,compatibility,reading,love,sign,moon,numerology,vedic,transits,bazi
```
Ordered by priority (earlier = more weight). Zero duplicates from title/subtitle. Singles only (Apple combines + handles plurals). 

⚠️ **App Store Connect shows a live character counter.** Paste the list, and if it exceeds 100, delete from the RIGHT (lowest priority first: `bazi`, then `transits`, then `vedic`). Do NOT add spaces after the commas — that wastes characters and Apple ignores them anyway.

**Why these:** `zodiac/sign` (head terms), `natal` (combines with "chart" → "natal chart"), `tarot` + `vedic` + `bazi` (your four traditions — niche but exactly what those seekers search), `astrologer` (covers "ask an astrologer" intent → your Counsel feature), `compatibility` (your IAP), `reading/love/moon/transits/numerology` (high-intent adjacent terms). Omitted: "astro" (redundant with astrology), "app" (Apple knows), competitor brand names (not allowed).

**Coverage check — across all three fields you now rank for:** AI astrology, birth chart, natal chart, daily horoscope, zodiac sign, tarot reading, vedic astrology, bazi, astrologer, compatibility, moon, transits, numerology, love reading — a wide, mostly-winnable spread with no wasted characters.

---

## PROMOTIONAL TEXT — 170 char max (updatable anytime WITHOUT app review)
```
Your full birth chart, read across four traditions — with Counsel, an AI astrologer who answers your questions. Not a sun-sign guess. Your exact chart.
```
**~150 chars.** Sits above the description. Not indexed, but it's the first thing readers see — leads with the differentiator. Because it updates without review, use it later for timely hooks (e.g. "New Moon in [sign] this week — see what it means for your chart").

---

## DESCRIPTION — conversion only (iOS does NOT index this for search)

Write to convert, not to rank. First 2-3 lines show before "more" — they carry the weight.

```
Most astrology apps give you a sun sign and a paragraph. OMENORA reads your entire birth chart — every planet, house, and aspect — calculated from your exact birth moment, not a one-size-fits-all guess.

Then it goes further than any app has: Counsel, your AI astrologer, is on call to answer your questions about your chart. Ask anything. Go deeper. Get guidance grounded in your real placements.

WHAT YOU GET

• Your full archetype reading — your shadow, your gifts, and the patterns that shape your life
• Your complete natal chart — all ten planets, their signs, houses, and aspects, explained for you personally
• A daily reading written for your chart — the cosmic weather, plus guidance for love, work, and health
• Your 90-day forecast — the major transits and timing ahead
• Counsel — an AI astrologer that knows your chart and answers your questions in plain language
• Compatibility — a full chart-to-chart reading for you and anyone else

FOUR TRADITIONS, ONE CHART
OMENORA reads your chart through Western, Vedic, BaZi, and Tarot — switch traditions and see your life from four angles.

WHY OMENORA IS DIFFERENT
Every word is calculated from your exact birth date, time, and place — your real chart, not a sun-sign shortcut. And Counsel is the first AI astrologer that actually remembers your placements and talks with you about them.

Begin with the night you were born.

—

SUBSCRIPTION
OMENORA Premium unlocks your full chart, all readings, daily guidance, and Counsel.
• Weekly — $6.99
• Monthly — $14.99
• Annual — $99.99 (best value)
Payment is charged to your Apple ID at confirmation of purchase. Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel anytime in your Apple ID settings. 

Terms: https://omenora.com/terms
Privacy Policy: https://omenora.com/privacy
```

⚠️ **Subscription disclosure is required by Apple (Guideline 3.1.2).** The block above includes title, length, price, auto-renew terms, and links — keep it. Apps with auto-renewable subscriptions get **rejected** without it. Replace the Terms/Privacy URLs with your real live URLs (you have a web app — these should already exist; if the paths differ, fix them).

---

## REQUIRED URL FIELDS (App Information / version page)
- **Support URL:** required — e.g. `https://omenora.com/support` (or a contact/help page that exists)
- **Marketing URL:** optional — `https://omenora.com`
- **Privacy Policy URL:** REQUIRED — `https://omenora.com/privacy` (must be live and reachable, or Apple rejects)

---

## NOTES / NON-OBVIOUS 2026 POINTS
1. **Screenshot text is now OCR-indexed by Apple.** Keyword-rich captions on your screenshots ("Your full birth chart," "Ask Counsel anything," "Daily reading for your chart") now contribute to both ranking and conversion. Worth doing when you build screenshots.
2. **The first two screenshots + icon drive install decisions** more than anything else on the page. Keywords get them to the page; visuals convert.
3. **Don't A/B-worry now.** Apple doesn't support native title/subtitle A/B testing (Google Play does). Ship this, measure, iterate via metadata updates — ranking changes show in ~2-4 weeks.
4. **Localization later:** you support six languages. Localized title/subtitle/keywords for ES/PT/HI/KO/ZH would capture regional search — a strong post-launch ASO lever, not a launch blocker.
5. This is iOS-only. Google Play uses a different model (indexes the full description, no hidden keyword field) — build that listing separately if/when you do Android.
```
