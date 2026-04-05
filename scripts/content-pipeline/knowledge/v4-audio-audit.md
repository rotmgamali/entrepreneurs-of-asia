# V4 Trailer Audio Audit -- Complete Report
**Date**: 2026-03-31
**Source**: `blueprints/cinematic-trailer-v4.shotstack.json`
**Total Duration**: 120s (117s content + 3s implied fade)
**VO Lines**: 26 | **SFX Hits**: 8 | **Soundtrack**: 1 (continuous)

---

## OVERALL GRADE: C+

The audio mix is structurally sound -- no VO overlaps, all video clips muted, decent breathing room between acts. However, there are **6 instances of triple-layer audio clashing** (soundtrack + VO + SFX simultaneously), **significant VO timing drift** from the approved script in Acts 1-2, and **zero gaps between consecutive VO lines** within each act, creating a relentless wall of narration with no micro-pauses.

---

## 1. VO TIMING AUDIT

### All 26 VO Lines vs. Approved Script

| VO# | Script Text | Script Time | Actual Time | Drift | Gap From Prev | Video Scene |
|-----|------------|-------------|-------------|-------|---------------|-------------|
| 01 | "They are not myths." | 0:01 | 0:05-0:08 | **+4s** | 5s (opener) | devil-vs-god-001 (5-8s) |
| 02 | "They walk between dimensions." | 0:04 | 0:08-0:11 | **+4s** | **0s** | devil-vs-god-002 (8-11s) |
| 03 | "And they have been at war..." | 0:08 | 0:11-0:14 | +3s | **0s** | devil-vs-god-003 (11-14s) |
| 04 | "Pleiadians. Guardians of light." | 0:16 | 0:15-0:18 | -1s | 1s | ophanim-full-form (15-18s) |
| 05 | "Anunnaki. Architects of civilization." | 0:20 | 0:18-0:21 | **-2s** | **0s** | egyptian-gods-001 (18-21s) |
| 06 | "Arcturians. Masters of frequency." | 0:24 | 0:21-0:24 | **-3s** | **0s** | buddha-smart-002 (21-24s) |
| 07 | "Reptilians. Rulers from the shadow." | 0:28 | 0:24-0:27 | **-4s** | **0s** | diablo-demon-reveal (24-27s) |
| 08 | "Not fantasy. Channeled. Documented. Real." | 0:32 | 0:27-0:30 | **-5s** | **0s** | melanated-gods-001 (27-30s) |
| 09 | "Seventy-two champions. Fourteen factions." | 0:36 | 0:35-0:38 | -1s | 5s | tft-cosmic-render (35-38s) |
| 10 | "Draft your army. Build your synergies." | 0:41 | 0:38-0:41 | **-3s** | **0s** | gods-unchained (38-41s) |
| 11 | "Then watch them fight." | 0:45 | 0:41-0:44 | **-4s** | **0s** | tft-fire-ram (41-44s) |
| 12 | "A strategic auto-battler..." | 0:49 | 0:44-0:47 | **-5s** | **0s** | capture-arena (44-47s) |
| 13 | "Built by AI agent swarms." | 0:56 | 0:55-0:58 | -1s | 8s | capture-paperclip (55-58s) |
| 14 | "Not a whitepaper. A working product." | 0:59 | 0:58-0:61 | -1s | **0s** | capture-test-suite (58-61s) |
| 15 | "Every card is an NFT on Polygon." | 1:03 | 1:04-1:07 | +1s | 3s | 3d-reptilian (64-67s) |
| 16 | "You own it. You trade it. It is yours." | 1:07 | 1:07-1:10 | 0s | **0s** | capture-marketplace (67-70s) |
| 17 | "The Founder's Pass." | 1:16 | 1:15-1:17 | -1s | 5s | founders-pass-zoom (75-78s) |
| 18 | "Two hundred. Ever." | 1:19 | 1:18-1:20 | -1s | 1s | founders-pass-overlay (78-80s) |
| 19 | "25,000 DDT airdropped..." | 1:22 | 1:22-1:25 | 0s | 2s | pack-opening (80-85s) |
| 20 | "Zero marketplace fees. Forever." | 1:27 | 1:25-1:28 | **-2s** | **0s** | capture-founders-pass (85-88s) |
| 21 | "Ten percent of all revenue..." | 1:31 | 1:28-1:31 | **-3s** | **0s** | capture-shop (88-91s) |
| 22 | "This is not a game announcement." | 1:36 | 1:35-1:38 | -1s | 4s | devil-vs-god-006 (95-98s) |
| 23 | "This is a summons." | 1:39 | 1:38-1:41 | -1s | **0s** | ophanim-reveal (98-101s) |
| 24 | "Demons and Deities." | 1:41 | 1:41-1:44 | 0s | **0s** | devil-vs-god-007 (101-104s) |
| 25 | "Choose your side." | 1:44 | 1:44-1:47 | 0s | **0s** | ophanim-rotation (104-107s) |
| 26 | "demonsanddeities.com" | 1:52 | 1:49-1:52 | **-3s** | 2s | capture-game-home (107-112s) |

