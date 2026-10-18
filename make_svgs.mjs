// Generates the animated SVGs for the GitHub profile README: a Discord-style profile card set in a
// cyberpunk city, a Daily Splits project card, and a neon divider.
// GitHub shows SVGs as images: no scripts and no outside requests, so fonts, icons and the avatar are
// embedded at build time, and every animation is SMIL, which plays everywhere.
// Run: node make_svgs.mjs
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(here, "assets"), { recursive: true });
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const USER = "vanshjaiswall";

// ---------- Palette ----------
const C = { bg: "#07060D", panel: "#100E1A", panel2: "#16131F", cyan: "#00F0FF", magenta: "#FF2BD6", yellow: "#FCEE0A", red: "#FF003C", green: "#39FF88", text: "#ECEAF4", dim: "#8D88A6", faint: "#4A4560" };

// ---------- Copy ----------
const ABOUT = "Building payments infra at Dodo Payments.";
const TYPING = ["shipping AI agents that talk to real APIs", "designing apps that feel native", "running further than planned", "probably debugging a webhook rn"];
const ROLES = [["TypeScript", C.cyan], ["Next.js", C.text], ["Payments", C.yellow], ["AI Agents", C.magenta], ["Design", C.red], ["Runner", C.green]];
const CARD = { label: "// SIDE PROJECT — LIVE", sub: "Habits and a running plan, built for iPhone.", cta: "OPEN THE APP", rows: ["Water", "Steps", "Run 5 km"] };

// ---------- Build-time fetches: fonts, icons, avatar ----------
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
async function fontFace(name, familyQuery, text) {
  const chars = [...new Set(text)].join("");
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${familyQuery}&text=${encodeURIComponent(chars)}&display=block`, { headers: { "User-Agent": UA } })).text();
  const url = (css.match(/url\((https:[^)]+)\)/) || [])[1];
  if (!url) throw new Error("No font file for " + familyQuery + "\n" + css);
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  return `@font-face{font-family:'${name}';src:url(data:font/woff2;base64,${buf.toString("base64")}) format('woff2');}`;
}
async function phosphor(name, weight = "regular") {
  const file = weight === "regular" ? name : `${name}-${weight}`;
  const svg = await (await fetch(`https://cdn.jsdelivr.net/npm/@phosphor-icons/core@2.1.1/assets/${weight}/${file}.svg`)).text();
  return svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
}
const ICON_NAMES = ["lightning", "credit-card", "sneaker-move", "code", "cpu", "terminal-window", "gift", "smiley", "plus-circle", "sticker"];
const ICONS = Object.fromEntries(await Promise.all(ICON_NAMES.map(async n => [n, await phosphor(n)])));
const icon = (name, x, y, size, color) => `<g transform="translate(${x} ${y}) scale(${(size / 256).toFixed(4)})" fill="${color}">${ICONS[name]}</g>`;
const avatarB64 = Buffer.from(await (await fetch(`https://github.com/${USER}.png?size=240`)).arrayBuffer()).toString("base64");

const monoText = TYPING.join("") + ROLES.map(r => r[0]).join("") + CARD.label + CARD.cta + USER
  + "> ABOUT ME ROLES PLAYING RUNNING ON A RUN SYS.ONLINE NIGHT_CITY://VANSH BUILD 26.10 0123456789:. elapsed km → — // ▮▯ DODO 24/7 PAY SUN 18 OCT LIVE @";
const displayText = "Vansh DAILY SPLITS Today 0123456789%";
const bodyText = ABOUT + "Visual Studio Code Editing checkout.ts Workspace: dodo-payments Daily Splits Long run · 10 km planned Message @" + USER + CARD.sub + CARD.rows.join("");
const FONTS = (await Promise.all([
  fontFace("Display", "Hanken+Grotesk:wght@800", displayText),
  fontFace("Text", "Geist:wght@400", bodyText),
  fontFace("TextM", "Geist:wght@600", bodyText),
  fontFace("Mono", "Geist+Mono:wght@400", monoText),
  fontFace("MonoB", "Geist+Mono:wght@600", monoText)
])).join("");
const F = { display: "'Display', sans-serif", text: "'Text', sans-serif", textM: "'TextM', sans-serif", mono: "'Mono', ui-monospace, Menlo, monospace", monoB: "'MonoB', ui-monospace, Menlo, monospace" };
const MW = 0.6; // Geist Mono advance

