# VIDEO QUALITY BIBLE -- Demons & Deities

**Version**: 4.0
**Last Updated**: 2026-03-31
**Authority**: This is the SINGLE SOURCE OF TRUTH for all video production. Every content creation agent MUST read this document before creating ANY video. No exceptions. Rules encoded in `video-quality-audit.ts` are the automated enforcement of this document.

---

## 1. THE 18 COMMANDMENTS OF D&D VIDEO

These are absolute, non-negotiable rules. Violating ANY of these is grounds for immediate re-render. Commandments XII-XVI were added from V1 trailer post-mortem lessons (2026-03-31). Commandments XVII-XVIII were added from V1-V5 production learnings (2026-03-31 v4.0 update).

### Commandment I: The First Frame MUST Be Motion
Never open with a static image. Frame 1 must contain visible movement -- particles converging, a camera pan, a zoom, video footage playing. Static images signal amateur production. If using a still character portrait, apply `zoomIn` or `zoomOut` effect so it is in motion from the very first frame. A viewer who sees a frozen image for even 0.3 seconds assumes the video is broken or low-effort.

**Shotstack implementation**:
```json
{ "asset": { "type": "image", "src": "..." }, "start": 0, "length": 4, "effect": "zoomIn", "fit": "cover" }
```
Or use a video clip with `trim` set to the most dynamic moment:
```json
{ "asset": { "type": "video", "src": "...", "trim": 12.5, "volume": 0 }, "start": 0, "length": 3, "fit": "cover" }
```

### Commandment II: Gameplay Footage MUST Be 40%+ of Runtime
For a 45-second video, that means at least 18 seconds of real game UI: hex grid, units placed, shop bar, combat with damage numbers, synergy badges, augment selection. D&D's working product is its #1 competitive advantage over vaporware NFT projects. Concept art and character portraits are supporting elements, not the main act. Calculate gameplay percentage before submitting any render.

### Commandment III: NEVER Use the Same Audio File for Soundtrack and SFX
The soundtrack (background music) and sound effects (whoosh, impact, shimmer) MUST be separate audio sources on separate tracks. Using one file for both creates muddy, unprofessional audio where SFX cannot be timed independently. The `soundtrack` property handles background music. Individual SFX go on Track 0 as `audio` assets with precise `start` times.

**Correct structure**:
```json
{
  "soundtrack": { "src": "https://music-file.mp3", "effect": "fadeInFadeOut", "volume": 0.65 },
  "tracks": [
    { "clips": [
      { "asset": { "type": "audio", "src": "https://whoosh-sfx.mp3", "volume": 0.9 }, "start": 2.0, "length": 0.8 },
      { "asset": { "type": "audio", "src": "https://impact-sfx.mp3", "volume": 1.0 }, "start": 5.0, "length": 0.5 }
    ]}
  ]
}
```

### Commandment IV: NEVER Exceed 12 Text Cards in a 45-Second Video
Text overload kills pacing and makes videos feel like slideshows. Hard limits by duration:
- 15s video: max 4 text cards
- 30s video: max 8 text cards
- 45s video: max 12 text cards
- 60s video: max 15 text cards
- 90s video: max 20 text cards

Count every text overlay as one card. The CTA end slate counts as one card. If you exceed the limit, cut the weakest text cards and let visuals carry the message.

### Commandment V: ALWAYS Render at 1080p/60fps Minimum
Output settings for every render:
```json
{
  "output": {
    "format": "mp4",
    "resolution": "hd",
    "fps": 25,
    "quality": "high"
  }
}
```
Note: Shotstack supports `sd` (576p), `hd` (720p), and `1080` (1080p). Always use `"resolution": "1080"` for final renders. Use `"hd"` only for sandbox test renders to save credits. FPS: Shotstack defaults to 25fps. If higher fps is needed, specify it. Never go below 25fps.

### Commandment VI: NEVER Open With a Logo or Title
The logo reveal is EARNED after 8-10 seconds of compelling content. Opening with a logo tells the viewer "this is an ad" and they scroll away. The logo should appear as a dramatic reveal event at the 8-12 second mark or as part of the closing CTA. Exception: a 0.07s flash of the logo during a transition is acceptable as subliminal branding.

**Wrong**: `[0s: Logo fade in] [3s: "Welcome to Demons & Deities"]`
**Right**: `[0s: Gold particles converging] [2s: Character materializes] [4s: Combat flash] [8s: Logo materializes from particles with impact SFX]`

### Commandment VII: ALWAYS Use Hard Cuts or Fades for Transitions
The only acceptable transition types for clips:
- `fade` -- for establishing shots, world-building, emotional moments
- `reveal` -- for dramatic unveils
- Hard cut (no transition property) -- for action sequences, rapid montages

NEVER use `slideLeft`, `slideRight`, `slideUp`, `slideDown` on video/image clips. These read as PowerPoint presentations, not game trailers. Slide transitions are only acceptable on text overlays for kinetic typography effects.

**Acceptable transitions in Shotstack**: `fade`, `reveal`, `wipeLeft`, `wipeRight` (sparingly), `zoom` (for dramatic emphasis), `carouselLeft`/`carouselRight` (never).

### Commandment VIII: NEVER Use Pixabay/Stock Video Clips or Screen Recordings
All video footage MUST come from one of these approved sources -- no exceptions:
1. **Segmind P2V (photo-to-video) animations** of cover art and character portraits -- the primary method for bringing static assets to life
2. **Clips extracted from YouTube reference videos** (game trailers, cinematics, etc.)
3. **3D model renders and pack opening animations**
4. **Animated text video clips** rendered via ffmpeg drawtext

**BANNED sources** (confirmed failures from V1-V5 production):
- **ALL screen recordings** -- Every screen recording attempt failed: broken pages, loading states, wrong content, unresponsive UI. Do NOT attempt screen recordings. Use P2V or cinematic clips instead.
- **ALL Ken Burns zoom clips** -- The founder explicitly banned these. Static images with zoomIn/zoomOut look cheap. Use Segmind P2V to make images come alive instead.
- **ALL Pixabay/stock video** -- Signals "vaporware crypto project" and destroys credibility.

Pixabay is ONLY permitted for **music/soundtrack** and **sound effects (SFX) audio**. Never for video clips.

**Correct video clip example**:
```json
{
  "asset": { "type": "video", "src": "https://game-screen-recording.mp4", "trim": 3, "volume": 0 },
  "start": 5, "length": 4,
  "filter": "boost",
  "transition": { "in": "fade", "out": "fade" },
  "fit": "cover"
}
```

### Commandment IX: ALWAYS Include 0.3-0.5s Black Cuts Between Major Sections
A brief black frame (0.3-0.5 seconds) between major trailer sections creates visual breathing room and signals a tonal shift. Without these, sections bleed together and the trailer feels rushed. The black cut is NOT a transition -- it is a deliberate absence of content that resets the viewer's visual attention.

**Implementation**: Leave a 0.3-0.5s gap between clips on the visual track. The background defaults to black. Optionally, place a bass impact SFX at the start of the gap for added punch.

Major section boundaries that need black cuts:
- Between hook and character showcase
- Between character showcase and gameplay demo
- Between gameplay demo and CTA
- Before and after the "breathe" silence moment

### Commandment X: ALWAYS Sync SFX to Visual Transitions Exactly
Every whoosh, impact, or shimmer SFX must land within 0.05 seconds of its corresponding visual event. If a character portrait appears at `start: 8.0`, the impact SFX starts at `start: 8.0` (not 7.8 or 8.2). Audio-visual desync is the fastest way to make a professional production feel amateur.

**Technique**: Build visuals first, note exact `start` times for key moments, then place SFX with matching `start` values. When music rhythm conflicts with visual timing, nudge the SFX to the nearest musical beat if the visual-music gap is less than 0.1s. If larger, prioritize visual sync.

### Commandment XI: Motion Visual ALWAYS Present -- No Static-Only Frames
Every frame of the video must have a motion visual element playing. Acceptable base visuals include: video clips, P2V (photo-to-video) animations from Segmind, and animated text video clips rendered via ffmpeg drawtext. Character portraits, logos, cover art, Founder's Pass art, and all other images belong on overlay tracks positioned ON TOP of the motion base layer. Images use opacity, position, scale, and offset to sit as overlays, never as full-screen replacements for motion content. HTML gradient backgrounds are NOT a substitute for motion video. An image should never be the only visual element on screen at any moment.

**Wrong**: An image of a character portrait as the sole visual on screen for 4 seconds with no motion behind it.
**Wrong**: An HTML div with a CSS gradient as the background "visual" for a section.
**Right**: A P2V animation plays on the bottom track while a character portrait overlays at 30% scale in the corner with 0.9 opacity.
**Right**: A cinematic clip plays full-screen on the bottom track while the logo overlays at center with `scale: 0.3`.
**Right**: An animated text video (ffmpeg drawtext) serves as a title card with built-in motion.

**Shotstack track ordering (mandatory)**:
```
Track 0: SFX audio
Track 1: Voiceover audio
Track 2: Animated text video clips (rendered via ffmpeg drawtext)
Track 3: Image overlays (portraits, logos, pack art -- with opacity/scale/position)
Track 4: (reserved)
Track 5: Video/P2V clips (the motion base -- ALWAYS present, NEVER gaps)
```

**Implementation**: The video track (Track 5) must contain back-to-back motion clips (video, P2V animations) that cover the entire timeline duration. Use `trim` to select the best moments from source footage. Use `filter` (darken, boost, blur) to vary the visual treatment per section. When a section features character portraits or logos, the video track underneath can use a `darken` or `blur` filter to keep the overlay readable without replacing the video entirely.

### Commandment XII: NEVER Use Clips with Visible Branding
Any clip showing another game's name, logo, UI brand, or title text is BANNED. This includes:
- Game title screens or splash screens
- In-game UI with recognizable game names
- Watermarks or channel logos
- Credit text or developer names

Before any clip is included, it must be screened for visible text. If in doubt, crop or reject. We cannot advertise for other games. No Gods Unchained title cards, no Mechabellum logos, no TFT branding, no Illuvium watermarks. Clips must be "clean" -- generic enough that they could be our game.

**Pre-inclusion checklist**:
1. Pause every 2 seconds and scan for text in the frame
2. Check all four corners for watermarks
3. Check center for title cards or splash screens
4. Check bottom for subtitles (see Commandment XIII)
5. If ANY visible branding is found: crop it out or reject the clip entirely

### Commandment XIII: NEVER Use Clips with Burned-In Subtitles
If a YouTube source has hardcoded subtitles baked into the video frame, those clips are UNUSABLE. The subtitles will distract from our own text overlays and look unprofessional. Always check the bottom 15% of the frame for subtitle text before approving any clip.

