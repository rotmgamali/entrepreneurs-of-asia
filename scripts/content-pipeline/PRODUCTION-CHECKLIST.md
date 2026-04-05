# PRODUCTION CHECKLIST -- Every Video Must Follow This

**Version**: 1.0
**Last Updated**: 2026-04-01
**Authority**: No video ships without completing every checkbox. No exceptions.

---

## PHASE 0: VISUAL STORY DESIGN (before ANY clip hunting)

- [ ] Write a SHOT LIST: what does the viewer SEE in each scene?
- [ ] Define ONE visual world (pick primary source or matched aesthetic sources)
- [ ] Define the two "sides" with distinct visual palettes (light vs dark, ice vs fire)
- [ ] Identify recurring characters/figures the viewer will follow
- [ ] Plan visual scale escalation (wide → medium → close-up → collision)
- [ ] Verify: does every scene connect to the next? Is this a STORY or a random montage?
- [ ] Map "clean zones" for each source video (cinematic vs gameplay/dialogue sections)

## PHASE 1: CLIP SOURCING

- [ ] Hunt clips that match SPECIFIC shots from the shot list (not "cool moments")
- [ ] Download sources using yt-dlp
- [ ] Run Gemini smart-sample — but NEVER trust timestamps without visual verification
- [ ] Extract candidate clips with ffmpeg
- [ ] QC screen EVERY clip at 4+ timepoints (0.5s, 1.5s, 2.5s, 3.5s):
  - [ ] No visible branding or logos from other games at ANY point in clip
  - [ ] No burned-in subtitles at ANY point in clip
  - [ ] No game UI overlays (controller buttons, menus, HUD)
  - [ ] No wrong genre (must be auto-battler/strategy/anime lore)
  - [ ] No watermarks in corners
  - [ ] Resolution is 1080p or higher
- [ ] Check file size sanity: 4s 720p clip should be 1-10MB. Under 500KB = likely broken.
- [ ] Verify each clip duration with ffprobe -- record actual duration
- [ ] Confirm no clip is reused from a previous video
- [ ] Confirm clip fits the same VISUAL WORLD as other clips (not random different game)
- [ ] Upload verified clips to Shotstack ingest

## PHASE 2: ASSEMBLY

- [ ] Lay out clips in timeline order matching narrative flow
- [ ] Watch the assembled cut end-to-end without audio
- [ ] Confirm every scene transition makes visual sense
- [ ] Record the exact start time and duration of each clip

## PHASE 3: VOICEOVER

- [ ] Write VO script AFTER watching the assembled clips
- [ ] Match each VO line to its corresponding scene
- [ ] Keep it sparse: 12-14 lines for 90s, proportional for other lengths
- [ ] Generate with ElevenLabs (voice nZ5WsS2E2UAALki8m2V6, 0.85x speed)
- [ ] Listen to every generated line -- verify pronunciation and pacing
- [ ] VO starts ON the scene cut or slightly before, never 0.5s after

## PHASE 4: SHOTSTACK JSON

- [ ] Set clip.length to VERIFIED source duration (never longer)
- [ ] Set clip audio volume to 0.05
- [ ] Set soundtrack volume to 0.4 with fadeInFadeOut
- [ ] Set VO volume to 1.0-1.3
- [ ] Set SFX volume to 0.3, only at major transitions
- [ ] No SFX at 0:00
- [ ] Max 2 audio sources at any moment
- [ ] Verify every URL returns HTTP 200
- [ ] No Shotstack HTML text overlays
- [ ] No Shotstack title presets
- [ ] No dark overlay tracks
- [ ] No photo overlays (portraits, logos scattered randomly)
- [ ] Hard cuts between scenes (no fade transitions)

## PHASE 5: TIMESTAMP VERIFICATION

- [ ] Every clip start = previous clip start + previous clip length (no gaps, no overlaps)
- [ ] Every VO line start aligns with its corresponding scene start
- [ ] Every SFX start aligns with its corresponding visual transition
- [ ] Total timeline duration = last clip start + last clip length
- [ ] Music duration matches total timeline duration

## PHASE 6: SANDBOX RENDER

