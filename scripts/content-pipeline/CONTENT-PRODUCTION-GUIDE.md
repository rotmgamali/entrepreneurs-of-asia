# Demons & Deities -- Content Production Guide

Master reference for the content creation swarm. Updated 2026-04-01 after v1-v11 audit.

## Architecture

```
SOURCES (input)                    PROCESSING                      OUTPUT
─────────────────                  ──────────                      ──────
YouTube clips (yt-dlp) ──┐
ElevenLabs VO          ──┤         ┌─────────────────┐
Segmind P2V            ──┤         │  Shotstack JSON  │──→ Shotstack API ──→ rendered MP4
Pixabay SFX/music      ──┼────────→│  (scene timeline │         │
Cover art/logos         ──┤         │   with layers)   │         ↓
3D model renders       ──┤         └─────────────────┘    ffmpeg drawtext ──→ final MP4
Pack opening animation ──┘                                (text overlays)
```

**Key change from earlier versions**: Text overlays are applied AFTER Shotstack render via ffmpeg, not inside Shotstack. This prevents black bars and allows adjustment without re-rendering.

## Available Tools

| Script | Purpose | API Used |
|--------|---------|----------|
| `clip-extractor.ts` | Download, analyze, clip videos from YouTube | yt-dlp + ffmpeg |
| `audio-pipeline.ts` | Voiceover generation + music | ElevenLabs |
| `pixabay-media.ts` | Search + download SFX and music ONLY | Pixabay |
| `video-quality-audit.ts` | Score videos against quality standards | -- |
| `video-analyze-reference.ts` | Analyze reference videos | Gemini 2.5 Pro |
| `video-blueprint-to-shotstack.ts` | Blueprint to render | Shotstack |
| `shotstack-validate.ts` | Validate + preview before render | -- |
| `pin-to-pinata.ts` | Pin files to IPFS | Pinata |
| `blotato-post.ts` | Post to social media | Blotato |
| `character-reveal-bot.ts` | Daily character posts | Blotato |

### Tools NOT in use (confirmed failures)

| Script | Why Removed |
|--------|-------------|
| `screen-recorder.ts` | Every screen recording failed -- broken pages, loading states. Banned. |
| Pixabay video search | Stock video looks like vaporware. Banned for video clips (SFX/music still OK). |
| Shotstack HTML overlays | Create black bars, cannot adjust after render. Use ffmpeg drawtext instead. |
| Shotstack title presets | Blockbuster, future, etc. all create black backgrounds. Banned. |
| Ken Burns zoom | Founder banned. Use Segmind P2V instead. |

## Quality System

| Document | Purpose |
|----------|---------|
| `VIDEO-QUALITY-BIBLE.md` | Master reference -- commandments for video production |
| `AGENT-SWARM-PLAYBOOK.md` | How 7 agents collaborate to produce content |
| `PRODUCTION-CHECKLIST.md` | Step-by-step checklist for every video (MUST follow) |
| `knowledge/technique-cards/MASTER-DIRECTION.md` | Founder's definitive vision |
| `knowledge/technique-cards/PRODUCTION-RULES.md` | All rules from v1-v11 consolidated |

## API Keys (in .env)

| Key | Service | Status |
|-----|---------|--------|
| `ELEVENLABS_API_KEY` | ElevenLabs voiceover | Active |
| `SHOTSTACK_API_KEY` | Shotstack production renders | Active |
| `SHOTSTACK_SANDBOX_KEY` | Shotstack test renders | Active |
| `PINATA_API_KEY` | IPFS pinning | Active |
| `GEMINI_API_KEY` | Video analysis (Gemini 2.5 Pro) | Active |
| `PIXABAY_API_KEY` | Pixabay SFX/music only | Active |
| `OPENAI_API_KEY` | Image generation (DALL-E) | Active |
| `BLOTATO_API_KEY` | Social posting | Not set yet |

## Proven VO Settings

| Setting | Value |
|---------|-------|
| Voice ID | nZ5WsS2E2UAALki8m2V6 |
| Speed | 0.85x |
| Style | Deep, slow, cinematic narrator |
| Lines per 90s | 12-14 (sparse, scene-matched) |

Previous voices tested and rejected: George (JBFqnCBsd6RMkjVDRZzb) -- too fast, too generic.