Burned-in subtitles cannot be removed in post -- they are part of the pixel data. Even cropping the bottom of the frame often removes too much of the composition. The safest approach is to reject these clips outright and find clean alternatives.

**How to detect**: Scrub through the clip at 2x speed. If white or yellow text appears at the bottom of the frame at any point, the clip has burned-in subtitles and must be rejected.

### Commandment XIV: Stay On Genre -- We Are an Auto-Battler
Only use clips that match or complement the auto-battler strategy genre. The viewer must never be confused about what kind of game D&D is.

**Acceptable clip genres**:
- TFT gameplay and cinematics
- Strategy/board views and army deployment
- Card games (Gods Unchained, Hearthstone-style)
- Turn-based combat and tactical positioning
- Anime clips of spiritual beings (these represent our lore characters -- Ra, Michael, Buddha, etc.)

**NOT acceptable clip genres**:
- FPS shooting (CoD, Valorant, etc.)
- Platforming (Mario, Celeste, etc.)
- Hack-and-slash action RPGs (Dark Souls, First Berserker, etc.)
- Racing games
- Sports games
- Battle royale gameplay

If a clip does not obviously fit the auto-battler/strategy/card game genre and is not anime representing our lore characters, reject it.

### Commandment XV: ALL Text Overlays Must Be Animated Video Clips
The native Shotstack title styles (`blockbuster`, `future`, etc.) create ugly black backgrounds behind text. HTML overlays render inconsistently and lack motion. ALL text must be pre-rendered as animated video clips using `ffmpeg drawtext` and then included as video assets in the timeline.

**Required animated text approach**:
- Render text to video using ffmpeg drawtext filter with animation (fade in, slide, scale)
- Font: Georgia for fantasy feel, Impact for impact words, Arial Black for stats
- Gold glow: render with fontcolor=#c89b3c and shadowcolor=black
- Upload the rendered text video to IPFS/Shotstack and include as a `type: "video"` asset
- Text videos should have transparent or black backgrounds (use chromakey or alpha if supported)

**ffmpeg drawtext example**:
```bash
ffmpeg -f lavfi -i color=c=black:s=1920x1080:d=3 \
  -vf "drawtext=fontfile=/path/to/Georgia.ttf:text='72 CHAMPIONS':fontcolor=#c89b3c:fontsize=96:x=(w-text_w)/2:y=(h-text_h)/2:shadowcolor=black:shadowx=4:shadowy=4:alpha='if(lt(t,0.5),t/0.5,1)'" \
  -c:v libx264 -pix_fmt yuv420p text-72-champions.mp4
```

**Correct Shotstack implementation**:
```json
{
  "asset": {
    "type": "video",
    "src": "https://ipfs-gateway/text-72-champions.mp4",
    "volume": 0
  },
  "start": 5, "length": 3,
  "fit": "cover"
}
```

**Wrong implementation** (Shotstack title preset -- creates black bar):
```json
{
  "asset": { "type": "title", "text": "72 CHAMPIONS", "style": "blockbuster", "size": "xx-large", "color": "#c89b3c" },
  "start": 5, "length": 3
}
```

### Commandment XVI: Audio Mix Must Be Balanced
With VO + SFX + soundtrack + clip audio, levels MUST be managed to prevent clipping, saturation, and audio chaos. These volume levels are non-negotiable:

| Source | Volume | Priority |
|--------|--------|----------|
| **Voiceover** | 1.0 | Always loudest -- the voice is the message |
| **Soundtrack** | 0.4 | Background only -- never overpowering |
| **SFX** | 0.5-0.7 | Accent hits, not overwhelming |
| **Video clips** | 0 (muted) | Unless specifically using clip audio as a feature |

**Additional rules**:
- Never have more than 3 audio sources playing simultaneously at any moment
- The Audio Director (or the agent producing the video) must review audio saturation before every render
- If VO is playing, soundtrack MUST duck to 0.3-0.4 (40% reduction from normal)
- During the "breathe" silence moment: soundtrack at 0.15-0.20, no SFX, no VO
- Listen to the loudest 5-second segment at full volume before submitting -- if anything distorts, reduce levels

**Shotstack volume placement**:
```json
{
  "soundtrack": { "src": "...", "effect": "fadeInFadeOut", "volume": 0.4 },
  "tracks": [
    { "clips": [{ "asset": { "type": "audio", "src": "sfx.mp3", "volume": 0.6 }, "start": 2.0, "length": 0.5 }] },
    { "clips": [{ "asset": { "type": "audio", "src": "vo.mp3", "volume": 1.0 }, "start": 4.0, "length": 8.0 }] }
  ]
}
```

### Commandment XVII: ALL Assets Must Be URL-Verified Before Assembly
Every asset URL (video, image, audio) must be verified to return HTTP 200 with the correct content-type BEFORE it is included in any Shotstack JSON. A broken URL produces a black frame, silent audio, or a render failure. For video assets, duration must also be verified via ffprobe or metadata to prevent freeze frames when clip.length exceeds actual source duration.

**Verification checklist**:
1. `curl -I <url>` returns HTTP 200
2. Content-Type header matches expected: `video/mp4`, `image/png`, `audio/mpeg`
3. Content-Length > 1KB (not empty or broken)
4. For video: `ffprobe -i <url>` confirms duration >= clip.length
5. For known 3-second sources: clip.length MUST be < 3s

**Implementation**: Run `shotstack-validate.ts --check-urls` before every render. Zero broken URLs is a hard requirement.

### Commandment XVIII: ALL Text Overlays Must Be Animated Video Clips, Not HTML
HTML text overlays render inconsistently across Shotstack versions and lack the cinematic motion that makes trailers feel professional. ALL text must be pre-rendered as animated video clips using ffmpeg drawtext, then included as `type: "video"` assets. This guarantees consistent rendering, built-in animation (fade, slide, scale), and eliminates the HTML rendering lottery.

**What this means in practice**:
- Text cards are `.mp4` files uploaded to IPFS, not inline HTML strings
- Each text video has its own animation baked in
- Text videos go on Track 2 as video assets, not HTML assets
- The `video-quality-audit.ts` script checks for this

---

## 2. THE HOOK (First 3 Seconds)

### The Science
- 65% of viewers who watch the first 3 seconds will watch for at least 10 seconds
- Videos with strong 3-second retention get 4-7x more impressions on all platforms
- Viewers make a stay/leave decision in 1.6 seconds on average
- Hook rate benchmark: 25-30% = healthy, 40%+ = unicorn-tier
- Pattern interrupts in the first 3 seconds yield up to 3x higher engagement

### What the First 3 Seconds MUST Do
1. **Show motion** (Commandment I) -- particles, camera movement, animation
2. **Create a "what is this?" reaction** -- something visually unexpected
3. **Signal production quality** -- high-quality visuals are an anti-rugpull trust signal
4. **Signal genre** -- an audio cue (cosmic hum, ethereal choir, bass drone) tells the viewer what kind of content this is before they consciously process the visuals

### The 3-Second Formula (frame by frame)

**0.0s - 0.5s: The Pattern Interrupt**
A single striking visual element appears. Options:
- Gold particles converging against pure black
- A dramatic character portrait with glowing faction aura
- A combat moment frozen at the peak of an ability effect
- A hex grid pulsing with energy

**0.5s - 1.5s: The Visual Hook**
The pattern interrupt resolves into something recognizable but intriguing:
- Particles form a character silhouette
- The combat moment unfreezes into slow-mo action
- The hex grid populates with units in rapid succession
- A card flips to reveal a Tier 5 mythic character