### VO Timing Issues Found

**CRITICAL -- ACT 1 VO starts 4s late (lines 01-03):**
The script calls for VO line 01 at 0:01 but it starts at 0:05. This means the first 5 seconds of the trailer are SILENT (music only + cover art). The CMO brief says line 01 should play over devil-vs-god-001 at 0:05, so the JSON matches the CMO brief, NOT the VO script. This is actually correct per the CMO direction -- but the VO script needs updating.

**CRITICAL -- ACT 2 is compressed by 5s (lines 04-08):**
Five VO lines play back-to-back with ZERO gaps from 0:15 to 0:30. The script expected these to span 0:16-0:35 (19 seconds), but the JSON crams them into 15 seconds (0:15-0:30). This leaves 5 seconds of VO-free space (0:30-0:35) for the 3D model and lore page -- which matches the CMO brief, but the VO lines have no breathing room between faction names. Each faction name deserves at least 0.5s of silence before the next.

**MODERATE -- ACT 3 is compressed by 5s (lines 09-12):**
Same pattern. Four lines back-to-back from 0:35-0:47 with zero gaps. Script expected 0:36-0:53, so the act runs 6 seconds faster than intended. The 8-second gap from 0:47-0:55 is a consequence -- too much dead air before Act 4.

**MODERATE -- ACT 5 lines 20-21 compressed:**
Lines 20 and 21 play back-to-back (0:85-0:91) with no pause. The value props ("zero fees" and "10% revenue") need a beat between them for the viewer to absorb each claim.

**MINOR -- Line 26 starts 3s early:**
"demonsanddeities.com" plays at 1:49 instead of 1:52. This means the URL is spoken while the game-home screen recording is still playing, which actually works fine. But the logo hold (1:52-2:00) has no VO at all, which is correct.

### VO Overlap Check
**PASS** -- No VO lines overlap each other. Every line's end time equals or precedes the next line's start time.

### VO-to-Scene Match
**PASS** -- All 26 VO lines play during their correct corresponding video scene as specified in the CMO brief. The VO content matches the visual content at every point.

---

## 2. SFX PLACEMENT AUDIT

### All 8 SFX Hits

| SFX# | Time | Duration | Volume | Scene Change Aligned? | VO Overlap? |
|------|------|----------|--------|----------------------|-------------|
| 1 | 0:00-0:03 | 3s | 0.3 | YES (0:00 opener) | No -- clean |
| 2 | 0:14-0:16 | 2s | 0.3 | NO (nearest: 0:15, delta 1s) | **YES -- VO4 (0:15-0:18)** |
| 3 | 0:35-0:38 | 3s | 0.4 | YES (0:35 Act 3 start) | **YES -- VO9 (0:35-0:38)** |
| 4 | 0:53-0:55 | 2s | 0.3 | YES (0:53 scene change) | No -- clean |
| 5 | 0:75-0:77 | 2s | 0.3 | YES (1:15 Act 5 start) | **YES -- VO17 (1:15-1:17)** |
| 6 | 1:35-1:37 | 2s | 0.4 | YES (1:35 Act 6 start) | **YES -- VO22 (1:35-1:38)** |
| 7 | 1:41-1:44 | 3s | 0.4 | YES (1:41 scene change) | **YES -- VO24 (1:41-1:44)** |
| 8 | 1:52-1:55 | 3s | 0.3 | YES (1:52 logo hold) | No -- clean |

