// Pixel effects drawn on a low-resolution canvas (320 px wide, like the backdrops) that is scaled up
// without smoothing, so every effect is made of the same chunky pixels as the scene.

const GOLD = ['#ffffff', '#fff3c4', '#ffe07a', '#ffc23d', '#f08a3c'];
const RED = ['#ffffff', '#ffd0c4', '#ff8a70', '#e0503c', '#a02c24'];
const PARTY = ['#ffe07a', '#ff8a70', '#7fd6ff', '#9be37f', '#e8a0ff', '#ffffff'];
const FLAME = ['#fff3c4', '#ffe07a', '#ffc23d', '#f08a3c', '#d4502c'];
const FRAME_MS = 50;
const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [.71, .71, .62], [-.71, .71, .62], [.71, -.71, .62], [-.71, -.71, .62]];
const OUTER = [5, 11, 17, 22, 26, 29, 31, 32, 33], INNER = [0, 1, 4, 9, 15, 21, 26, 30, 33];

export class Fx {
  constructor(canvas) {
    this.c = canvas; this.g = canvas.getContext('2d');
    this.parts = []; this.bursts = []; this.flashT = 0; this.aura = null; this.running = false; this.k = 1;
    this.loop = this.loop.bind(this);
  }
  // w,h: scene size in CSS pixels. Effects are positioned in CSS pixels and converted here.
  resize(w, h) { this.k = 320 / w; this.c.width = 320; this.c.height = Math.max(1, Math.round(h * this.k)); this.g.imageSmoothingEnabled = false; }
  start() { if (!this.running) { this.running = true; this.last = performance.now(); requestAnimationFrame(this.loop); } }
  add(x, y, n, o) {
    for (let i = 0; i < n; i++) {
      const a = (o.angle ?? Math.random() * Math.PI * 2) + (Math.random() - .5) * (o.spread ?? 0), sp = o.speed * (.4 + Math.random() * .6);
      this.parts.push({
        x: x * this.k + (Math.random() - .5) * (o.jitter || 0), y: y * this.k + (Math.random() - .5) * (o.jitter || 0),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.lift || 0), g: o.gravity ?? 160, life: o.life * (.6 + Math.random() * .4), age: 0,
        size: o.size || 2, colors: o.colors, fixed: o.fixed ? o.colors[Math.floor(Math.random() * o.colors.length)] : null,
      });
    }
    this.start();
  }
  // Starburst for a hit. Big gold one with a screen flash for criticals.
  burst(x, y, crit) {
    this.bursts.push({ x: Math.round(x * this.k), y: Math.round(y * this.k), t: 0, s: crit ? 1.4 : .5, colors: GOLD });
    this.add(x, y, crit ? 26 : 7, { speed: crit ? 150 : 80, life: crit ? .7 : .4, colors: GOLD, size: crit ? 2 : 1, gravity: 220 });
    if (crit) { this.flashT = .1; for (let i = 0; i < 5; i++) this.twinkle(x + (Math.random() - .5) * 150, y + (Math.random() - .5) * 110, i * .07); }
    this.start();
  }
  twinkle(x, y, delay) { this.bursts.push({ x: Math.round(x * this.k), y: Math.round(y * this.k), t: -delay, s: .22, colors: GOLD, plus: true }); }
  ouch(x, y) { this.bursts.push({ x: Math.round(x * this.k), y: Math.round(y * this.k), t: 0, s: .4, colors: RED }); this.add(x, y, 10, { speed: 90, life: .45, colors: RED, gravity: 260 }); this.start(); }
  confetti(x, y) {
    this.add(x, y, 60, { speed: 190, life: 1.5, colors: PARTY, fixed: true, angle: -Math.PI / 2, spread: 2.2, gravity: 230, jitter: 14 });
    for (let i = 0; i < 6; i++) this.twinkle(x + (Math.random() - .5) * 170, y - Math.random() * 110, i * .09);
  }
  setAura(on, x, y, w) { this.aura = on ? { x, y, w } : null; if (on) this.start(); }
  clear() { this.parts = []; this.bursts = []; this.aura = null; this.flashT = 0; this.g.clearRect(0, 0, this.c.width, this.c.height); }

  loop(now) {
    const dt = Math.min(.05, (now - this.last) / 1000); this.last = now;
    const g = this.g; g.clearRect(0, 0, this.c.width, this.c.height);
    if (this.aura && Math.random() < .5) {
      const a = this.aura;
      this.add(a.x + (Math.random() - .5) * a.w, a.y - Math.random() * 4, 1, { speed: 6, lift: 34 + Math.random() * 20, life: .55, colors: FLAME, gravity: -30, size: Math.random() < .3 ? 2 : 1 });
    }
    if (this.flashT > 0) { this.flashT -= dt; g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(0, 0, this.c.width, this.c.height); }
    for (const b of this.bursts) { b.t += dt; if (b.t >= 0) this.drawBurst(b); }
    this.bursts = this.bursts.filter(b => b.t < FRAME_MS * OUTER.length / 1000);
    for (const p of this.parts) {
      p.age += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      const f = p.age / p.life;
      g.fillStyle = p.fixed || p.colors[Math.min(p.colors.length - 1, Math.floor(f * p.colors.length))];
      if (f < 1 && (f < .75 || Math.floor(p.age * 30) % 2)) g.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    this.parts = this.parts.filter(p => p.age < p.life);
    if (this.parts.length || this.bursts.length || this.aura || this.flashT > 0) requestAnimationFrame(this.loop);
    else { this.running = false; g.clearRect(0, 0, this.c.width, this.c.height); }
  }
  drawBurst(b) {
    const g = this.g, f = Math.min(OUTER.length - 1, Math.floor(b.t * 1000 / FRAME_MS));
    const out = OUTER[f] * b.s, inn = INNER[f] * b.s, dirs = b.plus ? DIRS.slice(0, 4) : DIRS;
    for (const [dx, dy, len] of dirs) {
      for (let d = inn; d <= out; d += 1) {
        const t = out > 0 ? d / (OUTER[OUTER.length - 1] * b.s) : 0;
        const thick = b.plus ? 1 : Math.max(1, Math.round((len === 1 ? 3 : 2) * (1 - t) * (b.s > 1.2 ? 1.4 : b.s > .6 ? 1 : .6)));
        g.fillStyle = b.colors[Math.min(b.colors.length - 1, Math.floor(t * b.colors.length))];
        g.fillRect(Math.round(b.x + dx * d * len - thick / 2), Math.round(b.y + dy * d * len - thick / 2), thick, thick);
      }
    }
    if (f < 3 && !b.plus) { // bright core: a stepped diamond
      const r = Math.round((4 - f) * 2 * b.s) + 1; g.fillStyle = '#fff';
      for (let y = -r; y <= r; y++) { const w = r - Math.abs(y); g.fillRect(b.x - w, b.y + y, w * 2 + 1, 1); }
    }
  }
}
