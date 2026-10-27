# Changelog

## 7.0.0

### Changed
- **New engine: Electron 45** (with its Chromium and Node.js), in place of Electron 33, which stopped getting security fixes in April 2025. This version can't come in through INSTALAR: Deck 90 says it *cambia el motor del programa*, and the full Windows zip has to be downloaded once and put in place of the program's folder. Settings, presets and the track history live in `%APPDATA%\Deck 90` and stay as they are. Later versions on this engine install themselves again. The meters read the same on the new engine (tones, one channel, inverted phase, EBU Tech 3342).
- **Checked on Windows before every release.** Each push now also runs on one of GitHub's Windows machines: the now-playing bridge (it parses; it follows the right player among made-up sessions, Spotless first when it plays, then the one already followed, then Windows' current one; and it starts for real, reports, beats and quits when Deck 90 closes it), the built program starting once, and the updater through a normal install, a new version that doesn't start (the old one comes back), a damaged package (refused before anything is written) and a package that needs a new engine (offered as a full download). A release is only published when all of this passes.
- When system-audio capture can't start, `media.log` now says why (for example *NotReadableError: Could not start audio source*).

## 6.16.1

### Changed
- **Sharper lettering in the header and on the displays.** The song and artist at the top were drawn in whatever condensed font the PC had (or a plain fallback), with a wide, soft glow that blurred them. Deck 90 now brings its own: Barlow Condensed, a clean condensed face in the spirit of a '90s FL display, drawn with kerning and a tight glow so the letters stay crisp; the title is a little larger and the artist line more spaced. The same lettering is used for PLAY, TRACK, METAL, REEL and the other words on the DECK 90, SO-90 REEL and CD-90 displays, on the drawn cassette's display and on the phone.
- **Real dot-matrix song names** on the CD-90 and SO-90 REEL displays (Doto), as on the mock-ups, instead of a typewriter font.
- New screenshots in the README with the new lettering, and one of the CD-90.

## 6.16.0

### Added
- **The CD-90**, a third style for the big CINTA module (⚙ → CINTA → CD), with the metal frames. A brushed-steel CD panel from the mock-up — tray, eject, the eight track keys (the current one lit), power with its LED (green while it plays), TIME and REPEAT — beside an FL display: the song's time, the track number (it counts the songs played since Deck 90 started), PLAY / PAUSE / STOP, CD, the track calendar, the song in dot-matrix letters (scrolling when long), the song's progress and a live spectrum with falling peaks; under it the five transport keys, which drive the player. TIME switches between elapsed and remaining time; REPEAT lights its indicator; eject only says the CD-90 just plays. The panel follows the height and the display and keys take the rest of the width; a narrow display leaves out the calendar first. With CLÁSICO, or on the phone, the REEL cassette stands in.

## 6.15.0

### Added
- **AZUL INTENSO**, a sixth VU face: a deep, saturated blue lit bright from below and darker towards the corners, a thick white scale, a coral band, an amber needle that glows — and no readout under it: the meter fills its frame. In the ⚙ drawer (AZUL INT.), on V, in presets and on the phone. AZUL stays as it was.

## 6.14.0

