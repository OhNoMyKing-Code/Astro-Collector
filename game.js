// game.js (module)
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const howBtn = document.getElementById('howBtn');
const pauseBtn = document.getElementById('pauseBtn');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const waveEl = document.getElementById('wave');
const touchHint = document.getElementById('touchHint');

let W = 980, H = 720;
let last = 0, dt = 0;
let running = false, paused = false;
let keys = {};
let pointer = { down: false, x: 0, y: 0 };
let mouseDrag = false;

const state = {
  score: 0,
  lives: 3,
  wave: 1,
  samplesCollected: 0
};

// Resize canvas to fit container nicely
function fitCanvas() {
  const rect = canvas.getBoundingClientRect();
  const styleW = rect.width;
  const styleH = rect.height;
  canvas.width = Math.floor(styleW * devicePixelRatio);
  canvas.height = Math.floor(styleH * devicePixelRatio);
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
window.addEventListener('resize', fitCanvas);

// Basic utilities
function rand(min, max) { return Math.random() * (max - min) + min; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function dist(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return Math.hypot(dx, dy); }

// Game objects
class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.radius = 14;
    this.color = '#7be6ff';
    this.speed = 220;
    this.invulnerable = 0;
    this.angle = 0;
  }
  update(dt) {
    let vx = 0, vy = 0;
    if (keys.ArrowLeft || keys.a) vx -= 1;
    if (keys.ArrowRight || keys.d) vx += 1;
    if (keys.ArrowUp || keys.w) vy -= 1;
    if (keys.ArrowDown || keys.s) vy += 1;

    // pointer drag for mobile / mouse
    if (pointer.down) {
      const dx = pointer.x - this.x;
      const dy = pointer.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d > 5) {
        vx = dx / d;
        vy = dy / d;
      }
    }

    const mag = Math.hypot(vx, vy);
    if (mag > 0) {
      this.x += (vx / mag) * this.speed * dt;
      this.y += (vy / mag) * this.speed * dt;
      this.angle = Math.atan2(vy, vx);
    }

    // clamp to bounds with padding
    this.x = clamp(this.x, 20, (canvas.width / devicePixelRatio) - 20);
    this.y = clamp(this.y, 20, (canvas.height / devicePixelRatio) - 20);

    if (this.invulnerable > 0) this.invulnerable -= dt;
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2);
    // glow
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 2);
    grad.addColorStop(0, 'rgba(123,230,255,0.14)');
    grad.addColorStop(1, 'rgba(123,230,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, this.radius * 2, 0, Math.PI * 2); ctx.fill();

    // ship triangle
    ctx.fillStyle = this.invulnerable > 0 ? '#ffd27a' : this.color;
    ctx.beginPath();
    ctx.moveTo(0, -this.radius - 6);
    ctx.lineTo(-this.radius * 0.7, this.radius + 6);
    ctx.lineTo(this.radius * 0.7, this.radius + 6);
    ctx.closePath();
    ctx.fill();

    // cockpit
    ctx.fillStyle = 'rgba(2,26,36,0.9)';
    ctx.beginPath(); ctx.arc(0, -2, 4, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }
}

