'use strict';
// ═══════════════════════════════════════════════════════════
//  MAIN LOOP
// ═══════════════════════════════════════════════════════════
let beatStep = 0, wasFlashing = false;
let sparkT = 0;
function drawLufsHistory(now) {
  if (now - sparkT < 100) return;
  sparkT = now;
  const c = el('lufsHist'); if (!c) return;
  const x = c.getContext('2d'), W = c.clientWidth, H = 22, LO = -32, HI = -4;
  x.clearRect(0, 0, W, H);
  const y = v => H - 1 - (Math.max(LO, Math.min(HI, v)) - LO) / (HI - LO) * (H - 2);
  [[-14, 'rgba(116,255,183,.22)'], [-9, 'rgba(255,120,60,.22)']].forEach(([v, col]) => {
    x.strokeStyle = col; x.setLineDash([]); x.beginPath(); x.moveTo(0, y(v) + .5); x.lineTo(W, y(v) + .5); x.stroke();
  });
  x.setLineDash([]);
  if (lufsHist.length < 2) return;
  const step = W / 299, x0 = W - (lufsHist.length - 1) * step;
  x.beginPath();
  lufsHist.forEach((v, i) => { const px = x0 + i * step; i ? x.lineTo(px, y(v)) : x.moveTo(px, y(v)); });
  const fill = x.createLinearGradient(0, 0, 0, H);
  fill.addColorStop(0, 'rgba(121,217,255,.28)'); fill.addColorStop(1, 'rgba(121,217,255,0)');
  x.lineTo(W, H); x.lineTo(x0, H); x.closePath(); x.fillStyle = fill; x.fill();
  x.beginPath();
  lufsHist.forEach((v, i) => { const px = x0 + i * step; i ? x.lineTo(px, y(v)) : x.moveTo(px, y(v)); });
  x.strokeStyle = 'rgba(160,230,255,.9)'; x.lineWidth = 1.2; x.stroke();
}
const bleds = document.querySelectorAll('.beat-leds .led');

// Errors never stop the show: each part runs guarded, the loop always schedules the next frame,
// and the first occurrence of each error is reported (program: written to media.log).
const seenErrors = new Set();
function report(where, e) {
  const msg = where + ': ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : String(e));
  if (seenErrors.has(msg)) return;
  seenErrors.add(msg);
  console.error(msg);
  if (window.appLog) window.appLog(msg);
}
window.addEventListener('error', ev => report('window', ev.error || ev.message));
window.addEventListener('unhandledrejection', ev => report('promise', ev.reason));
function guard(where, fn) {
  try { fn(); }
  catch (e) {
    report(where, e);
    // A drawing function that threw may have left save()s open: unwind them (bounded) and reset the state.
    const dpr = window.devicePixelRatio || 1;
    [xVL, xVR, xGO, xSP, xOS, xDK, xTP, xMI].forEach(c => { try {
      for (let i = 0; i < 32; i++) c.restore();
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.shadowBlur = 0; c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    } catch (_) {} });
  }
}

function loop(ts) {
  if (!running) return;
  rafId = requestAnimationFrame(loop);          // schedule first: a failing frame can't freeze the next one
  try { frame(); } catch (e) { report('frame', e); }
}
function frame() {
  const now = performance.now();
  dtMs = lastFrame ? Math.min(100, now - lastFrame) : 16.7;
  lastFrame = now;
  frameScale = dtMs / 16.667;

  // VU
  const inL = readChannel(aL, bufL, vu.L), inR = readChannel(aR, bufR, vu.R);
  const loud = Math.max(vu.L.dbfs, vu.R.dbfs);
  if (loud > -50) lastAudible = now;
  if (loud > -55) {                       // ignore silence and fades
    autoRms += (loud - autoRms) * (1 - Math.exp(-dtMs / 6000));
    autoRef = Math.max(4, Math.min(24, -autoRms - 4));
  }
  tickVU(vu.L, inL);
  tickVU(vu.R, inR);
  if (miniMode) guard('mini', () => drawMini(cMI, xMI, true));
  else {
    if (mods.vu) guard('vu', () => { drawVU(cVL, xVL, vu.L); drawVU(cVR, xVR, vu.R); });
    if (mods.gonio) guard('gonio', () => drawGonio(cGO, xGO, true));
    // Spectrum + Osc + decks
    if (mods.spectrum) guard('spectrum', () => drawSpectrum(cSP, xSP));
    if (mods.osc) guard('osc', () => drawOsc(cOS, xOS));
    if (mods.deck) guard('deck', () => drawDeck(cDK, xDK, true));
    if (mods.tape) guard('tape', () => drawBigTape(cTP, xTP, true));
    if (mods.meters) guard('lufsHistory', () => drawLufsHistory(now));
  }

  // Meters + BPM
  guard('meters', () => updateMasterMeters(now));
  guard('bpm', () => tickBPM(now));
  const bpmEl  = el('bpmValue');
  const confEl = el('bpmConf');
  if (bpmVal > 0) {
    bpmEl.textContent = Math.round(bpmVal);
    confEl.textContent = bpmConfidence >= 0.45 ? '♩ LOCKED' : '♩ TRACKING';
  } else {
    bpmEl.textContent = '--';
    confEl.textContent = Math.max(vu.L.lvl, vu.R.lvl) > -40 ? 'LISTENING…' : 'NO SIGNAL';
  }

  // Beat flash: the four LEDs step through the bar like a hardware counter.
  const flashing = now < beatFlashUntil;
  if (flashing && !wasFlashing) beatStep = (beatStep + 1) % 4;
  if (flashing !== wasFlashing) {
    bpmEl.classList.toggle('beat', flashing);
    if (flashing) { const r = el('beatRing'); r.classList.remove('hit'); void r.offsetWidth; r.classList.add('hit'); }
    bleds.forEach((l, i) => {
      const on = flashing && i === beatStep;
      l.style.background = on ? '#00ff88' : '';
      l.style.boxShadow  = on ? '0 0 8px #00ff88' : '';
    });
    wasFlashing = flashing;
  }

  // Header LEDs
  if (vuCal === 'AUTO' && now - (loop.calT || 0) > 500) {
    loop.calT = now;
    const ab = document.querySelector('.seg[data-group="cal"] button[data-v="AUTO"]');
    if (ab) ab.textContent = 'AUTO −' + Math.round(autoRef);
  }
  phoneTick(now);
  const maxVu = Math.max(vu.L.lvl, vu.R.lvl);
  el('ledSig').className  = maxVu > -40 ? 'led green' : 'led';
  el('ledClip').className = (vu.L.clip || vu.R.clip) ? 'led red' : 'led';
}
