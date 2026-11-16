// Battle scene: backdrop, hero (arnis apprentice) and monster sprites, attacks and popups.
// Sprite art comes from the Salita project (assets/). Sizes follow the scene height so the
// layout works from phones to desktops.

import { Fx } from './fx.js?v=1794803894';

export const MONSTERS = [
  { id: 'duwende', name: 'Goblin', blurb: 'A sneaky miner who guards its gold with a pickaxe.' },
  { id: 'santelmo', name: 'Wisp', blurb: 'A floating blue flame that drifts through the dark.' },
  { id: 'siyokoy', name: 'Swamp Troll', blurb: 'A tusked brute covered in weeds and scales.' },
  { id: 'tigmamanukan', name: 'Stormbird', blurb: 'A swift blue bird that strikes like lightning.' },
  { id: 'alan', name: 'Harpy', blurb: 'A winged creature with long claws and a nasty screech.' },
  { id: 'sigbin', name: 'Hellhound', blurb: 'A lean, fiery beast that hunts at night.' },
  { id: 'amomongo', name: 'Yeti', blurb: 'A huge, shaggy beast with fists like boulders.' },
  { id: 'bungisngis', name: 'Cyclops', blurb: 'A one-eyed giant with a very big grin.' },
  { id: 'wakwak', name: 'Shadow Raven', blurb: 'A giant raven with glowing red eyes.' },
  { id: 'berberoka', name: 'Bog King', blurb: 'The ancient ruler of the swamp. The final boss.' },
];

export const BACKDROPS = {
  pct: ['coast-meadow', 'coast-windy-field', 'coast-east-coast', 'coast-creek-bridge', 'coast-terrace-walk', 'coast-high-road', 'coast-upper-terrace', 'coast-town-gate', 'coast-cliff-shelf', 'coast-cave-approach'],
  frac2dec: ['cave-mouth-hall', 'cave-drip-passage', 'cave-crossing', 'cave-river-hall', 'cave-echo-gallery', 'cave-swiftlet-roost', 'cave-crevice', 'cave-upper-gallery', 'cave-shaft-head', 'cave-skylight-exit'],
  compare: ['coast-woodland', 'coast-creek-bridge', 'coast-meadow', 'coast-terrace-walk', 'coast-windy-field', 'coast-high-road', 'coast-woodland', 'coast-upper-terrace', 'coast-town-gate', 'coast-cliff-shelf'],
  all: ['coast-meadow', 'coast-woodland', 'cave-mouth-hall', 'coast-creek-bridge', 'cave-river-hall', 'coast-high-road', 'cave-echo-gallery', 'coast-cliff-shelf', 'cave-upper-gallery', 'cave-overlook'],
  angles: ['coast-cliff-shelf', 'cave-overlook', 'coast-upper-terrace', 'cave-skylight-exit', 'coast-high-road', 'cave-upper-gallery', 'coast-cliff-shelf', 'cave-overlook', 'cave-shaft-head', 'cave-overlook'],
};
export const bgUrl = name => `assets/bg/battle-bg-${name}.png`;

let manifest = null;
export async function loadManifest() {
  if (!manifest) manifest = await fetch('assets/monsters/monster-atlas-manifest.json').then(r => r.json());
  return manifest;
}
export const atlasOf = id => manifest[id];
export const atlasUrl = id => 'assets/monsters/' + manifest[id].image.replace('./', '');

// Hero sheets: walk 5×4 frames of 32px (row 2 faces right), attack 6×2 frames of 48×32 (row 1 faces right).
const HERO_WALK = 'assets/hero/arnis-apprentice-32.png';
const HERO_ATTACK = 'assets/hero/arnis-apprentice-attack-48x32.png';
const ATTACK_MS = [210, 90, 60, 80, 80, 140], HIT_FRAME = 2;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Draw one frame of a monster atlas into an element (used for portraits and the bestiary too).
export function paintMonster(el, id, anim, frame, size) {
  const a = atlasOf(id), an = a.anims[anim], cols = a.w / a.cw, rows = a.h / a.ch;
  const i = Math.min(frame, an.ms.length - 1);
  el.style.backgroundImage = `url(${atlasUrl(id)})`;
  el.style.backgroundSize = `${cols * size}px ${rows * size}px`;
  el.style.backgroundPosition = `${-i * size}px ${-an.row * size}px`;
  el.style.width = el.style.height = size + 'px';
  return an;
}