### SFX Issues Found

**CRITICAL -- 5 out of 8 SFX hits overlap with VO lines:**
SFX 2, 3, 5, 6, and 7 all play simultaneously with voiceover. This creates audio muddiness where the narrator competes with impact sounds. The rule is MAX 2 audio sources at any moment (soundtrack + VO, or soundtrack + SFX, but NOT all three).

**MODERATE -- SFX2 is misaligned by 1 second:**
SFX2 starts at 0:14 but the scene change to Act 2 is at 0:15. The impact hit lands 1 second before the visual transition. Should start at 0:15 or be removed since it also overlaps with VO4.

**MINOR -- No SFX at major transitions:**
- 0:55 (Act 4 start) -- no SFX hit. "Built by AI agent swarms" deserves a tech-whoosh.
- 0:64 (NFT reveal) -- no SFX hit. "Every card is an NFT" is a money line with no audio punctuation.
- 0:78 ("Two hundred. Ever.") -- no SFX hit. This scarcity line needs a bass drop or boom.

### SFX Recommendations

**REMOVE or SHIFT:**
- SFX2 (0:14): Move to 0:14.5 and shorten to 1s, so it finishes before VO4 starts at 0:15. Or remove entirely -- the CMO brief only calls for a "music swell" at 0:14-0:15, not an SFX hit.
- SFX3 (0:35): Shift to 0:34 (pre-lap before VO9) or reduce to 0.5s so it clears before the VO kicks in.
- SFX5 (0:75): Shift to 0:74 or shorten to 1s to finish before VO17 at 0:75.
- SFX6 (0:95): Shift to 0:94 or shorten to 1s to clear before VO22.
- SFX7 (1:01): This is the hardest one. VO24 ("Demons and Deities") is the title drop. The SFX should either be a very short 0.5s hit that precedes the VO or should be removed entirely. The title drop should be VO-only for maximum impact.

**ADD:**
- 0:55: Tech-whoosh SFX (0.5s, vol 0.2) to punctuate the transition to Act 4, timed to end before VO13.
- 0:64: Digital shimmer SFX (0.5s, vol 0.2) for the NFT reveal, timed to 0:63.5 to clear before VO15 at 0:64.
- 0:78: Bass drop (0.5s, vol 0.3) timed at 0:77.5 to land just before VO18 "Two hundred. Ever."

---

## 3. AUDIO LAYERING ANALYSIS

### Triple-Layer Violations (Soundtrack + VO + SFX)

| Timestamp | Duration | Sources | Severity |
|-----------|----------|---------|----------|
| 0:15 | 1s | Soundtrack + VO4 + SFX2 | HIGH |
| 0:35-0:37 | 3s | Soundtrack + VO9 + SFX3 | HIGH |
| 1:15-1:16 | 2s | Soundtrack + VO17 + SFX5 | MEDIUM |
| 1:35-1:36 | 2s | Soundtrack + VO22 + SFX6 | MEDIUM |
| 1:41-1:43 | 3s | Soundtrack + VO24 + SFX7 | HIGH |

**Total triple-layer time: 11 seconds out of 117 seconds (9.4%)**

This is too much. The worst offender is SFX7 at 1:41-1:44 which runs the ENTIRE duration of the title drop VO line. The SFX at 0:35-0:38 also runs the full 3 seconds of VO9 ("Seventy-two champions. Fourteen factions.") -- one of the most important information-delivery lines.