// ---------- Helpers ----------
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const glowFilter = (id, std, strength = 1) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${std}" result="b"/><feComponentTransfer in="b" result="b2"><feFuncA type="linear" slope="${strength}"/></feComponentTransfer><feMerge><feMergeNode in="b2"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
// a burst of jitter offsets that mostly rests at 0: used for glitches
const jitter = (amp, dur, seed, at = [0.86, 0.9]) => {
  const r = rng(seed), vals = ["0 0", "0 0"], kt = ["0", at[0].toFixed(3)];
  const steps = 6;
  for (let i = 1; i <= steps; i++) { vals.push(`${((r() * 2 - 1) * amp).toFixed(1)} ${((r() * 2 - 1) * amp * 0.3).toFixed(1)}`); kt.push((at[0] + (at[1] - at[0]) * i / (steps + 1)).toFixed(3)); }
  vals.push("0 0", "0 0"); kt.push(at[1].toFixed(3), "1");
  return `<animateTransform attributeName="transform" type="translate" values="${vals.join(";")}" keyTimes="${kt.join(";")}" calcMode="discrete" dur="${dur}s" repeatCount="indefinite"/>`;
};
const flicker = (seed, dur = 4) => { const r = rng(seed), v = [], k = []; for (let i = 0; i <= 12; i++) { k.push((i / 12).toFixed(3)); v.push(r() < 0.18 ? (0.15 + r() * 0.3).toFixed(2) : "1"); } v[12] = v[0]; return `<animate attributeName="opacity" values="${v.join(";")}" keyTimes="${k.join(";")}" calcMode="discrete" dur="${dur}s" repeatCount="indefinite"/>`; };
const showAt = (at, out, dur) => `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;${at.toFixed(3)};${Math.min(at + 0.025, out - 0.01).toFixed(3)};${out.toFixed(3)};${Math.min(out + 0.03, 0.999).toFixed(3)};1" dur="${dur}s" repeatCount="indefinite"/>`;
const scanlines = (W, H) => `<pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="2" fill="#000000" fill-opacity="0.28"/></pattern>`
  + `<linearGradient id="band" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0.06"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>`;
const scanOverlay = (W, H) => `<rect width="${W}" height="${H}" fill="url(#scan)" pointer-events="none"/>
    <rect x="0" y="-120" width="${W}" height="120" fill="url(#band)"><animateTransform attributeName="transform" type="translate" values="0 0;0 ${H + 120};0 ${H + 120}" keyTimes="0;0.75;1" dur="6s" repeatCount="indefinite"/></rect>`;
// Glitch text: white core with cyan and magenta channels that split and tear during bursts
function glitchText(id, str, x, y, attrs, dur, seed) {
  return `<g>
      <text x="${x}" y="${y}" ${attrs} fill="${C.cyan}" opacity="0.85" style="mix-blend-mode:screen">${str}${jitter(9, dur, seed)}</text>
      <text x="${x}" y="${y}" ${attrs} fill="${C.magenta}" opacity="0.85" style="mix-blend-mode:screen">${str}${jitter(9, dur, seed + 7)}</text>
      <text x="${x}" y="${y}" ${attrs} fill="${C.text}">${str}</text>
      <clipPath id="${id}s"><rect x="${x - 20}" y="${y - 30}" width="600" height="9"><animate attributeName="y" values="${y - 30};${y - 14};${y - 40};${y - 22}" keyTimes="0;0.33;0.66;1" calcMode="discrete" dur="${dur / 3}s" repeatCount="indefinite"/></rect></clipPath>
      <text x="${x}" y="${y}" ${attrs} fill="${C.yellow}" clip-path="url(#${id}s)" opacity="0">${str}
        <animate attributeName="opacity" values="0;0;1;0;1;0;0" keyTimes="0;0.86;0.87;0.88;0.89;0.9;1" calcMode="discrete" dur="${dur}s" repeatCount="indefinite"/>${jitter(22, dur, seed + 3)}</text>
    </g>`;
}