export class Scene {
  constructor(root) {
    this.root = root;
    root.innerHTML = `<img class="bg" alt=""><div class="shadow hero-shadow"></div><div class="shadow mon-shadow"></div>
      <div class="sprite hero"></div><div class="sprite monster"></div><canvas class="fx"></canvas><div class="pops"></div>`;
    this.bg = root.querySelector('.bg');
    this.hero = root.querySelector('.hero');
    this.mon = root.querySelector('.monster');
    this.pops = root.querySelector('.pops');
    this.fx = new Fx(root.querySelector('.fx'));
    this.heroShadow = root.querySelector('.hero-shadow');
    this.monShadow = root.querySelector('.mon-shadow');
    this.busy = false; this.down = false; this.idleI = 0;
    new ResizeObserver(() => this.layout()).observe(root);
    this.tick = () => {
      if (!this.busy && !this.down && this.monId) {
        const an = atlasOf(this.monId).anims.battle_idle;
        this.showMon('battle_idle', this.idleI++ % an.ms.length);
      }
      this.timer = setTimeout(this.tick, 190);
    };
  }
  async setup(monId, backdrop) {
    await loadManifest();
    this.monId = monId; this.down = false; this.busy = false;
    this.bg.src = bgUrl(backdrop);
    this.mon.classList.remove('gone'); this.fx.clear();
    this.layout();
    this.heroIdle();
    this.showMon('battle_idle', 0);
    clearTimeout(this.timer); this.tick();
  }
  stop() { clearTimeout(this.timer); }
  layout() {
    const W = this.root.clientWidth, H = this.root.clientHeight;
    if (!W || !H) return;
    this.W = W; this.H = H; this.fx.resize(W, H);
    this.hs = Math.round(H * 0.34);          // hero frame box (32px art)
    this.groundY = H * 0.9;
    this.heroX = W * 0.27;
    this.monX = W * 0.72;
    if (this.monId) { this.monBase = Math.round(this.hs * 1.5 * atlasOf(this.monId).scale); this.showMon(this.monAnim || 'battle_idle', this.monFrame || 0); }
    this.heroIdle();
    const sh = (el, x, w) => Object.assign(el.style, { left: `${x - w / 2}px`, top: `${this.groundY - w * 0.09}px`, width: `${w}px`, height: `${w * 0.18}px` });
    sh(this.heroShadow, this.heroX, this.hs * 0.55);
    if (this.monBase) sh(this.monShadow, this.monX, this.monBase * 0.45);
  }
  heroIdle() {
    const s = this.hs, el = this.hero;
    if (!s) return;
    Object.assign(el.style, {
      width: `${s}px`, height: `${s}px`, left: `${this.heroX - s / 2}px`, top: `${this.groundY - s * 30 / 32}px`,
      backgroundImage: `url(${HERO_WALK})`, backgroundSize: `${5 * s}px ${4 * s}px`, backgroundPosition: `0px ${-2 * s}px`,
    });
    el.classList.remove('attacking');
  }
  heroFrame(i) {
    const s = this.hs, w = s * 1.5, el = this.hero;
    Object.assign(el.style, {
      width: `${w}px`, height: `${s}px`, left: `${this.heroX - w / 2}px`, top: `${this.groundY - s * 30 / 32}px`,
      backgroundImage: `url(${HERO_ATTACK})`, backgroundSize: `${6 * w}px ${2 * s}px`, backgroundPosition: `${-i * w}px ${-s}px`,
    });
  }
  showMon(anim, frame) {
    if (!this.monId || !this.monBase) return;
    const a = atlasOf(this.monId), an = a.anims[anim], size = this.monBase;
    this.monAnim = anim; this.monFrame = frame;
    paintMonster(this.mon, this.monId, anim, frame, size);
    this.mon.style.left = `${this.monX - (an.ax / a.cw) * size}px`;
    this.mon.style.top = `${this.groundY - (an.ay / a.ch) * size}px`;
  }
  async playMon(anim, onFrame, atFrame) {
    const an = atlasOf(this.monId).anims[anim];
    for (let i = 0; i < an.ms.length; i++) {
      this.showMon(anim, i);
      if (i === atFrame) onFrame?.();
      await sleep(an.ms[i] * 0.8);
    }
  }
  // Hero dashes in and strikes. onHit fires on the contact frame.
  async heroAttack(onHit, crit) {
    this.busy = true;
    const reach = Math.max(0, this.monX - this.heroX - this.monBase * 0.35 - this.hs * 0.3);
    this.hero.style.setProperty('--reach', `${reach}px`);
    this.hero.classList.add('attacking');
    for (let i = 0; i < 6; i++) {
      this.heroFrame(i);
      if (i === HIT_FRAME) {
        onHit?.();
        this.fx.burst(this.monX - this.monBase * 0.12, this.groundY - this.monBase * 0.36, crit);
        if (crit && !reduced()) this.shake(true);
        this.mon.classList.add('flash');
        if (crit) await sleep(110); // hit-stop: hold the contact frame
        this.playMon('hurt').then(() => this.mon.classList.remove('flash'));
      }
      await sleep(ATTACK_MS[i]);
    }
    this.heroIdle();
    await sleep(120);
    this.busy = false;
  }
  async monsterAttack(onHit) {
    this.busy = true;
    const an = atlasOf(this.monId).anims.battle_attack, contact = Math.floor(an.ms.length * 0.5);
    const reach = Math.max(0, this.monX - this.heroX - this.monBase * 0.3 - this.hs * 0.2);
    this.mon.style.setProperty('--reach', `${-reach}px`);
    this.mon.classList.add('lunging');
    await this.playMon('battle_attack', () => {
      onHit?.(); this.hero.classList.add('flash'); if (!reduced()) this.shake(false);
      this.fx.ouch(this.heroX, this.groundY - this.hs * 0.45);
      setTimeout(() => this.hero.classList.remove('flash'), 360);
    }, contact);
    this.mon.classList.remove('lunging');
    this.busy = false;
  }
  async defeat() {
    this.busy = true; this.down = true;
    this.fx.confetti(this.monX, this.groundY - this.monBase * 0.4);
    await this.playMon('defeat');
    await sleep(400);
    this.mon.classList.add('gone');
  }
  async heroHurtDown() { this.hero.classList.add('down'); await sleep(700); this.hero.classList.remove('down'); }
  aura(on) { this.fx.setAura(on, this.heroX, this.groundY - 2, this.hs * 0.45); this.hero.classList.toggle('fired-up', on); }
  banner(text) { const s = document.createElement('span'); s.className = 'banner'; s.textContent = text; this.pops.appendChild(s); setTimeout(() => s.remove(), 1300); }
  shake(big) { this.root.classList.remove('shake', 'shake-big'); void this.root.offsetWidth; this.root.classList.add(big ? 'shake-big' : 'shake'); }
  popup(on, text, kind) {
    const s = document.createElement('span');
    s.className = 'pop ' + kind; s.textContent = text;
    const x = on === 'monster' ? this.monX : this.heroX;
    const top = on === 'monster' ? this.groundY - this.monBase * 0.75 : this.groundY - this.hs * 1.05;
    s.style.left = `${x}px`; s.style.top = `${top}px`;
    this.pops.appendChild(s); setTimeout(() => s.remove(), 1100);
  }
}