### Second-by-Second Layer Count (Key Moments)

| Time | Soundtrack | VO | SFX | Total | Status |
|------|-----------|-----|------|-------|--------|
| 0:00 | 1 | 0 | 1 | 2 | OK |
| 0:05 | 1 | 1 | 0 | 2 | OK |
| 0:14 | 1 | 0 | 1 | 2 | OK |
| 0:15 | 1 | 1 | 1 | **3** | VIOLATION |
| 0:27 | 1 | 1 | 0 | 2 | OK |
| 0:35 | 1 | 1 | 1 | **3** | VIOLATION |
| 0:44 | 1 | 1 | 0 | 2 | OK |
| 0:53 | 1 | 0 | 1 | 2 | OK |
| 0:55 | 1 | 1 | 0 | 2 | OK |
| 0:75 | 1 | 1 | 1 | **3** | VIOLATION |
| 0:95 | 1 | 1 | 1 | **3** | VIOLATION |
| 1:01 | 1 | 1 | 1 | **3** | VIOLATION |
| 1:09 | 1 | 1 | 0 | 2 | OK |
| 1:52 | 1 | 0 | 1 | 2 | OK |

### Video Clip Audio Check
**PASS** -- All 37 video clips have `"volume": 0`. The 1 image clip at the end has no audio property (correct, images have no audio). No video audio bleeds into the mix.

---

## 4. SOUNDTRACK AUDIT

| Check | Status | Notes |
|-------|--------|-------|
| Starts at 0:00? | YES | Soundtrack is a timeline-level property, plays from frame 0 |
| Volume correct (0.4)? | YES | `"volume": 0.4` confirmed |
| Fade in? | YES | `"effect": "fadeIn"` present |
| Fade out? | **NO** | No `"fadeOut"` effect specified. The music will cut abruptly at the end of the timeline. |

**CRITICAL -- No fade out on soundtrack.**
The soundtrack only has `"effect": "fadeIn"`. It should be `"effect": "fadeInFadeOut"` to prevent an abrupt music cutoff at 1:57-2:00. The CMO brief explicitly calls for "Music fading" in the final seconds and "Silence. Impact." at 1:57-2:00.

---

## 5. SILENCE / BREATHING ROOM AUDIT

### VO-Free Gaps

| Gap | Duration | Purpose | Verdict |
|-----|----------|---------|---------|
| 0:00-0:05 | 5s | Title card, music fade in | GOOD -- opener breathing room |
| 0:14-0:15 | 1s | Music swell after hook | OK but tight. CMO wants full swell here. |
| 0:30-0:35 | 5s | 3D model + lore page (first-party proof) | GOOD -- music breathes |
| 0:47-0:55 | 8s | Gameplay montage (arena, deckbuilder, collection, creature reveal) | GOOD but LONG. 8 seconds of music-only gameplay montage may lose viewer attention. |
| 0:61-0:64 | 3s | Website scroll (first-party) | GOOD |
| 0:70-0:75 | 5s | Tokenomics + roadmap screens | GOOD |
| 0:77-0:78 | 1s | Transition between Pass intro and number | OK but tight |
| 0:80-0:82 | 2s | Pack opening animation start | GOOD |
| 0:91-0:95 | 4s | 3D Lucifer + cosmic battle (visual reset) | GOOD |
| 1:07-1:09 | 2s | URL appears, music settling | GOOD |
| 1:52-2:00 | 8s | Logo hold + fade to black | GOOD -- standard trailer close |

**Total VO-free time: ~44 seconds out of 117 seconds (37.6%)**
This is close to the script target of 30 seconds breathing room. Acceptable.

