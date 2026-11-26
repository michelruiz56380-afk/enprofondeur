/* En Profondeur — scripts communs aux 4 pages */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = s => document.querySelector(s);
  let audio = null, progress = 0;

  /* ---- Ambiance : l'eau fonce au fil de la page (aucun chiffre affiché) ---- */
  const stops = [[0,[13,58,64]],[.2,[8,44,52]],[.5,[10,28,34]],[.8,[14,18,20]],[1,[15,15,15]]];
  const mix = t => {
    for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) {
      const [a, ca] = stops[i-1], [b, cb] = stops[i], k = (t - a) / (b - a);
      return ca.map((v, j) => Math.round(v + (cb[j] - v) * k));
    }
    return stops.at(-1)[1];
  };
  const hdr = $('header.site'), portrait = $('#portrait'), parallax = [...document.querySelectorAll('[data-speed]')];
  function onScroll(){
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    progress = Math.min(1, Math.max(0, scrollY / max));
    const [r,g,b] = mix(progress);
    document.body.style.background = `rgb(${r},${g},${b})`;
    hdr && hdr.classList.toggle('scrolled', scrollY > 40);
    if (!reduce){
      if (portrait) portrait.style.transform = `translateY(${Math.min(scrollY, innerHeight) * .12}px)`;
      for (const el of parallax){
        const rc = el.parentElement.getBoundingClientRect();
        el.style.transform = `translateY(${(rc.top + rc.height/2 - innerHeight/2) * +el.dataset.speed}px)`;
      }
    }
    if (audio) audio.setDepth(progress);
  }
  addEventListener('scroll', onScroll, {passive:true});
  addEventListener('resize', onScroll);
  onScroll();

  /* ---- Menu mobile ---- */
  const burger = $('#burger'), mnav = $('#mobileNav');
  if (burger && mnav){
    burger.addEventListener('click', () => {
      const open = mnav.hidden;
      mnav.hidden = !open;
      burger.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mnav.addEventListener('click', e => { if (e.target.closest('a')) burger.click(); });
  }

  /* ---- Apparitions ---- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
  }), {threshold:.12});
  document.querySelectorAll('.reveal, .ring-word').forEach((el, i) => {
    el.style.transitionDelay = (i % 4) * 90 + 'ms'; io.observe(el);
  });

  /* ---- Vagues de la carte héros (accueil) ---- */
  const w1 = $('#w1'), w2 = $('#w2');
  function wave(t, amp, off, sp){
    let d = 'M0 0 L0 ' + off;
    for (let x = 0; x <= 1440; x += 30)
      d += ` L${x} ${off + Math.sin(x/220 + t/sp)*amp + Math.sin(x/90 + t/(sp*.7))*amp*.3}`;
    return d + ' L1440 0 Z';
  }

  /* ---- Particules en suspension ---- */
  const cv = $('#snow'), cx = cv.getContext('2d');
  let W, H, P = [];
  function resize(){
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr;
    const n = innerWidth < 760 ? 45 : 110;
    P = Array.from({length:n}, () => ({x:Math.random()*W, y:Math.random()*H, z:.2+Math.random()*.8, r:(.5+Math.random()*1.5)*dpr, ph:Math.random()*6.28}));
  }
  resize(); addEventListener('resize', resize);
  function drawSnow(t){
    cx.clearRect(0,0,W,H);
    const vis = .12 + progress * .55, dpr = W / innerWidth;
    for (const p of P){
      const y = ((p.y - scrollY * dpr * p.z * .35 - t * .01 * p.z) % H + H) % H;
      const x = p.x + Math.sin(t/2000 + p.ph) * 12 * p.z;
      cx.globalAlpha = vis * p.z;
      cx.beginPath(); cx.arc(x, y, p.r * p.z, 0, 6.28); cx.fillStyle = '#c9fbf8'; cx.fill();
    }
  }
  function loop(t){
    if (w1){ w1.setAttribute('d', wave(t, 26, 210, 1400)); w2.setAttribute('d', wave(t + 900, 18, 150, 1900)); }
    drawSnow(t);
    if (!reduce) requestAnimationFrame(loop);
  }
  reduce ? loop(0) : requestAnimationFrame(loop);
  if (reduce) addEventListener('scroll', () => drawSnow(0), {passive:true});

  /* ---- Respiration guidée : 4 s inspire · 4 s retiens · 6 s expire ---- */
  const bStart = $('#bStart');
  if (bStart){
    const orb = $('#orb'), bLabel = $('#bLabel'), bCount = $('#bCount'), bAfter = $('#bAfter');
    const phases = [['Inspirez',4,1],['Retenez',4,1],['Expirez',6,.55]];
    let running = false;
    const wait = ms => new Promise(r => setTimeout(r, ms));
    bStart.addEventListener('click', async () => {
      if (running) return; running = true; bStart.disabled = true; bAfter.textContent = '';
      for (let c = 1; c <= 3; c++){
        for (const [name, sec, scale] of phases){
          bLabel.textContent = name;
          orb.style.transitionDuration = reduce ? '.01s' : sec + 's';
          orb.style.transform = `scale(${scale})`;
          for (let s = sec; s > 0; s--){ bCount.textContent = `cycle ${c}/3 · ${s}`; await wait(1000); }
        }
      }
      bLabel.textContent = 'Revenez'; bCount.textContent = 'à votre rythme';
      bAfter.innerHTML = 'Ce que vous venez de ressentir, on peut le travailler en profondeur. <a href="coaching.html#coaching-respiration">Découvrir le coaching respiration</a>.';
      bStart.textContent = 'Recommencer'; bStart.disabled = false; running = false;
    });
  }

  /* ---- Ambiance sonore (opt-in, générée, aucun fichier) ---- */
  const soundBtn = $('#soundBtn');
  soundBtn && soundBtn.addEventListener('click', () => {
    if (!audio){
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const len = ac.sampleRate * 4, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      let last = 0; for (let i = 0; i < len; i++){ const w = Math.random()*2-1; last = (last + .02*w)/1.02; d[i] = last*3.5; }
      const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass';
      const gain = ac.createGain(); gain.gain.value = 0;
      src.connect(lp).connect(gain).connect(ac.destination); src.start();
      audio = { ac, gain, on:false, setDepth(p){ lp.frequency.setTargetAtTime(900 - p*780, ac.currentTime, .3); } };
      audio.setDepth(progress);
    }
    audio.on = !audio.on; audio.ac.resume();
    audio.gain.gain.setTargetAtTime(audio.on ? .35 : 0, audio.ac.currentTime, .4);
    soundBtn.setAttribute('aria-pressed', audio.on);
    soundBtn.setAttribute('aria-label', audio.on ? "Couper l'ambiance sonore" : "Activer l'ambiance sonore");
  });

  /* ---- Teaser : lecture avec le son au clic ---- */
  const tv = $('#teaserVideo'), tp = $('#teaserPlay');
  if (tv && tp){
    tp.addEventListener('click', () => {
      tv.controls = true; tv.muted = false;
      tv.closest('.teaser').classList.add('playing');
      tv.play();
    });
  }

  /* ---- Vidéos et podcasts externes : chargés seulement au clic (pas de cookies avant) ---- */
  document.querySelectorAll('.embed[data-embed]').forEach(box => {
    const trigger = box.querySelector('.embed-play, button');
    trigger && trigger.addEventListener('click', () => {
      document.querySelectorAll('video').forEach(v => v.pause());
      const f = document.createElement('iframe');
      f.src = box.dataset.embed;
      f.title = box.dataset.title || '';
      f.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write';
      f.allowFullscreen = true;
      f.loading = 'lazy';
      if (box.dataset.height) f.height = box.dataset.height;
      box.replaceChildren(f);
      box.classList.add('loaded');
    });
  });

  /* ---- Une seule vidéo à la fois ---- */
  const vids = [...document.querySelectorAll('video')];
  vids.forEach(v => v.addEventListener('play', () => vids.forEach(o => o !== v && o.pause())));
})();
