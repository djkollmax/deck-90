# Changelog

## 7.9.2

### Added
- **A CD player in the rack: the DC-90** (VER → CD, or `0`), under the tuner: a full-width drawer, a panoramic VFD (time, track of total, the line with the disc, PLAY/PAUSE/DISC, L/R levels) and its transport. It plays the PC's CD/DVD drive, a USB one too, with the same engine as the car stereo's CD mode: POWER reads the drive and starts the disc (and pauses what the PC was playing; off brings it back), ▶ ❚❚ ■, |◀◀ ▶▶| around the disc's ends, OPEN / CLOSE opens the real tray and, again, closes it and reads the new disc. An audio CD plays from the drive (track, time and the disc's length on the display); a disc of MP3s plays its files by name. It says when there's no drive or no disc. The CD and the radio take turns: playing one turns the other off. Like the tuner, its plate follows the rack's frame and the looks never hide it. The CD-90 drawn in the big tape panel stays as it was (what plays on the PC).
- The bridge closes the drive's tray (`cd-close`).
- **FM4, a band of hi-fi stations** (internet only): FIP and FIP Jazz (Radio France, Paris, AAC 192), KEXP (Seattle), and Linn's three, Linn Jazz, Linn Classical and Linn Radio (Glasgow, 320 kbps). In the tuner (its own key, FM4, beside FM1–FM3 and AM) and in the car stereo (BAND). An existing setup gets it as it is; its memories can be changed like any other.

## 7.9.1

### Fixed
- **The dial always reads right:** checked station by station, the needle stops on each one's frequency on the printed FM or AM scale; a station with no place on the dial (internet only) shows no needle instead of leaving it on the last one.
- A band key or a memory touched with the tuner off turned on the last station first and only then went to the one asked for (and a band key could stay on the old station): it goes straight to the one asked for now.
- "EN VIVO POR INTERNET" only for a station with no frequency; one tuned with the knob whose frequency is in its name says "EN VIVO".

## 7.9.0

### Added
- **The tuner has a key for each band:** FM1, FM2, FM3 and AM under BAND (where STANDBY was printed), the one in use lit. A touch goes to that band's memory, and turns the tuner on if it was off. BAND still steps through them.
- **The knob shows a frequency.** The country's most heard stations come from Radio Browser without a dial position: the tuner takes it from the station's name when it's there ("La 100 - 99.9 FM", "Radio 10 AM 710"), on the FM or AM scale with the needle.
- **An internet-only station writes its name big** where the digits go (80s80s, the FM3 stations, a tuned station with no frequency in its name) instead of dashes.

### Fixed
- The tuning knob showed a square focus ring when clicked.

## 7.8.9

### Fixed
- **The tuner's keys did nothing on Windows.** The rack's metal frame moves the window (a drag region), and only the modules are left out of it: the tuner, a unit of its own, wasn't, so Windows took its clicks as a window drag. It is clickable now.
- A station whose stream never answers gives up after 12 s instead of waiting forever, and a saved address that fails is looked up again once on Radio Browser before saying the station doesn't respond.

## 7.8.8