### Changed
- **The player that's playing wins.** With Spotless open but paused, Deck 90 kept showing its song even while another player played (a YouTube video in Chrome, Spotify, Apple Music…). Now it follows whichever is playing: Spotless first if it plays, otherwise the one it was already following, otherwise Windows' current one; with nothing playing, Spotless if it's open. The deck keys control the player shown.
- **Clean song names from browsers.** A browser tab's title becomes the song: no unread count ("(5)"), no "- YouTube", no "(Official Video)", "[Official Audio]", "(Video Oficial)" and the like, and "Artist - Song" is split so the artist isn't repeated (channels named "… - Topic" or "…VEVO" give the artist's name). In the header, the decks, the phone and the history.

## 6.13.4

### Changed
- **The song in the header reads like the decks' display**: with the metal frames, the title is in glowing turquoise, condensed bold capitals and larger, with the artist and album under it in a dimmer turquoise; a long title is cut with … inside its slot; a paused song dims. The source (SISTEMA, DEMO…) is a clear green and SIG / CLIP take the engraved labels' colour, so the whole header is readable on every finish. In the CLÁSICO rack the song is larger and brighter in its gold.

## 6.13.3

### Fixed
- Low, wide needle meters (CREMA, AZUL, CINTA 70s): "VU" and the − / + signs ran into the arc and the needle. They now sit in the room left under the arc, sized to it; a tiny meter leaves "VU" out.

### Changed
- New screenshots in the README: the metal frames, the DECK 90 cassette deck, the SO-90 REEL, the VU faces with CREMA, and the spectrum styles in the new frame.

## 6.13.2

### Changed
- The SO-90 REEL's reels are a richer, brighter gold, with more contrast in the brushed metal.

## 6.13.1

### Changed
- **The SO-90 REEL is the new cassette design**: the aluminium cassette with clear windows that show the case's inside (guides, rollers, the tape's path), natural brushed-gold reels with white hubs — rebuilt about their true centres, so they turn without wobbling — over the brown tape packs that change size as the side plays, and DECK 90 in serif along the right reel's rim. The cassette keeps its own outline (rounded corners, side steps). The label: side, the song, SO-90 REEL.

## 6.13.0

### Added
- **The meters' frame.** With the metal frames every VU face sits in a meter's black frame, its edge catching the light, the face behind a polished ring with rounded corners. The needle faces (AZUL, CINTA 70s, CREMA) have the level in a black readout window of its own under the face, in mono figures; their figures, marks and red band grow with the meter, and a wide meter gets a larger, flatter arc. STUDIO and HI-FI 90s sit inside the same frame with their own read-outs. CLÁSICO keeps the old look.
- **CREMA**, a fifth VU face: the classic backlit cream meter, bright and even, black ink and needle, a bold red band, the level in amber. In the ⚙ drawer, on V and on the phone.

### Changed
- The SO-90's reels are a brighter, yellower gold, and the shade over them is lighter.

### Fixed
- The backlit VU faces (CINTA 70s, AZUL) had a grey haze in the middle: the lamp's glow faded to transparent black. It fades to its own colour now.
- Very small needle meters show only the main figures and no PEAK word, so nothing overlaps.

## 6.12.0

### Added
- **The big tape as an SO-90 REEL**, with the metal frames and the REEL cassette: built from the panel's mock-up — the brushed-aluminium cassette with the song on its label, two windows with **gold open reels** that turn about their true centres (as a real C90: see 6.11.0) with the brown tape packs changing behind their cut-outs and the strands to the guides, "DECK 90" along the right reel's rim; the FL display behind a chrome bezel with the song's time, PLAY, the song in dot-matrix letters (scrolling when long) and L/R meters with **yellow and red zones**; and five dark transport keys, PLAY lit green with its bar. It follows the panel: by its height, or by its width in a tall panel. CLEAR, CLÁSICO and a portrait panel keep the drawn tape.

## 6.11.2