## Audio Mix (non-negotiable)

| Source | Volume |
|--------|--------|
| VO | 1.0-1.3 |
| SFX | 0.3 |
| Soundtrack | 0.4, fadeInFadeOut |
| Clip audio | 0.05 |

Max 2 audio sources at any moment. No SFX at 0:00.

## Content Types

### 1. Cinematic Trailers (60-120s)
- Cinematic YouTube clips + Segmind P2V opening + ElevenLabs VO + music
- Text overlays applied post-render via ffmpeg drawtext
- Dark blood red Copperplate text (#8b0000)
- Hard cuts between scenes
- Format: 16:9 (YouTube/Twitter) + 9:16 (TikTok/Reels)

### 2. Character Reveals (15-30s)
- Anime clips of the character's archetype + faction color theming
- ElevenLabs narration of lore
- Template: `content-assets/videos/shotstack-templates/character-reveal-template.json`

### 3. Faction Spotlights (30-45s)
- All characters from one faction
- Faction lore narration + synergy bonus showcase

### 4. Founder's Pass Promo (30-60s)
- Pack opening animation (full screen, dedicated scene)
- Benefits text sequence
- Urgency: supply counter, scarcity messaging

### 5. Social Media Clips (5-15s)
- Quick character reveal with impact sound
- Single stat or feature highlight

## Asset Locations

### On live site (Shotstack can access directly)
```
https://play.demonsanddeities.com/images/characters/*.png
https://play.demonsanddeities.com/images/pages/*.jpg
https://play.demonsanddeities.com/images/dd-logo-icon.png
https://play.demonsanddeities.com/images/packs/*.png
https://play.demonsanddeities.com/images/founders-pass-final.png
```

### Local (need IPFS pinning for Shotstack)
```
content-assets/character-portraits/
content-assets/cover-art/
content-assets/founders-pass-art/
content-assets/videos/
content-assets/logos/
scripts/marketing/audio/stock-footage/
scripts/marketing/audio/voiceover/
scripts/marketing/audio/music/
```

## Workflow: Making a Video

See `PRODUCTION-CHECKLIST.md` for the step-by-step process. Summary:

1. **Source clips** from YouTube using yt-dlp + Gemini smart-sample
2. **QC screen every clip** for branding, subtitles, wrong genre
3. **Assemble clips** in Shotstack JSON with verified durations
4. **Write VO script** AFTER watching the assembled cut
5. **Generate VO** with ElevenLabs (voice nZ5WsS2E2UAALki8m2V6, 0.85x)
6. **Build final Shotstack JSON** with audio, clips, and timing
7. **Sandbox render** and verify frame-by-frame
8. **Apply text overlays** via ffmpeg drawtext on rendered output
9. **Founder approval** before production render
10. **Production render** on Shotstack v1 environment

## Shotstack JSON Cheat Sheet

### Video clip
```json
{
  "asset": { "type": "video", "src": "https://...", "trim": 5, "volume": 0.05 },
  "start": 10, "length": 5,
  "fit": "cover"
}
```
Note: volume 0.05 (not 0). No fade transitions -- use hard cuts.

### Voiceover audio
```json
{
  "asset": { "type": "audio", "src": "https://...", "volume": 1.0 },
  "start": 5, "length": 3
}
```

### SFX audio
```json
{
  "asset": { "type": "audio", "src": "https://...", "volume": 0.3 },
  "start": 12, "length": 0.5
}
```

### Background music
```json
"soundtrack": { "src": "https://...", "effect": "fadeInFadeOut", "volume": 0.4 }
```

### Track ordering
```
Track 0: SFX audio
Track 1: Voiceover audio
Track 2: (reserved)
Track 3: Video/P2V clips (motion base -- always present)
```

Text overlays are NOT in Shotstack -- they go on via ffmpeg after render.

## Brand Colors

| Color | Hex | Use |
|-------|-----|-----|
| Dark Blood Red | #8b0000 | Primary text overlays (Copperplate) |
| Gold | #c89b3c | Titles, logos |
| Demon Red | #e84040 | Dark factions |
| Deity Blue | #7dc8ff | Light factions |
| White | #ffffff | Secondary text on dark |
