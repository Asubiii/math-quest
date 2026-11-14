// Tiny retro sound effects made with square and triangle waves (no audio files).
let ctx = null, muted = false;
try { muted = localStorage.getItem('math-quest-muted') === '1'; } catch { /* ignore */ }

export const isMuted = () => muted;
export function setMuted(m) { muted = m; try { localStorage.setItem('math-quest-muted', m ? '1' : '0'); } catch { /* ignore */ } }
// Browsers only allow sound after a tap or key press: call this from one.
export function unlock() { try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); } catch { ctx = null; } }

function tone(freq, start, dur, { type = 'square', vol = .08, to = null } = {}) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + start, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + .02);
}
const seq = (notes, step, dur, opt) => notes.forEach((f, i) => f && tone(f, i * step, dur, opt));

export const sfx = {
  hit: () => { tone(330, 0, .09, { to: 160 }); tone(90, 0, .08, { type: 'triangle', vol: .15 }); },
  crit: () => { tone(120, 0, .12, { type: 'triangle', vol: .2, to: 60 }); seq([784, 988, 1175, 1568], .045, .12, { vol: .07 }); },
  late: () => tone(260, 0, .1, { to: 200, vol: .06 }),
  wrong: () => seq([196, 147], .09, .16, { type: 'sawtooth', vol: .06 }),
  hurt: () => { tone(140, 0, .2, { type: 'sawtooth', vol: .08, to: 60 }); },
  combo: () => seq([659, 784, 988], .05, .1, { vol: .06 }),
  appear: () => seq([196, 0, 196, 262], .09, .12, { vol: .05 }),
  win: () => seq([523, 659, 784, 1047, 0, 784, 1047], .1, .16, { vol: .07 }),
  rankup: () => { seq([523, 659, 784, 1047, 1319, 1568], .08, .18, { vol: .07 }); seq([262, 0, 392, 0, 523], .16, .3, { type: 'triangle', vol: .1 }); },
  lose: () => seq([392, 330, 262, 196], .16, .25, { type: 'triangle', vol: .1 }),
  tick: () => tone(880, 0, .03, { vol: .03 }),
};
