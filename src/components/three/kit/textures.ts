import * as THREE from "three";

/**
 * Procedural canvas textures (no image downloads): brushed-metal grain,
 * the website/app screens, and a circuit board. Created on the client only.
 */

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext("2d")! };
}

function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Fine directional streaks used as a roughness map for brushed aluminium and steel. */
export function brushedRoughness(base = 150, contrast = 46) {
  const { c, ctx } = canvas(512, 512);
  const rand = seeded(11);
  ctx.fillStyle = `rgb(${base},${base},${base})`;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    const y = rand() * 512;
    const v = base + (rand() - 0.5) * contrast;
    ctx.strokeStyle = `rgba(${v},${v},${v},${0.25 + rand() * 0.35})`;
    ctx.lineWidth = 0.6 + rand() * 1.2;
    const x = rand() * 512;
    ctx.beginPath();
    ctx.moveTo(x - 200, y);
    ctx.lineTo(x + 200 + rand() * 300, y + (rand() - 0.5) * 1.5);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

const ink = "#1b1c1e";
const paper = "#ecebe6";
const forest = "#1d5c45";
const emerald = "#52b78b";

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** A believable landing page for the laptop screen. Taller than the screen so it can scroll. */
export function websiteScreen() {
  const W = 1024;
  const H = 1400;
  const { c, ctx } = canvas(W, H);
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);
  // nav
  ctx.fillStyle = ink;
  ctx.fillRect(0, 0, W, 64);
  ctx.fillStyle = paper;
  ctx.font = "800 26px sans-serif";
  ctx.fillText("StudyCircle", 36, 42);
  ctx.font = "500 17px sans-serif";
  ["Features", "Pricing", "Schools"].forEach((t, i) => ctx.fillText(t, 560 + i * 110, 40));
  ctx.fillStyle = emerald;
  rr(ctx, 890, 16, 104, 34, 6);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.fillText("Sign up", 910, 39);
  // hero
  ctx.fillStyle = ink;
  ctx.font = "800 64px sans-serif";
  ctx.fillText("Find your", 36, 170);
  ctx.fillText("study group.", 36, 240);
  ctx.fillStyle = "#595c61";
  ctx.font = "400 22px sans-serif";
  ctx.fillText("Match with classmates by course and schedule.", 36, 290);
  ctx.fillStyle = forest;
  rr(ctx, 36, 320, 200, 54, 8);
  ctx.fill();
  ctx.fillStyle = paper;
  ctx.font = "700 20px sans-serif";
  ctx.fillText("Get started", 78, 354);
  // hero visual
  ctx.fillStyle = "#d8d6cf";
  rr(ctx, 600, 110, 388, 270, 14);
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i === 1 ? emerald : "#b9bcc0";
    rr(ctx, 630, 140 + i * 58, 330, 40, 8);
    ctx.fill();
  }
  // cards
  for (let r = 0; r < 3; r++)
    for (let i = 0; i < 3; i++) {
      const x = 36 + i * 324;
      const y = 440 + r * 300;
      ctx.fillStyle = "#e2e0da";
      rr(ctx, x, y, 300, 270, 12);
      ctx.fill();
      ctx.fillStyle = (i + r) % 3 === 0 ? forest : "#9da1a6";
      rr(ctx, x + 20, y + 20, 260, 140, 8);
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.font = "700 22px sans-serif";
      ctx.fillText(["Biology", "Algebra II", "Spanish 3", "Chemistry", "History", "Physics", "Art", "English", "CS"][r * 3 + i], x + 20, y + 200);
      ctx.fillStyle = "#595c61";
      ctx.font = "400 16px sans-serif";
      ctx.fillText(`${3 + ((r + i) % 5)} groups meeting this week`, x + 20, y + 232);
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** A phone app screen (list + bottom bar). */
export function appScreen() {
  const W = 512;
  const H = 1040;
  const { c, ctx } = canvas(W, H);
  ctx.fillStyle = "#16171a";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = paper;
  ctx.font = "600 22px sans-serif";
  ctx.fillText("9:41", 40, 52);
  ctx.font = "800 46px sans-serif";
  ctx.fillText("Today", 36, 140);
  ctx.fillStyle = emerald;
  rr(ctx, 36, 170, 440, 170, 20);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.font = "700 28px sans-serif";
  ctx.fillText("Bio study group", 60, 230);
  ctx.font = "500 22px sans-serif";
  ctx.fillText("Library, 3:15 PM", 60, 268);
  ctx.fillText("4 going", 60, 304);
  for (let i = 0; i < 5; i++) {
    const y = 370 + i * 112;
    ctx.fillStyle = "#26282c";
    rr(ctx, 36, y, 440, 96, 16);
    ctx.fill();
    ctx.fillStyle = i % 2 ? "#9da1a6" : forest;
    ctx.beginPath();
    ctx.arc(84, y + 48, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = paper;
    ctx.font = "600 24px sans-serif";
    ctx.fillText(["Algebra review", "Spanish chat", "Chem lab prep", "Essay swap", "Physics quiz"][i], 128, y + 44);
    ctx.fillStyle = "#9da1a6";
    ctx.font = "400 19px sans-serif";
    ctx.fillText("Tomorrow", 128, y + 74);
  }
  ctx.fillStyle = "#26282c";
  ctx.fillRect(0, H - 110, W, 110);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i === 0 ? emerald : "#5c5f64";
    rr(ctx, 70 + i * 110, H - 78, 40, 40, 10);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Green solder mask with copper/silver traces, pads and silkscreen. */
export function circuitBoard() {
  const W = 1024;
  const H = 680;
  const { c, ctx } = canvas(W, H);
  const rand = seeded(5);
  ctx.fillStyle = "#1f4f3c";
  ctx.fillRect(0, 0, W, H);
  // subtle mask texture
  for (let i = 0; i < 1800; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rand() * 0.035})`;
    ctx.fillRect(rand() * W, rand() * H, 2, 2);
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // traces: orthogonal + 45° routing
  for (let i = 0; i < 70; i++) {
    let x = rand() * W;
    let y = rand() * H;
    ctx.strokeStyle = rand() > 0.3 ? "rgba(196,200,190,0.75)" : "rgba(214,170,90,0.7)";
    ctx.lineWidth = rand() > 0.7 ? 5 : 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      const len = 30 + rand() * 140;
      const dir = Math.floor(rand() * 8) * (Math.PI / 4);
      x += Math.cos(dir) * len;
      y += Math.sin(dir) * len;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(210,212,205,0.9)";
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // mounting holes
  for (const [x, y] of [
    [40, 40],
    [W - 40, 40],
    [40, H - 40],
    [W - 40, H - 40],
  ]) {
    ctx.fillStyle = "#c9ccd0";
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#101112";
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fill();
  }
  // silkscreen
  ctx.fillStyle = "rgba(236,235,230,0.85)";
  ctx.font = "700 30px monospace";
  ctx.fillText("EIC-01", 80, H - 70);
  ctx.font = "500 18px monospace";
  ctx.fillText("R1  C3  U2  LED", W - 260, H - 70);
  ctx.strokeStyle = "rgba(236,235,230,0.7)";
  ctx.lineWidth = 2;
  ctx.strokeRect(W / 2 - 170, H / 2 - 170, 340, 340);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Laser-etched text on a dark chip package. */
export function chipLabel(text: string) {
  const { c, ctx } = canvas(256, 256);
  ctx.fillStyle = "#151617";
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = "rgba(220,222,224,0.55)";
  ctx.font = "700 44px sans-serif";
  ctx.fillText(text, 40, 120);
  ctx.font = "500 22px monospace";
  ctx.fillText("2026 ARM", 40, 160);
  ctx.beginPath();
  ctx.arc(36, 36, 10, 0, Math.PI * 2);
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
