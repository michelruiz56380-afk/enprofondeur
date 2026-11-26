/* En Profondeur — scripts communs aux 4 pages */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = s => document.querySelector(s);
  let audio = null, progress = 0;

  /* ---- Ambiance : l'eau fonce au fil de la page (aucun chiffre affiché) ---- */
  // En profondeur : bleu clair en haut, de plus en plus profond en descendant
  const stops = [[0,[28,112,178]],[.12,[18,86,150]],[.3,[10,56,112]],[.55,[5,30,70]],[.8,[3,14,36]],[1,[2,7,18]]];
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
    document.documentElement.style.setProperty('--bgnow', `rgb(${r},${g},${b})`);
    hdr && hdr.classList.toggle('scrolled', scrollY > 40);
    if (!reduce){
      if (portrait) portrait.style.transform = `translate(-50%, ${Math.min(scrollY, innerHeight) * .06}px)`;
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

  /* ---- Story scrolling : la forme lumineuse change avec l'étape lue ---- */
  const sv = $('#storyVisual'), sw = $('#storyWord'), steps = [...document.querySelectorAll('.ss-step')];
  if (sv && steps.length){
    const setStep = el => {
      const i = el.dataset.i;
      if (sv.dataset.step === i) return;
      steps.forEach(s => s.classList.toggle('active', s === el));
      sv.dataset.step = i;
      const word = el.querySelector('h3').textContent;
      sw.classList.add('out');
      setTimeout(() => { sw.textContent = word; sw.classList.remove('out'); }, 260);
    };
    steps[0].classList.add('active');
    const sio = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && setStep(e.target)),
      {rootMargin: '-45% 0px -45% 0px'});
    steps.forEach(s => sio.observe(s));
  }

  /* ---- Halo lumineux qui suit la souris + bord lumineux des cartes ---- */
  if (matchMedia('(pointer: fine)').matches && !reduce){
    const glow = $('#glow');
    let gx = innerWidth / 2, gy = innerHeight / 2, tx = gx, ty = gy;
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; document.body.classList.add('has-pointer'); }, {passive:true});
    (function follow(){ gx += (tx - gx) * .12; gy += (ty - gy) * .12; glow.style.transform = `translate(${gx}px,${gy}px)`; requestAnimationFrame(follow); })();
    document.querySelectorAll('.need,.offer,.tcard,.media-card').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

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

  /* ---- Vagues animées (héros, séparations) : seulement quand elles sont visibles ---- */
  const waves = [...document.querySelectorAll('path[data-wave]')].map(el => {
    const [mode, amp, off, sp, ph] = el.dataset.wave.split(' ');
    const svg = el.ownerSVGElement;
    return { el, svg, mode, amp:+amp, off:+off, sp:+sp, ph:+ph, H: svg.viewBox.baseVal.height };
  });
  const visibleSvg = new Set();
  const wio = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? visibleSvg.add(e.target) : visibleSvg.delete(e.target)));
  new Set(waves.map(w => w.svg)).forEach(s => wio.observe(s));
  function drawWaves(t){
    for (const w of waves){
      if (!visibleSvg.has(w.svg) && t) continue;
      const T = t + w.ph * 1700;
      let d = '';
      for (let x = 0; x <= 1440; x += 30){
        const y = w.off + Math.sin(x / 230 + T / w.sp) * w.amp + Math.sin(x / 95 + T / (w.sp * .7)) * w.amp * .35;
        d += (x ? ' L' : 'M') + x + ' ' + y.toFixed(1);
      }
      if (w.mode === 'fill-top') d = 'M0 0 L' + d.slice(1) + ' L1440 0 Z';
      else if (w.mode === 'fill-bottom') d += ` L1440 ${w.H} L0 ${w.H} Z`;
      w.el.setAttribute('d', d);
    }
  }

  /* ---- Titres qui émergent des profondeurs (mot par mot, avec ondulation) ---- */
  document.querySelectorAll('h1.emerge').forEach(h => {
    let i = 0;
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3){
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)){ frag.append(part); return; }
          const s = document.createElement('span'); s.className = 'w'; s.textContent = part;
          s.style.setProperty('--d', (i++ * .14 + .15) + 's'); frag.append(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
    walk(h);
    h.classList.add('go');
  });
  const disp = document.querySelector('#water feDisplacementMap');
  if (disp && !reduce && document.querySelector('h1.emerge')){
    const t0 = performance.now();
    (function ripple(now){
      const k = Math.min(1, (now - t0) / 2600);
      disp.setAttribute('scale', (38 * Math.pow(1 - k, 2)).toFixed(2));
      if (k < 1) requestAnimationFrame(ripple);
      else document.querySelectorAll('h1.emerge').forEach(h => h.style.filter = 'none');
    })(t0);
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
      cx.beginPath(); cx.arc(x, y, p.r * p.z, 0, 6.28); cx.fillStyle = '#bfe6ff'; cx.fill();
    }
  }
  function loop(t){
    drawWaves(t);
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

  /* ---- Musique d'ambiance douce : générée dans le navigateur, aucun fichier.
     Ne démarre jamais seule : uniquement au clic sur le bouton. ---- */
  function createAmbient(){
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const master = ac.createGain(); master.gain.value = 0;
    const tone = ac.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2200; tone.Q.value = .3;
    // Réverbération douce (salle « aquatique ») fabriquée à la volée
    const len = ac.sampleRate * 5, ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++){ const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/len, 2.6); }
    const verb = ac.createConvolver(); verb.buffer = ir;
    const wet = ac.createGain(); wet.gain.value = .7;
    const dry = ac.createGain(); dry.gain.value = .45;
    tone.connect(dry).connect(master);
    tone.connect(verb).connect(wet).connect(master);
    master.connect(ac.destination);

    const hz = m => 440 * Math.pow(2, (m - 69) / 12);
    // Accords lents et apaisants (Do maj9 → La m9 → Fa maj7 → Sol 6/9)
    const chords = [[48,55,59,62,64],[45,52,55,59,64],[41,48,52,57,60],[43,50,55,57,62]];
    const bells = [72,74,76,79,81,84];   // gamme pentatonique : jamais de fausse note
    const CHORD = 10;                    // secondes par accord

    function pad(notes, t){
      notes.forEach((m, i) => {
        [0, 4].forEach(det => {          // deux voix légèrement désaccordées = son chaud
          const o = ac.createOscillator(), g = ac.createGain();
          o.type = i === 0 ? 'sine' : 'triangle';
          o.frequency.value = hz(m); o.detune.value = det ? 6 : -6;
          const peak = (i === 0 ? .055 : .028);
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(peak, t + 4);
          g.gain.setValueAtTime(peak, t + CHORD - 1);
          g.gain.linearRampToValueAtTime(0, t + CHORD + 4);
          o.connect(g).connect(tone); o.start(t); o.stop(t + CHORD + 4.2);
        });
      });
    }
    function bell(t){
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = hz(bells[Math.floor(Math.random() * bells.length)]);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(.022, t + .04);
      g.gain.exponentialRampToValueAtTime(.0001, t + 4.5);
      o.connect(g).connect(tone); o.start(t); o.stop(t + 4.6);
    }

    let next = 0, idx = 0, nextBell = 0, timer = null;
    function schedule(){
      const now = ac.currentTime;
      if (now + 1 > next){ pad(chords[idx++ % chords.length], Math.max(next, now + .1)); next = Math.max(next, now + .1) + CHORD; }
      if (now + 1 > nextBell){ nextBell = Math.max(nextBell, now) + 3 + Math.random() * 5; bell(nextBell); }
    }
    return {
      on: false,
      start(){
        ac.resume(); this.on = true;
        if (!timer){ next = ac.currentTime + .1; nextBell = next + 2; schedule(); timer = setInterval(schedule, 400); }
        master.gain.cancelScheduledValues(ac.currentTime);
        master.gain.setValueAtTime(master.gain.value, ac.currentTime);
        master.gain.linearRampToValueAtTime(.9, ac.currentTime + 3);   // fondu d'entrée de 3 s
      },
      stop(){
        this.on = false;
        master.gain.cancelScheduledValues(ac.currentTime);
        master.gain.setValueAtTime(master.gain.value, ac.currentTime);
        master.gain.linearRampToValueAtTime(0, ac.currentTime + 1.5);  // fondu de sortie
        setTimeout(() => { if (!this.on){ clearInterval(timer); timer = null; ac.suspend(); } }, 1700);
      },
      // Plus on descend dans la page, plus le son devient feutré
      setDepth(p){ tone.frequency.setTargetAtTime(2200 - p * 1500, ac.currentTime, .5); }
    };
  }

  const soundBtn = $('#soundBtn');
  soundBtn && soundBtn.addEventListener('click', () => {
    if (!audio){ audio = createAmbient(); audio.setDepth(progress); }
    audio.on ? audio.stop() : audio.start();
    soundBtn.setAttribute('aria-pressed', audio.on);
    soundBtn.setAttribute('aria-label', audio.on ? "Couper la musique d'ambiance" : "Activer la musique d'ambiance");
  });
  // La musique se coupe quand une vidéo ou un podcast démarre
  document.addEventListener('play', () => { if (audio && audio.on) soundBtn.click(); }, true);

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
      if (audio && audio.on) soundBtn.click();
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
