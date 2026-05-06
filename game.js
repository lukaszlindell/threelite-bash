const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const startButton = document.getElementById("startButton");

const W = canvas.width;
const H = canvas.height;
const FLOOR = 454;
const GRAVITY = 0.78;
const keys = new Set();

const bosses = [
  {
    name: "Janne",
    tag: "metal guitarist",
    sky: ["#87d3df", "#f5c06b"],
    ground: "#527a43",
    arena: "#78523d",
    hp: 3,
    color: "#a8b0b8",
    attack: "sound",
    intro: "Janne cranks up a guitar that fires sound rays.",
  },
  {
    name: "Lukasz",
    tag: "pompadour striker",
    sky: ["#9bc7ff", "#f4d98b"],
    ground: "#416d67",
    arena: "#6e4964",
    hp: 3,
    color: "#d59c67",
    attack: "hair",
    intro: "Lukasz whips his tall pompadour across the stage.",
  },
  {
    name: "Emil",
    tag: "camera rig diver",
    sky: ["#7fd1c7", "#dbf0a9"],
    ground: "#465d7c",
    arena: "#416b87",
    hp: 3,
    color: "#edc18d",
    attack: "arms",
    intro: "Emil's scuba camera arms snap outward from every angle.",
  },
  {
    name: "The Threelite",
    tag: "merged boss",
    sky: ["#7f73a8", "#e17864"],
    ground: "#393c58",
    arena: "#533745",
    hp: 5,
    color: "#caa0a0",
    attack: "all",
    intro: "The final abomination combines riffs, hair, and camera arms.",
  },
];

const state = {
  mode: "title",
  level: 0,
  cameraX: 0,
  shake: 0,
  message: "",
  messageTimer: 0,
  paused: false,
  won: false,
};

const norm = {
  x: 90,
  y: FLOOR - 64,
  w: 34,
  h: 64,
  vx: 0,
  vy: 0,
  dir: 1,
  onGround: false,
  invuln: 0,
  lives: 5,
  jumps: 0,
};

let boss;
let hazards = [];
let particles = [];

function makeBoss() {
  const data = bosses[state.level];
  return {
    ...data,
    x: 710,
    y: FLOOR - 96,
    w: data.name === "The Threelite" ? 86 : 70,
    h: data.name === "The Threelite" ? 116 : 96,
    maxHp: data.hp,
    hp: data.hp,
    vx: -1.2,
    dir: -1,
    attackClock: 90,
    hurt: 0,
    defeated: false,
  };
}

function resetLevel() {
  norm.x = 90;
  norm.y = FLOOR - norm.h;
  norm.vx = 0;
  norm.vy = 0;
  norm.dir = 1;
  norm.invuln = 80;
  norm.jumps = 0;
  boss = makeBoss();
  hazards = [];
  particles = [];
  state.cameraX = 0;
  state.shake = 0;
  say(boss.intro, 180);
}

function restartGame() {
  state.level = 0;
  state.mode = "play";
  state.paused = false;
  state.won = false;
  norm.lives = 5;
  resetLevel();
  overlay.classList.add("hidden");
}

function say(text, frames = 120) {
  state.message = text;
  state.messageTimer = frames;
}

function rectsHit(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function addParticles(x, y, color, count = 16) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * -5 - 1,
      life: 28 + Math.random() * 20,
      color,
    });
  }
}

function spawnHazard(type) {
  if (type === "sound") {
    hazards.push({ type, x: boss.x - 26, y: boss.y + 39, w: 46, h: 16, vx: -5.6, life: 160, color: "#f7df64" });
    hazards.push({ type, x: boss.x - 14, y: boss.y + 58, w: 38, h: 12, vx: -4.4, life: 150, color: "#ff8e5f" });
  }
  if (type === "hair") {
    hazards.push({ type, x: boss.x - 86, y: boss.y + 7, w: 96, h: 34, vx: -2.4, life: 62, color: "#2d2029" });
  }
  if (type === "arms") {
    hazards.push({ type, x: boss.x - 96, y: boss.y + 20, w: 112, h: 12, vx: -3.8, life: 70, color: "#d7e4ed" });
    hazards.push({ type, x: boss.x - 72, y: boss.y + 64, w: 92, h: 12, vx: -4.6, life: 78, color: "#d7e4ed" });
  }
}

