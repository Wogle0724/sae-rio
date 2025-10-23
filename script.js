
// ===== Countdown to 10:30 PM America/Chicago on 2025-10-24 =====
(function startRioCountdown(){
  const el = document.getElementById('countdown');
  if(!el) return;

  // Chicago is on Daylight Saving Time (UTC-5) on Oct 24, 2025.
  // 10:30 PM local == 03:30 UTC on Oct 25, 2025.
  const targetUTC = Date.UTC(2025, 9, 25, 3, 30, 0); // months are 0-based
  // If you truly meant CST (UTC-6), use: Date.UTC(2025, 9, 25, 4, 30, 0)

  function pad(n){ return n<10 ? '0'+n : ''+n; }
  function fmt(ms){
    if(ms <= 0) return '00:00:00';
    const totalSec = Math.floor(ms/1000);
    const hrs  = Math.floor(totalSec/3600);
    const mins = Math.floor((totalSec%3600)/60);
    const secs = totalSec%60;
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }

  function tick(){
    const now = Date.now();
    const diff = targetUTC - now;
    if(diff <= 0){
      el.textContent = '00:00:00';
      clearInterval(timer);
      return;
    }
    el.textContent = fmt(diff);
  }
  // Ensure the Rio font is loaded before first paint to avoid FOUT width shifts
  Promise.resolve()
    .then(() => document.fonts ? document.fonts.load('1em "Rio"') : null)
    .finally(() => {
      tick();
      var timer = setInterval(tick, 1000);
    });
})();
// ===== RIO/Brazil Jungle Promo — Interaction & Bird Spawner =====

// Frame-by-frame SVG lists (8 frames each). Paths can contain spaces.
const FrameBirds = {
  bird1: [
    "./assets/bird1/RIO Parrot 1-01.svg",
    "./assets/bird1/RIO Parrot 1-02.svg",
    "./assets/bird1/RIO Parrot 1-03.svg",
    "./assets/bird1/RIO Parrot 1-04.svg",
    "./assets/bird1/RIO Parrot 1-05.svg",
    "./assets/bird1/RIO Parrot 1-06.svg",
    "./assets/bird1/RIO Parrot 1-07.svg",
    "./assets/bird1/RIO Parrot 1-08.svg",
  ],
  bird2: [
    "./assets/bird2/RIO Parrot 2-090.svg",
    "./assets/bird2/RIO Parrot 2-100.svg",
    "./assets/bird2/RIO Parrot 2-110.svg",
    "./assets/bird2/RIO Parrot 2-120.svg",
    "./assets/bird2/RIO Parrot 2-130.svg",
    "./assets/bird2/RIO Parrot 2-140.svg",
    "./assets/bird2/RIO Parrot 2-150.svg",
    "./assets/bird2/RIO Parrot 2-160.svg",
  ],
  preloadAll(){
    // light-touch preload so first cycles don't flash
    for(const key of ["bird1","bird2"]){
      for(const src of this[key]){ new Image().src = src; }
    }
  }
};
FrameBirds.preloadAll();

// Sprite sheet loader for PNG birds
const Sprite = {
  img: null,
  ready: false,
  cols: 8,  // frames per row
  rows: 2,  // two birds
  path: "./assets/parrots-sprite.png",
  load(cb){
    const i = new Image();
    i.onload = () => {
      this.img = i;
      this.ready = true;
      this.w = i.naturalWidth;
      this.h = i.naturalHeight;
      this.frameW = Math.floor(this.w / this.cols);
      this.frameH = Math.floor(this.h / this.rows);
      cb && cb();
    };
    i.onerror = () => console.warn("Sprite sheet not found at", this.path);
    i.src = this.path;
  }
};
Sprite.load();

// Parallax: move background layers slightly with mouse / device tilt
(function setupParallax(){
  const factor = 15;
  function update(e){
    const w = window.innerWidth, h = window.innerHeight;
    let x = 0, y = 0;

    if(e.type === "mousemove"){
      x = (e.clientX - w/2) / factor;
      y = (e.clientY - h/2) / factor;
    }else if(e.type === "deviceorientation"){
      // mobile tilt fallback
      x = (e.gamma || 0) * 1.2;
      y = (e.beta  || 0) * 0.8;
    }
    document.documentElement.style.setProperty('--px', `${x}px`);
    document.documentElement.style.setProperty('--py', `${y}px`);
  }
  window.addEventListener('mousemove', update, {passive:true});
  window.addEventListener('deviceorientation', update, {passive:true});
})();

