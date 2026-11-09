# iOS 26+ share of active iPhones, November 2026 (global, Ethiopia, East Africa)

Context for the report writer: Apple-hosted asset packs (`AssetPackManager`) need iOS 26. Nota supports iOS 16+. This note measures how many iPhones a minimum of iOS 26 would leave out. Every source below is dated 2026 except one comparison point from February 2024. Nothing older than 2024 is relied on.

## What share of active iPhones ran iOS 26 or later in November 2026, globally and in Ethiopia or East Africa?

### Takeaway
Globally, about **78%** of iPhone web traffic was on iOS 26 or 27 in October to early November 2026 (StatCounter). In app analytics from mostly US and European apps the share is about **91%** (TelemetryDeck, end of October). Apple's own count was already 79% of all iPhones on iOS 26 on 7 June 2026, before iOS 27 came out, and Apple has published nothing newer. Ethiopia trails: about **69%** of Ethiopian iPhone web traffic was on iOS 26+ in October 2026. Within the iOS 16+ devices Nota can serve today, that is about **74.5%**, so roughly **one in four** of Nota's currently reachable Ethiopian iPhones would be dropped by an iOS 26 minimum. Kenya and Africa as a whole sit between Ethiopia and the global figure (75% and 73%).

### Cited Findings

**Apple (official, App Store-transacting devices)**
- Apple's figures are dated 7 June 2026. Among iPhones, "86 of all devices introduced in the last four years use iOS 26" and "79 of all devices use iOS 26". Among iPads the figures are 79 and 68 for iPadOS 26. The percent signs are drawn graphically on the page and are missing from its text. The page, fetched on 6 Nov 2026, still shows these June 2026 figures, gives no iOS 27 figure, and gives the remainder (21% of all iPhones) only as a chart, not by version. — [Apple Developer: App Store support, "iOS and iPadOS usage"](https://developer.apple.com/support/app-store/)
- Apple's earlier iOS 26 figures were measured on 12 Feb 2026, 150 days after the 15 Sep 2025 release: **66%** of all iPhones and **74%** of iPhones from the last four years. At similar points, iOS 18 had 68% of all iPhones and 76% of recent ones (measured 21 Jan 2025), and iOS 17 had 66% and 76% (measured 4 Feb 2024). This is secondary reporting of Apple's page. — [9to5Mac, 13 Feb 2026](https://9to5mac.com/2026/02/13/apple-announces-ios-26-usage-numbers-heres-how-they-compare/)
- Apple's cadence: it published the first figures for each new release in January or February, after a release the previous September (dates as above). — [9to5Mac, 13 Feb 2026](https://9to5mac.com/2026/02/13/apple-announces-ios-26-usage-numbers-heres-how-they-compare/)
- Secondary only: in June 2025, 82% of all iPhones ran iOS 18, slightly more than the 79% on iOS 26 a year later. The AppleInsider article returned HTTP 403, so this figure comes from a search-result summary and is unverified. — [AppleInsider, 10 Jun 2026](https://appleinsider.com/articles/26/06/10/fewer-iphone-users-are-updating-to-ios-26-than-they-did-with-ios-18); [Mezha](https://mezha.ua/en/news/ios-26-installed-on-79-of-iphones-apple-has-released-the-latest-figures-312136/)

**Device eligibility (Apple)**
- Apple's iPhone User Guide lists the same oldest models for iOS 26 and iOS 27: iPhone 11, 11 Pro and 11 Pro Max, and iPhone SE (2nd generation), up to iPhone 17e under iOS 26 and iPhone 18 Pro, 18 Pro Max and iPhone Duo under iOS 27. iOS 27 dropped no models that iOS 26 supported. — [Apple: iPhone models compatible with iOS 26](https://support.apple.com/guide/iphone/supported-models-iphe3fa5df43/26.0/ios/26.0); [Apple: iPhone models compatible with iOS 27](https://support.apple.com/guide/iphone/supported-models-iphe3fa5df43/27.0/ios/27.0)
- iOS 26 dropped the iPhone XS, XS Max and XR, which iOS 18 supported (secondary). — [9to5Mac, 15 Sep 2025](https://9to5mac.com/2025/09/15/ios-26-supports-these-recent-iphones-but-drops-three-models/); [TechRadar](https://www.techradar.com/phones/ios/ios-26-compatibility-does-your-iphone-support-it-heres-the-full-list-of-supported-devices)

**StatCounter (mobile web page views; CSV pulled 6 Nov 2026, minor versions summed into major versions by me)**

| Region, month | iOS 26+ | of which iOS 27 | iOS 26 | iOS 18 | iOS 17 | iOS 16 | iOS 15 | iOS ≤14 / other |
|---|---|---|---|---|---|---|---|---|
| Worldwide, Oct 2026 | **78.18** | 17.40 | 60.78 | 15.98 | 1.72 | 2.32 | 1.41 | 0.35 |
| Worldwide, 1–5 Nov 2026 (partial) | **77.77** | 29.27 | 48.50 | 16.15 | 1.75 | 2.43 | 1.49 | ~0.4 |
| Ethiopia, Oct 2026 | **68.95** | 19.15 | 49.80 | 16.35 | 2.68 | 4.52 | 4.66 | ~2.9 |
| Kenya, Oct 2026 | **74.92** | 18.12 | 56.80 | 14.85 | 1.09 | 4.86 | 3.58 | ~0.7 |
| Africa, Oct 2026 | **72.58** | 16.69 | 55.89 | 17.21 | 1.89 | 4.54 | 3.41 | ~0.35 |

— Sources: [StatCounter: iOS version share, worldwide](https://gs.statcounter.com/ios-version-market-share/mobile/worldwide); [StatCounter: Ethiopia](https://gs.statcounter.com/ios-version-market-share/mobile/ethiopia); [StatCounter: Kenya](https://gs.statcounter.com/ios-version-market-share/mobile/kenya); [StatCounter: Africa](https://gs.statcounter.com/ios-version-market-share/mobile/africa). The data comes from the same pages' CSV export (`chart.php?...statType_hidden=ios_version...&csv=1`).

- Share of Nota's current iOS 16+ base that runs iOS 26+, from the October 2026 rows above (my arithmetic): **worldwide 79.6%** (20.4% on iOS 16–18), **Ethiopia 74.5%** (25.5% on iOS 16–18), **Kenya 78.3%** (21.7%), **Africa 75.4%** (24.6%). — derived from the [StatCounter](https://gs.statcounter.com/ios-version-market-share/mobile/ethiopia) CSVs
- Trend, with the iOS 10/11 anomalies taken out (see below). Worldwide iOS 26+ rose steadily: 72.5% (Jun), 75.1% (Jul), 76.6% (Aug), 77.4% (Sep), 78.3% (Oct 2026). Ethiopia went 64.1% (Jun), 69.6% (Jul), 63.7% (Aug), 69.2% (Sep), 69.3% (Oct). Ethiopia's share below iOS 26 has stayed at about 30–31% since July. — [StatCounter CSV, Ethiopia](https://gs.statcounter.com/ios-version-market-share/mobile/ethiopia); [worldwide](https://gs.statcounter.com/ios-version-market-share/mobile/worldwide)
- Data-quality anomalies in the Ethiopian series. "iOS 11.0" made up 29.64% in May 2026 and 14.76% in June. "iOS 10.3" made up 21.46% in the partial November 2026 month. Neither is plausible for real iPhones. With the November anomaly removed, Ethiopia's iOS 26+ share for 1–5 Nov is about 73.5% (24.8% on iOS 27). Kenya had a smaller iOS 11.0 spike, 13.08% in May 2026. — [StatCounter CSV, Ethiopia](https://gs.statcounter.com/ios-version-market-share/mobile/ethiopia); [Kenya](https://gs.statcounter.com/ios-version-market-share/mobile/kenya)
- iOS is a small slice of mobile web traffic in East Africa. In October 2026 it was **6.0%** in Ethiopia (Android 93.83%), **4.72%** in Kenya, **16.9%** across Africa and **27.58%** worldwide. — [StatCounter: mobile OS share, Ethiopia](https://gs.statcounter.com/os-market-share/mobile/ethiopia) (same CSV export)
- StatCounter's methodology caveat: "Apple's Safari anti-fingerprinting changes misreported iOS 26.2 as 18.7 and iOS 26.1 as 18.6", followed by "Patch applied on 19 Jan 2026 to correct Apple-introduced distortion." Worldwide iOS 26 went from 32.75% in January to 61.46% in February 2026 as a result. — [StatCounter worldwide page](https://gs.statcounter.com/ios-version-market-share/mobile/worldwide); context in [Daring Fireball, Jan 2026](https://daringfireball.net/2026/01/ios_26_adoption_rate_is_not_bizarrely_low) (secondary)

**TelemetryDeck (in-app analytics)**
- At the end of October 2026 (page updated 2026-11-02): **iOS 27 36.38%, iOS 26 55.01%, iOS 18 6.56%**, which puts iOS 26+ at **91.39%**. The data set is "mostly American and European apps" and leans towards small, independent developers. iPadOS is counted as iOS. No figures are given for iOS 17 or older. — [TelemetryDeck: iOS major versions](https://telemetrydeck.com/survey/apple/iOS/majorSystemVersions/)
- By minor version, at the end of October 2026: iOS 26.6 at 36.28% ("which still made it the most used version"), iOS 27.0 at 31.85%, iOS 27.2 at 8.43%, iOS 26.5 at 11.62%. — [TelemetryDeck: iOS minor versions](https://telemetrydeck.com/survey/apple/iOS/minorSystemVersions/)

**App Store availability in Ethiopia (side finding)**
- Apple's "Availability of Apple Media Services" page (published 30 Oct 2026) lists the App Store for 39 African countries, including Kenya, Uganda, Tanzania and Rwanda. **Ethiopia is not listed.** — [Apple Support: Availability of Apple Media Services](https://support.apple.com/en-us/118205)

### Inferences
- **Global, November 2026: iOS 26+ is roughly 78% to 91% of active iPhones, depending on how it is measured.** StatCounter's web measure gives about 78%, TelemetryDeck's US/EU app measure about 91%. Apple's own App Store measure was 79% in June 2026, before iOS 27, and can only have risen since. In June 2026 StatCounter read about 7 to 9 points below Apple (69.9% raw, or 72.5% without anomalies, against Apple's 79%); in February 2026 it read about 4.5 points below (61.5% against 66%). If that gap still holds, Apple's method would put November 2026 in the mid-80s. That figure is extrapolated, not published.
- **Ethiopia: about 69–74% iOS 26+ in October to early November 2026**, five to ten points below the global web figure. Within Nota's current iOS 16+ audience, about **25%** of Ethiopian iPhones are on iOS 16–18. An iOS 26 minimum would exclude them. Kenya and Africa as a whole would lose about 22–25%.
- **The Ethiopian floor looks sticky.** The share below iOS 26 has sat at about 30% since July 2026, while worldwide it kept falling. This fits a large stock of iPhones that cannot run iOS 26 (XS, XR and older, with iOS 15.8 and 16.7 together near 9% of Ethiopian iPhone traffic). Adoption over time will not convert those devices. The iOS 26 and iOS 27 device lists are the same, so iOS 27 strands no further iPhones, but the iPhone XS/XR group (capped at iOS 18) stays stranded.
- **The Ethiopia numbers rest on a thin sample.** iOS is about 6% of Ethiopian mobile web traffic, and the series shows bot-like spikes (iOS 10.3 and iOS 11.0 above 20%). Read them as about ±5 points, not as precise figures.
- **What this means for the decision:** an iOS-26-only Apple-hosted-pack path would cover about three-quarters of the Ethiopian iPhones Nota can reach today, and roughly 80–90% globally. That is high, but it is not "nearly everyone" in Nota's main market. Unless Nota accepts losing about a quarter of its Ethiopian iPhone users, it needs a second iOS path for iOS 16–25: ODR, a self-hosted download, or bundling. Since iPhones are only about 6% of Ethiopian mobile traffic, this affects a small share of Nota's total users, whom Android dominates.
- Because Ethiopia has no App Store storefront, Ethiopian iPhone owners must be using Apple accounts from other storefronts. Nota's iOS distribution, and any Apple-hosted asset packs, will reach them through those foreign storefronts. This is an inference from the availability list. It is not documented for Ethiopia specifically.

### Gaps
- Apple has published no iOS 26+ or iOS 27 usage figure dated after 7 June 2026. Going by past years, its next update would probably come in January or February 2027. No primary source gives a November 2026 count by Apple's method.
- Apple publishes no per-country iOS version data. I found no Ethiopia- or East-Africa-specific app analytics, only StatCounter's web page views, and StatCounter does not publish sample sizes per country.
- StatCounter measures page views, not devices, which weights heavy web users and Safari. TelemetryDeck measures app sessions in mostly US/EU indie apps. Neither matches "active iPhones in Ethiopia that would install Nota".
- Residual misclassification in StatCounter's "iOS 18.7" and "iOS 18.6" buckets (9.68% and 1.78% worldwide in October), from the Safari anti-fingerprinting issue, cannot be ruled out despite the 19 Jan 2026 patch. If some of that is really iOS 26, the true iOS 26+ share is higher.
- No data found on the iPhone model mix in Ethiopia, such as how many XS/XR and older devices are in use, so the share of permanently stranded devices can only be read indirectly from the iOS 15 and 16 shares.
- AppleInsider's 10 June 2026 article (iOS 18's June 2025 figures) was blocked (HTTP 403). The 82% figure for iOS 18 in June 2025 is unverified.

## What exactly do the primary sources say (quote them), and how current are they?

### Takeaway
The only official source, Apple's App Store usage page, is about five months old: it was measured on 7 June 2026, before iOS 27, and says 79% of all iPhones and 86% of recent iPhones ran iOS 26. The current data, from October and early November 2026, comes from vendors that measure traffic (StatCounter for the web, TelemetryDeck for apps). These are the primary data for their own methods, but they are not Apple figures.

### Cited Findings
- **Apple**, measured **7 Jun 2026** (page fetched 6 Nov 2026): "As measured by devices that transacted on the App Store on June 7, 2026." Then: "86 of all devices introduced in the last four years use iOS 26." and "79 of all devices use iOS 26." The % sign is drawn graphically. Status: **5 months old; predates iOS 27; latest available.** — [Apple Developer: App Store support](https://developer.apple.com/support/app-store/)
- **Apple**, measured **12 Feb 2026**: 66% of all iPhones and 74% of iPhones from the last four years on iOS 26. Status: superseded; known through secondary reporting. — [9to5Mac, 13 Feb 2026](https://9to5mac.com/2026/02/13/apple-announces-ios-26-usage-numbers-heres-how-they-compare/)
- **Apple iPhone User Guide** (current): the headings "iPhone models compatible with iOS 26" and "iPhone models compatible with iOS 27" each open with iPhone 11 and iPhone SE (2nd generation). Status: current. — [Apple: iOS 26 models](https://support.apple.com/guide/iphone/supported-models-iphe3fa5df43/26.0/ios/26.0); [Apple: iOS 27 models](https://support.apple.com/guide/iphone/supported-models-iphe3fa5df43/27.0/ios/27.0)
- **StatCounter**, **October 2026** monthly and **1–5 November 2026** partial (pulled 6 Nov 2026): the charts are titled "Mobile iOS Version Market Share Worldwide - October 2026" and "Mobile iOS Version Market Share in Ethiopia - October 2026". Methodology note: "Apple's Safari anti-fingerprinting changes misreported iOS 26.2 as 18.7 and iOS 26.1 as 18.6" and "Patch applied on 19 Jan 2026 to correct Apple-introduced distortion." Status: **current, about one week old**. — [StatCounter worldwide](https://gs.statcounter.com/ios-version-market-share/mobile/worldwide); [StatCounter Ethiopia](https://gs.statcounter.com/ios-version-market-share/mobile/ethiopia)
- **TelemetryDeck**, **end of October 2026**, page "Updated 2026-11-02": iOS 27 at 36.38%, iOS 26 at 55.01%, iOS 18 at 6.56%. The data comes from "mostly American and European apps", and iOS 19 and 26 are combined as iOS 26. Status: **current**. — [TelemetryDeck major versions](https://telemetrydeck.com/survey/apple/iOS/majorSystemVersions/)
- **Apple Media Services availability**, published **30 Oct 2026**: the Africa list (Algeria through Zimbabwe, 39 countries) does not include Ethiopia. Status: current. — [Apple Support 118205](https://support.apple.com/en-us/118205)

### Inferences
- For a decision made in November 2026, StatCounter (Ethiopia and worldwide) is the most current source with country detail. Apple's June figure is the most authoritative but stale. It is best treated as a floor for global iOS 26+, since the share only rises over time.
- Before committing, check Apple's App Store usage page again when it updates, probably early 2027, and Nota's own iOS version analytics, if Nota gathers any (its privacy promise may rule that out).

### Gaps
- No primary source quotes an iOS 26+ figure for Ethiopia or East Africa other than StatCounter's chart data. No Apple, telecom or Ethiopian developer source was found.
- Search-result summaries mentioned other secondary sites (TechLila, GadgetHacks, Croma) with adoption statistics. They were not used, because they repeat Apple or StatCounter figures without adding primary data.