**1.5s - 3.0s: The Audio Anchor**
Music enters (if it hasn't already). The first bass note, chord, or percussion hit lands. This audio anchor "locks" the viewer's attention:
- A sub-bass impact hit at 1.5s
- An orchestral swell beginning at 1.0s and reaching first chord at 2.5s
- A synth riser that builds from 0.5s and drops at 3.0s

### What NEVER Goes in the First 3 Seconds
- Logo or game title (Commandment VI)
- Static image without motion effect
- Text-heavy overlay (more than 3 words)
- Stock video footage of any kind (use game recordings or YouTube clips instead)
- Black screen with fade-in (wastes 1-2 seconds of prime real estate)
- A narrator saying "Welcome to..." or "Introducing..."
- Web3 jargon ("NFT", "blockchain", "DeFi", "mint")

### Hook Templates by Video Type

| Video Type | Hook Strategy | Example |
|-----------|--------------|---------|
| Launch Trailer | Best combat moment at 0.25x speed | Ability VFX explosion, slow-mo, then snap to real-time |
| Character Reveal | Character materializes from faction-colored particles | Gold particles form Pleiadian champion shape |
| Gameplay Demo | Climax moment first, then "let me show you how we got here" | Tier 5 one-shotting an enemy, cut to "30 seconds earlier..." |
| FOMO/Mint | Large bold number | "200 LEFT" in massive gold text with countdown tick SFX |
| Lore Teaser | Mysterious cosmic visual + whispered single word | Dark nebula + whispered "prophecy..." |
| Pack Opening | Pack crackling with energy, slow pull beginning | Glowing pack edges, anticipation SFX rising |

---

## 3. EMOTIONAL ARC STRUCTURE

Every video follows a tension curve. The climax lands at the 70-80% mark, not the end. The end is reserved for the CTA, which requires the viewer to be in a state of desire, not peak excitement.

### Universal Energy Curve
```
Energy
10 |                         * *
 9 |                        *   *
 8 |                   *  *       *
 7 |                  *              *
 6 |              * *                  *
 5 |             *                       *
 4 |         * *                           *
 3 |        *                                *
 2 |    * *                                    * *
 1 |   *                                           *
   +───────────────────────────────────────────────────
   0%    20%    40%    60%    70-80%    90%    100%
   HOOK  BUILD  SHOWCASE  CLIMAX  DIP    CTA
```

### 15-Second Arc (TikTok/Reels)

| Second | Content | Energy | Notes |
|--------|---------|--------|-------|
| 0.0-1.0 | Pattern interrupt: striking visual | 7 | Immediate high energy -- no warmup |
| 1.0-3.0 | Core hook: best visual + audio drop | 9 | This IS the climax for 15s |
| 3.0-7.0 | Rapid feature cascade: 2-3 key visuals | 8 | One visual per 1.5s, text overlay on each |
| 7.0-10.0 | Gameplay flash: 2-3 quick game shots | 7 | Prove it is real |
| 10.0-12.0 | Climax reprise: best moment again or new peak | 10 | Hit hardest here |
| 12.0-15.0 | CTA: logo + single action + URL | 5 | "Play Now" or "Mint" -- one verb |

**Max text cards**: 4. **Music**: fast-paced, no build-up. **Transitions**: hard cuts only.

### 30-Second Arc (Twitter/Instagram)

| Second | Content | Energy | Text | Music |
|--------|---------|--------|------|-------|
| 0.0-1.5 | Visual hook: particles/combat | 7 | None | Ambient drone begins |
| 1.5-4.0 | Character or world reveal | 5 | None or 1-2 words | First chord |
| 4.0-8.0 | Ownership hook: "COLLECT. BATTLE. OWN." | 6 | Kinetic typography (3 words) | Building |
| 8.0-14.0 | Character showcase: 3-4 portraits | 7 | Character names below | Percussion enters |
| 14.0-18.0 | Gameplay proof: hex grid, combat | 8 | "REAL GAMEPLAY" | Full instrumentation |
| 18.0-22.0 | Rapid montage: 4-6 flash cuts | 10 | None (Commandment: zero text at peak) | Peak energy |
| 22.0-24.0 | Post-climax dip: atmospheric shot | 4 | Lore quote or tagline | Music pulls back |
| 24.0-30.0 | CTA: logo + Founder's Pass + URL | 3 | CTA text | Resolves to final chord |

**Max text cards**: 8. **Black cuts**: at 4.0s and 22.0s.

### 45-Second Arc (Primary Twitter/YouTube)

| Second | Content | Energy | Text | Music | SFX |
|--------|---------|--------|------|-------|-----|
| 0.0-1.5 | Visual hook: gold particles on black | 3 | None | Sub-bass drone | Shimmer |
| 1.5-4.0 | Hook resolves: character emerges | 5 | None | First melodic phrase | Impact hit |
| 4.0-6.0 | Ownership statement | 6 | "YOUR CHAMPIONS. YOUR BATTLES. YOUR REWARDS." | Sustained chord | Bass drop |
| 6.0-8.0 | 0.5s black cut, then logo reveal | 7 | Logo | Impact + shimmer | Logo SFX |
| 8.0-14.0 | Character parade: 3 characters, 2s each | 6-7 | Names below portraits | Building rhythm | Unique SFX per character |
| 14.0-16.0 | Synergy showcase: faction badge + 3 chars | 7 | Faction name | Percussion | Badge activation SFX |
| 16.0-22.0 | Gameplay: hex grid, combat, shop, augments | 8 | "72 CHAMPIONS" "14 FACTIONS" | Full energy | Combat SFX |
| 22.0-24.0 | 0.3s black cut + silence (breathe) | 2 | None | Held note only | None |
| 24.0-30.0 | Rapid montage: 8-10 portraits at 0.5-0.7s each | 10 | None | Peak drums/bass | Flash + impact per cut |
| 30.0-33.0 | Post-climax: atmospheric shot + tagline | 4 | Lore quote | Music resolves | Ambient shimmer |
| 33.0-37.0 | Social proof + tokenomics | 5 | "500M DDT SUPPLY" "PLAY AND EARN" | Gentle pulse | Subtle tick SFX |
| 37.0-45.0 | CTA: Founder's Pass art + "200 SUPPLY" + URL + Discord | 3 | CTA text | Final sustain + fade | None |

**Max text cards**: 12. **Black cuts**: at 6.0s and 22.0s.

### 60-Second Arc (YouTube/Twitter feature)

| Second | Content | Energy | Notes |
|--------|---------|--------|-------|
| 0.0-3.0 | Visual hook + audio anchor | 3-5 | Motion from frame 1 |
| 3.0-8.0 | World/environment establishing + first character | 4-6 | Ken Burns on cosmic landscape |
| 8.0-12.0 | Logo reveal + ownership hook | 6-7 | Logo as dramatic event |
| 12.0-22.0 | Character parade (5-6 chars, accelerating) | 5-8 | 4s, 3s, 2s, 1.5s, 1s, 0.7s per character |
| 22.0-24.0 | Silence/breathe moment | 2 | 2s held bass note |
| 24.0-34.0 | Gameplay showcase: full loop | 7-8 | Draft, place, fight, win |
| 34.0-42.0 | Rapid climax montage | 9-10 | Zero text, all visuals |
| 42.0-46.0 | Post-climax emotional dip | 3-4 | Lore quote, atmospheric |
| 46.0-50.0 | Social proof + tokenomics | 5 | Stats, economy |
| 50.0-60.0 | CTA: 10s hold | 3 | Logo + Founder's Pass + URL |

**Max text cards**: 15. **Black cuts**: at 8.0s, 22.0s, 42.0s.

### 90-Second Arc (Full Launch Trailer)

| Second | Content | Energy | Notes |
|--------|---------|--------|-------|
| 0.0-3.0 | Visual hook | 3 | Particles, cosmic, motion |
| 3.0-8.0 | Environment + audio genre signal | 4 | Cosmic landscape, ethereal music |
| 8.0-15.0 | Logo reveal + world intro | 5 | "14 FACTIONS. ONE PROPHECY." |
| 15.0-20.0 | Ownership hook: kinetic text | 6 | "COLLECT. BATTLE. OWN." |
| 20.0-35.0 | Character parade (8-10 chars, accelerating) | 5-8 | Start 4s each, end 0.5s each |
| 35.0-38.0 | Silence/breathe | 2 | Held note, dark screen |
| 38.0-50.0 | Gameplay showcase | 7-8 | Full game loop |
| 50.0-60.0 | Rapid climax montage | 9-10 | 12-15 flash cuts, zero text |
| 60.0-66.0 | Post-climax: lore moment | 3-4 | Emotional pivot |
| 66.0-72.0 | Social proof + tokenomics | 5 | Community, DDT, economy |
| 72.0-78.0 | Founder story flash (optional) | 4 | "Built by gamers. Owned by players." |
| 78.0-90.0 | CTA: 12s hold | 3 | Full end slate |

**Max text cards**: 20. **Black cuts**: at 8.0s, 15.0s, 35.0s, 60.0s.

### 1:45 (105-Second) Arc (Extended Trailer)

Same as 90-second arc but with expanded sections:
- Character parade: 12-15 characters (20.0-40.0s)
- Gameplay showcase: 15s (45.0-60.0s) -- show draft, shop, combat, augments separately
- Add an "AI/Tech Innovation" section (78.0-85.0s) -- "Built with AI agent swarms"
- Extended CTA: 15s hold (90.0-105.0s)

**Max text cards**: 24. Use the extra time for MORE gameplay, not more text.

---

## 4. TEXT OVERLAY MASTERY

### Maximum Word Count Per Card (by video duration)

| Video Duration | Max Words Per Card | Max Cards Total |
|---------------|-------------------|-----------------|
| 15s | 3 words | 4 cards |
| 30s | 5 words | 8 cards |
| 45s | 6 words | 12 cards |
| 60s | 6 words | 15 cards |
| 90s | 8 words | 20 cards |

### Minimum On-Screen Time

| Word Count | Minimum Display Time | Rationale |
|-----------|---------------------|-----------|
| 1 word | 1.5s | Impact word, read in 0.3s, needs emphasis time |
| 2-3 words | 2.5s | Read in 0.8s, needs 2x read time minimum |
| 4-5 words | 3.5s | Read in 1.2s, round up for comprehension |
| 6-8 words | 4.0s | Read in 1.8s, needs processing time |
| Exception: Rapid montage | 0.7-1.0s per word | Single words flashing for kinetic effect only |

### Font Hierarchy (Maximum 3 Styles)

**NOTE: Per Commandments XV and XVIII, ALL text overlays must be animated video clips rendered via ffmpeg drawtext. Do NOT use Shotstack native title presets or HTML assets.** The table below maps the visual intent to the ffmpeg drawtext implementation:

| Visual Intent | Font | Use Case | ffmpeg fontsize |
|--------------|------|----------|-----------------|
| Impact/Title | `Impact` or `Arial Black` | Game title, section headers, single impact words | `96` or `72` |
| Feature/Stat | `Arial Black` | Feature callouts, stat numbers, key phrases | `64` or `48` |
| Caption/Name | `Georgia` | Descriptions, character names, captions | `36` or `28` |

NEVER use more than 3 font families in a single video. Mixing 4+ creates visual chaos. All text rendered via ffmpeg drawtext with `shadowcolor` and `shadowx/shadowy` for readability -- never HTML `background-color`.

### Color Hierarchy

| Color | Hex | Use | Priority |
|-------|-----|-----|----------|
| Gold | `#c89b3c` | Brand name, titles, character names, primary emphasis | 1st (brand) |
| White | `#ffffff` | Descriptions, feature text, informational content | 2nd (info) |
| ONE accent | varies | Single accent for contrast: `#e84040` (urgency), `#7dc8ff` (divine), `#10b981` (earn) | 3rd (accent) |

NEVER use more than 3 text colors in one video. Choose the accent color based on the video's primary theme:
- Combat/action videos: `#e84040` (red)
- Lore/divine videos: `#7dc8ff` (blue)
- Economy/earn videos: `#10b981` (green)
- Scarcity/FOMO videos: `#f97316` (orange)

### Text Background Rule
Text readability comes from two sources: the text-shadow baked into the ffmpeg drawtext render, and the underlying video clip's filter treatment. Do NOT use HTML overlays or background-color properties.

**Implementation** -- Render text with shadow via ffmpeg, then place over a darken-filtered clip:
```bash
# Render text video with baked-in shadow
ffmpeg -f lavfi -i color=c=black:s=1920x1080:d=3 \
  -vf "drawtext=fontfile=Georgia.ttf:text='YOUR TEXT':fontcolor=#c89b3c:fontsize=64:shadowcolor=black:shadowx=4:shadowy=4:x=(w-text_w)/2:y=(h-text_h)/2" \
  -c:v libx264 -pix_fmt yuv420p output.mp4
```
```json
{ "asset": { "type": "video", "src": "...", "volume": 0 }, "start": 5, "length": 3, "filter": "darken", "fit": "cover" }
```
With the text video on the track above.

### Position Rules

| Position | Use Case | Shotstack Value |
|----------|---------|-----------------|
| Center | Impact statements, section headers, single words | `"center"` |
| Bottom | Character names, descriptions, captions | `"bottom"` |
| Bottom-left/right | Subtitles during voiceover | `"bottomLeft"` / `"bottomRight"` |
| Top | NEVER for primary text (overlaps platform UI) | avoid |

---

## 5. AUDIO ENGINEERING

### The Three Audio Layers

Every D&D video has exactly three audio layers, each on a separate track or property:

| Layer | Purpose | Source | Volume |
|-------|---------|--------|--------|
| **Soundtrack** | Background music, emotional backbone | Pixabay royalty-free music | 0.60-0.70 |
| **SFX** | Transition accents, impact hits, reveals | Pixabay SFX library | 0.80-1.00 |
| **Voiceover** | Narration, character voice | ElevenLabs | 1.00 |

**Volume relationships**:
- When VO plays: soundtrack drops to 0.40-0.50 (duck 40%)
- SFX always punches through: 0.80-1.00 regardless of other layers
- During "breathe" silence: soundtrack at 0.15-0.20, no SFX, no VO

### Soundtrack Rules

1. **Select music FIRST, then edit visuals to match** -- the music dictates cut timing, not the other way around
2. **Map the BPM** -- identify beat timestamps and align every major visual cut to a beat
3. **Music must match the trailer's emotional arc** -- select tracks with built-in dynamics (quiet intro, building middle, peak, resolution) or edit multiple tracks together
4. **Use `fadeInFadeOut` effect** on the soundtrack to avoid harsh starts/stops:
```json
"soundtrack": { "src": "https://music.mp3", "effect": "fadeInFadeOut", "volume": 0.65 }
```
5. **Never use music with recognizable lyrics** -- instrumental or ambient vocals only

### SFX Types and Placement

| SFX Type | Sound | When to Use | Typical Duration |
|----------|-------|-------------|-----------------|
| **Bass Impact** | Deep thud/boom | Section transitions, logo reveal, text slam | 0.3-0.8s |
| **Whoosh** | Swooshing air/energy | Between rapid cuts, character entrances | 0.3-0.6s |
| **Riser** | Ascending pitch/tension | Before climax, before reveal, building anticipation | 2.0-5.0s |
| **Shimmer** | Sparkling/magical | Character materialization, gold effects, card flip | 0.5-1.5s |
| **Hit/Clang** | Metal strike/energy burst | Combat moments, each character in parade | 0.2-0.5s |
| **Tick/Click** | Mechanical click | Counter/countdown, UI interactions | 0.1-0.3s |

### SFX Placement Map (45-second trailer example)

| Timestamp | SFX | Paired With |
|-----------|-----|------------|
| 0.0s | Shimmer (sustained) | Opening particle effect |
| 1.5s | Bass impact | First visual resolve |
| 4.0s | Bass drop | Ownership text slam |
| 6.0s | Shimmer + impact | Logo reveal |
| 8.0s | Hit (unique per char) | Character 1 reveal |
| 10.0s | Hit (different) | Character 2 reveal |
| 12.0s | Hit (different) | Character 3 reveal |
| 14.0s | Whoosh | Synergy badge activation |
| 22.0s | Riser (2s) then silence | Pre-climax build |
| 24.0-30.0s | Rapid hits (0.5s apart) | Flash cut montage |
| 30.0s | Bass impact (heavy) | Post-climax transition |
| 37.0s | Shimmer (sustained) | CTA card appearance |

### BPM Sync Methodology

1. Import or note the music track's BPM (common trailer music: 80-140 BPM)
2. Calculate beat interval: `60 / BPM = seconds per beat` (e.g., 120 BPM = 0.5s per beat)
3. Map beat timestamps for the full duration: 0.0, 0.5, 1.0, 1.5, 2.0...
4. Place major visual cuts on beat timestamps
5. During rapid montage, cut on every beat or every half-beat
6. Place SFX 0.00-0.05s before the beat for a "leading" punch feel
7. If a visual moment falls between beats, nudge the visual timing (not the SFX) to align

---

## 6. SHOTSTACK POWER FEATURES

The complete list of Shotstack capabilities we SHOULD be using. If your render does not use at least 5 of these, you are underutilizing the platform.

### Keyframe Animations
Control opacity, position, rotation, and scale over time:
```json
{
  "asset": { "type": "image", "src": "..." },
  "start": 0, "length": 4,
  "offset": { "x": -0.1, "y": 0 },
  "transform": { "rotate": { "angle": 0 } },
  "opacity": 0
}
```
Use keyframe-style control by splitting an asset across multiple clips with different properties for each segment.

### HTML Assets for Custom Styled Text
When the built-in title styles are insufficient, use HTML assets for pixel-perfect control:
```json
{
  "asset": {
    "type": "html",
    "html": "<div style='font-family:monospace;color:#10b981;font-size:36px;text-align:center;text-shadow:0 0 20px rgba(16,185,129,0.5)'>500,000,000 DDT</div>",
    "width": 600,
    "height": 80
  },
  "start": 33, "length": 4,
  "position": "center"
}
```
Use monospace font for economic/token data. Use text-shadow for glow effects.

### Filters
Apply visual treatment to any clip:
- `"darken"` -- darkens footage, good for text readability backdrop
- `"boost"` -- increases saturation and contrast, makes game art pop
- `"contrast"` -- deepens blacks, brightens highlights
- `"greyscale"` -- dramatic effect for flashback/lore moments
- `"blur"` -- background defocus for depth-of-field effect

```json
{ "asset": { "type": "video", "src": "..." }, "filter": "boost", "start": 0, "length": 5 }
```

### Luma Mattes for Shaped Reveals
Use luma matte assets to create shaped transitions (circle wipe, diamond reveal, etc.):
```json
{
  "asset": { "type": "luma", "src": "https://luma-matte.mp4" },
  "start": 5, "length": 2
}
```

### Video Speed Control
- `0.5` -- slow-motion for ability showcases and dramatic moments
- `1.0` -- normal speed for gameplay
- `2.0` -- fast-forward for montage energy

```json
{ "asset": { "type": "video", "src": "...", "trim": 5, "volume": 0, "speed": 0.5 } }
```

### Title Styles Available
| Style | Look | Best For |
|-------|------|----------|
| `minimal` | Clean sans-serif | Subtle captions |
| `blockbuster` | Bold, cinematic | Impact words, game title |
| `vogue` | Elegant serif | Lore quotes |
| `sketchy` | Hand-drawn | Casual/fun |
| `subtitle` | Standard subtitle | Descriptions, names |
| `chunk` | Heavy block letters | Single words, emphasis |
| `future` | Sci-fi/tech | Features, stats |

### All 14 Transition Types
`fade`, `reveal`, `wipeLeft`, `wipeRight`, `slideLeft`, `slideRight`, `slideUp`, `slideDown`, `carouselLeft`, `carouselRight`, `carouselUp`, `carouselDown`, `zoom`, `shuffleLeft`, `shuffleRight`

**Recommended**: Use only `fade`, `reveal`, and hard cuts. Avoid carousel and slide transitions (Commandment VII).

### Crop and Transform
Reframe clips for vertical (9:16) output or to focus on a specific region:
```json
{ "asset": { "type": "video", "src": "...", "crop": { "top": 0.1, "bottom": 0.1, "left": 0.2, "right": 0.2 } } }
```

### Template / Merge Fields
Create reusable templates with dynamic data for character series:
```json
{
  "merge": [
    { "find": "CHARACTER_NAME", "replace": "Enki" },
    { "find": "FACTION", "replace": "Anunnaki" },
    { "find": "PORTRAIT_URL", "replace": "https://play.demonsanddeities.com/images/characters/enki.png" },
    { "find": "FACTION_COLOR", "replace": "#f97316" }
  ]
}
```
This enables programmatic generation of 72 character reveal videos from one template.

### Multi-Format Output
Generate multiple formats from one render:
- `mp4` -- primary video format
- `gif` -- social media preview, Discord embed
- `jpg` -- poster frame for thumbnails
- Combine with resolution settings for platform-specific output

### Effects (DEPRECATED -- Use P2V Instead)
Ken Burns effects (`zoomIn`, `zoomOut`, `slideLeft`, `slideRight`) are **BANNED** as of v4.0. They look cheap and the founder explicitly rejected them. Instead of applying a Ken Burns zoom to a static image, run the image through **Segmind P2V (Kling 1.6)** to create a real animated video clip where the subjects come alive.

**Old approach (BANNED)**: `{ "asset": { "type": "image", "src": "..." }, "effect": "zoomIn" }`
**New approach (REQUIRED)**: Upload image to Segmind P2V, get back 5s animated video, use as `type: "video"` asset.

---

## 7. D&D BRAND ASSETS AND HOW TO USE THEM

### Live Game URLs (Shotstack can access these directly)

```
Character Portraits (77 total):
https://play.demonsanddeities.com/images/characters/{name}.png

Page Backgrounds:
https://play.demonsanddeities.com/images/pages/{page}.jpg

Logo:
https://play.demonsanddeities.com/images/dd-logo-icon.png

Pack Artwork:
https://play.demonsanddeities.com/images/packs/{pack}.png

Founder's Pass:
https://play.demonsanddeities.com/images/founders-pass-final.png
```

### Character Portraits -- Usage Rules
- 77 portraits available on the live site
- These are the single strongest visual asset -- use them prominently
- ALWAYS run through Segmind P2V (photo-to-video) to create animated versions -- NEVER use static images or Ken Burns zooms
- Display character name as an animated text video clip below the portrait
- Group 2-3 characters from the same faction together to imply synergy
- During rapid montage: show P2V portrait animations at 0.4-0.7s each with flash cut transitions

### Cover Art -- Usage Rules
- Use ONLY as opening/closing bookend, NEVER mid-trailer
- Opening: cover art MUST be run through Segmind P2V to create an animated version (NOT Ken Burns zoom)
- Closing: P2V cover art behind the CTA end slate
- NEVER use cover art as a substitute for gameplay footage
- NEVER show cover art for more than 5 seconds continuously

### Founder's Pass Art -- Usage Rules
- Show prominently in CTA section (last 8-12 seconds)
- Apply shimmer or glow effect
- Always pair with supply count: "200 SUPPLY"
- IPFS version: `ipfs://bafybeie7tf6qpiuovji4dm7rhzoa666mdgmnz3uzkt6ngmdssd4telcqoq`

### Faction Colors

| Faction | Primary Color | Hex | Use In Video |
|---------|--------------|-----|-------------|
| Pleiadian | Gold | `#c89b3c` | Brand primary, title text |
| Sirian | Blue | `#7dc8ff` | Divine, celestial moments |
| Arcturian | Purple | `#8b5cf6` | Mystical, rare |
| Andromedan | Teal | `#06b6d4` | Tech, advanced |
| GalacticFed | Silver | `#94a3b8` | Neutral, balanced |
| Ascended | White-Gold | `#fbbf24` | Enlightenment, peak moments |
| Orion | Ice Blue | `#93c5fd` | Cold, strategic |
| Lemurian | Emerald | `#10b981` | Nature, growth |
| Atlantean | Cyan | `#22d3ee` | Ocean, depth |
| Agarthan | Earth Brown | `#a16207` | Underground, ancient |
| Martian | Red-Orange | `#ef4444` | War, aggression |
| Anunnaki | Orange | `#f97316` | Power, authority |
| Luciferian | Dark Red | `#e84040` | Dark, dangerous |
| Reptilian | Acid Green | `#84cc16` | Sinister, cunning |

Use faction colors as:
- Colored borders/overlays on character portraits during reveals
- Background tint for faction-grouped sections
- Text color for faction names (use the faction's primary color)

### Logo Usage Rules
- Prominent reveal as a visual event at 8-12s mark (with animation + dedicated SFX)
- CTA end slate: logo prominently placed, full opacity
- NEVER use as a persistent watermark throughout the video -- this is not a TV network bumper
- Logo reveal should have its own sound effect (shimmer + impact)
- Minimum logo display time: 3 seconds per appearance

---

## 8. CRYPTO/NFT CONVERSION PSYCHOLOGY

### The 5 Cardinal Rules

**Rule 1: Lead with Gameplay Quality, Blockchain Second**
D&D has a working game with 707 passing tests, 72 characters, and a full combat engine. This is the #1 differentiator from vaporware NFT projects. Show gameplay in the first 15 seconds. Mention blockchain/NFT/tokens AFTER the viewer is already engaged by the game itself.

**Wrong order**: "NFT card game on Polygon" -> gameplay
**Right order**: Stunning combat -> character reveal -> "And you OWN every champion"

**Rule 2: Working Product is the #1 Trust Signal**
In a space where 90% of projects have nothing but concept art and promises, showing a real, running, interactive game is the most powerful anti-rugpull signal available. Every trailer MUST include actual game UI footage (hex grid, shop, combat, synergies). This is not optional.

**Rule 3: Scarcity Messaging Goes Near the CTA, Not Mid-Trailer**
"200 Founder's Passes" creates urgency -- but placing it at the 20-second mark means the viewer forgets by the CTA. Place scarcity messaging at 80-90% through the video, immediately before or as part of the CTA. The sequence is: gameplay proof -> desire -> scarcity -> action.

**Rule 4: Show the Economy, Never Promise Returns**
- SAY: "Earn DDT tokens every match. DDT trades on exchanges."
- NEVER SAY: "Make $500/day" or "10x your investment"
- Show the marketplace, show trading, show token earning -- let the viewer draw conclusions
- Use monospace font for economic data (signals technical credibility to crypto audience)
- "PLAY -> EARN -> TRADE" not "GET RICH PLAYING GAMES"

**Rule 5: Show Social Proof, Never Fake It**
Sophisticated crypto buyers will verify claims. Understating and overdelivering builds more trust than inflating numbers. Show real metrics:
- Discord member count
- Test suite passing (707 tests = engineering credibility)
- Character count (72 champions)
- Feature completeness percentage
- If community is small, show development velocity instead

### The 5 Psychological Triggers That Convert

| Trigger | What It Means | How to Activate in Video | Placement |
|---------|--------------|-------------------------|-----------|
| **FOMO** | Fear of missing out on a limited opportunity | Supply counter ticking down, "200 Founder's Passes. When they're gone, they're gone." | 80-90% (near CTA) |
| **Ownership Pride** | Desire to truly own digital assets | "Your champions are YOURS. On-chain. Tradeable. Permanent." Show NFT in wallet. | 15-25% (early hook) |
| **Earning Potential** | Aspiration to profit from play | Show marketplace trades, token balance increasing, "Play and Earn" | 60-70% (after gameplay proof) |
| **Community Belonging** | Desire to be part of something | Discord screenshots, faction allegiance, "Join 5,000 Founders" | 70-80% (social proof section) |
| **Quality Signal** | Trust that the project is legitimate | High production value in the trailer itself, real gameplay footage, polished UI | Every frame (ambient) |

### CTA Best Practices for Web3

- ONE action, not three. Pick the most important: mint link, Discord join, or website visit
- Use web3-native language: "Connect your wallet" not "Download the app"
- Show the Founder's Pass artwork prominently
- Include urgency: "200 SUPPLY" with a number, not just "limited"
- Hold the CTA on screen for 8-12 seconds (viewer needs time to pull out phone/open browser)
- If `demonsanddeities.com` IS the mint page, show the URL. If it is a middleman, show the direct mint link
- Discord link as secondary CTA (smaller text below primary)
- End slate must be screenshottable -- designed to look good as a still image shared on social media

---

## 9. QUALITY SCORECARD (0-100)

Use this scorecard to rate ANY D&D video before publishing. Score each category, sum the total. Minimum passing score: 70/100. Target: 85+.

### Category 1: Hook Power (0-15 points)

| Score | Criteria |
|-------|---------|
| 0-3 | Opens with logo, static image, or black screen. No motion in first frame. |
| 4-6 | Has motion in first frame but generic (slow fade, weak Ken Burns). No audio hook. |
| 7-9 | Strong visual hook with motion + audio anchor. Creates mild curiosity. |
| 10-12 | Compelling visual pattern interrupt + audio drop. Makes viewer think "what is this?" |
| 13-15 | Exceptional hook: unique visual, perfect audio sync, immediate genre signal. Would stop a fast-scrolling thumb. |

**Quick check**: Watch the first 1.6 seconds with sound off. Would you stop scrolling? Watch with sound on. Does the audio make you want to stay?

### Category 2: Visual Quality (0-20 points)

| Score | Criteria |
|-------|---------|
| 0-4 | Stock video clips used, static images without effects, low resolution, no game footage. |
| 5-8 | Some game footage but supplemented with non-approved sources. Some static images. Inconsistent quality. |
| 9-12 | Consistent color grading. Ken Burns on all stills. All footage from approved sources (game recordings, dev captures, YouTube clips, 3D renders). Good composition. |
| 13-16 | High-quality visuals throughout. Effective use of filters, effects, and faction colors. Smooth transitions. |
| 17-20 | Cinema-quality visual treatment. Every frame looks intentional. Faction color coding consistent. Gameplay footage is clear and polished. Flash cuts are perfectly timed. |

**Mandatory checks and automatic deductions**:
- All moments have video as the base layer (Commandment XI). Scrub through the entire timeline -- is there any moment where an image or HTML gradient is the only visual on screen with no video underneath? If yes, deduct 5 points from this category automatically.
- Any clip with visible branding from another game (Commandment XII): deduct 5 points per occurrence.
- Any clip with burned-in subtitles (Commandment XIII): deduct 3 points per occurrence.
- Any clip from a non-auto-battler genre that is not anime lore content (Commandment XIV): deduct 3 points per occurrence.

**Quick check**: Pause at 5 random frames. Does every frame look like it belongs in a professional game trailer?

### Category 3: Audio Quality (0-15 points)

| Score | Criteria |
|-------|---------|
| 0-3 | No SFX, music-only, or SFX/music from same source. Audio feels flat. |
| 4-6 | Separate music and SFX but poor sync. SFX arrive early/late. Music does not match energy arc. |
| 7-9 | Decent music-visual sync. 3+ distinct SFX types. Music matches general energy. VO (if present) is audible. |
| 10-12 | Strong BPM sync. 5+ SFX types placed precisely. Music arc matches visual arc. VO ducking works. Volume levels balanced. |
| 13-15 | Professional audio mix. Every cut lands on a beat. SFX feel like "visual percussion." Music has the breathe-before-climax moment. VO sits perfectly above the mix. Signature D&D audio cues present. |

**Mandatory checks and automatic deductions**:
- More than 3 audio sources playing simultaneously at any moment (Commandment XVI): deduct 3 points.
- Soundtrack volume above 0.5 during voiceover sections (Commandment XVI): deduct 2 points.
- Any video clip with audio not muted (volume > 0) without explicit justification: deduct 2 points.

**Quick check**: Close your eyes and listen. Can you feel the energy arc? Do you hear distinct SFX for transitions? Does the music build and release?

### Category 4: Pacing and Arc (0-15 points)

| Score | Criteria |
|-------|---------|
| 0-3 | No discernible arc. Same energy throughout. No climax. Monotonous pacing. |
| 4-6 | Some variation but no clear build. Climax either missing or at wrong position. |
| 7-9 | Recognizable three-act structure. Climax exists but not at 70-80% mark. Some accelerating cuts. |
| 10-12 | Clear emotional arc with build, climax at 70-80%, and resolution. Accelerating cut rhythm in character parade. Breathe moment present. |
| 13-15 | Perfect emotional arc. Viewer feels tension build and release. Accelerating cuts create physiological excitement. Breathe-before-climax moment lands perfectly. Post-climax dip gives space before CTA. |

**Quick check**: Chart the energy level every 5 seconds. Does it follow the universal energy curve? Is there a clear peak at 70-80%?

### Category 5: Text and Copy (0-15 points)

| Score | Criteria |
|-------|---------|
| 0-3 | Text overload (too many cards), unreadable text (no background), inconsistent fonts/colors, text during peak montage. |
| 4-6 | Within text card limits but copy is weak or generic. Text readable but not styled. Inconsistent positioning. |
| 7-9 | Good copy, within limits, readable. Mostly consistent font/color hierarchy. Some text timing issues. |
| 10-12 | Strong copy that communicates value. Consistent font hierarchy (max 3 styles). Max 3 colors. All text has sufficient display time. Zero text during peak montage. |
| 13-15 | Exceptional copy: every word earns its place. Perfect font/color hierarchy. Kinetic typography used effectively. Text placement follows platform conventions. CTA copy creates urgency. |

**Mandatory checks and automatic deductions**:
- Any use of Shotstack native title presets (`"type": "title"`) instead of HTML assets (Commandment XV): deduct 3 points per occurrence.
- Any text with `background-color` instead of `text-shadow` for readability: deduct 2 points.

**Quick check**: Read every text card aloud. Does each one communicate something essential? Could any be cut without losing meaning? Is every card on screen long enough to read twice?

### Category 6: Brand and CTA (0-10 points)

| Score | Criteria |
|-------|---------|
| 0-2 | No CTA, or CTA is unclear/multiple actions. Logo absent or used as persistent watermark. |
| 3-4 | CTA exists but weak (no urgency, no scarcity). Logo shown but not as an event. |
| 5-6 | Clear single-action CTA with basic urgency. Logo reveal present. Faction colors used. |
| 7-8 | Strong CTA with scarcity + urgency + clear action. Logo reveal is a visual event. Consistent brand colors throughout. Founder's Pass art shown. |
| 9-10 | CTA is compelling and held 8-12s. Logo reveal has dedicated SFX and animation. Faction color coding throughout. End slate is screenshottable. Brand identity unmistakable. |

**Quick check**: Could someone who has never heard of D&D tell you what to do after watching? Would they feel urgency to do it?

### Category 7: Technical Quality (0-10 points)

| Score | Criteria |
|-------|---------|
| 0-2 | Sub-720p, visible compression artifacts, audio clipping, desync issues. |
| 3-4 | 720p but some technical issues: brief desync, inconsistent aspect ratio, one or two jarring transitions. |
| 5-6 | 1080p, no desync, clean transitions, but minor issues (a brief audio pop, minor framing issue). |
| 7-8 | 1080p+, zero technical issues, all transitions clean, all SFX synced within 0.05s, no audio artifacts. |
| 9-10 | Flawless technical execution. 1080p/60fps. Perfect sync. Clean audio mix. Appropriate use of 5+ Shotstack features. Proper black cuts between sections. |

**Quick check**: Watch at 2x speed looking only for technical issues. Any jarring moments? Any desync? Any resolution drops?

### Score Summary Template

```
SCORECARD: [Video Name] - [Date]
═══════════════════════════════════
Hook Power:       __/15
Visual Quality:   __/20
Audio Quality:    __/15
Pacing & Arc:     __/15
Text & Copy:      __/15
Brand & CTA:      __/10
Technical:        __/10
═══════════════════════════════════
TOTAL:            __/100

Verdict: [ ] PUBLISH (85+)  [ ] REVISE (70-84)  [ ] REBUILD (<70)

Top 3 weaknesses:
1.
2.
3.

Action items:
-
```

---

## 10. COMMON MISTAKES BLACKLIST

The 37 most common mistakes. Each numbered entry describes what NOT to do, followed by what to do instead.

### Hook Failures (1-6)

**1. Opening with the game logo**
BAD: First 3 seconds show the D&D logo fading in from black.
GOOD: First 3 seconds show gold particles converging into a character silhouette. Logo appears at 8-10 seconds as a dramatic reveal.

**2. Opening with a static image (no motion)**
BAD: A character portrait appears without any effect -- a frozen image for 2-3 seconds.
GOOD: Character portrait with `zoomIn` effect, entering with a fade and paired with an impact SFX.

**3. Opening with text explaining what the game is**
BAD: "Demons & Deities is a blockchain-based auto-battler game..."
GOOD: Show the game being awesome for 10 seconds, THEN communicate what it is.

**4. Burying the hook after a slow fade from black**
BAD: 2-second fade from black before anything appears (viewer has already scrolled).
GOOD: Content begins at frame 1. Zero warmup. Zero fade-from-black at the start.

**5. Using Web3 jargon in the opening**
BAD: "The first ERC-721 auto-battler on Polygon Layer 2"
GOOD: Show stunning gameplay first. Say "You own your champions" (not "ERC-721 tokens") after the hook.

**6. Hook that does not match the rest of the video**
BAD: Open with an explosive combat scene, then spend 40 seconds on slow text slides about tokenomics.
GOOD: Hook should preview the video's best moment. The rest of the video should fulfill the hook's promise.

### Visual Mistakes (7-14)

**7. Using Pixabay or stock video clips**
BAD: Generic "cosmic clouds" clip from Pixabay or any stock footage library. This signals "vaporware crypto project" to sophisticated audiences.
GOOD: Screen recording of actual gameplay, dev process capture, clipped YouTube reference footage, or character portrait with Ken Burns effect. D&D has a working game -- use real footage from it.

**8. Slideshow transitions (slideLeft, slideRight)**
BAD: Character portraits sliding in from the side like a PowerPoint deck.
GOOD: Character portraits appearing with `fade` or hard cut, paired with impact SFX.

**9. Showing cover art for extended periods mid-trailer**
BAD: Cover art displayed for 8 seconds in the middle of the trailer as filler.
GOOD: Cover art used ONLY as brief opening backdrop (3-5s) or CTA background. Middle is gameplay + characters.

**10. No Ken Burns on static images**
BAD: A character portrait sits perfectly still for 4 seconds.
GOOD: Same portrait with `zoomIn` creating subtle motion. The viewer subconsciously perceives life.

**11. Inconsistent aspect ratio or resolution**
BAD: Mixing 720p and 1080p sources, or showing a 16:9 clip letterboxed inside a 16:9 frame.
GOOD: All sources at consistent resolution, `fit: "cover"` to fill frame, `crop` to reframe if needed.

**12. No black cuts between major sections**
BAD: Hook slams directly into character parade which slams directly into gameplay which slams into CTA -- no breathing room.
GOOD: 0.3-0.5s gaps of black between major sections, each optionally punctuated with a bass impact.

**13. Too many visual effects competing for attention**
BAD: A clip with `zoomIn` + `boost` filter + text overlay + animated border + particle overlay all at once.
GOOD: One or two treatments per clip maximum. Let each element breathe.

**14. Flash cuts that are too long or too short**
BAD: "Flash cuts" that are actually 1.5 seconds each (too slow for montage) or 0.1 seconds (too fast to register).
GOOD: Flash cuts in the rapid montage at 0.4-0.7 seconds each. White frame flashes at 0.07 seconds between them.

### Audio Mistakes (15-20)

**15. Using the same file for music and SFX**
BAD: One audio file plays as both soundtrack and effects. SFX cannot be independently timed.
GOOD: Separate soundtrack in `soundtrack` property, individual SFX as `audio` assets on Track 0.

**16. SFX out of sync with visuals**
BAD: Whoosh sound plays 0.3 seconds after the character has already appeared.
GOOD: Whoosh `start` time matches the character clip `start` time exactly (within 0.05s).

**17. No SFX at all -- music only**
BAD: Background music plays while visuals cut silently. Feels like a muted video.
GOOD: Minimum 5 SFX events in a 45-second video. Each major visual transition gets an SFX.

**18. Music volume does not duck for voiceover**
BAD: VO and music fight at the same volume. Words are unclear.
GOOD: When VO plays, music volume drops to 0.40-0.50. VO at 1.0. Clear vocal separation.

**19. No "breathe" silence before the climax**
BAD: Energy stays constant through the climax. The peak does not feel peak because there is no valley before it.
GOOD: 2-4 seconds of near-silence (held note, ambient only) immediately before the highest-energy sequence.

**20. Abrupt music start/stop**
BAD: Music starts at full volume on frame 1 and cuts off abruptly at the end.
GOOD: `"effect": "fadeInFadeOut"` on soundtrack. Or manual fade via volume envelope.

### Text/Copy Mistakes (21-25)

**21. Text during the peak montage**
BAD: Character names appearing during the rapid flash-cut climax sequence.
GOOD: Zero text during the highest-energy montage. Pure visuals + music + SFX only. Text returns after the climax.

**22. Too many words per text card**
BAD: "Demons & Deities is a blockchain-powered auto-battler card game featuring 72 unique champions across 14 mythological factions"
GOOD: "72 CHAMPIONS" (card 1) -- "14 FACTIONS" (card 2) -- "ONE PROPHECY" (card 3). Three cards, 2 words each.

**23. Text on screen for too short a duration**
BAD: An 8-word sentence displayed for 1.5 seconds. Viewer cannot finish reading.
GOOD: 8 words = 4.0 seconds minimum display time. Always enough time to read twice.

**24. More than 3 font styles or 3 text colors**
BAD: Blockbuster for titles, future for features, subtitle for names, minimal for captions, vogue for quotes = 5 styles.
GOOD: Blockbuster for titles, future for features, subtitle for everything else = 3 styles max.

**25. Text without background overlay on busy visuals**
BAD: White text floating over a detailed character portrait. Letters blend into the art.
GOOD: Same text with a `rgba(0,0,0,0.6)` background bar behind it, or placed over a `darken`-filtered section.

### Structural Mistakes (26-30)

**26. No clear CTA or multiple competing CTAs**
BAD: "Visit our website! Join Discord! Follow on Twitter! Mint now! Read the whitepaper!"
GOOD: "FOUNDER'S PASS -- 200 SUPPLY -- demonsanddeities.com" -- ONE action.

**27. CTA held for less than 5 seconds**
BAD: End slate flashes for 2 seconds and the video ends. Viewer cannot process or act.
GOOD: CTA held for 8-12 seconds. Viewer has time to screenshot, open browser, or remember the URL.

**28. Climax at the wrong position**
BAD: Highest energy moment at the 30% mark, then 70% of the video is declining energy.
GOOD: Climax at 70-80% mark. Build to it, hit it, brief dip, then CTA. The arc matters.

**29. No gameplay footage (all stock video/cinematics)**
BAD: 60 seconds of Pixabay stock footage and text overlays. No game UI anywhere. Stock video is banned entirely.
GOOD: Minimum 40% runtime is actual game screen recordings: hex grid, shop, combat, synergies, augments. Supplement with dev process captures, YouTube reference clips, and character portraits with Ken Burns.

**30. Video exceeds 90 seconds for an unknown IP**
BAD: 3-minute trailer for a game nobody has heard of. Viewer drops off after 60 seconds.
GOOD: 45-75 seconds for the primary trailer. 15-25 seconds for TikTok/Reels cut. Respect attention spans.

**31. Using Pixabay stock video clips**
BAD: Downloading "cosmic nebula" or "abstract particles" video from Pixabay and using it as B-roll. This signals "vaporware crypto project" and destroys trust with crypto-savvy viewers.
GOOD: Use real game footage instead. Screen record gameplay from `play.demonsanddeities.com`, capture dev process sessions, clip YouTube reference trailers, or apply Ken Burns to character portraits. Pixabay is ONLY for music and SFX audio -- never video.

**32. Using images as the main background instead of video**
BAD: A character portrait or cover art image sits as the ONLY visual on screen for 3-5 seconds with no video playing underneath. Or an HTML div with a CSS gradient serves as the "background" for a section. The result looks like a slideshow, not a trailer.
GOOD: Video clips are ALWAYS the base visual layer on the bottom track (Track 5), playing continuously with zero gaps for the entire timeline. Character portraits, logos, cover art, and Founder's Pass art are placed as overlays on higher tracks (Track 3) using opacity, scale, and position properties. When you need a subdued background behind overlays, apply a `darken` or `blur` filter to the video clip underneath -- never replace the video with a static image or HTML gradient.

**33. Gaps in the video base layer**
BAD: The bottom video track has a 2-second gap between clips, causing a black frame or revealing a lower-priority track's static image as the sole visual.
GOOD: Video clips on the bottom track are placed back-to-back with zero gaps. Every moment of the timeline has a video clip playing as the base visual layer. Use `trim` to select the best moments and vary clip durations (2-6 seconds) to maintain visual interest.

**34. Using clips with other game branding visible**
BAD: A YouTube clip of TFT gameplay with the TFT logo clearly visible in the corner, or a Gods Unchained clip with the game title on the loading screen. The viewer sees another game's name and thinks "this isn't original."
GOOD: Screen every clip for visible text, logos, watermarks, and UI branding before including it. If branding is visible, crop it out or reject the clip. Only use clips that are "clean" enough to pass as D&D footage.

**35. Using clips with burned-in subtitles**
BAD: A YouTube cinematic clip with hardcoded white subtitles at the bottom of the frame. When our own text overlays appear, they compete with the subtitle text and the result looks chaotic and unprofessional.
GOOD: Check the bottom 15% of every clip for subtitle text before approving it. If subtitles are baked in, reject the clip entirely -- they cannot be removed in post. Find a clean version or an alternative source.

**36. Using Shotstack title presets (they create black bars)**
BAD: Using `"type": "title", "style": "blockbuster"` which renders text with an opaque black background bar behind it, making the video look like a corporate presentation.
GOOD: Use `"type": "html"` assets with custom CSS. Apply `text-shadow` for readability instead of `background-color`. Use system fonts (Arial Black, Impact, Georgia) with gold glow shadows: `text-shadow: 0 0 20px rgba(200,155,60,0.8), 0 4px 8px rgba(0,0,0,0.9)`.

**37. Audio clipping from too many simultaneous sources**
BAD: Voiceover at 1.0, soundtrack at 0.7, two SFX at 0.9, and a video clip with audio at 0.5 all playing at the same moment. The combined output clips and distorts.
GOOD: Never have more than 3 audio sources playing simultaneously. VO at 1.0, soundtrack ducked to 0.3-0.4 during VO, SFX at 0.5-0.7, video clips muted (volume 0). Review the loudest 5-second segment at full volume before submitting any render.

---

## 11. REFERENCE STANDARDS

These are the quality targets. Every D&D video should be compared against these references.

### TFT Set Cinematics (Structure and Pacing)
- **What to study**: The emotional arc, accelerating cut rhythm, character parade structure, BPM-synced editing, use of silence before climax
- **Key examples**: TFT Remix Rumble cinematic, TFT Inkborn Fables launch cinematic
- **What D&D should match**: The pacing structure (4s -> 2s -> 1s -> 0.5s character reveals), the energy curve, the zero-text peak montage, the post-climax emotional pivot
- **What D&D should NOT copy**: TFT's reliance on full 3D animation (we use game recordings, portraits with Ken Burns, and 3D model renders instead)
- **Benchmark**: If your video's pacing feels like a TFT set reveal, the arc is correct

### Illuvium (Production Quality)
- **What to study**: The cinematic quality of creature reveals, the polish of in-engine footage, how they use slow-motion on ability moments
- **Key takeaway**: Illuvium generated massive hype because they showed polished in-engine footage early, unlike vaporware competitors. D&D must do the same with real gameplay.
- **Benchmark**: If your video's visual treatment makes game assets look as polished as Illuvium's creature reveals, the quality is right

### Gods Unchained (Card Game Aesthetic)
- **What to study**: How they present card art, the card flip/reveal animations, the balance between card showcase and gameplay, the economy messaging
- **Key takeaway**: Card games benefit from the "collection desire" instinct. Show cards being collected, revealed, and organized. The collection UI IS a selling point.
- **Benchmark**: If watching your video makes the viewer want to collect the characters, the aesthetic is working

### Derek Lieu Standards (Indie Game Trailers)
- **What to study**: His blog posts on trailer structure, CTA end slates, sound design, TikTok adaptation
- **Key principles from Derek Lieu**:
  - "Show the game being played, not just looking pretty"
  - "The first frame is the most important frame"
  - "Sound effects should be on, always"
  - "One CTA, one action"
  - "Don't show a URL if it adds clicks between trailer and conversion"
- **Benchmark**: If Derek Lieu would approve your trailer structure and CTA, the fundamentals are solid

### Genshin Impact Character Demos (Character Presentation)
- **What to study**: The three-camera ability showcase (activation close-up, wide effect, enemy reaction), environment-first character introduction, the emotional pivot in the final third, voice ducking under music
- **Key takeaway**: Each character demo makes the viewer FEEL something about the character through environment and pacing, not just see abilities
- **Benchmark**: If watching your character reveal makes the viewer want to play THAT specific character, the presentation is working

### Best Crypto Game Trailers (Web3 Conversion)
- **Parallel TCG**: "PLAY -> EARN -> TRADE" kinetic text, ownership stated early then moved on, monospace font for economic data, Discord-first CTA
- **Axie Infinity**: Real player earning stories, "play AND earn" framing (fun first), community-driven viral marketing
- **Moonbirds**: Founder credibility through podcast presence (Bankless, Tim Ferriss), authority channels over hype
- **Benchmark**: If your web3 messaging follows the "show don't promise" principle and includes a working product as the primary trust signal, the conversion approach is correct

---

## 12. SELF-IMPROVEMENT PROTOCOL

### After Every Render: The Mandatory Review Cycle

**Step 1: Score It**
Run the video through the Quality Scorecard (Section 9). Fill out every category. Be honest -- a generous self-score leads to publishing mediocre content.

**Step 2: Identify the 3 Lowest Categories**
Look at the three categories with the lowest individual scores. These are your improvement targets for the next render.

**Step 3: Research Targeted Improvements**
For each weak category, apply the corresponding research action:

| Weak Category | Research Action |
|--------------|----------------|
| Hook Power | Re-watch the first 3 seconds of 5 TFT set reveals. Note exactly what is shown. Implement one technique you have not tried. |
| Visual Quality | Apply one new Shotstack feature you have not used (Section 6). Add color treatment to every untreated clip. |
| Audio Quality | Add 3 more SFX events. Verify BPM sync. Ensure separate soundtrack and SFX sources. |
| Pacing & Arc | Chart energy level every 5 seconds. Compare to the Universal Energy Curve (Section 3). Adjust clip durations. |
| Text & Copy | Count text cards -- are you under the limit? Check display times. Reduce to max 3 font styles. |
| Brand & CTA | Extend CTA to 10 seconds. Add scarcity language. Make logo reveal a visual event. |
| Technical | Re-render at 1080p. Check all SFX sync within 0.05s. Verify no resolution drops. |

**Step 4: Compare to Reference**
Watch the closest reference trailer (Section 11) immediately before and after watching your video. Note specific differences. Your video should progressively close the gap with each iteration.

**Step 5: Document Learnings**
After each production cycle, note:
- What technique produced the biggest improvement?
- What Shotstack feature was underutilized?
- What SFX placement pattern worked best?
- What text approach was most readable/impactful?

### The Iteration Loop

```
RENDER v1 -> SCORE -> IDENTIFY WEAKNESSES -> RESEARCH -> RENDER v2 -> SCORE -> ...
```

Each version should score at least 5 points higher than the previous. If a version scores lower, identify what regressed and fix before proceeding.

### Automated Rule Enforcement

Rules are not just documented here -- they are encoded in code. The following files are the automated enforcement layer:

| File | What It Enforces |
|------|-----------------|
| `scripts/marketing/video-quality-audit.ts` | ~45 automated checks including screen recording detection, Ken Burns detection, freeze detection, text bleed detection, opening SFX detection, plus all structural/quality scoring |
| `scripts/marketing/knowledge/technique-cards/MASTER-DIRECTION.md` | Founder's complete vision -- supersedes all other direction files |
| `scripts/marketing/AGENT-SWARM-PLAYBOOK.md` | Asset verification protocol for all agents |

When a new rule is learned from production failures, it must be encoded in BOTH this document AND `video-quality-audit.ts`. A rule that only exists in markdown will eventually be forgotten. A rule encoded in the audit script will be enforced automatically on every render.

### Continuous Bible Updates

This document is living. When new techniques are discovered:

1. Test the technique in a render
2. Score the render with and without the technique
3. If the technique improves the score by 3+ points, add it to this bible
4. If the technique fails, add it to the Common Mistakes Blacklist (Section 10)
5. Update the relevant section with specific Shotstack implementation details

### Quarterly Review Checklist

Every 90 days, review:
- [ ] Are we still following all 16 Commandments?
- [ ] Has our average scorecard rating improved?
- [ ] Are we using 5+ Shotstack power features per video?
- [ ] Do our hooks match current platform trends (hook styles evolve)?
- [ ] Are our reference standards still the best examples?
- [ ] Has any new competitor set a higher quality bar?
- [ ] Are we A/B testing hooks (Technique #47)?
- [ ] Is the character reveal template generating daily content?

---

## 13. ASSET QUALITY STANDARDS

Every asset sourced for a D&D video must meet these minimum quality bars. Failing to enforce these standards results in renders that look amateurish, sound generic, or break during production. No exceptions.

### Video Clips

**PIXABAY VIDEO, STOCK VIDEO, SCREEN RECORDINGS, AND KEN BURNS ZOOMS ARE ALL BANNED.** All video footage must come from these 4 approved sources:

1. **Segmind P2V (photo-to-video) animations** -- The primary method for bringing cover art and character portraits to life. Upload the image to Segmind Kling 1.6, get back a 5-second animated video. This is the #1 replacement for both screen recordings and Ken Burns zooms.
2. **YouTube reference clips** -- Extracted clips from game trailers, cinematics, and reference videos (TFT set reveals, competitor trailers, etc.). Credit where required.
3. **3D model renders** -- Character model turntables, ability animations, pack opening sequences rendered from the 3D pipeline.
4. **Animated text video clips** -- Text rendered to video via ffmpeg drawtext with built-in animation (fade, slide, scale). These replace HTML text overlays for consistent, cinematic text treatment.

Quality standards for all video sources:
- **Minimum resolution**: 1280x720. Reject anything smaller -- low-res clips look blurry when scaled to 1080p output.
- **Minimum duration**: 3 seconds of source footage. Shorter clips leave no room to trim to the best moment.
- **NO clips with visible watermarks, text, logos, or people's faces** that are not D&D assets.
- **Every clip MUST be previewed before use** -- run a visual quality check. Do not blindly include recordings without reviewing them.
- **Clips should match the D&D color palette**: dark backgrounds with gold/purple/blue accents.
- **Video is ALWAYS the base visual layer (Commandment XI)**. The bottom track must contain back-to-back video clips covering the entire timeline with zero gaps. Images, portraits, logos, and other static assets are overlays on HIGHER tracks -- they never replace video as the background. If you need a dark or subtle background behind text or overlays, use a video clip with a `darken` or `blur` filter -- never an HTML gradient or a full-screen static image.

### Music / Soundtrack

- **Must be at least 60 seconds long** so it covers a full trailer without awkward loops or abrupt repeats.
- **Must have clear build-up and drops** -- cinematic structure with dynamics, not flat ambient background. The music drives the emotional arc (Section 3).
- **Genres that work**: epic orchestral, dark electronic, cinematic hybrid, trailer music, dark ambient with percussion.
- **Genres that DO NOT work**: pop, EDM drops, lo-fi, acoustic guitar, happy/upbeat, chiptune, jazz, reggae.
- **Must have a clear beat that can be synced to cuts**. Avoid arrhythmic ambient tracks -- if you cannot identify the BPM, the track is unusable for a trailer.
- **Volume must not clip or distort at any point**. Listen to the loudest section at full volume before using.
- **Must be royalty-free with commercial license**. Pixabay music is royalty-free (yes). Always verify license terms for non-Pixabay sources.

### Sound Effects

- **Must be clean recordings** with no background noise, no room reverb, no hiss.
- **Types needed (minimum 3 per trailer)**:
  1. **Bass impact** -- deep, sub-heavy boom for reveals and transitions
  2. **Whoosh** -- for scene changes and text appearances
  3. **Riser** -- tension-building sweep before climax moments
  4. **Shimmer/sparkle** -- for positive reveals (Founder's Pass, rewards, character materialization)
  5. **Hit/stinger** -- sharp metallic hit for logo slams and combat accents
- **Duration**: 0.3-2.0 seconds each. SFX should be punchy, not drawn out. A 5-second impact SFX is a music track, not an effect.
- **NEVER use the soundtrack as an SFX source** (Commandment III). They are separate assets, always.

### Character Art / Game Assets

- **Portraits must be the official game portraits** from `play.demonsanddeities.com`. Do not use fan art, AI-generated replacements, or cropped screenshots.
- **Only use existing, verified URLs**. Check that the URL returns a 200 response before including it in a Shotstack JSON.
- **Cover art**: Only `home-cover-art.png` and `founders-pass-final.png` are approved for use.
- **Logo**: Only `dd-logo-icon.png` is the official logo. Do NOT use unofficial, generated, or placeholder logos.
- **Screenshots**: Must be actual screenshots from the live game at `play.demonsanddeities.com`, not mockups, Figma exports, or concept art.

### IPFS-Pinned Assets

- **All local assets must be pinned to IPFS before use in Shotstack**. Shotstack cannot access local file paths.
- **Verify gateway URL returns correct content-type**: `audio/mpeg` for MP3, `video/mp4` for video, `image/png` for images.
- **Pinata gateway URLs preferred** (`gateway.pinata.cloud`). These are the most reliable and fastest.
- **Never use expired or broken IPFS URLs** -- always test the URL in a browser or with `curl` before including in a render. A broken URL produces a black frame or silent audio.

### Asset Quality Tiers

| Tier | Definition | Usage Rule |
|------|-----------|------------|
| **S-Tier** | Segmind P2V animations of cover art/portraits, clipped YouTube reference footage (TFT cinematics, game trailers), animated text videos (ffmpeg drawtext), ElevenLabs voiceover | Use freely in any production |
| **A-Tier** | 3D model renders and pack opening animations, Pixabay music/SFX audio | Use with review -- preview before including |
| **B-Tier** | Character portraits with P2V animation applied (never static, never Ken Burns) | Use only with P2V animation |
| **C-Tier (BANNED)** | ALL screen recordings, ALL Ken Burns zooms, Pixabay stock video clips, generic stock footage, AI-generated video without game context, generic crypto imagery (spinning coins, green charts), AI-generated voices that sound robotic, low-res images (<720p), HTML text overlays | **NEVER use**. No exceptions. Enforced by `video-quality-audit.ts`. |

When sourcing video assets, always start at S-Tier and work down. If you reach B-Tier, create a new P2V animation before settling. If you are considering C-Tier, stop -- the audit script will reject it automatically. Pixabay is only for music and SFX audio.

---

## APPENDIX A: SHOTSTACK JSON SKELETON (Copy-Paste Starter)

**CRITICAL: Video is ALWAYS the base visual layer (Commandment XI). The bottom track (Track 5) must contain back-to-back video clips covering the ENTIRE timeline with zero gaps. Images are ONLY overlays on higher tracks -- never the sole visual on screen.**

```json
{
  "timeline": {
    "soundtrack": {
      "src": "https://YOUR-MUSIC-URL.mp3",
      "effect": "fadeInFadeOut",
      "volume": 0.65
    },
    "tracks": [
      {
        "_comment": "Track 0: SFX audio",
        "clips": [
          { "asset": { "type": "audio", "src": "https://SFX-SHIMMER.mp3", "volume": 0.9 }, "start": 0.0, "length": 0.5 },
          { "asset": { "type": "audio", "src": "https://SFX-IMPACT.mp3", "volume": 1.0 }, "start": 5.0, "length": 0.5 },
          { "asset": { "type": "audio", "src": "https://SFX-WHOOSH.mp3", "volume": 0.9 }, "start": 8.0, "length": 0.4 }
        ]
      },
      {
        "_comment": "Track 1: Voiceover audio",
        "clips": [
          { "asset": { "type": "audio", "src": "https://VO-NARRATION.mp3", "volume": 1.0 }, "start": 4.0, "length": 6.0 }
        ]
      },
      {
        "_comment": "Track 2: Text overlays",
        "clips": [
          { "asset": { "type": "title", "text": "YOUR TEXT", "style": "blockbuster", "size": "xx-large", "color": "#c89b3c" }, "start": 4.0, "length": 3.0, "transition": { "in": "fade", "out": "fade" } }
        ]
      },
      {
        "_comment": "Track 3: Image overlays (portraits, logos, pack art -- with opacity/scale/position)",
        "clips": [
          { "asset": { "type": "image", "src": "https://play.demonsanddeities.com/images/dd-logo-icon.png" }, "start": 8.0, "length": 3.0, "transition": { "in": "fade" }, "fit": "none", "position": "center", "scale": 0.3, "opacity": 1.0 },
          { "asset": { "type": "image", "src": "https://play.demonsanddeities.com/images/characters/enki.png" }, "start": 14.0, "length": 3.0, "effect": "zoomIn", "transition": { "in": "fade", "out": "fade" }, "fit": "none", "position": "centerRight", "scale": 0.5, "opacity": 0.95 }
        ]
      },
      {
        "_comment": "Track 4: Semi-transparent dark overlay (for text readability, only during text sections)",
        "clips": [
          { "asset": { "type": "html", "html": "<div style='width:100%;height:100%;background:rgba(0,0,0,0.5)'></div>", "width": 1920, "height": 1080 }, "start": 4.0, "length": 3.0, "transition": { "in": "fade", "out": "fade" } }
        ]
      },
      {
        "_comment": "Track 5: Video clips -- THE BASE VISUAL. ALWAYS present, NEVER gaps. Covers entire timeline.",
        "clips": [
          { "asset": { "type": "video", "src": "https://GAME-COMBAT-RECORDING.mp4", "trim": 5, "volume": 0 }, "start": 0, "length": 5, "filter": "boost", "transition": { "in": "fade" }, "fit": "cover" },
          { "asset": { "type": "video", "src": "https://GAME-HEX-GRID-RECORDING.mp4", "trim": 2, "volume": 0 }, "start": 5, "length": 4, "filter": "boost", "fit": "cover" },
          { "asset": { "type": "video", "src": "https://GAME-SHOP-RECORDING.mp4", "trim": 0, "volume": 0 }, "start": 9, "length": 5, "filter": "darken", "fit": "cover" },
          { "asset": { "type": "video", "src": "https://GAME-COMBAT-RECORDING-2.mp4", "trim": 10, "volume": 0 }, "start": 14, "length": 4, "filter": "boost", "fit": "cover" },
          { "asset": { "type": "video", "src": "https://GAME-SYNERGY-RECORDING.mp4", "trim": 3, "volume": 0 }, "start": 18, "length": 5, "filter": "boost", "transition": { "out": "fade" }, "fit": "cover" }
        ]
      }
    ]
  },
  "output": {
    "format": "mp4",
    "resolution": "1080",
    "fps": 25,
    "quality": "high"
  }
}
```

**Track order (front to back -- mandatory, see Commandment XI)**:
```
Track 0: SFX audio
Track 1: Voiceover audio
Track 2: Text overlays
Track 3: Image overlays (portraits, logos, pack art -- with opacity/scale/position)
Track 4: Semi-transparent dark overlay (for text readability, only during text sections)
Track 5: Video clips (the base visual -- ALWAYS present, NEVER gaps)
```

Note: In Shotstack, lower track numbers render ON TOP of higher track numbers. Track 0 is the topmost layer, Track 5 is the bottommost. This means video clips on Track 5 serve as the ever-present background, and all images/text/audio overlay on top. The video track must have back-to-back clips covering the entire timeline duration -- no gaps allowed. Use `filter: "darken"` or `filter: "blur"` on video clips underneath text/image overlay sections to keep overlays readable.

---

## APPENDIX B: QUICK REFERENCE CARD

```
BEFORE YOU RENDER -- CHECK THESE 16 THINGS:
=============================================
[ ] First frame has motion (Commandment I)
[ ] Gameplay footage >= 40% of runtime (Commandment II)
[ ] Separate soundtrack and SFX files (Commandment III)
[ ] Text cards within limit for duration (Commandment IV)
[ ] Resolution set to 1080 (Commandment V)
[ ] No logo in first 8 seconds (Commandment VI)
[ ] No slideLeft/slideRight transitions (Commandment VII)
[ ] No Pixabay/stock video clips -- only approved sources (Commandment VIII)
[ ] Black cuts between major sections (Commandment IX)
[ ] All SFX synced within 0.05s of visuals (Commandment X)
[ ] Video is base layer on Track 5 with zero gaps -- images are overlays only (Commandment XI)
[ ] No clips with visible branding from other games (Commandment XII)
[ ] No clips with burned-in subtitles (Commandment XIII)
[ ] All clips match auto-battler/strategy genre or are anime lore content (Commandment XIV)
[ ] All text uses HTML assets with text-shadow -- no Shotstack title presets (Commandment XV)
[ ] Audio mix balanced: VO 1.0, soundtrack 0.4, SFX 0.5-0.7, clips muted, max 3 simultaneous (Commandment XVI)
```

---

*This bible is the law. Follow it and every video improves. Ignore it and every video fails. There are no shortcuts to quality.*