### Fixed
- **The tuner's layout was lost in 7.8.7** (a later edit of the stylesheet cut it): the DT-90 kept its full height and pushed the rack past the window's bottom (its memory keys 1–6 out of reach), and `9` / VER → RADIO couldn't hide it. It shrinks with the window again and hides.
- **Deck 90 followed itself as "the PC's player":** while the radio played, Windows listed Deck 90 as a media player, the bridge took it as what plays on the PC, and the window's title (the song plus " · Deck 90") came back as the song, longer each time. Deck 90's own session is left out now, and Windows shows the station's name for it.
- What the radio does (the station playing, or why one didn't start) is written to media.log.

## 7.8.7

### Added
- **A radio tuner in the rack: the DT-90** (VER → RADIO, or `9`). A hi-fi tuner unit under the meters, with a VFD display (band, memory, the frequency in 7 segments, STEREO/MONO/TUNED, signal, L/R levels, a dot-matrix line with the station) and an analog dial with a needle that glides to the station. It is the same radio as the car stereo: the same stations, bands (FM1–FM3, AM) and memories. POWER turns it on (and pauses what the PC was playing; off brings it back), BAND changes band, ◀ ▶ and the knob step through the country's most heard stations, 1–6 are the memories (hold 1 s, or MEMO and the number, to keep what plays there), SCAN tries each for 8 s, MODE shows AUTO/MONO, DISP shows the station, the time or the temperature. An internet-only station shows dashes on the dial. The plate follows the rack's frame (silver, black, champagne). Looks and their rotation leave it as it is. Opening the stereo with the radio on carries it there, and closing the stereo with the radio on leaves it playing in the tuner.
- **SDM has 28 looks:** twelve more after AQUA: COBALTO (deep blue, blue-white letters), LIMA, ROSA, VIOLETA, FUEGO (orange letters, red meters), MATRIX (terminal green phosphor), ATARDECER (dark violet, orange letters, pink meters), NIXIE (the orange of nixie tubes), OLED (pure black, cold white, blue meters), LCD AZUL (blue-backlit LCD, white letters), LCD ÁMBAR (amber-backlit LCD, dark letters) and BICOLOR (yellow letters, cyan labels, green meters).

## 7.8.6

### Changed
- **The stereo turns the volume down quickly.** VOL ▼ (and the wheel down) is three steps of Windows' volume at once (6 %); VOL ▲ stays one step (2 %), as in a car. Holding VOL ▲ or ▼ repeats it every 0.1 s.

### Fixed
- The volume keys were slow to act: the Windows bridge took one command each 0.4 s, after reading the player. It presses them the moment they arrive now (a burst at once), and it answers any command without waiting out the 0.4 s.

## 7.8.5

### Added
- **SDM has 16 looks:** the six colours and HD as they were, then nine more whole looks, each with its own glass, letters, labels and meters: ÁMBAR (black, 80s amber), HIELO (night blue, VFD cyan), VERDE NOCHE, ROJO SPORT, BLANCO, LCD CLARO (light glass, dark letters, like a positive LCD), MIAMI (violet, pink letters, cyan meters), ORO and AQUA. Each press says which one and what it is; holding SDM a second goes back one.

## 7.8.4

### Added
- **FM2 and FM3 come full, by genre.** FM2 is Buenos Aires: Con Vos 89.9, Nacional Clásica 96.7 (classical), Blackie 89.1 (jazz), Delta 90.3 (electronic), Blue 100.7 (the 80s and 90s) and Nacional Rock 93.7. FM3 is the same genres from the world, internet only: Radio Swiss Classic, Radio Swiss Jazz, Ibiza Global Radio, Heart 80s (London), SomaFM Groove Salad (chill) and Radio Paradise. An existing setup gets them in its empty memories; a station stored there by hand stays.

## 7.8.3

### Changed
- **On a CD, the numbers are its tracks:** 1–6 play tracks 1–6, and held for a second, 7–12 (the numbers printed above the keys). On a disc of MP3s, its files. In RADIO they're still the memories.
- **AM lights MONO** on the display (STEREO goes dark), as an AM station sounds; FM, the CD and the PC keep STEREO.
- **HDB has a brighter level:** NORMAL → HIGH → MEDIUM → LOW, with the level named on the screen.
- **SDM has a seventh look, HD:** the glass goes black and the letters yellow, like a high-end display. The other six colours stay.
- **The stereo's meters are shaped like the real DP940's:** curved columns that step up from the inside out (the bottom rows long, reaching in under TRACK, the top ones short), instead of three even columns. Their last five steps go yellow, amber and red, in every colour (true in colour 1 and HD).
- **A stronger yellow on the stereo's display:** the 16-segment letters and the lit labels are a saturated yellow, a touch thicker, as on the real glass.

### Fixed
- **CD track skipping:** TRACK ▶ ▶ ▶ pressed quickly went one track only (each press counted from the track the drive still reported), and the drive was followed only while 'playing', so a jump that sat in 'seeking' left the display stuck. Now each press counts from the one asked for and shows it at once, the bridge keeps following the drive while it seeks, the ends of the disc wrap (▶ on the last track goes to the first, ◀ on the first to the last) and data tracks are skipped.
- The update test from 7.8.2 read the page before it had loaded ("ok" case on Windows).

## 7.8.2

### Changed
- **Changing the stereo's mode pauses what was playing.** Going from PC to RADIO or CD pauses the player's song (Spotless, or whatever plays); leaving RADIO turns the radio off; leaving CD pauses the disc. Coming back picks it up again: the song plays on, the CD goes on from where it was, the radio tunes the same station again (a live one). A memory (1–6) or SCAN from another mode does the same.

### Fixed
- The update check on GitHub's Windows machines sometimes failed by itself: it prepared the test version after the program had already asked the real GitHub (8 s after starting). It's ready before the program starts now.

## 7.8.1

### Changed
- **The stereo's meters move much more.** They followed the VU needles (slow, about 300 ms, and calibrated so a loud master sat near the top): now they read each ~40 ms of sound and show it around the music's own loudness of the last few seconds, with a quick rise and a short fall, so they jump with the beats and drop in the quiet moments, whatever the song's level. Only on the stereo: the rack's meters stay as they are.

## 7.8.0

### Added
- **The stereo plays CDs: CD mode** (MODE now goes PC → RADIO → CD, or touch the CD slot). On Windows, Deck 90 finds the PC's CD/DVD drive (a USB one too):
  - **An audio CD** plays from the drive itself (Windows' own CD audio), as a car stereo starts when a disc goes in. TRACK ◀ ▶ changes track (◀ in a track's first seconds goes to the one before), SEL pauses and plays, and the display shows TRACK 03, the disc's tracks and length, and the time; the meters follow its sound.
  - **A CD or DVD of MP3s** (or M4A, OGG, FLAC, WAV) plays its files here, one after the other, with each file's name on the display.
  - **⏏ opens the tray.** PWR is now the one that goes back to the rack.
  - Without a drive, without a disc or with a disc without music, the display says so (SIN LECTORA, NO DISC, SIN AUDIO).

- **DISP shows the time and the temperature**, in every mode (PC, RADIO and CD): it goes normal → time → temperature (the header's weather, with the city and today's high and low underneath) → BPM → loudness. The line under the big letters keeps saying what's playing.
- **AM on the radio:** BAND now goes FM1 → FM2 → FM3 → AM, with six Buenos Aires AM stations over the internet: Mitre 790, Radio 10 710, Continental 590, Rivadavia 630, Radio Nacional 870 and La Red 910 (24 memories in all).

### Changed
- FM1-6 is now Vorterix 92.1 (it was Los 40).

## 7.7.0

### Added
- **ESTÉREO: Deck 90 as a car stereo, with internet radio.** `E` (or the new radio button in the tools, or the tray) closes the rack and the window becomes the front of a DP940 car stereo: a photo of the whole front with the live 16-segment display over its LCD and a key over each button. It's a strip window of its own (its own size and place, always on top, like the mini strip).
  - **PC mode:** the song in 16-segment letters (scrolling when long), its artist and time, and the L/R meters on the real sound; paused or stopped, the radio screen. DISP: song, BPM, loudness or time.
  - **RADIO mode** (MODE): stations over the internet, looked up by name in Radio Browser (radio-browser.info, free; only the name looked for is sent) and played by the program, so the meters follow them. FM1 comes with Aspen 102.3, 80s80s (Hamburg, internet only: no dial, the display shows its name), Metro 95.1, Rock & Pop 95.9, La 100 99.9 and Los 40 105.5 on 1–6, and Con Vos 89.9 on FM2-1; TUNE ◀ ▶ steps through Argentina's most heard stations, SCAN plays 8 s of each, holding 1–6 for a second keeps the station playing there, BAND gives FM1, FM2 and FM3 (18 memories). The radio screen shows the frequency (or the name), the memory and the station.
  - **The other keys:** VOL ▲ ▼ (or the mouse wheel anywhere on the front) is Windows' volume, ATT mutes, SEL plays or pauses (the radio, or the player's song), TRACK ◀ ▶ skips songs in PC mode, SDM changes the display's colour (six) and HDB its brightness, PWR or ⏏ go back to the rack (and turn the radio off). The AUX lamp lights while something is heard.
  - The display is the DP940 module made for Deck 90 (`src/vendor/dp940-display.js`), with two small additions so its meters and the station's name also work on the radio screen.
