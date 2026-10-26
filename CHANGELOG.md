# Changelog

## 6.8.0

### Changed
- **Updates show up sooner.** Deck 90 often lives in the tray for days, where ✕ leaves it, so it only saw a new release when restarted or every 6 hours. Now it asks GitHub every hour and whenever the window comes back from the tray (if the last look is over 30 minutes old).
- The tray menu has **Buscar actualizaciones**, which says "al día" or what went wrong, and turns into **Instalar Deck 90 x.y** when there's one to install.

## 6.7.0

### Changed
- **Presets: five favourites and three of your own.** 1–5 (F1–F5) are now fixed looks — Estudio, Hi-Fi 90s, Cinta 70s, Vidriera, Mastering — and C1, C2, C3 (F6–F8) are yours: GUARDAR then C1–C3, Shift+click on one, or Shift+F6–F8 stores what's on screen there. An empty C says so when clicked. Looks saved over 1–5 with 6.6.0 move into C1–C3 by themselves.

### Added
- The window's size and place, and whether it was maximized, are remembered between sessions (only restored if that place is still on a screen). The mini strip keeps its own.

## 6.6.0

### Added
- **Five presets**, in the console (★ 1 2 3 4 5 GUARDAR) and on F1–F5. A preset keeps the whole look: VU face, spectrum style and FL sensitivity, screen tone, VU calibration, which modules show, and the deck and cassette styles. Five come ready — Estudio, Hi-Fi 90s, Cinta 70s, Vidriera, Mastering — and any of them can be replaced: GUARDAR then a number, Shift+click on a number, or Shift+F1–F5. A replaced preset is named after its VU face and spectrum; the number whose look is on screen lights up. Kept with the program's settings.

## 6.5.1

### Fixed
- The program no longer flashes the browser version's start screen for a moment when it opens.

### Docs
- New screenshots: the main view with the CINTA 70s VU and FL ÁMBAR, six spectrum styles, both new VU faces, the phone display and the track history.

## 6.5.0

### Added
- **Six new spectrum styles**, in the console's new MÁS ▾ menu and on `T`:
  - **LED 80s:** columns of rectangular LEDs, green / yellow / red, a peak LED that holds and drops.
  - **FL SHOWROOM:** the FL display in turquoise with magenta tops; after 3 s of silence it runs shop-window demo patterns until the music is back.
  - **FL ÁMBAR:** stereo, left channel up from the middle, right channel down, amber segments and band names in between.
  - **RTA 1/3:** 31 ISO third-octave bands measured as power per band, each FFT bin weighted by how much of it falls in the band (pink noise reads flat within ±0.5 dB above 40 Hz, ±1.5 dB below), scale in dBFS on both sides; the bands under 40 Hz are dimmed because the FFT has too few bins there; SENS adds 0 / 6 / 12 dB and says so.
  - **LCD:** green dot-matrix panel with the pixels' shadow on the backplate.
  - **ESPECTROGRAMA:** waterfall, 30 Hz – 20 kHz on a log scale, 60 px a second whatever the frame rate.
- **Two new VU faces:** CINTA 70s (warm backlit cream face, thin black needle, red zone, glass) and AZUL (blue backlit face, amber needle). Both use the classic −20…+3 VU scale spaced by voltage, like the real instrument, and fit wide and tall panels. `V` steps through all four.
- **Tray icon.** On Windows ✕ leaves Deck 90 in the tray, still measuring (the phone display keeps working); the first time Windows says so. Shift+✕ always quits. Its menu: show/hide, mini mode, phone display, *Arrancar con Windows* (starts hidden, straight to the tray; the entry follows the program if its folder moves), *Al cerrar, quedar en la bandeja* (off by default on Linux, where many desktops show no tray icon), and Salir. If the window never finishes its first paint it's shown anyway after 4 s.
- After an update the program comes back visible, even when it had been started hidden with Windows.
- **Phone:** a spectrogram view (swipe: todo · VU · FL · espectrograma · cinta), and the FL's colour (green, turquoise, amber, or like the PC) in ⚙; the new VU faces are there too.

### Fixed
- Resizing the window while the program was still loading could throw an error.

## 6.4.0