// ---------- Banner art: neon city ----------
function city(W, H) {
  const r = rng(7);
  const layer = (seed, minH, maxH, fill, winRate, idp) => {
    const rr = rng(seed); let x = -20, out = "", wins = "";
    while (x < W + 20) {
      const w = 34 + rr() * 64, h = minH + rr() * (maxH - minH), top = H - h;
      out += `<rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}"/>`;
      if (rr() < 0.35) out += `<rect x="${(x + w / 2 - 1).toFixed(1)}" y="${(top - 16).toFixed(1)}" width="2" height="16" fill="${fill}"/><circle cx="${(x + w / 2).toFixed(1)}" cy="${(top - 17).toFixed(1)}" r="2" fill="${C.red}">${flicker(seed + x | 0, 2 + rr() * 2)}</circle>`;
      for (let wy = top + 10; wy < H - 8; wy += 12) for (let wx = x + 6; wx < x + w - 8; wx += 9) {
        if (rr() > winRate) continue;
        const col = rr() < 0.6 ? C.cyan : rr() < 0.7 ? C.yellow : C.magenta;
        wins += `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="4" height="6" fill="${col}" fill-opacity="${(0.35 + rr() * 0.6).toFixed(2)}">${rr() < 0.12 ? flicker((wx * 7 + wy) | 0, 3 + rr() * 4) : ""}</rect>`;
      }
      x += w + rr() * 6;
    }
    return `<g id="${idp}">${out}${wins}</g>`;
  };
  // synthwave sun with sliding stripes
  const bars = Array.from({ length: 9 }, (_, i) => `<rect x="0" y="${(170 + i * 13 + i * i * 0.8).toFixed(1)}" width="${W}" height="${(2 + i * 0.9).toFixed(1)}" fill="#000000"/>`).join("");
  // rain
  let rain = "";
  for (let i = 0; i < 90; i++) { const x = r() * (W + 120), y = r() * H * 2 - H, l = 10 + r() * 16; rain += `<path d="M${x.toFixed(0)} ${y.toFixed(0)}l-4 ${l.toFixed(0)}" stroke="${r() < 0.2 ? C.cyan : "#9FB8FF"}" stroke-opacity="${(0.12 + r() * 0.25).toFixed(2)}" stroke-width="1"/>`; }
  const cars = [[70, 9, C.yellow, 1], [104, 13, C.magenta, -1], [132, 7, C.cyan, 1]].map(([y, d, col, dir], i) =>
    `<g filter="url(#glowS)"><rect x="${dir > 0 ? -60 : W + 20}" y="${y}" width="22" height="2" rx="1" fill="${col}"/><rect x="${dir > 0 ? -84 : W + 46}" y="${y}" width="20" height="2" rx="1" fill="${col}" fill-opacity="0.35"/>
      <animateTransform attributeName="transform" type="translate" values="0 0;${dir * (W + 140)} 0" dur="${d}s" begin="${i * 1.3}s" repeatCount="indefinite"/></g>`).join("");
  return `
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    <g opacity="0.9"><circle cx="820" cy="210" r="130" fill="url(#sun)" mask="url(#sunmask)"/></g>
    <mask id="sunmask"><rect width="${W}" height="${H}" fill="#FFFFFF"/><g>${bars}<animateTransform attributeName="transform" type="translate" values="0 0;0 13" dur="1.6s" repeatCount="indefinite"/></g></mask>
    <g id="city">
      ${layer(11, 90, 200, "#1C0E36", 0.08, "far")}
      ${layer(23, 50, 150, "#0B0716", 0.18, "near")}
      <g filter="url(#glowM)">
        <rect x="262" y="128" width="30" height="104" rx="3" fill="none" stroke="${C.magenta}" stroke-width="2">${flicker(41, 5)}</rect>
        ${"DODO".split("").map((ch, i) => `<text x="277" y="${152 + i * 22}" text-anchor="middle" font-family="${F.monoB}" font-size="20" fill="${C.magenta}">${ch}${flicker(41, 5)}</text>`).join("")}
        <rect x="986" y="150" width="112" height="34" rx="4" fill="none" stroke="${C.cyan}" stroke-width="2"/>
        <text x="1042" y="173" text-anchor="middle" font-family="${F.monoB}" font-size="17" letter-spacing="2" fill="${C.cyan}">24/7 PAY${flicker(77, 3.4)}</text>
      </g>
    </g>
    ${cars}
    <g>${rain}<animateTransform attributeName="transform" type="translate" values="0 0;-40 ${H}" dur="0.9s" repeatCount="indefinite"/></g>
    <use href="#city" opacity="0" filter="url(#toCyan)"><animate attributeName="opacity" values="0;0;0.7;0;0.6;0;0" keyTimes="0;0.86;0.87;0.88;0.89;0.9;1" calcMode="discrete" dur="5s" repeatCount="indefinite"/>${jitter(12, 5, 91)}</use>
    <use href="#city" opacity="0" filter="url(#toMagenta)"><animate attributeName="opacity" values="0;0;0.7;0;0.6;0;0" keyTimes="0;0.86;0.87;0.88;0.89;0.9;1" calcMode="discrete" dur="5s" repeatCount="indefinite"/>${jitter(12, 5, 93)}</use>
    <rect y="${H - 70}" width="${W}" height="70" fill="url(#floorfade)"/>
    <text x="28" y="34" font-family="${F.mono}" font-size="14" letter-spacing="2" fill="${C.cyan}" fill-opacity="0.85">NIGHT_CITY://VANSH</text>
    <text x="${W - 28}" y="34" text-anchor="end" font-family="${F.mono}" font-size="14" letter-spacing="2" fill="${C.yellow}">SYS.ONLINE <tspan>▮▮▮<animate attributeName="fill-opacity" values="1;0.2;1" dur="1.2s" repeatCount="indefinite"/></tspan>▯</text>`;
}

