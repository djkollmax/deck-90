# Deck 90

An audio analyzer that looks like a 90s hi-fi rack: VU meters, loudness, spectrum, BPM, cassette decks, a
tuner (DT-90) and a CD player (DC-90), for whatever plays on a Windows or Linux computer. Electron, no build
step: the page is plain HTML, CSS and JavaScript. README.md (Spanish) and README.en.md say what it does and how
to install it.

Damián (djkollmax) owns it and writes in Rioplatense Spanish: everything the user reads (the program's texts,
toasts, `src/novedades.md`, README.md) is in that Spanish; code, comments, commits and CHANGELOG.md are in
English.

## Layout

The code was restructured in stages (7.9.16–7.9.18): the tests, `src/core/`, the `src/ui/` folders, and the
shared state made explicit. Moving to ES modules (`import`/`export`) is left for when the project grows; Damián
wants it done then (see Shared names).

- `electron/`: the main process. `main.js` (window, IPC, the network the page may not reach), `media.ps1` (the
  Windows bridge: now playing, volume keys, the CD drive through MCI), `mpris.js` (the same on Linux),
  `radioproxy.js` (the radio through a local proxy that reads the song and bitrate), `cdnames.js`
  (MusicBrainz), `jellyfin.js` (the DM-90's Jellyfin server: sign-in, the music library, a song's stream),
  `audiofile.js` (a data CD file's rate and bits), `remote.js` (the phone), `updater.js`, `tracklog.js`.
- `src/core/`: what works with no screen. `events.js` is the hub (`deck.on`, `deck.emit`, `deck.notice` for a
  line to the person); `radio.js` (memories, tuning through the proxy, the song and quality, SCAN) and `cd.js`
  (the drive, the disc's names, quick skips, REPEAT and SHUFFLE) and `music.js` (the Jellyfin library, the queue,
  Q, REPEAT and SHUFFLE, the player) say what changed through it and never touch a screen. The screens call
  their functions and listen. `store.js` reads and writes what's saved (localStorage).
- `src/ui/<module>/`: the screens, each folder with its scripts and its CSS.
  - `app/`: the program around the modules. `core.js` (shared state), `audio.js` (capture, measurements,
    toast), `loop.js` (the frame loop), `controls.js` (keys, prefs, the console), `stills.js`, `idle.js`,
    `presets.js`, `rotate.js`, `phone.js`, `history.js`, `about.js`, `update.js`, `welcome.js`, `backup.js`,
    `boot.js` (in `<head>`). Its CSS, in this order: `base.css` (the rack), `splash.css`, `look.css` (the 5.x–6.x
    look, layered), `dialogs.css`, `window.css`, `chassis.css` (the metal frames), `console.css`,
    `welcome.css`.
  - `meters/` (VU, spectrum, oscilloscope, goniometer), `tape/` (the cassette decks, the big tape, the CD-90
    tape style), `header/` (now playing, clock and weather; `nowplaying.js` also keeps Deck 90's own sources, `npSource`: the DM-90, the DC-90 and the radio register there, and the one playing gets the header, the history, the deck's keys and the media keys), `mini/` (the strip), `stereo/` (the car stereo
    window; `stereo-face.css` is shared with the phone), `tuner/` (the DT-90; `units.css` styles it and the
    DC-90), `cdunit/` (the DC-90), `jukebox/` (the DM-90: `dm90.js` its faceplate, Deck 90's own in the units'
    style, and `jukebox.js` its lists and keys).
- `src/index.html` loads every script as a classic script and every stylesheet, in order. The stylesheets are
  one cascade split in files: a later file overrides an earlier one, so moving a rule between files can change
  the look (compare with `scripts/shots.mjs`, below).
- `src/vendor/`: Damián's SVG components (`dp940-display.js` the car stereo's display, `dt90-tuner.js`,
  `dc90-cd.js`). Deck 90 patches them; every patch is marked with a `Deck 90 x.y.z` comment and listed in the
  file's header. A new revision from Damián replaces the file and gets those patches again.