### Added
- **Updates itself.** A few seconds after it starts (and every 6 hours) the program asks GitHub for the latest release. If it's newer, a bar offers it: INSTALAR downloads a small package with the program's own files (about 230 KB), checks it against the SHA-256 GitHub publishes for it, keeps the current files in `resources\app-anterior`, writes the new ones and restarts. If anything fails half-way the old files are put back. A release built on a different Electron sends you to GitHub for the full zip instead. Releases now carry `Deck-90-<version>-app.bundle` for this.
  - Safety nets: each file write is retried while Windows (antivirus, indexer) holds it; if a write fails, exactly the files already written are put back. `resources\deck90-update.json` marks an install in progress: if the program starts and finds an install that was cut off, or a new version that died before its window loaded, it restores `app-anterior`, restarts into it, says so, and doesn't offer that version again.
- **Spotify badge.** Next to *Loudness*: how much Spotify's normalisation would change the track's volume (target −14 LUFS integrated; a quieter track is raised only until its peak reaches −1 dB). Also on the phone, under the integrated value.
- **Track history (`L` or ☰).** Each track heard for 30 s or more is kept with its integrated LUFS, LRA, true peak (or sample peak), BPM and the Spotify change, up to 5000 tracks, in `history.json` in the program's data folder. The window shows the track playing now as it's measured. EXPORTAR A EXCEL saves a CSV that Excel opens directly (`;`, decimal commas, UTF-8); titles can't turn into Excel formulas.
- `Esc` closes the history and phone windows instead of stopping the analysis.
- The history is saved every 45 s while a track plays, so a crash or a Windows shutdown loses little. A player that disappears for a moment (Windows drops its session now and then) doesn't split a track in two, and stopping and restarting the analysis mid-track carries on measuring the same track.
- Peaks count from 1 s into a track, and the history leaves out the last second before the next track is announced, so the next track's first hit doesn't become the previous track's peak.

### Hardened
- Every message from the page to the program is accepted only from Deck 90's own window.

### Fixed
- A new track no longer starts with the previous track's details (length, album) until its own arrive.
- Integrated loudness and LRA count one block per 100 ms of time instead of one per frame, so a slow or busy PC measures the same as a fast one.

## 6.3.1

- **Minimized window keeps measuring.** Windows stops animation frames for a minimized (or fully covered) window, and the whole analysis ran on them: the phone display fell to zero and integrated LUFS, LRA and BPM froze until the window came back. A timer now takes over at ~30 per second while no frames arrive — it measures and feeds the phone, and skips the drawing nobody can see.

## 6.3.0 — 2026-10-22

### Added (phone display)
- **FL 90s spectrum on the phone.** It has its own view and also sits in the "everything" view. The PC sends the 19 bands as measured; the phone does the fall and the peak caps.
- **The phone's own settings (⚙).** VU face, cassette style and FL sensitivity can each follow the PC or be chosen on the phone. Also: whether the FL shows in "everything", a dim night mode, and a short vibration on the cassette keys.
- **Track progress bar.** Shows the time played and the time left.
- **Swipe sideways** to change views.

### Changed
- The FL 90s display is drawn by one function, `drawFLDisplay`, shared by the rack and the phone. Its lamps and captions step aside in narrow panels.
- The HI-FI 90s VU drops its captions in panels too narrow for them.

## 6.2.0 — 2026-10-22

### Added
- **Phone display.** In the settings drawer, *CELULAR → ON* starts a small server on the home network (port 9090) and shows a QR code. A phone or tablet that opens it gets:
  - the VU meters and the big cassette, live, drawn with the rack's own code;
  - the track and its cover;
  - momentary and integrated LUFS, LRA, true peak, BPM and phase.
  - The cassette's keys control the player on the PC.
  - Three views (all, VU only, cassette only), portrait and landscape, and full screen.
  - Off by default. Every request needs the key in the address. Only the page's own files are served.
  - If port 9090 is taken it uses 9091–9095, and the QR shows the port it got.
  - A phone that stops reading never piles frames up on the PC. At most 8 screens at once.
  - The phone page tries to keep the screen on: Wake Lock where the browser allows it, otherwise a tiny muted video. Some phones still sleep; the screen timeout setting covers those.

### Fixed
- The STUDIO VU's "VU" label no longer lands on the dB readout in tall, narrow panels.

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
