# Changelog

## 6.1.0 — 2026-10-21

### Added
- **Mini mode** (`P`, or the ◫ button). A small strip that stays on top of other windows: two reels that turn while music plays, L/R LED bars on the VU scale with peak hold, momentary and integrated loudness, and true peak. The track stays in the title bar. The strip remembers its size and place; double-click it or press `P` to go back.
- **Goniometer** (module 8). The stereo image as a dot cloud (mid up, side across), with auto-gain, phosphor persistence and a correlation bar.
- **True peak.** The peak card now shows dBTP: BS.1770-4 4x oversampling on the audio thread, with a 1.5 s hold and the track's maximum. Without AudioWorklet it falls back to sample peak (dBFS).
- **Loudness range (LRA).** EBU Tech 3342, per track, next to the integrated loudness.

### Changed
- The main row lays out any mix of VU, BPM and goniometer. With the VUs off, the BPM display and the goniometer share the width.

### Fixed
- The first "now playing" could arrive before the window was listening and only show up a few seconds later. The latest track is now handed over as soon as the page loads.

## 6.0.1 — 2026-10-20

### Fixed
- **Loudness read high on bass.** Web Audio takes a high-pass filter's Q in dB, so the K-weighting high-pass was resonant instead of rolling off. Bass-heavy music read up to 6 dB too loud at 30–50 Hz. LUFS now stays within ±0.3 dB of BS.1770 from 30 Hz to 5 kHz.
- **Phase meter read below +1.00 on mono.** The L/R correlation is now computed sample-aligned on the audio thread.
- **Switching to DEMO while audio was running left the meters dead** (status stuck on STANDBY). Fast repeated source changes could also leave two sources running at once.
- **Linux: SISTEMA could open the microphone instead of the monitor source.** It now uses the monitor, and says so clearly when there isn't one.
- **Esc to leave full screen also stopped the analysis.**
- The spectrum's "20k" label was cut off at the right edge.
- The big reel cassette still printed the old name.
- A drawing error could, in rare cases, hang the window while it recovered.

### Improved
- Content-Security-Policy. The window can no longer be navigated away (for example by dropping a file on it). Capture permissions are limited to the app's own page.
- Windows "now playing" bridge: survives a missing or blocked PowerShell, recovers after sleep/resume, and logs repeated errors only once.
- Linux "now playing": picks the player that is actually playing when Spotless isn't open, and shows cover art that arrives a moment after the title.
- Integrated loudness is cheaper to compute over long sessions.
- Packaging deletes a corrupted cached Electron download instead of failing every time.
- README: Linux sandbox note for Ubuntu 23.10+, and corrected measurement notes.

## 6.0.0 — 2026-10-20

First public release.