function hurtNorm() {
  if (norm.invuln > 0 || state.mode !== "play") return;
  norm.lives -= 1;
  norm.invuln = 120;
  norm.vx = -7 * norm.dir;
  norm.vy = -9;
  state.shake = 16;
  say(norm.lives > 0 ? "Ouch. Norm gets another chance." : "Norm is out of tries. Press R to restart.", 110);
  addParticles(norm.x + norm.w / 2, norm.y + norm.h / 2, "#f05b5b", 20);
  if (norm.lives <= 0) {
    state.mode = "gameover";
    overlay.querySelector("h1").textContent = "Game Over";
    overlay.querySelector("p").textContent = "The bosses are still standing. Press R or Start Game.";
    startButton.textContent = "Try Again";
    overlay.classList.remove("hidden");
  }
}

function stompBoss() {
  boss.hp -= 1;
  boss.hurt = 28;
  boss.vx = boss.x < norm.x ? -2.2 : 2.2;
  norm.vy = -14.5;
  norm.y = boss.y - norm.h - 2;
  state.shake = 10;
  addParticles(norm.x + norm.w / 2, boss.y + 12, "#f2c14e", 24);
  say(`${boss.name} takes a hit. ${Math.max(0, boss.hp)} to go.`, 80);
  if (boss.hp <= 0) {
    boss.defeated = true;
    state.mode = "levelclear";
    addParticles(boss.x + boss.w / 2, boss.y + boss.h / 2, "#ffffff", 48);
    if (state.level === bosses.length - 1) {
      state.won = true;
      say("Threelite Bash complete. Norm wins.", 999);
      overlay.querySelector("h1").textContent = "Norm Wins";
      overlay.querySelector("p").textContent = "The merged boss has been bashed back into three separate problems.";
      startButton.textContent = "Play Again";
      overlay.classList.remove("hidden");
    } else {
      say(`${boss.name} is down. Next boss incoming...`, 120);
      setTimeout(() => {
        if (state.mode === "levelclear" && !state.won) {
          state.level += 1;
          state.mode = "play";
          resetLevel();
        }
      }, 1500);
    }
  }
}

function updateNorm() {
  const left = keys.has("arrowleft") || keys.has("a");
  const right = keys.has("arrowright") || keys.has("d");
  const jump = keys.has("arrowup") || keys.has("w") || keys.has(" ");

  if (left) {
    norm.vx -= 0.86;
    norm.dir = -1;
  }
  if (right) {
    norm.vx += 0.86;
    norm.dir = 1;
  }
  if (!left && !right) norm.vx *= 0.78;
  norm.vx = Math.max(-6.2, Math.min(6.2, norm.vx));

  if (jump && norm.onGround && norm.jumps <= 0) {
    norm.vy = -17;
    norm.onGround = false;
    norm.jumps = 12;
  }
  if (!jump) norm.jumps = 0;
  if (norm.jumps > 0) norm.jumps -= 1;

  norm.vy += GRAVITY;
  norm.x += norm.vx;
  norm.y += norm.vy;

  if (norm.y + norm.h >= FLOOR) {
    norm.y = FLOOR - norm.h;
    norm.vy = 0;
    norm.onGround = true;
  } else {
    norm.onGround = false;
  }

  norm.x = Math.max(22, Math.min(W - norm.w - 20, norm.x));
  if (norm.invuln > 0) norm.invuln -= 1;
}

function updateBoss() {
  if (boss.defeated) return;
  boss.x += boss.vx;
  if (boss.x < 595 || boss.x > 830) {
    boss.vx *= -1;
    boss.dir *= -1;
  }
  boss.attackClock -= 1;
  if (boss.attackClock <= 0) {
    if (boss.attack === "all") {
      spawnHazard(["sound", "hair", "arms"][Math.floor(Math.random() * 3)]);
      boss.attackClock = 54;
    } else {
      spawnHazard(boss.attack);
      boss.attackClock = 72 + Math.random() * 42;
    }
  }
  if (boss.hurt > 0) boss.hurt -= 1;

  if (rectsHit(norm, boss)) {
    const falling = norm.vy > 2;
    const feetWereAbove = norm.y + norm.h - norm.vy <= boss.y + 18;
    if (falling && feetWereAbove) stompBoss();
    else hurtNorm();
  }
}

function updateHazards() {
  hazards.forEach((h) => {
    h.x += h.vx;
    h.life -= 1;
    if (h.type === "sound") h.y += Math.sin(h.life * 0.18) * 1.4;
    if (h.type === "hair") h.h = 24 + Math.sin(h.life * 0.4) * 8;
  });
  hazards = hazards.filter((h) => h.life > 0 && h.x + h.w > -60);
  hazards.forEach((h) => {
    if (rectsHit(norm, h)) hurtNorm();
  });
}

