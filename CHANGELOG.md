# Changelog

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