- The radio memories travel in the copy of the settings.

## 7.6.1

### Fixed
- Sometimes, at start, the player's first message reached the page before it had finished loading and caused an error (the song showed up a moment later). Now it waits for the page and is shown right away.

## 7.6.0

### Added
- **Showroom mode: the looks turn by themselves.** ↻ ROTAR, beside GUARDAR in LOOKS (or the `R` key), opens a small menu: on or off, every 1, 3, 5 or 10 minutes, and which looks: the ten favourites (each slot's two), your C1–C3, or all of them. The rack goes to the next one with a short fade and says its name. Only music time counts: with the song paused, in the mini strip, with the big tape alone, the window hidden or a menu open, it holds still. A look chosen by hand gets its full turn; it's remembered with your settings (and in their copy).
- Spanish forms on GitHub for a problem or an idea.

### Changed
- A new GIF at the top of the README: the console, a VU face picked by its picture and a look changing with the fade.

## 7.5.2

### Changed
- **The ⚙ settings come out even.** The clock and its city share one row in PANTALLA (OFF · HORA · + CLIMA and the city beside them), and EXTRAS keeps the phone and the copy of the settings: the four blocks pair up three and three, two and two. Two by two up to 1650 px wide (they were four across from 1300, and the source and clock rows got cramped), four across above that, each pair the same height. The weather's hints point to ⚙ → PANTALLA → RELOJ.

## 7.5.1

### Added
- **A Windows installer** beside the zip: `Deck-90-…-setup.exe` installs Deck 90 for your user, without administrator rights, in `%LOCALAPPDATA%\Programs\Deck 90` (a folder it can update itself in, as INSTALAR does), with a Start menu entry, an optional desktop icon and an uninstaller in Settings → Apps that also takes away its "Arrancar con Windows" entry (your settings stay). Each release's installer is built and tested on Windows: installed, started and uninstalled.

## 7.5.0

### Added
- **A welcome on the first start** (three steps): where Deck 90 listens (the PC, the microphone or the DEMO), the five looks with their pictures to try on the rack behind, and two extras: the city for the weather and the phone display's QR. It shows once; ⓘ → VER LA BIENVENIDA shows it again.
- **A copy of your settings in a file**: ⚙ → EXTRAS → AJUSTES → GUARDAR COPIA writes the look on screen, your C1–C3 and the clock and city to a file; CARGAR (tap twice: it replaces what you have) reads one back, for another PC or after reinstalling. The track history exports on its own, to Excel.

### Changed
- **A tidier console.** The VU face and the spectrum style are now one button each, showing a picture of the one in use and its name; it opens every style with its picture (taken from the displays themselves) and a line about it. `V` and `T` still step through them. The top row is VU, ESPECTRO and VER; the second, LOOKS (the presets) and the tools.
- **The ⚙ settings in four blocks**: SONIDO (source, 0 VU calibration, SENS), PANTALLA (frame and screen tone), CASETERA Y CINTA, and EXTRAS (phone, clock and the city, now a field of its own). Labels in one column, the buttons of a row the same width; two blocks a row in windows under 1300 px.
- Drawn icons for the tools (settings, history, big tape only, mini mode, hide, full screen, about) instead of text symbols that looked different on each PC.
- The console's lettering is the decks' condensed type instead of Courier, larger and easier to read, and one colour code throughout: gold for what's chosen, blue for the modules shown, green for the source that's listening.
- What you touch is in Spanish: ESPECTRO and CASETERA in VER, LOOKS for the presets; each module button says its key. The weather's hints point to ⚙ → EXTRAS → CIUDAD.

## 7.4.1

### Added
- **ⓘ ACERCA DE / NOVEDADES** (the ⓘ button beside ⛶, the `I` key, or the tray's "Acerca de Deck 90 y novedades"): the version, what Deck 90 is, links to GitHub, a BUSCAR ACTUALIZACIONES button, every key, and what changed in each of the 43 versions, in Spanish, newest first (yours marked LA TUYA). It opens by itself once after an update. The notes live in `src/novedades.md`.

### Fixed
- **DÚO, LED CIAN and LED VERDE could show only the left channel** when the VU panel wasn't wide (spectrum and OSC hidden, a narrow window): the R panel is put away for them, but they drew both only on a wide panel. Now the L panel always shows both: DÚO puts one face over the other, the LEDs stand up in two columns.
- **After STOP those three faces stayed at the last level** (needles up, LEDs lit) instead of resting like the others.
- Moving the window to a screen with another scale (100 % → 150 %) without it changing size could leave the displays painted at the wrong size: everything is now sized again for the new screen.
- FL SPECTRUM and FL SPECTRUM CIAN redraw their name and PEAK HOLD lamp when the panel changes height.
- The MÁS ▾ tooltip lists FL SPECTRUM and FL SPECTRUM CIAN.

## 7.4.0

### Added
- **DÚO, a seventh VU face** (⚙ → VU → DÚO, or `V`): both meters side by side on one wide backlit cream face, like a cassette deck's level meter. A straight scale from −60 to +3 dB (0 and +3 in red) whose marks all lean toward the needles' pivot under the window, dB under each scale, LEVEL L and LEVEL R, DECK 90 in the middle, in a black brushed frame with a brass bevel. The L panel takes the whole width (the R panel is put away); on the phone each meter shows on its own.
- **LED CIAN and LED VERDE, VU faces eight and nine**: both channels as two rows of glowing square LEDs on black glass, −40 to +3 dB, turning amber from −5 and red above 0, the scale in the meter's colour underneath. Like DÚO they take the whole width (and show one meter each on the phone).
- **Each favourite preset has a second look.** Pressing 1–5 (F1–F5) while its look is on screen turns to the other one, and back: 1 Estudio / Estudio LED, 2 Hi-Fi 90s / Hi-Fi Spectrum (DÚO with FL SPECTRUM), 3 Cinta 70s / Casetera (DÚO, FL 90s and the SO-90 REEL), 4 Vidriera / Vidriera cian (LED CIAN, FL SPECTRUM CIAN and the CD-90), 5 Mastering / Mastering LED (LED VERDE and the spectrogram). The button lights with either; its tooltip names both and the message says which one it is (1/2, 2/2). Your C1–C3 stay exactly as you saved them.

### Changed
- **The DECK 90 cassette's hubs are smaller and centred in the window**, with a margin to the label above and to the window's edge below (the photo's own hubs were taken out, so only the turning ones show).

## 7.3.0

### Added
- **Two new spectrum styles, FL SPECTRUM and FL SPECTRUM CIAN** (MÁS ▾): a clean black window in a thin gold line, nineteen bars, orange peak caps, the bands named underneath (32 … 16k) and one PEAK HOLD lamp. FL SPECTRUM is green turning yellow and orange near the top; CIAN is turquoise, each bar's top segments paler whatever its height. Both follow SENS, and the phone can show them too (⚙ → COLOR FL → SPECTRUM or CIAN).

### Changed
- **With the song paused, the rack stops drawing.** Once nothing comes in and every display has settled (the needles on their stop, the bars and their peaks on the floor, the tape still), the displays are left as they are, so drawing costs nothing, until a sound comes back, something on them changes (a new song, the time on the CD-90), the window changes or you touch anything. What moves by itself keeps moving: a song title too long for its display scrolls, the spectrogram runs, FL SHOWROOM plays its shop-window demo. Each display at rest was checked against a fresh drawing of the same moment: identical.
- **True peak takes less than half the work** on the audio thread, and none at all in silence. The readings are bit for bit the same (checked sample by sample against the previous version on half a million samples, and with test tones).

### Fixed
- On phones with a very dense screen, the meters, the FL and the cassette on the phone display came out slightly larger than their frame (7.2.0) and lost their right edge.

## 7.2.0

### Changed
- **The same picture for about half the work.** What doesn't move in a display is now painted once and copied in every frame instead of being drawn again sixty times a second: the VU faces with their scales and figures, the FL glass with every unlit segment, the photos of the SO-90 and the CD-90, the deck's steel and the cassette shells, the frames, labels and captions. The glow of a lit segment is painted once per colour and size and then stamped, and the FL displays blur their glow on a quarter-size copy, only over the bars that are lit. Every display keeps its look (each one was compared with 7.1.3 pixel by pixel).
- Measured on a slow test machine without a graphics card, the work per frame of a window with the VU meters, FL SHOWROOM and the SO-90 REEL went from about 31 ms to 16 ms, and the page needs about 85 MB less memory. Alone, each display: VU meters 31–50 → 17–18 ms, SO-90 REEL 65 → 24, CD-90 48 → 16, CLEAR cassette 35 → 19, deck 31 → 16, FL SHOWROOM 44 → 34, FL AMBER 49 → 25, LED 80s 36 → 22, LCD 33 → 19.
- **In the tray or minimized nothing is drawn.** The rack keeps measuring (LUFS, LRA, BPM, the history, the phone) but doesn't paint what no one sees: in the test, the main thread went from 86 % busy to 4 %, the graphics process from 25 % to 1 %.
- At most 60 drawn frames a second, also on 120 and 144 Hz screens, and 30 after a few seconds of silence (a paused song: the needles are at rest, the tape stands still). The measurements are the same: test tones from 0 to −55 dBFS read exactly as before, EBU 3342 included.
- The readouts and the LEDs touch the page only when what they show changes, and still pictures no display has used for a while give their memory back.

## 7.1.3

### Fixed
- **The mini strip could end up as big as the normal window**, with giant LUFS and TP figures (for example when Windows moves windows between screens, or an edge was dragged far down). The strip now never grows taller than 300 px, whatever resizes it, and its small figures keep their size at any height.
- If the page loads again while the strip is on (after a graphics driver hiccup), it comes back as the strip.

## 7.1.2

### Changed
- **The temperature stays in narrower windows.** When the header display is short of room, the weather's words go first, then the date, then the weather's icon, and only then the temperature; the song gives up a little more room and the dividers come closer. In a window about 1080 px wide the clock, the song, the icon and the temperature now all fit (before, the weather went away there); down to about 950 px the temperature stays without its icon.

## 7.1.1

### Changed
- The weather shows its city beside today's high and low (QUILMES · ↑18° ↓12°), so you can see which place it is.
- The mini strip keeps the clock and the weather as far as its width allows; a narrow strip gives the engraved name's room to the display (the LED stays).

### Fixed
- The mini strip could end up cut off at the bottom: when the header changes height (the clock turning on, going into or out of mini mode), the modules under it are now sized again.
- In a very low mini strip the meters stay inside their window.
- New screenshots in the README: the header with five kinds of weather, a wide window with the CD-90, and the mini strip.

## 7.1.0

### Added
- **Clock, date and weather in the header display** (with the metal frames). The display now spans the header between the brand and the status. On its left, the time in the same 7-segment digits as the decks, the colon blinking, with the day and date beside it (MARTES / 27 OCT). The song stays centred in the middle. On its right, the weather: an FL icon (sun or moon, clouds, rain, drizzle, storm, snow, fog), the temperature in 7-segment digits, the sky in words and today's high and low. The display is taller when the window is.
- **⚙ → RELOJ**: OFF, HORA (just the clock) or + CLIMA, and a field for your city: type it and press Enter (it's looked up by name and the first match is kept; the full name shows when you rest the mouse on the weather). Clicking the weather opens that field. Until there's a city the weather's side says how to set one.
- The weather comes from Open-Meteo (free, no account) every 15 minutes, through the main process; only the city's name, once, and its coordinates are sent. Offline, it tries again every few minutes and hides numbers older than three hours.
- A narrow window keeps room for the song: the weather's words go first, then the date, then the weather. In mini mode and with the CLÁSICO frame the header stays as before.

### Fixed
- Typing in a field of the drawer no longer works the rack's keyboard shortcuts.

## 7.0.1

### Changed
- **A wider CD-90 panel when the module is wide.** With the CD-90 under the VU meters and the spectrum (a module much wider than tall), the steel panel now grows sideways too, up to 75 % wider: a longer tray, keys 1–8 wider and further apart, more steel between the LED and TIME. The lettering, the keys' numbers, eject and the rounded corners keep their shape, because the photo only stretches in plain strips. The display takes the rest of the width, as before.

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