### Added
- **The song on the deck's display.** In the free space right of PLAY and METAL, in the display's own lettering: the title bright, the artist under it (deck A: what's playing; deck B: the song before). Too long for the space, a line scrolls slowly with a pause at its start, fading in and out at the edges, as the displays of the time did. On a wide display it sits in the middle, before the remaining time, and the DOLBY / HX PRO / AUTO REV indicators move to the bottom row.

## 6.11.1

### Fixed
- **The DECK 90 tape's reels no longer wobble.** They turned about a point 6–7 px below their real centre, so they swung and the still hub of the picture showed around them. Each hub's centre is now found from its own six-fold shape (the point where it looks the same turned 60°), the hub picture is centred on it to a fraction of a pixel, and the light on it stays put while the hub turns, as on a real reel. Over a full turn the spindle stays within 0.06 px.

### Added
- **Yellow and red zones on the deck's level meters**, as on the decks of the time: turquoise up to −6 dB, yellow to 0 dB, red above. Unlit segments keep a hint of their zone's colour, and the scale's numbers take it too.

## 6.11.0

### Added
- **The DECK 90 cassette deck.** With the metal frames (TITANIO, NEGRO, CHAMPAGNE) the DECK module is a black brushed-aluminium deck built from the panel's mock-up: a bevelled cassette well with a DECK 90 TYPE IV tape, the FL display behind its bezel, six square transport keys under TRANSPORT, two knurled knobs (REC LEVEL follows the music), the power key with its LED and the phones jack, and four screws. It fills its panel like the old one: the well and knobs keep their size and the display and keys stretch. CLÁSICO keeps the drawn deck.
- **The song on the cassette's label**: deck A's tape has the playing song in big letters with the artist under it (long titles shrink, then are cut with …); deck B's has the song before.

### Changed
- **The cassettes turn like real ones.** Playing side A, the left reel pays the tape out and the right one winds it up, and both turn counterclockwise (they turned the other way). Each turns at the tape's speed over its own pack: 0.30 turns a second on a full pack, 0.67 on a bare hub, 0.39 each halfway — as a C90 at 4.76 cm/s. In the DECK 90 tape you see the brown packs change through the window as the side plays. Applies to every cassette (the decks, the big tape, REEL and CLEAR).
- **The FL display** of the decks: upright digits with bevelled segments and no ghost of the unlit ones, condensed bold lettering, thick meter segments with the unlit ones faintly there, the dB scale under them. A low display shows just the counter, PLAY/METAL and the meters, so nothing overlaps.

## 6.10.2

### Fixed
- **The window can be moved from the whole frame.** Only the header bar moved it: grabbing the metal edge, a screw, the gaps between modules or the engraved name above a module did nothing, which is easy to do with the window maximized (the top of the screen is the frame). Now all of these move the window (and a double-click on them maximizes or restores it, as on the header). The modules, the controls and the deck keys take clicks as before.

## 6.10.1

### Changed
- **The cassette decks fill their panel.** They kept a fixed shape (at most about 3 : 1) and stayed small in the middle of a wide panel. Now the cassette well and the knobs follow the deck's height and the display and transport keys stretch across: two decks fill the panel side by side, and one deck takes its panel's whole width.
- With one deck (SIMPLE), its panel takes more of the window's height, so that deck grows in both directions.
- A wide deck's display adds the **remaining time** (of the song on deck A, of the tape side on B) and the indicators of the decks of the time: DOLBY B, HX PRO, AUTO REV, NR, MPX FILTER.
- Small decks keep their knob labels apart.

## 6.10.0

### Added
- **MARCO: the frame of a premium '90s deck**, in three finishes, **TITANIO** (the default), **NEGRO** and **CHAMPAGNE**, or the old **CLÁSICO**. Chosen in the ⚙ drawer and remembered. Each module is a brushed-metal plate with its name engraved above it (LEVEL L, LEVEL R, BPM, GONIO…), and what it shows sits behind black glass in a polished, chamfered bevel; the spectrum's window has a thin amber bezel, the song is in a black display slot in the header, the window keys are square metal keys, and four screws hold the plate at its corners. Only the frame changes: VU meters, spectrum and decks draw as before. The metal and the screws come from mock-ups of the panel; the bevels are drawn, so the frame fits any window size and follows the modules you switch on or off.

### Fixed
- In a very short window, displays now stay inside their frames instead of running over the bottom edge.

## 6.9.2

### Changed
- The glare that drifted across the rack from the left, back and forth every 9 seconds, is gone.
- The program's edge is a faceplate frame, with the four screws inside it: they no longer sit on the corners of the title bar, and the window's edge reads against whatever is behind it.

## 6.9.1

### Changed
- **Spotless 1.2's equaliser.** On and not flat, it changes the sound by frequency, so the master's loudness can't be worked out from what's heard: the Spotify badge shows **SPOTIFY ?** (and the history leaves MASTER and Spotify empty) until it's off or flat, as with Spotless's levelling. Its preamp and bands are read from Spotless's settings like its volume.

## 6.9.0

### Fixed
- **Loudness is now exact around 1–3 kHz.** The K-weighting used the browser's own high-shelf filter, whose curve isn't BS.1770's: it read up to 0.5 dB low between 1 and 3 kHz (music about 0.1–0.3 LU low, and the Spotify badge that much too generous). Both K-weighting filters are now designed from the recommendation for the sound card's own rate; at 48 kHz they are exactly its coefficients. A 2 kHz tone at −20 dBFS reads −17.6 LUFS, as it should.
- **True peak no longer jumps up to +1 dB when measuring starts.** The oversampling filter started from silence while the music was already playing; it now waits for 12 real samples.
- **Crest** is each channel's peak against its own RMS over 400 ms, as the label says: it no longer changes with the frame rate (it read higher in the tray) nor reads 3 dB high when only one channel has sound.
- **History: a short re-measure no longer replaces a long line.** Switching to MIC or DEMO and back during a track measured it again under the same line; now each measurement has its own.
- The track before, on deck B, is right when the player disappears and comes back with another track; a track played again ("repeat one") is a new line.
- Integrated loudness keeps 6 hours (was 1) for long DJ sets and podcasts.
- After a restart on the same track, LRA and integrated wait for the loudness windows to fill again.
- The window at its smallest sizes: nothing overlaps at 760 px wide, panels give up height before anything is cut, and if it still doesn't fit the rack scrolls.
- Keys: F1–F8 do nothing behind the phone window; Esc closes a window even with GUARDAR armed; GUARDAR then F6–F8 saves; holding S, M, D or Space no longer restarts the source over and over (two quick starts could leave the microphone in use).
- Tape-only mode (Z) is remembered with the rack it came from.
- The phone's progress bar and tape counter no longer depend on the phone's clock agreeing with the PC's.

### Added
- **Spotless's volume is taken into account.** Deck 90 reads Spotless's volume and levelling from its settings: at 71 % Spotless plays 7.9 dB under the master, which made the history read about 8 dB low and the Spotify badge wrong by that much. The badge now shows what Spotify would do to the master at any volume (its tooltip says how much was added back), and the history has a **MASTER** column (also in the CSV, with the player's volume). With Spotless's levelling on, the badge shows **SPOTIFY ?**: Spotless is already evening out the volume, so the master can't be known. Lines saved before 6.9 can't be corrected and show — there.
- Tray: **Nueva clave para el celular** (with the phone display on) cuts off everyone who ever scanned the QR.

### Changed — safety
- **An update that doesn't start puts the previous version back by itself**, even when its main process fails to load (the program now starts from a small fixed file, `electron/boot.js`) or its window hasn't loaded after 2 minutes. Before writing anything, every script in an update must compile.
- Checks give GitHub 20 s to answer and 2 minutes for the download: a dead connection no longer stops the checks for days or leaves BAJANDO… on screen. **Buscar actualizaciones** in the tray always reports. A version that failed once can be installed again from there.
- Started with Windows, Deck 90 stays in the tray even when it was last closed maximized (and comes back maximized).
- Leaving mini mode on Windows brings the window back maximized if it was.
- History: if a backup program or the antivirus is holding the file, nothing is written over it (it could lose the history); it's written at most every 30 s and when the program closes.
- "Now playing" recovers by itself when Windows restarts Explorer; the bridge is restarted when it goes silent, and keeps trying instead of giving up after five failed starts.
- If the page stops (graphics driver, memory) after days in the tray, it is loaded again. The log moves to `media.1.log` past 1 MB instead of going silent or being deleted. Settings are written so a power cut can't leave them half written.
- Phone display: a port Windows reserves (Hyper-V, WSL) is skipped like a busy one; virtual-machine adapters go last in the QR.
- "Arrancar con Windows" no longer turns itself back on when disabled in the Task Manager.
- Releases: every push compiles every script, and the Linux build is started once before it's published; the build actions are pinned.

## 6.8.2

### Changed
- In the program, FUENTE (SISTEMA · MIC · DEMO · ■) moved from the main row to the ⚙ drawer: the program listens to the PC by itself, so the main row no longer looks like the old pick-a-source screen. S, M, D and Space work as before. The browser version keeps it up front, where it's needed.

## 6.8.1

### Fixed
- **No more waiting rack at start.** For a moment the program showed the rack at rest — FUENTE with nothing chosen, STANDBY, the "waiting" panels — like the old pick-a-source screen, before the system audio started. The window now appears once it's listening, with one live frame already drawn (or after 2.5 s if that takes longer, 5 s at the latest).

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