function updateParticles() {
  particles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.28;
    p.life -= 1;
  });
  particles = particles.filter((p) => p.life > 0);
}

function update() {
  if (state.mode !== "play" || state.paused) {
    updateParticles();
    return;
  }
  updateNorm();
  updateBoss();
  updateHazards();
  updateParticles();
  if (state.messageTimer > 0) state.messageTimer -= 1;
  if (state.shake > 0) state.shake -= 1;
}

function px(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawSky() {
  const data = bosses[state.level] || bosses[0];
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, data.sky[0]);
  gradient.addColorStop(0.72, data.sky[1]);
  gradient.addColorStop(1, "#273040");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  px(0, FLOOR, W, H - FLOOR, data.ground);
  for (let x = -20; x < W + 40; x += 48) {
    px(x, FLOOR + 28, 32, 18, "#2e342a");
    px(x + 10, FLOOR + 5, 20, 18, data.arena);
  }

  for (let x = 30; x < W; x += 145) {
    px(x, 335 + Math.sin((x + state.level * 40) * 0.04) * 7, 78, 12, "rgba(255,255,255,0.34)");
    px(x + 16, 320, 34, 12, "rgba(255,255,255,0.42)");
  }

  px(585, FLOOR - 8, 330, 8, "#231a18");
  px(620, FLOOR - 36, 256, 18, data.arena);
  px(632, FLOOR - 50, 234, 14, "#f2c14e");
}

function drawNorm() {
  const blink = norm.invuln > 0 && Math.floor(norm.invuln / 6) % 2 === 0;
  if (blink) return;
  const x = norm.x;
  const y = norm.y;
  const d = norm.dir;
  px(x + 8, y + 2, 18, 12, "#5b3a27");
  px(x + 5, y + 14, 24, 18, "#e2a66f");
  px(x + (d > 0 ? 22 : 6), y + 20, 6, 5, "#161923");
  px(x + 8, y + 32, 22, 22, "#4472bd");
  px(x + 4, y + 36, 8, 22, "#f2c14e");
  px(x + 26, y + 36, 8, 22, "#f2c14e");
  px(x + 7, y + 54, 10, 10, "#2f2a26");
  px(x + 21, y + 54, 10, 10, "#2f2a26");
  px(x + (d > 0 ? 29 : -1), y + 17, 7, 7, "#e2a66f");
}

function drawBoss() {
  if (!boss) return;
  const x = boss.x;
  const y = boss.y + (boss.hurt > 0 ? Math.sin(boss.hurt) * 3 : 0);
  const flash = boss.hurt > 0 && boss.hurt % 6 < 3;
  const skin = flash ? "#ffffff" : boss.color;

  if (boss.name === "Janne") {
    px(x + 18, y, 34, 20, "#d8dce1");
    px(x + 16, y + 20, 38, 34, skin);
    px(x + 22, y + 9, 8, 5, "#111318");
    px(x + 42, y + 9, 8, 5, "#111318");
    px(x + 14, y + 54, 44, 28, "#222633");
    px(x + 1, y + 36, 32, 13, "#25140c");
    px(x + 24, y + 31, 38, 8, "#f2c14e");
    px(x + 10, y + 82, 14, 14, "#111318");
    px(x + 45, y + 82, 14, 14, "#111318");
  } else if (boss.name === "Lukasz") {
    px(x + 17, y - 20, 38, 34, "#2b1b24");
    px(x + 22, y - 32, 28, 22, "#2b1b24");
    px(x + 15, y + 6, 42, 32, skin);
    px(x + 18, y + 16, 36, 8, "#161923");
    px(x + 27, y + 32, 18, 7, "#5a352b");
    px(x + 10, y + 40, 50, 40, "#8257a6");
    px(x + 10, y + 80, 15, 16, "#2f2a26");
    px(x + 45, y + 80, 15, 16, "#2f2a26");
  } else if (boss.name === "Emil") {
    px(x + 18, y + 3, 38, 32, skin);
    px(x + 16, y + 3, 14, 10, "#35241f");
    px(x + 23, y + 15, 28, 8, "#1d2533");
    px(x + 13, y + 37, 48, 33, "#f0f3d2");
    px(x + 16, y + 70, 42, 20, "#2b8b9b");
    px(x - 24, y + 22, 30, 7, "#aeb9c8");
    px(x - 32, y + 12, 14, 18, "#1d2533");
    px(x + 60, y + 26, 30, 7, "#aeb9c8");
    px(x + 86, y + 14, 16, 22, "#1d2533");
    px(x + 17, y + 90, 13, 6, "#111318");
    px(x + 45, y + 90, 13, 6, "#111318");
  } else {
    px(x + 22, y - 24, 40, 34, "#2b1b24");
    px(x + 14, y + 3, 52, 38, skin);
    px(x + 18, y + 16, 42, 8, "#111318");
    px(x + 6, y + 42, 72, 34, "#6f596b");
    px(x - 26, y + 40, 34, 9, "#f2c14e");
    px(x + 58, y + 38, 56, 8, "#aeb9c8");
    px(x + 12, y + 76, 22, 38, "#222633");
    px(x + 49, y + 76, 22, 38, "#2b8b9b");
    px(x + 9, y + 110, 18, 8, "#111318");
    px(x + 55, y + 110, 18, 8, "#111318");
  }
}