// ---------- Discord-style profile card ----------
function profileCard() {
  const W = 1200, H = 876, BH = 268;
  const AX = 150, AY = 268, AR = 84;
  // badges
  const badges = [["lightning", C.yellow], ["credit-card", C.cyan], ["code", C.magenta], ["cpu", C.green], ["sneaker-move", C.red]];
  const bx0 = W - 40 - badges.length * 52 - 12;
  const badgeSvg = `<rect x="${bx0}" y="282" width="${badges.length * 52 + 12}" height="60" rx="12" fill="${C.panel}" stroke="${C.cyan}" stroke-opacity="0.15"/>`
    + badges.map(([n, col], i) => { const cx = bx0 + 32 + i * 52, cy = 312;
      const hex = Array.from({ length: 6 }, (_, k) => { const a = Math.PI / 3 * k - Math.PI / 2; return `${(cx + 19 * Math.cos(a)).toFixed(1)},${(cy + 19 * Math.sin(a)).toFixed(1)}`; }).join(" ");
      return `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="${2.4 + i * 0.3}s" repeatCount="indefinite"/>
        <polygon points="${hex}" fill="${col}" fill-opacity="0.08" stroke="${col}" stroke-width="1.6" filter="url(#glowS)"/>${icon(n, cx - 11, cy - 11, 22, col)}</g>`; }).join("");

  // typing line
  const FS = 19, CW = FS * MW, TX = 64, TY = 592, SLOT = 4, CYCLE = SLOT * TYPING.length;
  const typing = TYPING.map((text, i) => {
    const n = text.length, hold = SLOT / CYCLE - 0.004, kt = [], wv = [], xv = [];
    for (let k = 0; k <= n; k++) { kt.push((0.11 * k / n).toFixed(4)); wv.push((k * CW).toFixed(1)); xv.push((TX + 2 * CW + k * CW).toFixed(1)); }
    const sync = `dur="${CYCLE}s" begin="${i * SLOT}s" repeatCount="indefinite"`;
    return `<g opacity="0"><animate attributeName="opacity" values="1;0;0" keyTimes="0;${hold.toFixed(4)};1" calcMode="discrete" ${sync}/>
      <clipPath id="tc${i}"><rect x="${TX + 2 * CW}" y="${TY - FS}" height="${FS * 1.6}" width="0"><animate attributeName="width" values="${wv.join(";")}" keyTimes="${kt.join(";")}" calcMode="discrete" ${sync}/></rect></clipPath>
      <text x="${TX + 2 * CW}" y="${TY}" clip-path="url(#tc${i})" font-family="${F.mono}" font-size="${FS}" fill="${C.cyan}">${esc(text)}</text>
      <rect y="${TY - FS + 2}" width="${(CW * 0.6).toFixed(1)}" height="${FS + 5}" fill="${C.cyan}" x="${TX + 2 * CW}"><animate attributeName="x" values="${xv.join(";")}" keyTimes="${kt.join(";")}" calcMode="discrete" ${sync}/>
        <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.5;0.51;1" dur="1s" repeatCount="indefinite"/></rect></g>`;
  }).join("\n");

  // role chips (two rows)
  let rx = 64, ry = 652;
  const roles = ROLES.map(([name, col]) => {
    const w = name.length * 15 * MW + 46; if (rx + w > 580) { rx = 64; ry += 44; }
    const x = rx; rx += w + 10;
    return `<g><rect x="${x}" y="${ry}" width="${w.toFixed(1)}" height="34" rx="8" fill="${C.panel2}" stroke="${col}" stroke-opacity="0.35"/>
      <circle cx="${x + 18}" cy="${ry + 17}" r="6" fill="${col}" filter="url(#glowS)"/>
      <text x="${x + 32}" y="${ry + 22}" font-family="${F.mono}" font-size="15" fill="${C.text}">${name}</text></g>`;
  }).join("");

  // live elapsed timer: 01:24:SS
  const digits = (cycle, step, begin, x, y) => Array.from({ length: cycle / step }, (_, d) =>
    `<text x="${x}" y="${y}" font-family="${F.mono}" font-size="17" fill="${C.green}" opacity="0">${d}<animate attributeName="opacity" values="0;1;0" keyTimes="0;${(d * step / cycle).toFixed(4)};${((d + 1) * step / cycle).toFixed(4)}" calcMode="discrete" dur="${cycle}s" begin="${begin}s" repeatCount="indefinite"/></text>`).join("");
  const timerX = 722 + 6 * 17 * MW, timerY = 614;
  const timer = `<text x="722" y="${timerY}" font-family="${F.mono}" font-size="17" fill="${C.green}">01:24:</text>${digits(60, 10, -37, timerX, timerY)}${digits(10, 1, -7, timerX + 17 * MW, timerY)}
    <text x="${timerX + 2 * 17 * MW + 8}" y="${timerY}" font-family="${F.mono}" font-size="17" fill="${C.dim}">elapsed</text>`;

  const activity = (y, iconName, col, title, sub) => `
    <rect x="612" y="${y}" width="524" height="${iconName === "terminal-window" ? 102 : 92}" rx="12" fill="${C.panel2}" stroke="${col}" stroke-opacity="0.18"/>
    <rect x="628" y="${y + 14}" width="76" height="${iconName === "terminal-window" ? 74 : 64}" rx="12" fill="${col}" fill-opacity="0.08" stroke="${col}" stroke-opacity="0.5" filter="url(#glowS)"/>
    ${icon(iconName, 646, y + (iconName === "terminal-window" ? 31 : 26), 40, col)}
    <text x="722" y="${y + 38}" font-family="${F.textM}" font-size="20" fill="${C.text}">${title}</text>
    <text x="722" y="${y + 62}" font-family="${F.text}" font-size="17" fill="${C.dim}">${sub}</text>`;

  const runY = 664, barX = 722, barW = 390;
  const run = `${activity(runY, "sneaker-move", C.magenta, "Daily Splits", "Long run · 10 km planned")}
    <rect x="${barX}" y="${runY + 74}" width="${barW}" height="4" rx="2" fill="#FFFFFF" fill-opacity="0.1"/>
    <rect x="${barX}" y="${runY + 74}" width="0" height="4" rx="2" fill="url(#neonbar)"><animate attributeName="width" values="0;${barW};${barW}" keyTimes="0;0.85;1" dur="9s" repeatCount="indefinite"/></rect>
    <circle cx="${barX}" cy="${runY + 76}" r="5" fill="#FFFFFF" filter="url(#glowM)"><animate attributeName="cx" values="${barX};${barX + barW};${barX + barW}" keyTimes="0;0.85;1" dur="9s" repeatCount="indefinite"/></circle>`;

  // avatar duotone + glitch
  const av = `<g>
      <circle cx="${AX}" cy="${AY}" r="${AR + 10}" fill="${C.bg}"/>
      <g><animateTransform attributeName="transform" type="rotate" from="0 ${AX} ${AY}" to="360 ${AX} ${AY}" dur="14s" repeatCount="indefinite"/>
        <circle cx="${AX}" cy="${AY}" r="${AR + 6}" fill="none" stroke="url(#ring)" stroke-width="3" stroke-dasharray="40 14 8 14" filter="url(#glowS)"/></g>
      <clipPath id="avclip"><circle cx="${AX}" cy="${AY}" r="${AR}"/></clipPath>
      <g clip-path="url(#avclip)">
        <image href="data:image/png;base64,${avatarB64}" x="${AX - AR}" y="${AY - AR}" width="${AR * 2}" height="${AR * 2}" filter="url(#duo)"/>
        <image href="data:image/png;base64,${avatarB64}" x="${AX - AR}" y="${AY - AR}" width="${AR * 2}" height="${AR * 2}" filter="url(#toCyan)" opacity="0" style="mix-blend-mode:screen">
          <animate attributeName="opacity" values="0;0;0.8;0;0.7;0;0" keyTimes="0;0.6;0.61;0.62;0.63;0.64;1" calcMode="discrete" dur="5s" repeatCount="indefinite"/>${jitter(10, 5, 55, [0.6, 0.64])}</image>
        <rect x="${AX - AR}" y="${AY - AR}" width="${AR * 2}" height="${AR * 2}" fill="url(#scan)"/>
      </g>
      <circle cx="${AX + 60}" cy="${AY + 60}" r="21" fill="${C.bg}"/>
      <circle cx="${AX + 60}" cy="${AY + 60}" r="14" fill="${C.green}" filter="url(#glowM)"/>
      <circle cx="${AX + 60}" cy="${AY + 60}" r="14" fill="none" stroke="${C.green}" stroke-width="2"><animate attributeName="r" values="14;26" dur="1.8s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.8;0" dur="1.8s" repeatCount="indefinite"/></circle>
    </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Profile card for Vansh (vanshjaiswall): building payments infrastructure at Dodo Payments. Roles: TypeScript, Next.js, Payments, AI agents, design, runner. Currently editing checkout.ts in VS Code and running with Daily Splits.">
  <defs>
    <style>${FONTS}</style>
    <clipPath id="card"><rect width="${W}" height="${H}" rx="22"/></clipPath>
    <clipPath id="bannerclip"><rect width="${W}" height="${BH}"/></clipPath>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B0420"/><stop offset="0.55" stop-color="#2A0A47"/><stop offset="0.85" stop-color="#6B0F5E"/><stop offset="1" stop-color="#FF2BD6" stop-opacity="0.6"/></linearGradient>
    <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.yellow}"/><stop offset="0.55" stop-color="#FF7A3D"/><stop offset="1" stop-color="${C.magenta}"/></linearGradient>
    <linearGradient id="floorfade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.bg}" stop-opacity="0"/><stop offset="1" stop-color="${C.bg}"/></linearGradient>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.cyan}"/><stop offset="0.5" stop-color="${C.magenta}"/><stop offset="1" stop-color="${C.yellow}"/></linearGradient>
    <linearGradient id="neonbar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.magenta}"/><stop offset="1" stop-color="${C.cyan}"/></linearGradient>
    <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.cyan}"/><stop offset="0.5" stop-color="${C.magenta}"/><stop offset="1" stop-color="${C.yellow}"/>
      <animateTransform attributeName="gradientTransform" type="translate" values="0 0;1 0;0 0" dur="6s" repeatCount="indefinite"/></linearGradient>
    ${glowFilter("glowS", 3, 1.2)}${glowFilter("glowM", 6, 1.4)}
    <filter id="toCyan"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0.94  0 0 0 0 1  0 0 0 1 0"/></filter>
    <filter id="toMagenta"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 0.17  0 0 0 0 0.84  0 0 0 1 0"/></filter>
    <filter id="duo"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="table" tableValues="0.10 0.75 0.0 0.9"/><feFuncG type="table" tableValues="0.02 0.12 0.85 1"/><feFuncB type="table" tableValues="0.22 0.70 1 1"/></feComponentTransfer></filter>
    ${scanlines(W, H)}
  </defs>
  <g clip-path="url(#card)">
    <rect width="${W}" height="${H}" fill="${C.bg}"/>
    <g clip-path="url(#bannerclip)">${city(W, BH)}</g>
    <path d="M0 ${BH}H${W}" stroke="url(#edge)" stroke-width="2" filter="url(#glowS)"/>

    ${av}
    ${badgeSvg}

    <rect x="32" y="364" width="${W - 64}" height="408" rx="16" fill="${C.panel}" stroke="${C.cyan}" stroke-opacity="0.14"/>
    <path d="M32 380V364H48M${W - 48} 364H${W - 32}V380M32 756V772H48M${W - 48} 772H${W - 32}V756" fill="none" stroke="${C.cyan}" stroke-width="2" filter="url(#glowS)"/>
    ${glitchText("nm", "Vansh", 62, 432, `font-family="${F.display}" font-size="60" letter-spacing="-2.5"`, 4.2, 21)}
    <text x="236" y="432" font-family="${F.mono}" font-size="20" fill="${C.dim}">@${USER}</text>
    <path d="M64 470H${W - 64}" stroke="#FFFFFF" stroke-opacity="0.07"/>

    <text x="64" y="512" font-family="${F.monoB}" font-size="14" letter-spacing="2.5" fill="${C.dim}">ABOUT ME</text>
    <text x="64" y="552" font-family="${F.text}" font-size="21" fill="${C.text}">${ABOUT}</text>
    <text x="64" y="${TY}" font-family="${F.monoB}" font-size="${FS}" fill="${C.magenta}">&gt;</text>
${typing}
    <text x="64" y="638" font-family="${F.monoB}" font-size="14" letter-spacing="2.5" fill="${C.dim}">ROLES</text>
    ${roles}

    <text x="612" y="512" font-family="${F.monoB}" font-size="14" letter-spacing="2.5" fill="${C.dim}">PLAYING</text>
    ${activity(526, "terminal-window", C.cyan, "Visual Studio Code", "Editing checkout.ts · dodo-payments")}
    ${timer}
    <text x="612" y="652" font-family="${F.monoB}" font-size="14" letter-spacing="2.5" fill="${C.dim}">ON A RUN</text>
    ${run}

    <rect x="32" y="790" width="${W - 64}" height="58" rx="12" fill="${C.panel}" stroke="${C.magenta}" stroke-opacity="0.22"/>
    ${icon("plus-circle", 50, 805, 28, C.dim)}
    <text x="94" y="826" font-family="${F.text}" font-size="19" fill="${C.dim}">Message @${USER}</text>
    <rect x="${94 + 0.53 * 19 * ("Message @" + USER).length + 6}" y="808" width="2" height="24" fill="${C.cyan}"><animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.5;0.51;1" dur="1.1s" repeatCount="indefinite"/></rect>
    ${icon("gift", W - 160, 805, 28, C.dim)}${icon("sticker", W - 118, 805, 28, C.dim)}${icon("smiley", W - 76, 805, 28, C.yellow)}

    ${scanOverlay(W, H)}
    <rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="21.25" fill="none" stroke="url(#edge)" stroke-width="1.5" stroke-opacity="0.7"/>
  </g>
</svg>`;
}

