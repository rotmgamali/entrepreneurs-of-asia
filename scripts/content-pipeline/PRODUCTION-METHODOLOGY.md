# THE WAVE — Video Production Methodology
## Version 1.0 — The unified wave approach

Everything in the video is ONE wave. Music, visuals, voice, text, and story all peak and trough together. When one rises, they all rise. When one peaks, they ALL peak at the same millisecond.

---

## THE PROCESS

### Step 1: LISTEN TO THE MUSIC
Before anything else, listen to the track. Map its emotional journey:
- Where is it quiet/tense? (troughs)
- Where is it building? (rises)  
- Where does it EXPLODE? (peaks)
- What's the BIGGEST moment? (the climax)
- What story does the music already tell?

Use waveform analysis at 125ms resolution to find EVERY spike — massive, big, medium, small. Nothing goes unmatched.

### Step 2: WRITE THE STORY TO MATCH THE MUSIC'S ARC
The music already has an emotional arc. Write a story that rides the same wave:
- Music trough = story mystery/setup
- Music building = story tension/anticipation
- Music peak = story revelation/impact
- Music climax = story's biggest moment
- Music resolution = CTA/close

### Step 2.5: DESIGN THE VISUAL STORY (NEW — added after wave video failure)
Before hunting for ANY clips, write a SHOT LIST that describes what the viewer SEES in each scene:
- What visual world are we in? Pick ONE primary source or visually matched sources.
- What are the two "sides"? Define a visual palette for each (light vs dark, ice vs fire, etc.)
- What characters recur? The viewer must recognize figures across scenes.
- How does visual SCALE escalate? (wide → medium → close-up → collision at climax)
- What does each scene SHOW that connects to the previous and next scene?

A video where every spike has an explosion but no scene connects to any other scene is a RANDOM MONTAGE, not a story. Visual coherence > spike coverage.

### Step 3: FIND CLIPS THAT SERVE THE VISUAL STORY, NARRATIVE, AND MUSIC
For each shot in the shot list, find a clip where:
- The visual content matches what the SHOT LIST needs (not just "cool explosion")
- The clip belongs to the same visual world as the rest of the video
- The clip has an internal EVENT (explosion, impact, flash) at a known timestamp
- That event can be placed precisely on a music spike
- The clip has been QC'd at 4+ timepoints (0.5s, 1.5s, 2.5s, 3.5s) for subtitles/branding/UI

Use Gemini on FULL source videos to get timestamps, but NEVER trust Gemini timestamps without extracting frames and visually verifying. Gemini frequently maps events to wrong timestamps.

### Step 4: CALCULATE PRECISE PLACEMENT
For each clip: `clip_start = music_spike - event_offset_in_clip`

Every clip gets a CUSTOM length determined by when the next clip needs to start. No fixed durations.

### Step 5: MATCH EVERY SPIKE
- MASSIVE spikes (2.0x+) → biggest visual events (explosions, ground-breaking impacts)
- BIG spikes (1.7x+) → major events or scene transitions
- MEDIUM spikes (1.2-1.7x) → scene transitions or subtle visual shifts
- SMALL spikes (1.0-1.2x) → camera angle changes, particle bursts, light flashes within a scene
- NO SPIKE goes unmatched. Every single energy bump in the audio has a corresponding visual event.

### Step 6: VO AND TEXT FLOW ACROSS THE WAVE
- VO plays ACROSS scenes — it's the continuous narrative thread
- VO rides the troughs — speaks during quiet moments between peaks
- Text reinforces key VO words, appears during the scene it belongs to
- At the climax, VO delivers the most impactful line as the biggest visual event hits the biggest music spike

### Step 7: BUILD ANTICIPATION
The early part of the video is NOT the best part. It's the SETUP for the best part.
- Start atmospheric, mysterious, slow
- Build intensity gradually with each scene
- Save the BEST clip for the BIGGEST spike
- The viewer should feel the climax coming before it arrives
- When it hits — music + visual + voice + text all peak together = dopamine

### Step 8: VERIFY THE WAVE
After assembly, watch the entire video and ask:
- Does every spike have a visual event?
- Do the peaks build properly (small → medium → large → MASSIVE)?
- Does the story make sense across the scenes?
- Is the climax the most powerful moment in the video?
- Would this give someone chills?

---

## WHAT THIS REPLACES

The old approach: find clips → arrange in order → add music → add VO → hope it syncs

The new approach: music emotional arc → story arc → clips serve both → mathematical precision → unified wave

---

## THE ROLES

### Director (Claude)
- Maps the music's emotional journey
- Writes the story arc
- **DESIGNS THE VISUAL STORY** — shot list, visual world, two factions, character continuity, scale escalation
- Selects ONE primary source (or visually matched sources) — no multi-game mashups
- Assigns clips to spikes — but ONLY clips that serve the visual story
- Reviews all team output before render — rejects clips that break visual coherence
- Delegates, doesn't do everything

### Clip Hunter (Agent)
- Downloads sources from YouTube
- Maps "clean zones" for each source (which timestamp ranges are cinematic vs gameplay/dialogue/UI)
- Uses Gemini on FULL source videos to find ALL events with timestamps
- VERIFIES every Gemini timestamp by extracting frames — Gemini is frequently wrong
- QC screens every clip at 4+ timepoints (0.5, 1.5, 2.5, 3.5s) for subtitles, branding, game UI
- Checks file size sanity: 4s 720p clip < 500KB = likely broken
- Reports: clip name, source, event description, event timestamp, duration, clean zone, file size
- REJECTS clips that don't match the Director's shot list or visual world

### Audio Analyst (Agent)
- Maps music waveform at 125ms resolution
- Categorizes every spike (massive/big/medium/small)
- Identifies the emotional arc sections
- Reports: complete spike list with timestamps and energy levels

### VO Producer (Agent)
- Generates VO lines with the founder's preferred voice
- Verifies pronunciation and pacing
- Reports: line text, duration, serve URL

### Assembler (Agent)
- Takes the Director's clip-to-spike mapping
- Builds the Shotstack JSON with calculated start times and trim values
- Verifies: no gaps, no overlaps, no freeze risks, all URLs valid
- Reports: complete JSON ready for render

### Text Producer (Agent)
- Applies text overlays via ffmpeg after render
- Matches text timing to VO and scene boundaries
- Reports: final video with text

---

## NEVER FORGET

The viewer's brain processes audio and visual simultaneously. When an explosion on screen happens at the EXACT same millisecond as a bass drop in the music, the brain registers it as one unified event. This creates a physical sensation — goosebumps, excitement, dopamine. 

When they're even 100ms apart, the brain processes them as two separate events. The magic is gone.

Every millisecond matters.