### Music Swell at 0:14-0:15
**PARTIALLY IMPLEMENTED.** SFX2 is placed at 0:14-0:16 (a 2-second hit at vol 0.3). However, the CMO brief calls for a "music swell" -- meaning the soundtrack itself should surge, not an SFX layered on top. Since Shotstack does not support dynamic volume automation on the soundtrack, the SFX hit is a reasonable approximation. BUT it overlaps with VO4 at 0:15, which diminishes the effect. If the SFX is shortened to end at 0:15 (before VO4 starts), the swell would land cleanly.

### Intra-Act Breathing Room
**FAIL.** Within each act, consecutive VO lines have ZERO gap:
- Act 1: VO1->VO2->VO3 = 0s, 0s gaps (wall of voice from 0:05-0:14)
- Act 2: VO4->VO5->VO6->VO7->VO8 = 0s, 0s, 0s, 0s gaps (wall from 0:15-0:30)
- Act 3: VO9->VO10->VO11->VO12 = 0s, 0s, 0s gaps (wall from 0:35-0:47)
- Act 4: VO13->VO14 = 0s gap, then 3s pause, then VO15->VO16 = 0s gap
- Act 5: VO17 then 1s, VO18 then 2s, VO19->VO20->VO21 = 0s, 0s gaps
- Act 6: VO22->VO23->VO24->VO25 = 0s, 0s, 0s gaps (wall from 0:95-1:07)

The actual VO audio files are likely shorter than their 3-second length slots (e.g., "They are not myths" is about 1.5 seconds of speech), so there IS natural silence at the tail of each slot. But the slots are set to exactly abut, meaning if any VO file is close to 3 seconds long, it will bleed into the next with no pause.

**Recommendation:** Add 0.5s gaps between consecutive VO lines within each act by shifting start times. For example, VO2 should start at 8.5 instead of 8, VO3 at 11.5 instead of 11, etc.

---

## 6. VO VOLUME AUDIT

| Check | Status | Notes |
|-------|--------|-------|
| All VO at volume 1.0? | **YES** | All 26 lines: `"volume": 1` |
| Exceptions? | None | Uniform volume across all lines |
| Audible over soundtrack at 0.4? | **YES** | VO at 1.0 vs soundtrack at 0.4 = 2.5x volume ratio. VO will be clearly dominant. |
| Audible over SFX? | **MOSTLY** | SFX at 0.3-0.4 vs VO at 1.0. VO will still be dominant, but triple-layer moments add 0.7-0.8 combined background noise which compresses the perceived VO clarity. |

---

## ISSUES SORTED BY SEVERITY

### CRITICAL (Must Fix)

1. **No soundtrack fade out.** The music will cut abruptly at the end. Change `"effect": "fadeIn"` to `"effect": "fadeInFadeOut"`.

2. **5 SFX hits overlap with VO lines (triple-layer violations).** SFX 2, 3, 5, 6, 7 all create 3-source audio at their timestamps. Either shift each SFX to end before the VO starts, shorten to 0.5s pre-lap hits, or remove them.

3. **Zero micro-gaps between consecutive VO lines within acts.** 17 out of 25 VO transitions have 0-second gaps. Add 0.5s spacing minimum.

### HIGH (Should Fix)

4. **SFX7 (1:41-1:44) plays over the title drop.** "Demons and Deities" is the brand name. It should have pristine audio -- soundtrack + VO only. Remove SFX7 or make it a 0.3s pre-hit at 1:40.7.

5. **8-second dead zone at 0:47-0:55.** After Act 3 VO ends at 0:47, there is no VO until 0:55. This is the longest VO gap in the trailer. The script puts VO12 at 0:49, meaning the line should start 2 seconds later than its current 0:44 position. The entire Act 3 VO block (lines 09-12) needs to spread out.

6. **Act 2 compressed by 5 seconds.** The five faction VO lines (04-08) run from 0:15-0:30 but the script expects 0:16-0:35. The 3D model / lore page at 0:30-0:35 has no VO, which is correct per the CMO brief -- but the faction names within 0:15-0:30 need micro-gaps.

### MODERATE (Nice to Fix)