// ---------- Daily Splits card: neon floor grid + mini phone ----------
function splitsCard() {
  const W = 1200, H = 340, DUR = 7, PX = 840, PY = 34, PW = 220, PH = 400;
  const done = [0.2, 0.4, 0.6], END = 0.92, cols = [C.cyan, C.yellow, C.magenta];
  const rows = CARD.rows.map((name, i) => {
    const y = PY + 168 + i * 44, t = done[i], x = PX + 28;
    return `<circle cx="${x + 11}" cy="${y}" r="11" fill="none" stroke="${cols[i]}" stroke-opacity="0.45"/>
      <g opacity="0">${showAt(t, END, DUR)}<circle cx="${x + 11}" cy="${y}" r="12" fill="${cols[i]}" filter="url(#glowS)"/><path d="M${x + 5.5} ${y} l3.8 3.8 l7 -7.4" fill="none" stroke="${C.bg}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g>
      <text x="${x + 32}" y="${y - 2}" font-family="${F.text}" font-size="13" fill="${C.text}">${name}</text>
      <rect x="${x + 32}" y="${y + 6}" width="124" height="3" rx="1.5" fill="#FFFFFF" fill-opacity="0.1"/>
      <rect x="${x + 32}" y="${y + 6}" width="0" height="3" rx="1.5" fill="${cols[i]}"><animate attributeName="width" values="0;0;124;124;0" keyTimes="0;${(t - 0.12).toFixed(2)};${t};${END};1" dur="${DUR}s" repeatCount="indefinite"/></rect>`;
  }).join("\n");
  const pcts = ["0%", "33%", "67%", "100%"], bounds = [0, ...done, END];
  const pct = pcts.map((p, i) => `<text x="${PX + 26}" y="${PY + 130}" font-family="${F.display}" font-size="46" letter-spacing="-2" fill="${i === 3 ? C.cyan : C.text}" opacity="0">${p}
      <animate attributeName="opacity" values="0;1;0;0" keyTimes="0;${bounds[i].toFixed(2)};${bounds[i + 1].toFixed(2)};1" calcMode="discrete" dur="${DUR}s" repeatCount="indefinite"/></text>`).join("\n");
  // perspective grid floor
  const HZ = 200, VX = 600;
  let floor = "";
  for (let i = -14; i <= 14; i++) floor += `<path d="M${VX} ${HZ}L${VX + i * 130} ${H + 40}" stroke="${C.magenta}" stroke-opacity="0.35"/>`;
  const hl = Array.from({ length: 8 }, (_, i) => `<path d="M0 ${HZ}H${W}" stroke="${C.cyan}" stroke-opacity="0.4"><animateTransform attributeName="transform" type="translate" values="0 0;0 ${H - HZ}" keyTimes="0;1" keySplines="0.6 0 1 1" calcMode="spline" dur="4s" begin="${-i * 0.5}s" repeatCount="indefinite"/><animate attributeName="stroke-opacity" values="0;0.6;0.2" dur="4s" begin="${-i * 0.5}s" repeatCount="indefinite"/></path>`).join("");
  const ctaW = (CARD.cta.length + 2) * (16 * MW + 2) + 48; // letter-spacing 2 per glyph
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Daily Splits: habits and a running plan, built for iPhone. Open the live app.">
  <defs>
    <style>${FONTS}</style>
    <clipPath id="card"><rect width="${W}" height="${H}" rx="22"/></clipPath>
    <clipPath id="floorclip"><rect y="${HZ}" width="${W}" height="${H - HZ}"/></clipPath>
    <clipPath id="screen"><rect x="${PX + 9}" y="${PY + 9}" width="${PW - 18}" height="${PH - 18}" rx="28"/></clipPath>
    <linearGradient id="skyb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.bg}"/><stop offset="1" stop-color="#2A0A47"/></linearGradient>
    <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.cyan}"/><stop offset="0.5" stop-color="${C.magenta}"/><stop offset="1" stop-color="${C.yellow}"/>
      <animateTransform attributeName="gradientTransform" type="translate" values="0 0;1 0;0 0" dur="6s" repeatCount="indefinite"/></linearGradient>
    ${glowFilter("glowS", 3, 1.2)}${glowFilter("glowM", 7, 1.4)}
    ${scanlines(W, H)}
  </defs>
  <g clip-path="url(#card)">
    <rect width="${W}" height="${H}" fill="url(#skyb)"/>
    <g clip-path="url(#floorclip)"><rect y="${HZ}" width="${W}" height="${H - HZ}" fill="${C.bg}"/>${floor}${hl}</g>
    <path d="M0 ${HZ}H${W}" stroke="${C.magenta}" stroke-width="2" filter="url(#glowM)"/>

    <text x="56" y="84" font-family="${F.monoB}" font-size="15" letter-spacing="2.5" fill="${C.yellow}">${CARD.label}</text>
    ${glitchText("ds", "DAILY SPLITS", 52, 160, `font-family="${F.display}" font-size="72" letter-spacing="-2"`, 5, 33)}
    <text x="56" y="200" font-family="${F.text}" font-size="21" fill="${C.text}" fill-opacity="0.85">${CARD.sub}</text>
    <g><rect x="56" y="234" width="${ctaW.toFixed(0)}" height="50" rx="6" fill="${C.bg}" stroke="${C.cyan}" stroke-width="2" filter="url(#glowS)"><animate attributeName="stroke-opacity" values="1;0.45;1" dur="1.8s" repeatCount="indefinite"/></rect>
      <text x="78" y="265" font-family="${F.monoB}" font-size="16" letter-spacing="2" fill="${C.cyan}">${CARD.cta} <tspan>→<animate attributeName="dx" values="0;6;0" dur="1.4s" repeatCount="indefinite"/></tspan></text></g>

    <g><animateTransform attributeName="transform" type="translate" values="0 0;0 -8;0 0" dur="5s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" keyTimes="0;0.5;1"/>
      <rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="36" fill="#000000" stroke="${C.cyan}" stroke-width="2" filter="url(#glowM)"/>
      <g clip-path="url(#screen)">
        <rect x="${PX + 9}" y="${PY + 9}" width="${PW - 18}" height="${PH - 18}" fill="#05040A"/>
        <rect x="${PX + PW / 2 - 32}" y="${PY + 18}" width="64" height="18" rx="9" fill="#000000"/>
        <text x="${PX + 28}" y="${PY + 64}" font-family="${F.mono}" font-size="10" letter-spacing="1.4" fill="${C.dim}">SUN 18 OCT</text>
        <text x="${PX + 26}" y="${PY + 88}" font-family="${F.display}" font-size="22" letter-spacing="-0.6" fill="${C.text}">Today</text>
