# V4 Trailer Timing & Transitions Audit

**File**: `blueprints/cinematic-trailer-v4.shotstack.json`
**Date**: 2026-03-31
**Auditor**: Timing & Transitions Agent

---

## TRACK LAYOUT SUMMARY

| Track | Type | Clip Count |
|-------|------|------------|
| 0 | Image overlays (logo PNG, founders-pass PNG) | 2 |
| 1 | VO audio lines | 26 |
| 2 | SFX audio | 8 |
| 3 | Text overlays (HTML) | 14 |
| 4 | Video base layer + 1 closing image | 38 video + 1 image |

---

## 1. CLIP DURATION VS SOURCE DURATION (FREEZE RISK)

### Video Track -- Full Clip-by-Clip Analysis

| # | Asset Name | Start | Length | End | Source Duration | Trim | FREEZE RISK |
|---|-----------|-------|--------|-----|----------------|------|-------------|
| 1 | cover-art-p2v | 0.0 | 5.0 | 5.0 | 5.1s | no | OK (5 < 5.1) |
| 2 | devil-vs-god-001 | 5.0 | 3.0 | 8.0 | 3.0s | 0.1 | **FREEZE** (needs 3.1s, only 3.0s available) |
| 3 | devil-vs-god-002 | 8.0 | 3.0 | 11.0 | 3.0s | 0.1 | **FREEZE** (needs 3.1s, only 3.0s available) |
| 4 | devil-vs-god-003 | 11.0 | 3.0 | 14.0 | 3.0s | 0.1 | **FREEZE** (needs 3.1s, only 3.0s available) |
| 5 | ophanim-full-form | 15.0 | 3.0 | 18.0 | 3.0s | 0.1 | **FREEZE** (needs 3.1s, only 3.0s available) |
| 6 | egyptian-gods-001 | 18.0 | 3.0 | 21.0 | 3.0s | 0.1 | **FREEZE** (needs 3.1s, only 3.0s available) |
| 7 | buddha-smart-002 | 21.0 | 3.0 | 24.0 | 3.0s | 0.1 | **FREEZE** (needs 3.1s, only 3.0s available) |
| 8 | diablo-demon-reveal | 24.0 | 3.0 | 27.0 | 3.0s | 0.1 | **FREEZE** (needs 3.1s, only 3.0s available) |
| 9 | melanated-gods-001 | 27.0 | 3.0 | 30.0 | 3.0s | 0.1 | **FREEZE** (needs 3.1s, only 3.0s available) |
| 10 | 3d-pleiadian | 30.0 | 2.0 | 32.0 | 8.0s | no | OK |
| 11 | capture-lore | 32.0 | 3.0 | 35.0 | 8.0s+ | no | OK |
| 12 | tft-cosmic-render | 35.0 | 3.0 | 38.0 | 3-4s | 0.1 | MARGINAL (likely OK if source is 4s; freeze if 3s) |
| 13 | gods-unchained-tides-001 | 38.0 | 3.0 | 41.0 | 3.0s | 0.1 | **FREEZE** (needs 3.1s, only 3.0s available) |
| 14 | tft-fire-ram | 41.0 | 3.0 | 44.0 | 3-4s | 0.1 | MARGINAL (same as #12) |
| 15 | UNKNOWN (4mnmf) | 44.0 | 3.0 | 47.0 | UNKNOWN | no | UNKNOWN -- not in asset inventory |
| 16 | capture-deckbuilder | 47.0 | 3.0 | 50.0 | 8.0s+ | no | OK |
| 17 | UNKNOWN (4med7) | 50.0 | 3.0 | 53.0 | UNKNOWN | no | UNKNOWN -- not in asset inventory |
| 18 | illuvium-creature-reveal | 53.0 | 2.0 | 55.0 | 3.0s | 0.1 | OK (2.0 < 2.9 available) |
| 19 | capture-paperclip-agents | 55.0 | 3.0 | 58.0 | 8.0s+ | no | OK |
| 20 | capture-test-suite | 58.0 | 3.0 | 61.0 | 8.0s+ | no | OK |
| 21 | capture-website | 61.0 | 3.0 | 64.0 | 8.0s+ | no | OK |
| 22 | 3d-reptilian | 64.0 | 3.0 | 67.0 | 8.0s | no | OK |
| 23 | UNKNOWN (4mq3d) | 67.0 | 3.0 | 70.0 | UNKNOWN | no | UNKNOWN -- not in asset inventory |
| 24 | capture-tokenomics | 70.0 | 3.0 | 73.0 | 8.0s+ | no | OK |
| 25 | capture-roadmap | 73.0 | 2.0 | 75.0 | 8.0s+ | no | OK |
| 26 | founders-pass-zoom | 75.0 | 3.0 | 78.0 | 5.0s | no | OK |
| 27 | devil-vs-god-004 | 78.0 | 2.0 | 80.0 | 3.0s | 0.1 | OK (2.0 < 2.9 available) |
| 28 | pack-opening | 80.0 | 5.0 | 85.0 | 6.0s | no | OK |
| 29 | capture-founders-pass | 85.0 | 3.0 | 88.0 | 8.0s+ | no | OK |
| 30 | UNKNOWN (4mm4c) | 88.0 | 3.0 | 91.0 | UNKNOWN | no | UNKNOWN -- not in asset inventory |
| 31 | 3d-lucifer | 91.0 | 2.0 | 93.0 | 8.0s | no | OK |
| 32 | devil-vs-god-005 | 93.0 | 2.0 | 95.0 | 3.0s | 0.1 | OK (2.0 < 2.9 available) |
| 33 | devil-vs-god-006 | 95.0 | 3.0 | 98.0 | 3.0s | 0.1 | **FREEZE** (needs 3.1s, only 3.0s available) |
| 34 | ophanim-reveal | 98.0 | 3.0 | 101.0 | 3.0s | 0.1 | **FREEZE** (needs 3.1s, only 3.0s available) |
| 35 | devil-vs-god-007 | 101.0 | 3.0 | 104.0 | 3.0s | 0.1 | **FREEZE** (needs 3.1s, only 3.0s available) |
| 36 | ophanim-rotation | 104.0 | 3.0 | 107.0 | 3.0s | 0.1 | **FREEZE** (needs 3.1s, only 3.0s available) |
| 37 | capture-game-home | 107.0 | 5.0 | 112.0 | 8.0s+ | no | OK |
| 38 | dd-logo-text (IMAGE) | 112.0 | 5.0 | 117.0 | static | fade | OK (static image) |

### FREEZE SUMMARY

**12 CONFIRMED FREEZE-FRAME CLIPS**: #2, #3, #4, #5, #6, #7, #8, #9, #13, #33, #34, #35, #36

**Root cause**: All YouTube-extracted clips are exactly 3.0s. Setting `trim: 0.1` means playback starts at 0.1s, so only 2.9s of video remains. But `length: 3.0` tells Shotstack to play for 3.0 seconds. The last 0.1s has no video frames, causing a freeze on the final frame.

**2 MARGINAL CLIPS**: #12 (tft-cosmic-render), #14 (tft-fire-ram) -- if TFT clips are 3s source, these also freeze.

**4 UNIDENTIFIED CLIPS**: #15, #17, #23, #30 -- source IDs not found in `clips/v4-asset-inventory.json`. Cannot verify duration.

### FIX for all freeze clips

For every clip with `trim: 0.1` and `length: 3.0` from a 3.0s source:
- **Option A** (recommended): Remove the `trim` property entirely. Let clip play from frame 0.
- **Option B**: Reduce `length` from 3.0 to 2.9. This shortens the clip but avoids freeze. Requires adjusting all subsequent start times.
- **Option C**: Keep trim but set `length: 2.9` and fill the 0.1s gap with a hard cut from the next clip.

---

## 2. GAPS IN VIDEO TRACK

Checking consecutive clips for timing gaps where only the background (#0a0a0f) shows:

| Gap # | Between | Gap Start | Gap End | Duration | Issue |
|-------|---------|-----------|---------|----------|-------|
| 1 | cover-art-p2v (ends 5.0) -> devil-vs-god-001 (starts 5.0) | -- | -- | 0s | OK, no gap |
| 2 | devil-vs-god-001 (ends 8.0) -> devil-vs-god-002 (starts 8.0) | -- | -- | 0s | OK |
| 3 | devil-vs-god-002 (ends 11.0) -> devil-vs-god-003 (starts 11.0) | -- | -- | 0s | OK |
| **4** | **devil-vs-god-003 (ends 14.0) -> ophanim-full-form (starts 15.0)** | **14.0** | **15.0** | **1.0s** | **GAP -- black frame for 1 full second** |
| 5 | ophanim-full-form (ends 18.0) -> egyptian-gods-001 (starts 18.0) | -- | -- | 0s | OK |
| 6 | egyptian-gods-001 (ends 21.0) -> buddha-smart-002 (starts 21.0) | -- | -- | 0s | OK |
| 7 | buddha-smart-002 (ends 24.0) -> diablo-demon-reveal (starts 24.0) | -- | -- | 0s | OK |
| 8 | diablo-demon-reveal (ends 27.0) -> melanated-gods-001 (starts 27.0) | -- | -- | 0s | OK |
| 9 | melanated-gods-001 (ends 30.0) -> 3d-pleiadian (starts 30.0) | -- | -- | 0s | OK |
| 10 | 3d-pleiadian (ends 32.0) -> capture-lore (starts 32.0) | -- | -- | 0s | OK |
| 11 | capture-lore (ends 35.0) -> tft-cosmic-render (starts 35.0) | -- | -- | 0s | OK |
| 12 | tft-cosmic-render (ends 38.0) -> gods-unchained-tides-001 (starts 38.0) | -- | -- | 0s | OK |
| 13 | gods-unchained-tides-001 (ends 41.0) -> tft-fire-ram (starts 41.0) | -- | -- | 0s | OK |
| 14 | tft-fire-ram (ends 44.0) -> UNKNOWN-4mnmf (starts 44.0) | -- | -- | 0s | OK |
| 15 | UNKNOWN-4mnmf (ends 47.0) -> capture-deckbuilder (starts 47.0) | -- | -- | 0s | OK |
| 16 | capture-deckbuilder (ends 50.0) -> UNKNOWN-4med7 (starts 50.0) | -- | -- | 0s | OK |
| 17 | UNKNOWN-4med7 (ends 53.0) -> illuvium-creature-reveal (starts 53.0) | -- | -- | 0s | OK |
| 18 | illuvium-creature-reveal (ends 55.0) -> capture-paperclip-agents (starts 55.0) | -- | -- | 0s | OK |
| 19 | capture-paperclip-agents (ends 58.0) -> capture-test-suite (starts 58.0) | -- | -- | 0s | OK |
| 20 | capture-test-suite (ends 61.0) -> capture-website (starts 61.0) | -- | -- | 0s | OK |
| 21 | capture-website (ends 64.0) -> 3d-reptilian (starts 64.0) | -- | -- | 0s | OK |
| 22 | 3d-reptilian (ends 67.0) -> UNKNOWN-4mq3d (starts 67.0) | -- | -- | 0s | OK |
| 23 | UNKNOWN-4mq3d (ends 70.0) -> capture-tokenomics (starts 70.0) | -- | -- | 0s | OK |
| 24 | capture-tokenomics (ends 73.0) -> capture-roadmap (starts 73.0) | -- | -- | 0s | OK |
| 25 | capture-roadmap (ends 75.0) -> founders-pass-zoom (starts 75.0) | -- | -- | 0s | OK |
| 26 | founders-pass-zoom (ends 78.0) -> devil-vs-god-004 (starts 78.0) | -- | -- | 0s | OK |
| 27 | devil-vs-god-004 (ends 80.0) -> pack-opening (starts 80.0) | -- | -- | 0s | OK |
| 28 | pack-opening (ends 85.0) -> capture-founders-pass (starts 85.0) | -- | -- | 0s | OK |
| 29 | capture-founders-pass (ends 88.0) -> UNKNOWN-4mm4c (starts 88.0) | -- | -- | 0s | OK |
| 30 | UNKNOWN-4mm4c (ends 91.0) -> 3d-lucifer (starts 91.0) | -- | -- | 0s | OK |
| 31 | 3d-lucifer (ends 93.0) -> devil-vs-god-005 (starts 93.0) | -- | -- | 0s | OK |
| 32 | devil-vs-god-005 (ends 95.0) -> devil-vs-god-006 (starts 95.0) | -- | -- | 0s | OK |
| 33 | devil-vs-god-006 (ends 98.0) -> ophanim-reveal (starts 98.0) | -- | -- | 0s | OK |
| 34 | ophanim-reveal (ends 101.0) -> devil-vs-god-007 (starts 101.0) | -- | -- | 0s | OK |
| 35 | devil-vs-god-007 (ends 104.0) -> ophanim-rotation (starts 104.0) | -- | -- | 0s | OK |
| 36 | ophanim-rotation (ends 107.0) -> capture-game-home (starts 107.0) | -- | -- | 0s | OK |
| 37 | capture-game-home (ends 112.0) -> dd-logo-text IMAGE (starts 112.0) | -- | -- | 0s | OK |

### GAP SUMMARY

**1 gap found**: 14.0s - 15.0s (1.0 second of black)

Per the VO script, this is the intentional "music swell" pause between Act 1 and Act 2. The storyboard specifies a 0.3s black cut at 14.7s-15.0s, but v4 has a full 1.0s gap. This is **0.7s longer than intended** but may be acceptable for dramatic pause.

**FIX** (if desired): Add a filler clip from 14.0-15.0s (e.g., extend devil-vs-god-003 to length 4, or insert a 1s ophanim clip). Or reduce gap to 0.3s as the storyboard specifies.

---

## 3. TEXT-VO SYNC ANALYSIS

### VO Audio Placement (Track 1) vs Text Overlay (Track 3)

| VO# | VO Start | VO Script Text | VO Script Timestamp | Text Start | Text Content | Sync Status |
|-----|----------|---------------|---------------------|------------|-------------|-------------|
| 01 | 5.0 | "They are not myths." | 0:01 (1s) | -- | (no matching text) | **MISALIGNED** -- VO at 5s, script says 1s. 4s late. |
| 02 | 8.0 | "They walk between dimensions." | 0:04 (4s) | -- | (no matching text) | **MISALIGNED** -- VO at 8s, script says 4s. 4s late. |
| 03 | 11.0 | "And they have been at war..." | 0:08 (8s) | -- | (no matching text) | **MISALIGNED** -- VO at 11s, script says 8s. 3s late. |
| 04 | 15.0 | "Pleiadians. Guardians of light." | 0:16 (16s) | 15.0 | "PLEIADIANS" | **CLOSE** -- VO 1s early vs script. Text synced to VO. |
| 05 | 18.0 | "Anunnaki. Architects of civilization." | 0:20 (20s) | 18.0 | "ANUNNAKI" | **CLOSE** -- VO 2s early vs script. Text synced to VO. |
| 06 | 21.0 | "Arcturians. Masters of frequency." | 0:24 (24s) | 21.0 | "ARCTURIANS" | **CLOSE** -- VO 3s early vs script. Text synced to VO. |
| 07 | 24.0 | "Reptilians. Rulers from the shadow." | 0:28 (28s) | 24.0 | "REPTILIANS" | **CLOSE** -- VO 4s early vs script. Text synced to VO. |
| 08 | 27.0 | "Not fantasy. Channeled. Documented. Real." | 0:32 (32s) | -- | (no matching text) | **MISSING TEXT** -- important line has no text overlay. |
| 09 | 35.0 | "72 champions. 14 factions." | 0:36 (36s) | 35.0 | "72 CHAMPIONS / 14 FACTIONS" | **CLOSE** -- VO 1s early. Text synced to VO. |
| 10 | 38.0 | "Draft your army. Build your synergies." | 0:41 (41s) | -- | (no matching text) | **MISSING TEXT** |
| 11 | 41.0 | "Then watch them fight." | 0:45 (45s) | -- | (no matching text) | **MISSING TEXT** |
| 12 | 44.0 | "A strategic auto-battler..." | 0:49 (49s) | -- | (no matching text) | **MISSING TEXT** |
| 13 | 55.0 | "Built by AI agent swarms." | 0:56 (56s) | 55.0 | "BUILT BY AI AGENT SWARMS" | **CLOSE** -- VO 1s early. Text synced to VO. |
| 14 | 58.0 | "Not a whitepaper. A working product." | 0:59 (59s) | -- | (no matching text) | **MISSING TEXT** |
| 15 | 64.0 | "Every card is an NFT on Polygon." | 1:03 (63s) | 64.0 | "EVERY CARD IS AN NFT" | **CLOSE** -- VO 1s late. Text synced to VO. |
| 16 | 67.0 | "You own it. You trade it. It is yours." | 1:07 (67s) | -- | (no matching text) | **MISSING TEXT** |
| 17 | 75.0 | "The Founder's Pass." | 1:16 (76s) | -- | (no matching text) | **CLOSE** -- VO 1s early. But NO text for this line. |
| 18 | 78.0 | "Two hundred. Ever." | 1:19 (79s) | 78.0 | "200 EVER" | **SYNCED** to VO. 1s early vs script. |
| 19 | 82.0 | "25K DDT airdropped..." | 1:22 (82s) | -- | (no matching text) | **MISSING TEXT** |
| 20 | 85.0 | "Zero marketplace fees. Forever." | 1:27 (87s) | 85.0 | "ZERO MARKETPLACE FEES FOREVER" | **SYNCED** to VO. 2s early vs script. |
| 21 | 88.0 | "10% of all revenue. Shared with you." | 1:31 (91s) | -- | (no matching text) | **MISSING TEXT** |
| 22 | 95.0 | "This is not a game announcement." | 1:36 (96s) | -- | (no matching text) | **MISSING TEXT** |
| 23 | 98.0 | "This is a summons." | 1:39 (99s) | -- | (no matching text) | **MISSING TEXT** |
| 24 | 101.0 | "Demons and Deities." | 1:44 (104s) | 101.0 | "DEMONS AND DEITIES" | **CLOSE** -- VO 3s early vs script. Text synced to VO. |
| 25 | 104.0 | "Choose your side." | 1:48 (108s) | 104.0 | "CHOOSE YOUR SIDE" | **CLOSE** -- VO 4s early vs script. Text synced to VO. |
| 26 | 109.0 | "demonsanddeities.com" | 1:52 (112s) | 107.0 | "demonsanddeities.com" | **PARTIAL** -- text appears 2s BEFORE VO. Text length 13s. |

### TEXT-VO SYNC SUMMARY

**VO timing vs script**: The entire trailer compresses the VO script. Act 1 VO lines are shifted 3-4s late (starting at 5s instead of 1s). Acts 2-6 shift VO lines 1-4s earlier than the script. This means the v4 trailer has been independently re-timed rather than following the script timestamps.

**Missing text overlays for VO lines**: Lines 01, 02, 03, 08, 10, 11, 12, 14, 16, 17, 19, 21, 22, 23 (14 of 26 lines have NO text overlay). The storyboard calls for ~28 text overlays; v4 only has 14.

**Text present without matching VO**: 
- "DEMONS AND DEITIES" title at 2.0-7.0s (no VO at that time -- this is the logo reveal)
- "COSMIC AUTO BATTLER" subtitle at 5.0-8.0s 
- "DDT TOKEN / POLYGON BLOCKCHAIN" at 70.0-73.0s (no direct VO match)

### Text Overlap Check

| Text A | Text A Range | Text B | Text B Range | Overlap |
|--------|-------------|--------|-------------|---------|
| "DEMONS AND DEITIES" | 2.0-7.0 | "COSMIC AUTO BATTLER" | 5.0-8.0 | **OVERLAP 5.0-7.0** (2s) -- INTENTIONAL (title+subtitle) |
| "DEMONS AND DEITIES" (CTA) | 101.0-104.0 | "CHOOSE YOUR SIDE" | 104.0-107.0 | No overlap (sequential) |
| "CHOOSE YOUR SIDE" | 104.0-107.0 | "demonsanddeities.com" | 107.0-120.0 | No overlap (sequential) |

No unintentional text overlaps found.

### Text Readability Duration Check

| Text | Duration | Min Required | Status |
|------|----------|-------------|--------|
| "DEMONS AND DEITIES" (title) | 5.0s | 2.0s | OK |
| "COSMIC AUTO BATTLER" | 3.0s | 2.0s | OK |
| "PLEIADIANS" | 3.0s | 2.0s | OK |
| "ANUNNAKI" | 3.0s | 2.0s | OK |
| "ARCTURIANS" | 3.0s | 2.0s | OK |
| "REPTILIANS" | 3.0s | 2.0s | OK |
| "72 CHAMPIONS / 14 FACTIONS" | 3.0s | 3.0s | OK (just barely) |
| "BUILT BY AI AGENT SWARMS" | 3.0s | 3.0s | OK (just barely) |
| "EVERY CARD IS AN NFT" | 3.0s | 3.0s | OK (just barely) |
| "DDT TOKEN / POLYGON BLOCKCHAIN" | 3.0s | 3.0s | OK |
| "200 EVER" | 2.0s | 2.0s | OK (minimum) |
| "ZERO MARKETPLACE FEES FOREVER" | 3.0s | 3.0s | OK |
| "DEMONS AND DEITIES" (CTA) | 3.0s | 2.0s | OK |
| "CHOOSE YOUR SIDE" | 3.0s | 2.0s | OK |
| "demonsanddeities.com" | 13.0s | 3.0s | OK (very generous) |

All text durations meet minimum readability thresholds.

---

## 4. IMAGE OVERLAY TIMING

### Track 0 -- Image Overlays

| Image | Asset | Start | Length | End | Expected Timing | Status |
|-------|-------|-------|--------|-----|-----------------|--------|
| dd-logo-text (PNG) | source.png | 2.0 | 5.0 | 7.0 | During cover-art-p2v opening (0-5s) | **PARTIALLY CORRECT** -- logo starts at 2s (good delay), but extends to 7s while video moves to devil-vs-god at 5s. Logo hangs over combat footage for 2s. |
| founders-pass-nobg (PNG) | source.png | 78.0 | 2.0 | 80.0 | Before/during pack opening (80s) | **SLIGHTLY EARLY** -- appears over devil-vs-god-004 clip. Storyboard puts it at 76s for 4s. Current placement is reasonable but only 2s (storyboard says 4s). |

### Image Overlay Issues

1. **dd-logo-text**: Extends 2s past the cover-art-p2v clip it belongs with. At 5.0-7.0s, the logo PNG is overlaid on the devil-vs-god-001 combat clip, which is visually wrong.
   - **FIX**: Change length from 5.0 to 4.5 (or 5.0 with start at 0.0) so it ends before or at the cover-art-p2v boundary.

2. **founders-pass-nobg**: Only 2s duration vs storyboard's 4s. Appears at 78s (over devil-vs-god-004) rather than 76s (over founders-pass-zoom).
   - **FIX**: Move start from 78.0 to 76.0 and increase length from 2.0 to 4.0.

3. **Missing image overlays**: The storyboard calls for character portrait images during faction reveals (buddha.png, enki-prime.png, archangel-michael.png, reptilian-overlord.png) -- none are present in v4.

### Image Scale/Position

| Image | Scale | Position | Status |
|-------|-------|----------|--------|
| dd-logo-text | 0.6 | center | OK |
| founders-pass-nobg | 0.5 | center | OK but storyboard says scale 0.35 |

---

## 5. TRANSITION TYPES

### Video Clip Transitions

| Clip # | Asset | Transition In | Transition Out | Issue |
|--------|-------|--------------|----------------|-------|
| 1 | cover-art-p2v | **fade** | -- | **WARNING**: Fade-in on opening video may cause perceived "stopping" during first 0.5-1s while opacity ramps. Consider hard cut. |
| 2-37 | all other video clips | none | none | OK -- hard cuts as required |
| 38 | dd-logo-text (IMAGE in video track) | **fade** | **fade** | OK for closing logo hold |

### Image Overlay Transitions

| Image | Transition In | Transition Out | Status |
|-------|--------------|----------------|--------|
| dd-logo-text (Track 0) | fade | fade | OK |
| founders-pass-nobg (Track 0) | fade | fade | OK |

### Text Overlay Transitions

All 14 text overlays use `"in": "fade"` and most have `"out": "fade"`. This is correct per the storyboard requirements (text should fade in/out, video should hard cut).

**Exception**: "COSMIC AUTO BATTLER" text has `"in": "fade"` but NO `"out"` transition. It will hard-cut off. This is fine given it overlaps with the title, but could add `"out": "fade"` for polish.

### Transition Issue Summary

Only 1 concern: The opening video clip (cover-art-p2v) has a fade-in transition. For a trailer, the very first frame should have immediate visual impact. The fade-in means the first 0.5s shows just the background (#0a0a0f).

**FIX**: Remove the `"transition": {"in": "fade"}` from the first video clip. Let it start at full opacity.

---

## 6. TOTAL TIMELINE COVERAGE

### Video Track Coverage

- First clip starts at: **0.0s** (cover-art-p2v)
- Last clip ends at: **117.0s** (dd-logo-text image at 112+5)
- **GAP at end: 117.0s - 120.0s = 3.0s of black**
- Total target: 120.0s

**ISSUE**: The trailer has 3 seconds of pure black (#0a0a0f) at the end (117-120s). The "demonsanddeities.com" text overlay runs until 120s (107+13=120), so the text floats over black for the last 3 seconds. The VO line 26 at 109s with length 3s ends at 112s, so audio is silent from 112-120s (only soundtrack remains).

**FIX**: Either extend the dd-logo-text image from length 5 to length 8 (to reach 120s), or add a final darkened video clip from 117-120s.

### VO Audio Coverage

26 VO lines span from 5.0s to 112.0s (line 26 at 109s + 3s length).

- **No VO from 0.0-5.0s**: First 5 seconds have no narration. Script says line 01 should be at 1s.
- **No VO from 30.0-35.0s**: 5-second gap between line 08 (ends ~30s) and line 09 (starts 35s). Storyboard has line 08 at 32s, so this gap is intentional (the "ethereal music transition" pause).
- **No VO from 47.0-55.0s**: 8-second gap after line 12 (at 44s, ~3s duration = ends 47s) to line 13 (at 55s). Storyboard has a gameplay montage pause here.
- **No VO from 112.0-120.0s**: Last 8 seconds are music-only logo hold. Intentional.

All VO lines fall within the 0-120s window.

### Text Overlay Coverage

14 text overlays span from 2.0s to 120.0s (last text "demonsanddeities.com" at 107s + 13s = 120s).

All text overlays fall within the 0-120s window.

---

## CRITICAL ISSUES SUMMARY (Priority Order)

### P0 -- MUST FIX (Causes visible defects)

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 1 | **12 clips freeze on last frame** due to `trim: 0.1` on 3.0s source clips with `length: 3.0` | Clips #2-9, #13, #33-36 | Remove `"trim": 0.1` from all 3s YouTube clips. OR reduce `length` to `2.9` on each. |
| 2 | **3s black gap at end** (117-120s) | End of video track | Extend dd-logo-text image at 112s from length 5 to length 8. |
| 3 | **1s black gap** at 14.0-15.0s (0.7s longer than intended) | Between clips #4 and #5 | Add a 1s filler clip, or reduce to 0.3s gap per storyboard. |

### P1 -- SHOULD FIX (Content quality)

| # | Issue | Fix |
|---|-------|-----|
| 4 | **14 of 26 VO lines have no text overlay** | Add text overlays for lines 01-03, 08, 10-12, 14, 16-17, 19, 21-23 per storyboard spec. |
| 5 | **dd-logo-text PNG extends 2s past its video** (5-7s overlaps combat) | Reduce logo length to 4.5s or change start to 0.5s with length 4.5s |
| 6 | **founders-pass-nobg PNG mispositioned** (78s instead of 76s, 2s instead of 4s) | Move to start 76.0, length 4.0 |
| 7 | **Opening fade-in on video** reduces impact | Remove `"transition": {"in": "fade"}` from clip #1 |
| 8 | **4 unidentified assets** not in inventory | Identify source IDs: 4mnmf, 4med7, 4mq3d, 4mm4c. Add to v4-asset-inventory.json. |

### P2 -- NICE TO HAVE

| # | Issue | Fix |
|---|-------|-----|
| 9 | VO timing compressed vs script (Act 1 lines 4s late, Act 2-6 lines 1-4s early) | Re-time VO placements to match script timestamps |
| 10 | "COSMIC AUTO BATTLER" text missing fade-out transition | Add `"out": "fade"` |
| 11 | Missing character portrait overlays from storyboard | Add buddha.png, enki-prime.png, etc. during faction reveals |
| 12 | Missing dark overlays from storyboard | Add semi-transparent black overlays for text readability sections |

---

## COMPLETE CLIP TIMELINE (for reference)

```
0.0  --|== cover-art-p2v ==|-- 5.0
5.0  --|== devil-vs-god-001 (FREEZE) ==|-- 8.0
8.0  --|== devil-vs-god-002 (FREEZE) ==|-- 11.0
11.0 --|== devil-vs-god-003 (FREEZE) ==|-- 14.0
14.0 --[BLACK GAP 1.0s]-- 15.0
15.0 --|== ophanim-full-form (FREEZE) ==|-- 18.0
18.0 --|== egyptian-gods-001 (FREEZE) ==|-- 21.0
21.0 --|== buddha-smart-002 (FREEZE) ==|-- 24.0
24.0 --|== diablo-demon-reveal (FREEZE) ==|-- 27.0
27.0 --|== melanated-gods-001 (FREEZE) ==|-- 30.0
30.0 --|== 3d-pleiadian ==|-- 32.0
32.0 --|== capture-lore ==|-- 35.0
35.0 --|== tft-cosmic-render (MARGINAL) ==|-- 38.0
38.0 --|== gods-unchained-tides-001 (FREEZE) ==|-- 41.0
41.0 --|== tft-fire-ram (MARGINAL) ==|-- 44.0
44.0 --|== UNKNOWN-4mnmf ==|-- 47.0
47.0 --|== capture-deckbuilder ==|-- 50.0
50.0 --|== UNKNOWN-4med7 ==|-- 53.0
53.0 --|== illuvium-creature-reveal ==|-- 55.0
55.0 --|== capture-paperclip-agents ==|-- 58.0
58.0 --|== capture-test-suite ==|-- 61.0
61.0 --|== capture-website ==|-- 64.0
64.0 --|== 3d-reptilian ==|-- 67.0
67.0 --|== UNKNOWN-4mq3d ==|-- 70.0
70.0 --|== capture-tokenomics ==|-- 73.0
73.0 --|== capture-roadmap ==|-- 75.0
75.0 --|== founders-pass-zoom ==|-- 78.0
78.0 --|== devil-vs-god-004 ==|-- 80.0
80.0 --|== pack-opening ==|-- 85.0
85.0 --|== capture-founders-pass ==|-- 88.0
88.0 --|== UNKNOWN-4mm4c ==|-- 91.0
91.0 --|== 3d-lucifer ==|-- 93.0
93.0 --|== devil-vs-god-005 ==|-- 95.0
95.0 --|== devil-vs-god-006 (FREEZE) ==|-- 98.0
98.0 --|== ophanim-reveal (FREEZE) ==|-- 101.0
101.0--|== devil-vs-god-007 (FREEZE) ==|-- 104.0
104.0--|== ophanim-rotation (FREEZE) ==|-- 107.0
107.0--|== capture-game-home ==|-- 112.0
112.0--|== dd-logo-text (IMAGE) ==|-- 117.0
117.0--[BLACK GAP 3.0s]-- 120.0
```

---

## QUICK FIX CHECKLIST

```
[ ] Remove "trim": 0.1 from clips at: 5, 8, 11, 15, 18, 21, 24, 27, 35, 38, 41, 78, 93, 95, 98, 101, 104
    (all YouTube clips with trim that causes freeze)
[ ] Change dd-logo-text image at 112s: length 5 -> 8
[ ] Identify 4 unknown asset source IDs
[ ] Add 14 missing text overlays per storyboard
[ ] Fix dd-logo-text overlay: reduce length to avoid overlap with combat clips
[ ] Fix founders-pass-nobg overlay: move start to 76s, length to 4s
[ ] Remove fade-in transition from first video clip
[ ] Add "out": "fade" to "COSMIC AUTO BATTLER" text
```