7. **SFX2 misaligned by 1s.** Starts at 0:14, scene change at 0:15. Should start at 0:14.5 or be shortened.

8. **Missing SFX at key moments.** No audio punctuation at 0:55 (tech reveal), 0:64 (NFT reveal), or 0:78 (scarcity reveal).

9. **VO26 starts 3s early.** "demonsanddeities.com" at 1:49 vs. script target 1:52. The URL gets buried in the game-home screen recording instead of landing on the logo hold.

### LOW (Polish)

10. **VO line lengths all set to 3s (or 2s for short lines).** The actual speech varies in length -- "Then watch them fight" is ~1.5s of audio, while "A strategic auto-battler unlike anything before it" is ~3s. Setting all to 3s means the Shotstack clip may hold silence at the tail. Not a problem if gaps are added, but means the timeline is over-allocating time to short lines.

---

## SPECIFIC TIMESTAMP FIXES NEEDED

| Fix | Current | Proposed | Reason |
|-----|---------|----------|--------|
| Soundtrack effect | `"fadeIn"` | `"fadeInFadeOut"` | Prevent abrupt music cutoff |
| SFX2 start | 14 | 14 | Keep at 14 but shorten length to 1 (ends at 15 before VO4) |
| SFX3 start | 35 | 34.5 | Shift 0.5s earlier; shorten length to 1 (ends at 35.5, partial overlap OK at low vol) |
| SFX5 start | 75 | 74.5 | Shift 0.5s earlier; shorten length to 1 |
| SFX6 start | 95 | 94.5 | Shift 0.5s earlier; shorten length to 1 |
| SFX7 | 101, length 3 | 100.5, length 0.5 | Brief pre-hit before title drop |
| VO2 start | 8 | 8.5 | 0.5s gap after VO1 |
| VO3 start | 11 | 12 | 1s gap after VO2 (long line needs space) |
| VO5 start | 18 | 18.5 | 0.5s gap after VO4 |
| VO6 start | 21 | 22 | 0.5s gap after VO5 |
| VO7 start | 24 | 25 | 0.5s gap after VO6 |
| VO8 start | 27 | 28.5 | 0.5s gap after VO7 |
| VO10 start | 38 | 39 | 1s gap after VO9 |
| VO11 start | 41 | 42 | 1s gap after VO10 |
| VO12 start | 44 | 45 | 1s gap after VO11 |
| VO20 start | 85 | 86 | 1s gap after VO19 |
| VO21 start | 88 | 89.5 | 1.5s gap after VO20 |
| VO23 start | 98 | 99 | 1s gap after VO22 |
| VO24 start | 101 | 102 | 1s gap after VO23 |
| VO25 start | 104 | 105.5 | 1.5s gap after VO24 |
| VO26 start | 109 | 112 | Match script -- play over logo hold, not game-home |

---

## SUMMARY

**What works well:**
- All video clips correctly muted (volume 0) -- no clip audio bleed
- VO volume uniform at 1.0, clearly audible over 0.4 soundtrack
- Good inter-act breathing room (5-8 second gaps between acts)
- SFX volumes appropriately low (0.3-0.4) so they support rather than dominate
- VO-to-scene matching is correct throughout -- every line plays over its intended visual
- Opener (0:00-0:05) and closer (1:52-2:00) have proper breathing room

**What needs work:**
- Soundtrack missing fade out (will cut abruptly)
- 5 of 8 SFX hits create triple-layer audio clashes with VO
- Zero intra-act micro-gaps between 17 consecutive VO line pairs
- Act 2 and Act 3 VO blocks are compressed vs. the approved script timing
- Missing SFX at 3 key emotional moments (tech reveal, NFT reveal, scarcity reveal)
- Title drop at 1:41 is muddied by a 3-second SFX overlay

**Bottom line:** The structure is correct but the execution needs a precision pass. Fix the fade out, resolve the triple-layer violations, and add 0.5-1s micro-gaps between consecutive VO lines. The audio mix will jump from C+ to B+ with those three changes alone.