${pct}
${rows}
        <rect x="${PX + 9}" y="${PY + 9}" width="${PW - 18}" height="${PH - 18}" fill="url(#scan)"/>
      </g>
    </g>
    ${scanOverlay(W, H)}
    <rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="21.25" fill="none" stroke="url(#edge)" stroke-width="1.5" stroke-opacity="0.7"/>
  </g>
</svg>`;
}

// ---------- Divider: neon pulse with glitch ticks ----------
function divider() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="28" viewBox="0 0 1200 28" aria-hidden="true">
  <defs><linearGradient id="d" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.cyan}" stop-opacity="0"/><stop offset="0.5" stop-color="${C.magenta}"/><stop offset="1" stop-color="${C.yellow}" stop-opacity="0"/></linearGradient>
    ${glowFilter("g", 3, 1.4)}</defs>
  <rect x="0" y="13.5" width="1200" height="1" fill="${C.cyan}" fill-opacity="0.25"/>
  <rect x="-300" y="12.5" width="300" height="3" fill="url(#d)" filter="url(#g)"><animateTransform attributeName="transform" type="translate" values="0 0;1500 0" dur="3s" repeatCount="indefinite"/></rect>
  ${[80, 410, 790, 1120].map((x, i) => `<rect x="${x}" y="8" width="${14 + i * 6}" height="12" fill="${[C.cyan, C.magenta, C.yellow, C.cyan][i]}" opacity="0"><animate attributeName="opacity" values="0;0;0.9;0;0" keyTimes="0;${(0.2 + i * 0.18).toFixed(2)};${(0.21 + i * 0.18).toFixed(2)};${(0.23 + i * 0.18).toFixed(2)};1" calcMode="discrete" dur="3.5s" repeatCount="indefinite"/></rect>`).join("")}
  <path d="M0 6v16M1199 6v16" stroke="${C.magenta}" stroke-width="2"/>
</svg>`;
}

rmSync(join(here, "assets", "banner.svg"), { force: true });
writeFileSync(join(here, "assets", "profile-card.svg"), profileCard());
writeFileSync(join(here, "assets", "daily-splits.svg"), splitsCard());
writeFileSync(join(here, "assets", "divider.svg"), divider());
console.log("SVGs written to", join(here, "assets"));