- `src/remote/`: the phone's page; `electron/remote.js` maps the shared files it loads.
- `tests/`: see Checks. `scripts/`: packaging (`package.mjs`), the update test, the syntax check, the shots,
  the shared-names report (`globals.mjs`).

## Shared names

The page's scripts share their top-level names (no modules yet), so:

- A script may use any name of a script loaded before it. A name of a script loaded after it exists only once
  the page has loaded: code that can run while the page loads (top-level code, an image's onload, a font
  promise) checks it with `typeof` first; code that only runs later (keys, the frame loop, timers) doesn't.
- The radio and the CD are changed only through `src/core/`'s functions (`radioTune`, `radioScanSet`,
  `cdGo`, `cdStopHere`, `cdPauseHere`, …), never by setting their variables; they answer through `deck` events.
- State that several files change lives in one object owned by one file: `capture` (core.js: the Web Audio
  graph and `running`), `pace` (core.js: frame timing), `worklet` (audio.js: what the audio worklets send).
  The phone's `src/remote/shim.js` defines the parts of them its shared files read.
- Still set from another file: the measurement values of core.js that audio.js's per-frame measuring updates
  (VU reference, loudness, LRA, crest, phase, beat, BPM), the view prefs that controls.js and presets.js apply
  (`drawerOpen`, `controlsHidden`, `deckDouble`, `modsBeforeTape`, `tapeStyle`, `vuCal`, `miniMode`), and a few
  hand-overs (`restAnim`, `tunerResumePc`, `deckHits`, `lastAudible`, `presetSaveArmed`, `rotateLeft`).
  `node scripts/globals.mjs` lists them and the `typeof` checks; `--json` maps every name, for the move to ES
  modules (the measuring would move with the values into one module then).

## Checks

Before committing:

```sh
node scripts/check.mjs                      # every script compiles
xvfb-run -a npm test                        # tests/*.test.mjs: the program as a person uses it
```

`npm test` needs Electron and Playwright: `npm install` (and `npx playwright-core install chromium` for the
phone's test), or point `ELECTRON_PATH` at an Electron 45 and `PW_DIR` at a folder holding
`node_modules/playwright-core`. The tests start the real program with a fresh profile and no network: a pretend
radio station (`tests/lib/station.mjs`, an ICY stream with song titles) and a pretend CD drive that plays a
disc straight through as Windows does (`tests/lib/app.mjs`). Each file is one program run; they take about
four minutes. CI runs them on every push (`.github/workflows/release.yml`, job `tests`), next to the Windows
job (the bridge, the built program, the installer, the updates).

A change a person would notice gets a test in `tests/`, asserting what they would see. A change that must not
show (moving code, splitting CSS) is checked with pictures: `node scripts/shots.mjs <dir>` before and after,
then `python3 scripts/shots-compare.py <before> <after>` says which states differ and where.

## Commits

The subject is one plain sentence saying what changed for the user, no full stop, with the version in
parentheses when it is released: `REPEAT and SHUFFLE on the DC-90 (7.9.14)`. The body, when there is one, says
why and how in a short paragraph.

## Releases

Every push to `main` whose `package.json` version has no release yet publishes it (Windows installer and zip,
Linux zip, the app bundle the updater installs), once the tests and the Windows job pass. A release bumps the
version and adds its section to both `CHANGELOG.md` (English) and `src/novedades.md` (Spanish, shown in the
program). Push one release, wait for its run to finish, then the next: two at once race.

## Words

- **rack**: the main window's stack of modules. **DT-90**: the tuner unit. **DC-90**: the CD unit. **DM-90**: the
  music server unit (Jellyfin).
- **stereo**: the car stereo window (E), with its own radio and CD modes. **mini**: the strip (P).
- **phone**: the phone's page, served by `electron/remote.js`.
- **look**: a module's skin (VU faces, spectrum looks, the stereo display's SDM looks).

## Rules

- README screenshots use made-up song and station names, and "Buenos Aires" for the weather.
- No credentials or personal data in the repo.
- The program must look and work the same after a restructuring step: the tests are the contract.