- [ ] Render on Shotstack sandbox (stage environment)
- [ ] Download the rendered output
- [ ] Watch frame-by-frame at 0.25x speed
- [ ] Verify:
  - [ ] No freeze frames (clip trimmed beyond source)
  - [ ] No black gaps between scenes
  - [ ] No audio desync (VO matches visuals)
  - [ ] No clipping or distortion in audio
  - [ ] Music fades in at start and out at end
  - [ ] No branding from other games visible

## PHASE 7: TEXT OVERLAYS (post-render)

- [ ] Apply text overlays via ffmpeg drawtext on the rendered MP4
- [ ] Font: Copperplate, color: dark blood red (#8b0000)
- [ ] Each text overlay starts and ends within its scene boundaries
- [ ] Text does not bleed across scene transitions
- [ ] Watch the output again to verify text placement

## PHASE 8: FOUNDER APPROVAL

- [ ] Show founder the complete video with text overlays
- [ ] Document all feedback
- [ ] If changes requested:
  - [ ] Make changes in Shotstack JSON
  - [ ] RECALCULATE every timestamp after the change point
  - [ ] Return to Phase 6 (sandbox render)
- [ ] Get explicit "approved" before production render

## PHASE 9: PRODUCTION RENDER

- [ ] Render on Shotstack production (v1 environment)
- [ ] Download final output
- [ ] One final frame-by-frame verification
- [ ] Archive the Shotstack JSON, all source clips, and final render

---

## CRYPTO PROMO CHECKLIST (30-45s Twitter/TikTok format)

### PHASE A: CLIP SOURCING
- [ ] Search YouTube for games in the same genre (auto-battler → Illuvium, TFT, Auto Chess)
- [ ] Download 6-8 unique source videos using yt-dlp
- [ ] Search for abstract animated backgrounds (blockchain nodes, cosmic nebula, neon tunnels, particles)
- [ ] Extract 10-12 clips at 3-4s each, all different timestamps, all different sources
- [ ] QC EVERY clip at 4 timepoints — reject any with: branding, subtitles, game UI, watermarks
- [ ] Verify zero clip reuse — every segment is unique
- [ ] NO screen recordings of our own UI (loading states, dev data, cursors)

### PHASE B: MUSIC + BEAT MAP
- [ ] Select electronic/trap beat (NOT cinematic orchestral)
- [ ] Trim music to start at an energetic section (skip buildups)
- [ ] Analyze waveform — find ALL beat drops > 1.5x energy
- [ ] Plan clip transitions to land ON beat drops
- [ ] Set music volume to 0.25-0.35 (VO must dominate)

### PHASE C: VOICEOVER
- [ ] Write punchy script (8-10 lines, ~30-35s at fast pace)
- [ ] Generate with ENERGETIC voice (NOT dramatic narrator)
- [ ] Speed up to 1.2-1.3x
- [ ] Verify total VO duration matches video length

### PHASE D: ASSEMBLY
- [ ] Cut each clip to exact beat-synced durations
- [ ] Concat all clips — verify no gaps, no overlaps
- [ ] Mix VO + music (VO at 1.2-1.3 volume, music at 0.25-0.35)
- [ ] Add text overlays — each appears ON the beat drop, not before
- [ ] Bitrate minimum 4000kbps for readable text
- [ ] First frame = scroll-stopping visual + logo (NOT dark/empty)
- [ ] Last frame = specific CTA ("MINT NOW", not just URL)

### PHASE E: QC
- [ ] Watch at 1x speed — does every cut feel intentional?
- [ ] Check VO clarity — can you understand every word over the music?
- [ ] Check text readability — is every overlay sharp and clear?
- [ ] Verify no clip is reused
- [ ] Verify no branding/subtitles/UI from other games visible

---

## IF ANYTHING CHANGES MID-PRODUCTION

When you move, trim, or remove ANY clip:
1. Recalculate the start time of EVERY clip after it
2. Recalculate the start time of EVERY VO line after it
3. Recalculate the start time of EVERY SFX after it
4. Recalculate the start time of EVERY text overlay after it
5. Recalculate the music trim to match
6. Re-render on sandbox
7. Re-verify frame-by-frame

There are no shortcuts. Skipping any of these steps has caused failures in every version from v1 through v11.