// Bird spawner: clones hidden SVG and sends it flying across the screen.
(function birdSpawner(){
  const sky = document.getElementById('sky');
  const template = document.getElementById('toucan-template');

  if(!sky) return;

  function spawnSvgBird(){
    // Clone the SVG node deeply
    const bird = template.cloneNode(true);
    bird.removeAttribute('id'); // make it an instance
    bird.style.left = '-220px';

    // Randomize vertical start/end to create gentle arcs
    const startY = (Math.random()*60 - 30); // -30px..+30px
    const endY   = (Math.random()*120 - 60); // -60px..+60px
    const scale  = (Math.random()*0.6 + 0.7).toFixed(2); // 0.7..1.3
    const rot    = (Math.random()*10 - 5).toFixed(1) + 'deg';
    const dur    = (Math.random()*10 + 10).toFixed(2) + 's'; // 10..20s

    bird.style.setProperty('--startY', `${startY}px`);
    bird.style.setProperty('--endY',   `${endY}px`);
    bird.style.setProperty('--scale',  scale);
    bird.style.setProperty('--rot',    rot);
    bird.style.setProperty('--dur',    dur);

    // Randomize top position (viewport percentage)
    const topPercent = Math.random()*60 + 10; // 10%..70%
    bird.style.top = `${topPercent}vh`;

    // Occasionally flip to fly the other way (right-to-left)
    const rtl = Math.random() < 0.25;
    if(rtl){
      bird.style.left = 'calc(100vw + 260px)';
      bird.style.transform = 'scaleX(-1)'; // visual flip
      bird.style.animationName = 'fly-rtl';
      // define rtl keyframes on first use (once)
      ensureRtlKeyframes();
    }

    // Remove after animation completes to avoid DOM bloat
    bird.addEventListener('animationend', () => bird.remove());
    sky.appendChild(bird);
  }

  function spawnSpriteBird(){
    if(!Sprite.ready) return; // fall back until image loads

    const div = document.createElement('div');
    div.className = 'sprite-bird';

    // randomize which row (0 or 1) = which bird
    const row = Math.random() < 0.5 ? 0 : 1;

    // randomize arc/scale/speed
    const startY = (Math.random()*60 - 30);
    const endY   = (Math.random()*120 - 60);
    const scale  = (Math.random()*0.5 + 0.8).toFixed(2);
    const rot    = (Math.random()*10 - 5).toFixed(1) + 'deg';
    const dur    = (Math.random()*8 + 10).toFixed(2) + 's';
    const flap   = (Math.random()*0.4 + 0.6).toFixed(2) + 's'; // 0.6..1.0s per cycle

    // size & sheet metrics via CSS vars
    div.style.setProperty('--sprite-url', `url("${Sprite.path}")`);
    div.style.setProperty('--sprite-w', `${Sprite.w}px`);
    div.style.setProperty('--frame-w', `${Sprite.frameW}px`);
    div.style.setProperty('--frame-h', `${Sprite.frameH}px`);
    div.style.setProperty('--cols', Sprite.cols);
    div.style.setProperty('--dur', dur);
    div.style.setProperty('--flap-speed', flap);
    div.style.setProperty('--startY', `${startY}px`);
    div.style.setProperty('--endY', `${endY}px`);
    div.style.setProperty('--scale', scale);
    div.style.setProperty('--rot', rot);

    // vertical placement in viewport
    const topPercent = Math.random()*60 + 10;
    div.style.top = `${topPercent}vh`;

    // choose row by shifting background-position-y
    const rowOffset = -row * Sprite.frameH;
    div.style.backgroundPosition = `0px ${rowOffset}px`;

    // occasional RTL flight
    const rtl = Math.random() < 0.25;
    if(rtl){
      div.style.left = 'calc(100vw + 260px)';
      // reuse same frames; flip via scaleX(-1) inside keyframes
      div.style.animationName = 'bird-glide-rtl, bird-frames';
    }

    div.addEventListener('animationend', () => div.remove());
    sky.appendChild(div);
  }

  function spawnFrameBird(topPercentOverride){
    const use = Math.random() < 0.5 ? "bird1" : "bird2";
    const frames = FrameBirds[use];
    if(!frames) return;

    const img = document.createElement('img');
    img.className = 'frame-bird';
    img.src = frames[0];

    // motion randomization
    const startY = (Math.random()*60 - 30);
    const endY   = (Math.random()*120 - 60);
    const scale  = (Math.random()*0.5 + 0.85).toFixed(2);
    const rot    = (Math.random()*10 - 5).toFixed(1) + 'deg';
    const dur    = (Math.random()*8 + 10).toFixed(2) + 's';
    const flapMs = Math.floor(Math.random()*120 + 70); // 70..190ms per frame

    // apply CSS vars for glide path
    img.style.setProperty('--startY', `${startY}px`);
    img.style.setProperty('--endY', `${endY}px`);
    img.style.setProperty('--scale', scale);
    img.style.setProperty('--rot', rot);
    img.style.setProperty('--dur', dur);

    // vertical viewport placement
    const topPercent = (typeof topPercentOverride === 'number') ? topPercentOverride : (Math.random()*60 + 10);
    img.style.top = `${topPercent}vh`;

    // occasional RTL
    const rtl = Math.random() < 0.25;
    if(rtl){
      img.classList.add('rtl');
    }

    // frame cycling
    let idx = 0;
    const advance = () => {
      idx = (idx + 1) % frames.length;
      img.src = frames[idx];
    };
    const timer = setInterval(advance, flapMs);

    // cleanup when glide finishes
    img.addEventListener('animationend', () => {
      clearInterval(timer);
      img.remove();
    });

    sky.appendChild(img);
  }

  // Spawn cadence: a bird every 2–4 seconds
  function loop(){
    spawnFrameBird();
    const next = Math.random()*2000 + 2000; // 2000..4000ms
    setTimeout(loop, next);
  }
  loop();

  function ensureRtlKeyframes(){
    if(document.getElementById('rtl-style')) return;
    const style = document.createElement('style');
    style.id = 'rtl-style';
    style.textContent = `
      @keyframes fly-rtl{
        0%   { transform: translateX(0) translateY(var(--startY, 0)) scaleX(-1) scale(var(--scale,1)) rotate(var(--rot, 0deg)); opacity: 0; }
        5%   { opacity: 1; }
        100% { transform: translateX(calc(-100vw - 260px)) translateY(var(--endY, 0)) scaleX(-1) scale(var(--scale,1)) rotate(var(--rot, 0deg)); opacity: 1; }
      }`;
    document.head.appendChild(style);
  }

  // Click anywhere to spawn a small burst of frame birds at the click height
  window.addEventListener('click', (evt) => {
    const vh = Math.min(85, Math.max(10, (evt.clientY / window.innerHeight) * 100));
    for(let i=0; i<3; i++){
      spawnFrameBird(vh + (Math.random()*6 - 3)); // ±3vh variance
    }
  }, {passive:true});
})();