function drawHazards() {
  hazards.forEach((h) => {
    if (h.type === "sound") {
      px(h.x, h.y, h.w, h.h, h.color);
      px(h.x + 8, h.y - 7, h.w * 0.55, 5, "#fff4a3");
      px(h.x + 5, h.y + h.h + 3, h.w * 0.45, 4, "#fb6d5b");
    } else if (h.type === "hair") {
      px(h.x, h.y, h.w, h.h, h.color);
      px(h.x + 10, h.y - 8, h.w - 20, 10, "#4c2e42");
    } else {
      px(h.x, h.y, h.w, h.h, h.color);
      px(h.x - 8, h.y - 7, 18, 24, "#1d2533");
      px(h.x + h.w - 4, h.y - 5, 16, 20, "#1d2533");
    }
  });
}

function drawParticles() {
  particles.forEach((p) => {
    px(p.x, p.y, 5, 5, p.color);
  });
}

function drawHud() {
  const data = bosses[state.level] || bosses[0];
  px(18, 18, 322, 72, "rgba(11,13,18,0.72)");
  ctx.fillStyle = "#f7f2df";
  ctx.font = "20px ui-monospace, monospace";
  ctx.fillText(`Norm lives: ${norm.lives}`, 34, 48);
  ctx.fillText(`Stage ${state.level + 1}: ${data.name}`, 34, 76);

  px(W - 292, 18, 274, 72, "rgba(11,13,18,0.72)");
  ctx.fillStyle = "#f7f2df";
  ctx.font = "18px ui-monospace, monospace";
  ctx.fillText(data.tag, W - 274, 45);
  for (let i = 0; i < boss.maxHp; i++) {
    px(W - 274 + i * 28, 60, 20, 16, i < boss.hp ? "#f05b5b" : "#4b4f5e");
  }

  if (state.messageTimer > 0 || state.mode === "levelclear") {
    const text = state.message;
    ctx.font = "18px ui-monospace, monospace";
    const width = Math.min(W - 70, ctx.measureText(text).width + 34);
    px((W - width) / 2, 104, width, 44, "rgba(11,13,18,0.78)");
    ctx.fillStyle = "#f7f2df";
    ctx.textAlign = "center";
    ctx.fillText(text, W / 2, 133);
    ctx.textAlign = "left";
  }

  if (state.paused) {
    px(W / 2 - 92, H / 2 - 30, 184, 60, "rgba(11,13,18,0.86)");
    ctx.fillStyle = "#f7f2df";
    ctx.font = "26px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("Paused", W / 2, H / 2 + 8);
    ctx.textAlign = "left";
  }
}

function draw() {
  ctx.save();
  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  drawSky();
  drawHazards();
  drawBoss();
  drawNorm();
  drawParticles();
  ctx.restore();
  drawHud();
}

function frame() {
  update();
  draw();
  requestAnimationFrame(frame);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", "arrowup", " ", "a", "d", "w"].includes(key)) {
    event.preventDefault();
  }
  if (key === "p" && state.mode === "play") state.paused = !state.paused;
  if (key === "r") restartGame();
  keys.add(key);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

startButton.addEventListener("click", restartGame);

document.querySelectorAll(".touch-button").forEach((button) => {
  const key = button.dataset.key;
  const press = (event) => {
    event.preventDefault();
    keys.add(key);
  };
  const release = (event) => {
    event.preventDefault();
    keys.delete(key);
  };
  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", release);
});

boss = makeBoss();
say("Press Start Game.", 999);
frame();
