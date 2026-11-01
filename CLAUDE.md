# Deck 90

An audio analyzer that looks like a 90s hi-fi rack: VU meters, loudness, spectrum, BPM, cassette decks, a
tuner (DT-90) and a CD player (DC-90), for whatever plays on a Windows or Linux computer. Electron, no build
step: the page is plain HTML, CSS and JavaScript. README.md (Spanish) and README.en.md say what it does and how
to install it.

Damián (djkollmax) owns it and writes in Rioplatense Spanish: everything the user reads (the program's texts,
toasts, `src/novedades.md`, README.md) is in that Spanish; code, comments, commits and CHANGELOG.md are in
English.

## Layout

The code is being restructured in stages (tests first, then a `core/` without any screen, then one folder per
module with its own CSS, then ES modules instead of shared globals). Until then:

- `electron/`: the main process. `main.js` (window, IPC, the network the page may not reach), `media.ps1` (the
  Windows bridge: now playing, volume keys, the CD drive through MCI), `mpris.js` (the same on Linux),
  `radioproxy.js` (the radio through a local proxy that reads the song and bitrate), `cdnames.js`
  (MusicBrainz), `remote.js` (the phone), `updater.js`, `tracklog.js`.
- `src/index.html` loads `src/js/*.js` as classic scripts, in order; they share their top-level names. The order
  in index.html matters, and a file reaching another one's names checks with `typeof` first.
  - `core.js`, `audio.js`, `loop.js`: the capture, the measurements and the frame loop.
  - `draw-*.js`, `deck*.js`, `tape*.js`, `cd90.js`: the modules' drawing.
  - `stereo.js`: the radio and CD engines and the car stereo window. `tuner.js` and `cdunit.js`: the rack's
    DT-90 and DC-90 on those engines.
  - `controls.js` (keys and prefs), `clock.js` (header clock and weather), `phone.js`, `history.js`, …
- `src/vendor/`: Damián's SVG components (`dp940-display.js` the car stereo's display, `dt90-tuner.js`,
  `dc90-cd.js`). Deck 90 patches them; every patch is marked with a `Deck 90 x.y.z` comment and listed in the
  file's header. A new revision from Damián replaces the file and gets those patches again.
- `src/remote/`: the phone's page. `src/styles.css`, `src/stereo-face.css`: the styles.
- `tests/`: see Checks. `scripts/`: packaging (`package.mjs`), the update test, the syntax check.

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

A change a person would notice gets a test in `tests/`, asserting what they would see.

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

- **rack**: the main window's stack of modules. **DT-90**: the tuner unit. **DC-90**: the CD unit.
- **stereo**: the car stereo window (E), with its own radio and CD modes. **mini**: the strip (P).
- **phone**: the phone's page, served by `electron/remote.js`.
- **look**: a module's skin (VU faces, spectrum looks, the stereo display's SDM looks).

## Rules

- README screenshots use made-up song and station names, and "Buenos Aires" for the weather.
- No credentials or personal data in the repo.
- The program must look and work the same after a restructuring step: the tests are the contract.