class Asteroid {
  constructor(x, y, r, vx, vy) {
    this.x = x; this.y = y; this.r = r;
    this.vx = vx; this.vy = vy;
    this.angle = rand(0, Math.PI * 2);
    this.spin = rand(-1, 1);
    this.color = '#c3b29b';
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.angle += this.spin * dt;
    // wrap around screen
    const Wp = canvas.width / devicePixelRatio, Hp = canvas.height / devicePixelRatio;
    if (this.x < -50) this.x = Wp + 50;
    if (this.x > Wp + 50) this.x = -50;
    if (this.y < -50) this.y = Hp + 50;
    if (this.y > Hp + 50) this.y = -50;
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    // irregular polygon
    ctx.fillStyle = this.color;
    ctx.beginPath();
    const spikes = 8;
    for (let i = 0; i < spikes; i++) {
      const a = (i / spikes) * Math.PI * 2;
      const rr = this.r * (0.75 + Math.random() * 0.5);
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

class Sample {
  constructor(x, y) {
    this.x = x; this.y = y; this.r = 9;
    this.pulse = rand(0, Math.PI * 2);
    this.color = '#8affc1';
  }
  update(dt) {
    this.pulse += dt * 6;
  }
  draw(ctx) {
    const scale = 1 + Math.sin(this.pulse) * 0.08;
    ctx.save();
    ctx.translate(this.x, this.y);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.r * 3);
    grad.addColorStop(0, 'rgba(138,255,193,0.95)');
    grad.addColorStop(0.6, 'rgba(138,255,193,0.25)');
    grad.addColorStop(1, 'rgba(138,255,193,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, this.r * scale * 2, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(0, 0, this.r * scale, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

class Particle {
  constructor(x, y, vx, vy, life, color) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.life = life; this.max = life; this.color = color;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
  }
  draw(ctx) {
    if (this.life <= 0) return;
    const a = clamp(this.life / this.max, 0, 1);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = a;
    ctx.beginPath(); ctx.arc(this.x, this.y, 2.5 * a, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// Game manager
let player, asteroids = [], samples = [], particles = [];
let spawnTimer = 0, sampleTimer = 0, waveTimer = 0;

function resetGame() {
  const Wp = canvas.width / devicePixelRatio, Hp = canvas.height / devicePixelRatio;
  player = new Player(Wp / 2, Hp / 2);
  asteroids = [];
  samples = [];
  particles = [];
  state.score = 0; state.lives = 3; state.wave = 1; state.samplesCollected = 0;
  spawnTimer = 0; sampleTimer = 0;
  updateHUD();
}

function startGame() {
  fitCanvas();
  resetGame();
  overlay.style.display = 'none';
  running = true;
  paused = false;
  last = performance.now();
  requestAnimationFrame(loop);
}

function endGame() {
  running = false;
  overlay.style.display = 'flex';
  overlay.querySelector('.menu h2').textContent = 'Game Over';
  overlay.querySelector('.menu p').textContent = `Score: ${state.score} — Bạn đạt wave ${state.wave}.`;
  overlay.querySelector('.menu-actions').innerHTML = '<button id="restart">Chơi lại</button>';
  document.getElementById('restart').addEventListener('click', () => {
    overlay.querySelector('.menu h2').textContent = 'Astro Collector';
    overlay.querySelector('.menu p').textContent = 'Thu thập sample, né tiểu hành tinh. WASD / ←↑→↓ hoặc kéo để di chuyển.';
    overlay.querySelector('.menu-actions').innerHTML = `<button id="startBtn">Start</button><button id="howBtn">Hướng dẫn</button>`;
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('howBtn').addEventListener('click', showHow);
  });
}

function spawnAsteroid() {
  const Wp = canvas.width / devicePixelRatio, Hp = canvas.height / devicePixelRatio;
  const edge = Math.floor(rand(0, 4));
  let x = rand(0, Wp), y = rand(0, Hp);
  if (edge === 0) { x = -40; y = rand(0, Hp); }
  if (edge === 1) { x = Wp + 40; y = rand(0, Hp); }
  if (edge === 2) { x = rand(0, Wp); y = -40; }
  if (edge === 3) { x = rand(0, Wp); y = Hp + 40; }
  const vx = (player.x - x) / 6 + rand(-30, 30);
  const vy = (player.y - y) / 6 + rand(-30, 30);
  const r = rand(12, 34) * (1 + state.wave * 0.08);
  asteroids.push(new Asteroid(x, y, r, vx, vy));
}

function spawnSample() {
  const Wp = canvas.width / devicePixelRatio, Hp = canvas.height / devicePixelRatio;
  const x = rand(60, Wp - 60);
  const y = rand(60, Hp - 60);
  samples.push(new Sample(x, y));
}

// collision helpers
function circleHit(a, b) {
  return dist(a, b) < (a.radius || a.r || 0) + (b.r || b.radius || 0);
}

function updateHUD() {
  scoreEl.textContent = state.score;
  livesEl.textContent = state.lives;
  waveEl.textContent = state.wave;
}

function createExplosion(x, y, color = 'rgba(255,160,80,0.9)') {
  for (let i = 0; i < 18; i++) {
    const ang = rand(0, Math.PI * 2);
    const s = rand(40, 160);
    const vx = Math.cos(ang) * s;
    const vy = Math.sin(ang) * s;
    particles.push(new Particle(x, y, vx, vy, rand(0.4, 0.9), color));
  }
}

// Main loop
function loop(t) {
  if (!running) return;
  dt = Math.min((t - last) / 1000, 0.033);
  last = t;
  if (!paused) update(dt);
  render();
  requestAnimationFrame(loop);
}

function update(dt) {
  // spawn logic
  spawnTimer -= dt;
  sampleTimer -= dt;
  if (spawnTimer <= 0) {
    // spawn count increases with wave
    const count = Math.min(1 + Math.floor(state.wave / 2), 6);
    for (let i = 0; i < count; i++) spawnAsteroid();
    spawnTimer = clamp(2.2 - state.wave * 0.08, 0.6, 3);
  }
  if (sampleTimer <= 0) {
    spawnSample();
    sampleTimer = rand(3.5, 6.5);
  }

  // update objects
  player.update(dt);
  asteroids.forEach(a => a.update(dt));
  samples.forEach(s => s.update(dt));
  particles.forEach(p => p.update(dt));
  particles = particles.filter(p => p.life > 0);

  // collisions: player <-> sample
  for (let i = samples.length - 1; i >= 0; i--) {
    const s = samples[i];
    if (dist(player, s) < player.radius + s.r) {
      // collect
      state.score += 150;
      state.samplesCollected += 1;
      createExplosion(s.x, s.y, 'rgba(138,255,193,0.95)');
      samples.splice(i, 1);
      updateHUD();
      // every 5 samples -> advance wave
      if (state.samplesCollected % 5 === 0) {
        state.wave += 1;
        // reward
        state.score += 300;
        createTextPopup(`Wave ${state.wave}`, player.x, player.y - 30);
      }
    }
  }

  // collisions: player <-> asteroid
  for (let i = asteroids.length - 1; i >= 0; i--) {
    const a = asteroids[i];
    if (dist(player, a) < player.radius + a.r * 0.7) {
      if (player.invulnerable <= 0) {
        // lose life
        state.lives -= 1;
        player.invulnerable = 1.4;
        createExplosion(player.x, player.y);
        updateHUD();
        if (state.lives <= 0) {
          endGame();
        }
      }
      // break large asteroid into smaller pieces sometimes
      if (a.r > 18 && Math.random() < 0.5) {
        const pieces = Math.floor(rand(1, 3));
        for (let k = 0; k < pieces; k++) {
          const r2 = a.r * rand(0.4, 0.7);
          asteroids.push(new Asteroid(a.x + rand(-6, 6), a.y + rand(-6, 6), r2, a.vx * rand(0.6, 1.4) + rand(-40, 40), a.vy * rand(0.6, 1.4) + rand(-40, 40)));
        }
      }
      // remove original
      asteroids.splice(i, 1);
      state.score = Math.max(0, state.score - 40);
      updateHUD();
    }
  }

  // collisions: asteroid <-> sample (asteroid can destroy sample)
  for (let i = asteroids.length - 1; i >= 0; i--) {
    for (let j = samples.length - 1; j >= 0; j--) {
      if (dist(asteroids[i], samples[j]) < asteroids[i].r + samples[j].r) {
        createExplosion(samples[j].x, samples[j].y, 'rgba(255,200,150,0.9)');
        samples.splice(j, 1);
        break;
      }
    }
  }

  // small particles friction
  particles.forEach(p => { p.vx *= 0.99; p.vy *= 0.99; });
}

// render
function render() {
  const Wp = canvas.width / devicePixelRatio, Hp = canvas.height / devicePixelRatio;
  // clear
  ctx.clearRect(0, 0, Wp, Hp);

  // subtle starfield background
  ctx.fillStyle = '#020413';
  ctx.fillRect(0, 0, Wp, Hp);
  // stars
  for (let i = 0; i < 60; i++) {
    const x = (i * 73) % Wp;
    const y = (i * 47) % Hp;
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect(x + (i % 3) * 7, y + (i % 5) * 3, 2, 2);
  }

  // draw samples
  samples.forEach(s => s.draw(ctx));
  // draw asteroids
  asteroids.forEach(a => a.draw(ctx));
  // draw particles
  particles.forEach(p => p.draw(ctx));
  // draw player on top
  player.draw(ctx);

  // HUD drawn via DOM, but we can draw popups
  drawPopups(ctx);
}

// simple popup text list
let popups = [];
function createTextPopup(text, x, y) {
  popups.push({ text, x, y, life: 1.6 });
}
function drawPopups(ctx) {
  for (let i = popups.length - 1; i >= 0; i--) {
    const p = popups[i];
    p.life -= 1 / 60;
    if (p.life <= 0) popups.splice(i, 1);
    else {
      ctx.save();
      ctx.globalAlpha = clamp(p.life / 1.6, 0, 1);
      ctx.fillStyle = '#bff3ff';
      ctx.font = 'bold 16px Inter, system-ui';
      ctx.fillText(p.text, p.x - 30, p.y - (1 - p.life) * 30);
      ctx.restore();
    }
  }
}

// input handling
window.addEventListener('keydown', (e) => { keys[e.key] = true; });
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

canvas.addEventListener('pointerdown', (e) => {
  pointer.down = true;
  const r = canvas.getBoundingClientRect();
  pointer.x = (e.clientX - r.left);
  pointer.y = (e.clientY - r.top);
  mouseDrag = true;
});
window.addEventListener('pointermove', (e) => {
  if (!mouseDrag) return;
  const r = canvas.getBoundingClientRect();
  pointer.x = (e.clientX - r.left);
  pointer.y = (e.clientY - r.top);
});
window.addEventListener('pointerup', () => { pointer.down = false; mouseDrag = false; });

// pause button
pauseBtn.addEventListener('click', () => {
  paused = !paused;
  pauseBtn.textContent = paused ? '▶' : 'II';
  if (paused) {
    touchHint.style.display = 'none';
  } else {
    touchHint.style.display = 'block';
  }
});

// Start / How buttons
startBtn.addEventListener('click', startGame);
howBtn.addEventListener('click', showHow);

function showHow() {
  overlay.querySelector('.menu h2').textContent = 'Hướng dẫn';
  overlay.querySelector('.menu p').textContent = 'Di chuyển bằng WASD / Mũi tên hoặc kéo trên màn hình. Thu thập sample (xanh lá) để tăng điểm. Né tiểu hành tinh — va chạm sẽ mất mạng. Thu thập 5 sample để lên wave.';
  overlay.querySelector('.menu-actions').innerHTML = '<button id="backBtn">Quay lại</button>';
  document.getElementById('backBtn').addEventListener('click', () => {
    overlay.querySelector('.menu h2').textContent = 'Astro Collector';
    overlay.querySelector('.menu p').textContent = 'Thu thập sample, né tiểu hành tinh. WASD / ←↑→↓ hoặc kéo để di chuyển.';
    overlay.querySelector('.menu-actions').innerHTML = `<button id="startBtn">Start</button><button id="howBtn">Hướng dẫn</button>`;
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('howBtn').addEventListener('click', showHow);
  });
}

// initial sizing & UI
(function init() {
  // set canvas container size to a good aspect ratio
  const parent = canvas.parentElement;
  function adjustSize() {
    const maxW = Math.min(window.innerWidth - 40, 980);
    const maxH = Math.min(window.innerHeight - 160, 720);
    const ar = 980 / 720;
    let w = maxW, h = Math.floor(w / ar);
    if (h > maxH) { h = maxH; w = Math.floor(h * ar); }
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    fitCanvas();
  }
  window.addEventListener('resize', adjustSize);
  adjustSize();

  // place initial menu buttons
  overlay.style.display = 'flex';
  document.getElementById('startBtn').addEventListener('click', startGame);
  document.getElementById('howBtn').addEventListener('click', showHow);

  // small initial content
  updateHUD();
})();
