/* Cartes de vœux : rendu commun à l'aperçu, au PDF et au HTML animé.
 * Aucune dépendance. Exposé sous window.Cartes. */
(function () {
  'use strict';

  const LARGEUR = 1050, HAUTEUR = 740; // proportions A5 paysage (210 × 148 mm)

  const MODELES = {
    elegant: 'Élégant',
    festif: 'Festif',
    epure: 'Épuré',
  };

  const TITRES = [
    'Meilleurs vœux',
    'Bonne année {annee}',
    'Belle année {annee}',
    'Meilleurs vœux pour {annee}',
  ];

  const MESSAGES = [
    "Toute l'équipe vous souhaite une très belle année {annee}, riche en projets, en rencontres et en réussites.",
    "Meilleurs vœux pour cette année {annee} ! Qu'elle vous apporte santé, sérénité et de belles surprises.",
    "Succès et réussite pour {annee} : nous sommes heureux de vous accompagner et de continuer à construire ensemble.",
    "Merci pour votre confiance en {anneePrecedente}. En {annee}, nous continuons à vous accompagner dans chacun de vos projets.",
    "Que {annee} soit l'année de vos plus belles ambitions. Nous serons à vos côtés pour les réaliser.",
  ];

  /* ---------- Outils ---------- */

  function echapper(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function remplir(modele, v) {
    return String(modele || '').replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : ''))
      .replace(/\s+([,.!?;:])/g, (m, p) => (p === ',' || p === '.' ? p : ' ' + p))
      .replace(/\s{2,}/g, ' ').trim();
  }

  function hexVersRvb(hex) {
    let h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    if (isNaN(n)) return [0, 0, 0];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function luminance(hex) {
    const [r, g, b] = hexVersRvb(hex).map((c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function contraste(a, b) {
    const l1 = luminance(a), l2 = luminance(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  /* Choisit, parmi les candidates, la couleur la plus lisible sur le fond. */
  function lisibleSur(fond, candidates) {
    let meilleure = candidates[0], score = 0;
    for (const c of candidates) {
      const s = contraste(fond, c);
      if (s > score) { score = s; meilleure = c; }
    }
    return meilleure;
  }

  function rvba(hex, a) {
    const [r, g, b] = hexVersRvb(hex);
    return `rgba(${r},${g},${b},${a})`;
  }

  /* Générateur pseudo-aléatoire déterministe : la même carte donne
   * toujours les mêmes confettis, dans l'aperçu comme dans le PDF. */
  function hasard(graine) {
    let s = 0;
    for (const ch of String(graine)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
    s = s || 1;
    return () => {
      s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  function nomComplet(client) {
    return [client.prenom, client.nom].filter(Boolean).join(' ').trim();
  }

  /* ---------- Contenu d'une carte ---------- */

  /* Rassemble tout ce qu'affiche la carte pour un client donné. */
  function contenu(charte, reglages, client) {
    const annee = Number(reglages.annee) || new Date().getFullYear() + 1;
    const v = {
      annee,
      anneePrecedente: annee - 1,
      prenom: client.prenom || '',
      nom: client.nom || '',
      entreprise: client.entreprise || '',
      maMarque: charte.nom || '',
    };
    const choixMessage = client.messageChoix != null && client.messageChoix !== '' ? client.messageChoix : reglages.messageChoix;
    let message;
    if (choixMessage === 'perso') {
      message = (client.messageChoix === 'perso' ? client.messagePerso : reglages.messagePerso) || '';
    } else {
      message = MESSAGES[Number(choixMessage) || 0];
    }
    const titre = reglages.titreChoix === 'perso' ? reglages.titrePerso : TITRES[Number(reglages.titreChoix) || 0];
    const qui = nomComplet(client);
    let dedicace = '';
    if (qui && client.entreprise) dedicace = `${qui} · ${client.entreprise}`;
    else dedicace = qui || client.entreprise || '';
    return {
      annee,
      titre: remplir(titre, v),
      dedicace: dedicace ? remplir(reglages.formuleDedicace || 'Pour {qui}', Object.assign({}, v, { qui: dedicace })) : '',
      message: remplir(message, v),
      note: remplir(client.note || '', v),
      signature: remplir(charte.signature || charte.nom || '', v),
      logo: charte.logo || '',
      logoClient: reglages.logoClient && client.logo ? client.logo : '',
      site: charte.site || '',
    };
  }

  /* ---------- Couleurs effectives d'un modèle ---------- */

  function palette(charte, modele) {
    const c = charte.couleurs || {};
    const p = c.principale || '#1f3c88', s = c.secondaire || '#e3b04b';
    const f = c.fond || '#fbf8f2', t = c.texte || '#1c1c1c';
    if (modele === 'elegant') {
      // Fond profond : la couleur de marque la plus sombre, sinon le texte, sinon un bleu nuit
      const fond = [p, s].find((x) => luminance(x) < 0.12) || (luminance(t) < 0.12 ? t : '#1b1f2a');
      const encre = lisibleSur(fond, [f, '#ffffff', t]);
      const accent = [s, p].find((x) => x !== fond && contraste(fond, x) >= 2.5) || lisibleSur(fond, ['#e8c37a', '#ffffff']);
      return { fond, encre, accent, doux: rvba(encre, 0.72), filigrane: rvba(accent, 0.12), c1: p, c2: s };
    }
    if (modele === 'festif') {
      const fond = luminance(f) > 0.6 ? f : '#fffaf3';
      const titre = contraste(fond, p) >= 3 ? p : lisibleSur(fond, [t, '#1c1c1c']);
      const encre = lisibleSur(fond, [t, '#1c1c1c']);
      return { fond, encre, accent: titre, doux: rvba(encre, 0.75), filigrane: rvba(p, 0.08), c1: p, c2: s };
    }
    // épuré
    const fond = '#ffffff';
    const encre = lisibleSur(fond, [t, '#1c1c1c']);
    const accent = contraste(fond, p) >= 3 ? p : encre;
    return { fond, encre, accent, doux: rvba(encre, 0.7), filigrane: rvba(p, 0.07), c1: p, c2: s };
  }

  /* ---------- Feuille de style des cartes ---------- */

  function css() {
    return `
.cv{position:relative;width:${LARGEUR}px;height:${HAUTEUR}px;overflow:hidden;background:var(--cv-fond);color:var(--cv-encre);
  font-family:var(--cv-police-texte),system-ui,sans-serif;box-sizing:border-box;-webkit-font-smoothing:antialiased}
.cv *{box-sizing:border-box;margin:0;padding:0}
.cv-deco,.cv-confettis{position:absolute;inset:0;pointer-events:none}
.cv-annee{position:absolute;right:-18px;bottom:-70px;font-family:var(--cv-police-titre),Georgia,serif;font-weight:700;
  font-size:330px;line-height:1;letter-spacing:-.04em;color:var(--cv-filigrane);white-space:nowrap}
.cv-contenu{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:84px 104px}
.cv-dedicace{font-size:19px;letter-spacing:.16em;text-transform:uppercase;color:var(--cv-doux);margin-bottom:26px}
.cv-titre{font-family:var(--cv-police-titre),Georgia,serif;font-weight:700;font-size:84px;line-height:1.02;letter-spacing:-.01em;
  color:var(--cv-accent);margin-bottom:30px;max-width:820px}
.cv-message{font-size:25px;line-height:1.55;max-width:700px;color:var(--cv-encre)}
.cv-note{font-family:var(--cv-police-titre),Georgia,serif;font-style:italic;font-size:24px;line-height:1.45;max-width:680px;
  margin-top:22px;color:var(--cv-doux)}
.cv-signature{position:absolute;left:104px;right:104px;bottom:56px;display:flex;align-items:center;gap:18px;font-size:18px;
  color:var(--cv-doux)}
.cv-signature img{max-height:54px;max-width:190px;object-fit:contain}
.cv-signature span{font-weight:600}
.cv-logo-client{position:absolute;top:52px;right:64px;max-height:64px;max-width:200px;object-fit:contain}
.cv-filet{display:block;width:84px;height:3px;background:var(--cv-c2);margin-bottom:26px;border-radius:2px}

/* Élégant : fond profond, double cadre, étoiles */
.cv--elegant .cv-cadre{position:absolute;inset:28px;border:1.5px solid var(--cv-accent);opacity:.65}
.cv--elegant .cv-cadre::after{content:"";position:absolute;inset:9px;border:1px solid var(--cv-accent);opacity:.45}
.cv--elegant .cv-etoile{position:absolute;width:10px;height:10px;background:var(--cv-accent);transform:rotate(45deg);border-radius:1px}
.cv--elegant .cv-dedicace{color:var(--cv-accent)}
.cv--elegant .cv-titre{color:var(--cv-encre)}
.cv--elegant .cv-filet{background:var(--cv-accent)}

/* Festif : confettis aux couleurs de la charte */
.cv--festif .cv-confetti{position:absolute;border-radius:2px}
.cv--festif .cv-confetti.rond{border-radius:50%}
.cv--festif .cv-contenu{padding-right:300px}
.cv--festif .cv-annee{right:auto;left:auto;right:-10px;bottom:-60px}

/* Épuré : bande de couleur et pastille */
.cv--epure .cv-bande{position:absolute;left:0;top:0;bottom:0;width:26px;background:var(--cv-c1)}
.cv--epure .cv-bande::after{content:"";position:absolute;left:26px;top:0;bottom:0;width:8px;background:var(--cv-c2)}
.cv--epure .cv-pastille{position:absolute;right:-120px;top:-120px;width:420px;height:420px;border-radius:50%;background:var(--cv-c1);opacity:.09}
.cv--epure .cv-pastille.deux{right:auto;left:-90px;top:auto;bottom:-150px;width:260px;height:260px;background:var(--cv-c2);opacity:.07}
.cv--epure .cv-contenu{padding-left:130px}
.cv--epure .cv-signature{left:130px}

/* Format portrait (carte animée sur téléphone) */
.cv.cv-portrait{width:${HAUTEUR}px;height:${LARGEUR}px}
.cv-portrait .cv-contenu{padding:110px 64px 170px}
.cv-portrait .cv-titre{font-size:78px}
.cv-portrait .cv-message{font-size:29px}
.cv-portrait .cv-note{font-size:27px}
.cv-portrait .cv-dedicace{font-size:21px}
.cv-portrait .cv-signature{left:64px;right:64px;bottom:64px;font-size:21px}
.cv-portrait .cv-annee{font-size:270px;bottom:-56px}
.cv-portrait .cv-logo-client{top:44px;right:48px}
.cv--festif.cv-portrait .cv-contenu{padding-right:64px}
.cv--festif.cv-portrait .cv-confetti{opacity:.45}
.cv--epure.cv-portrait .cv-contenu{padding-left:84px}
.cv--epure.cv-portrait .cv-signature{left:84px}
`;
  }

  function variables(charte, modele) {
    const p = palette(charte, modele);
    const pol = (n, defaut) => (n ? `'${String(n).replace(/'/g, '')}'` : defaut);
    return [
      `--cv-fond:${p.fond}`, `--cv-encre:${p.encre}`, `--cv-accent:${p.accent}`, `--cv-doux:${p.doux}`,
      `--cv-filigrane:${p.filigrane}`, `--cv-c1:${p.c1}`, `--cv-c2:${p.c2}`,
      `--cv-police-titre:${pol(charte.policeTitre, 'Georgia')}`,
      `--cv-police-texte:${pol(charte.policeTexte, 'system-ui')}`,
    ].join(';');
  }

  function decor(modele, charte, graine) {
    const r = hasard(graine + modele);
    if (modele === 'elegant') {
      let etoiles = '';
      ['left:65px;top:65px', 'right:65px;top:65px', 'left:65px;bottom:65px', 'right:65px;bottom:65px']
        .forEach((pos) => { etoiles += `<i class="cv-etoile" style="${pos}"></i>`; });
      for (let i = 0; i < 14; i++) {
        const x = 840 + r() * 150, y = 70 + r() * 300, t = 3 + r() * 5;
        etoiles += `<i class="cv-etoile cv-scintille" style="left:${(x / LARGEUR * 100).toFixed(1)}%;top:${(y / HAUTEUR * 100).toFixed(1)}%;width:${t.toFixed(1)}px;height:${t.toFixed(1)}px;opacity:${(0.35 + r() * 0.5).toFixed(2)};animation-delay:${(r() * 3).toFixed(2)}s"></i>`;
      }
      return `<div class="cv-deco"><div class="cv-cadre"></div>${etoiles}</div>`;
    }
    if (modele === 'festif') {
      const p = palette(charte, 'festif');
      const couleurs = [p.c1, p.c2, rvba(p.c1, 0.55), rvba(p.c2, 0.6)];
      let html = '';
      for (let i = 0; i < 46; i++) {
        // concentrés sur la droite et le haut, pour laisser le texte lisible
        const x = r() < 0.75 ? 700 + r() * 350 : r() * LARGEUR;
        const y = x > 680 ? r() * HAUTEUR : r() * 70;
        const rond = r() < 0.3;
        const l = rond ? 8 + r() * 8 : 6 + r() * 8, h = rond ? l : 12 + r() * 14;
        const rot = Math.round(r() * 360), c = couleurs[Math.floor(r() * couleurs.length)];
        html += `<i class="cv-confetti${rond ? ' rond' : ''}" style="left:${(x / LARGEUR * 100).toFixed(1)}%;top:${(y / HAUTEUR * 100).toFixed(1)}%;width:${l.toFixed(0)}px;height:${h.toFixed(0)}px;background:${c};transform:rotate(${rot}deg);--rot:${rot}deg;--retard:${(r() * 1.2).toFixed(2)}s;--duree:${(5 + r() * 5).toFixed(2)}s"></i>`;
      }
      return `<div class="cv-confettis">${html}</div>`;
    }
    return `<div class="cv-deco"><div class="cv-bande"></div><div class="cv-pastille"></div><div class="cv-pastille deux"></div></div>`;
  }

  /* HTML de la carte seule (un bloc .cv de 1050 × 740 px). */
  function carte(charte, reglages, client) {
    const modele = MODELES[reglages.modele] ? reglages.modele : 'elegant';
    const k = contenu(charte, reglages, client);
    const graine = (client.id || '') + nomComplet(client);
    return `<div class="cv cv--${modele}" style="${variables(charte, modele)}">
  ${decor(modele, charte, graine)}
  <div class="cv-annee" data-anim="annee">${k.annee}</div>
  ${k.logoClient ? `<img class="cv-logo-client" data-anim="logo" src="${echapper(k.logoClient)}" alt="">` : ''}
  <div class="cv-contenu">
    ${k.dedicace ? `<p class="cv-dedicace" data-anim="1">${echapper(k.dedicace)}</p>` : ''}
    <span class="cv-filet" data-anim="2"></span>
    <h1 class="cv-titre" data-anim="3">${echapper(k.titre)}</h1>
    ${k.message ? `<p class="cv-message" data-anim="4">${echapper(k.message).replace(/\n/g, '<br>')}</p>` : ''}
    ${k.note ? `<p class="cv-note" data-anim="5">${echapper(k.note).replace(/\n/g, '<br>')}</p>` : ''}
  </div>
  ${(k.logo || k.signature) ? `<div class="cv-signature" data-anim="6">${k.logo ? `<img src="${echapper(k.logo)}" alt="">` : ''}${k.signature ? `<span>${echapper(k.signature)}</span>` : ''}</div>` : ''}
</div>`;
  }

  function lienPolices(charte) {
    const familles = [charte.policeTitre, charte.policeTexte].filter(Boolean)
      .filter((f, i, t) => t.indexOf(f) === i)
      .filter((f) => !/^(georgia|arial|helvetica|times|verdana|system-ui|sans-serif|serif)$/i.test(f));
    if (!familles.length) return '';
    const q = familles.map((f) => 'family=' + encodeURIComponent(f).replace(/%20/g, '+') + ':ital,wght@0,400;0,600;0,700;1,400').join('&');
    return `https://fonts.googleapis.com/css2?${q}&display=swap`;
  }

  /* ---------- Page HTML animée, autonome ---------- */

  function pageAnimee(charte, reglages, client, options) {
    options = options || {};
    const modele = MODELES[reglages.modele] ? reglages.modele : 'elegant';
    const k = contenu(charte, reglages, client);
    const p = palette(charte, modele);
    const polices = lienPolices(charte);
    const prenom = client.prenom || client.entreprise || '';
    const titrePage = `${k.titre}${prenom ? ' · ' + prenom : ''}${charte.nom ? ' · ' + charte.nom : ''}`;
    const sceau = charte.logo
      ? `<img src="${echapper(charte.logo)}" alt="">`
      : `<b>${echapper((charte.nom || 'V').trim().charAt(0).toUpperCase())}</b>`;
    const fondPage = modele === 'elegant' ? p.fond : (luminance(p.c1) < 0.5 ? p.c1 : '#1b1f2a');
    const encrePage = lisibleSur(fondPage, ['#ffffff', '#1c1c1c']);

    return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${echapper(titrePage)}</title>
${polices ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${polices}">` : ''}
<style>
html,body{margin:0;height:100%}
body{background:${fondPage};color:${encrePage};font-family:${charte.policeTexte ? `'${String(charte.policeTexte).replace(/'/g, '')}',` : ''}system-ui,sans-serif;
  display:flex;align-items:center;justify-content:center;overflow:hidden;
  background-image:radial-gradient(circle at 50% 40%, ${rvba(encrePage, 0.10)}, transparent 65%)}
#ciel{position:fixed;inset:0;width:100%;height:100%;pointer-events:none}
.scene{position:fixed;left:50%;top:calc(50% - 26px);width:${LARGEUR}px;height:${HAUTEUR}px;transform:translate(-50%,-50%);transform-origin:center}
.scene.portrait{width:${HAUTEUR}px;height:${LARGEUR}px}
.portrait .enveloppe p{font-size:44px}
.portrait .enveloppe small{font-size:22px}
.portrait .sceau{width:170px;height:170px}
.enveloppe{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;
  background:${p.c1};color:${lisibleSur(p.c1, ['#ffffff', '#1c1c1c'])};border-radius:10px;
  box-shadow:0 40px 90px rgba(0,0,0,.35);transition:transform 1s cubic-bezier(.7,0,.3,1),opacity .8s ease .5s;z-index:3;overflow:hidden}
.enveloppe::before{content:"";position:absolute;left:0;right:0;top:0;height:58%;
  background:linear-gradient(to bottom right, transparent 49.6%, ${rvba('#000000', 0.12)} 50%) left/50.1% 100% no-repeat,
  linear-gradient(to bottom left, transparent 49.6%, ${rvba('#000000', 0.12)} 50%) right/50.1% 100% no-repeat}
.enveloppe p{position:relative;font-size:30px;margin:0;text-align:center;padding:0 60px;line-height:1.35}
.enveloppe small{position:relative;font-size:17px;letter-spacing:.2em;text-transform:uppercase;opacity:.8}
.sceau{position:relative;width:124px;height:124px;border-radius:50%;background:${p.c2};border:none;cursor:pointer;
  display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(0,0,0,.3),inset 0 0 0 6px ${rvba('#ffffff', 0.25)};
  animation:pulse 2.2s ease-in-out infinite;padding:20px}
.sceau img{max-width:100%;max-height:100%;object-fit:contain}
.sceau b{font-size:54px;color:${lisibleSur(p.c2, ['#ffffff', '#1c1c1c'])};font-family:${charte.policeTitre ? `'${String(charte.policeTitre).replace(/'/g, '')}',` : ''}Georgia,serif}
.sceau:focus-visible{outline:3px solid ${lisibleSur(p.c1, ['#ffffff', '#1c1c1c'])};outline-offset:6px}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
.ouverte .enveloppe{transform:translateY(115%) rotate(4deg);opacity:0;pointer-events:none}
.carte-cadre{position:absolute;inset:0;border-radius:10px;overflow:hidden;box-shadow:0 40px 90px rgba(0,0,0,.35);
  transform:scale(.94);opacity:0;transition:transform 1.2s cubic-bezier(.2,.8,.2,1) .35s,opacity .8s ease .35s}
.ouverte .carte-cadre{transform:none;opacity:1}
[data-anim]{opacity:0;transform:translateY(22px)}
.ouverte [data-anim]{animation:monte .9s cubic-bezier(.2,.8,.2,1) forwards}
.ouverte [data-anim="1"]{animation-delay:1.1s}.ouverte [data-anim="2"]{animation-delay:1.3s}
.ouverte [data-anim="3"]{animation-delay:1.5s}.ouverte [data-anim="4"]{animation-delay:2.1s}
.ouverte [data-anim="5"]{animation-delay:2.7s}.ouverte [data-anim="6"]{animation-delay:3.2s}
.ouverte [data-anim="logo"]{animation-delay:3.4s}
.ouverte [data-anim="annee"]{animation:annee 2.4s cubic-bezier(.2,.8,.2,1) .9s forwards;transform:translateY(80px) scale(.9)}
@keyframes monte{to{opacity:1;transform:none}}
@keyframes annee{to{opacity:1;transform:none}}
.ouverte .cv-confetti{animation:tombe var(--duree) linear var(--retard) infinite}
@keyframes tombe{0%{transform:translateY(-760px) rotate(var(--rot))}100%{transform:translateY(0) rotate(calc(var(--rot) + 540deg))}}
.cv-scintille{animation:scintille 2.6s ease-in-out infinite}
@keyframes scintille{0%,100%{opacity:.15;transform:rotate(45deg) scale(.6)}50%{opacity:.95;transform:rotate(45deg) scale(1.15)}}
.actions{position:fixed;left:0;right:0;bottom:14px;display:flex;justify-content:center;gap:14px;font-size:14px;opacity:0;transition:opacity .6s 4s}
.ouverte .actions{opacity:1}
.actions a,.actions button{color:inherit;background:${rvba(encrePage, 0.12)};border:1px solid ${rvba(encrePage, 0.25)};border-radius:99px;
  padding:9px 16px;font:inherit;cursor:pointer;text-decoration:none}
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{animation:none!important;transition:none!important}
  [data-anim]{opacity:1!important;transform:none!important}
  .ouverte .enveloppe{display:none}.carte-cadre{opacity:1;transform:none}.actions{opacity:1}
}
${css()}
</style>
</head>
<body>
<canvas id="ciel" aria-hidden="true"></canvas>
<main class="scene" id="scene">
  <div class="carte-cadre">${carte(charte, reglages, client)}</div>
  <div class="enveloppe">
    <small>${echapper(charte.nom || '')}</small>
    <p>${prenom ? `${echapper(prenom)}, une` : 'Une'} carte vous attend</p>
    <button class="sceau" id="ouvrir" aria-label="Ouvrir la carte">${sceau}</button>
    <small>Touchez le sceau pour l'ouvrir</small>
  </div>
</main>
<div class="actions">
  <button type="button" id="rejouer">Revoir l'animation</button>
  ${k.site ? `<a href="${echapper(k.site)}" target="_blank" rel="noopener">${echapper(charte.nom || 'Notre site')}</a>` : ''}
</div>
<script>
(function(){
  var scene=document.getElementById('scene');
  var carte=scene.querySelector('.cv');
  function ajuster(){
    var w=document.documentElement.clientWidth,h=document.documentElement.clientHeight,portrait=w<h*0.85;
    scene.classList.toggle('portrait',portrait);carte.classList.toggle('cv-portrait',portrait);
    var L=portrait?${HAUTEUR}:${LARGEUR},H=portrait?${LARGEUR}:${HAUTEUR};
    var s=Math.min((w-24)/L,(h-90)/H,1.25);
    scene.style.transform='translate(-50%,-50%) scale('+Math.max(s,.2)+')';
  }
  addEventListener('resize',ajuster);ajuster();
  var b=document.body, ouvert=false;
  function ouvrir(){if(ouvert)return;ouvert=true;b.classList.add('ouverte');lancer();}
  document.getElementById('ouvrir').addEventListener('click',ouvrir);
  ${options.ouvertureAuto === false ? '' : 'setTimeout(ouvrir,6000);'}
  document.getElementById('rejouer').addEventListener('click',function(){
    b.classList.remove('ouverte');ouvert=false;void b.offsetWidth;setTimeout(ouvrir,700);
  });
  var cv=document.getElementById('ciel'),c=cv.getContext('2d'),pts=[],anim=0;
  var couleurs=${JSON.stringify([p.c2, encrePage, p.accent])};
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){b.classList.add('ouverte');return;}
  function taille(){cv.width=innerWidth*devicePixelRatio;cv.height=innerHeight*devicePixelRatio;}
  addEventListener('resize',taille);taille();
  function lancer(){
    pts=[];var n=Math.min(140,Math.round(innerWidth/9));
    for(var i=0;i<n;i++)pts.push({x:Math.random()*cv.width,y:-Math.random()*cv.height,r:(1+Math.random()*2.6)*devicePixelRatio,
      v:(0.3+Math.random()*1.1)*devicePixelRatio,o:Math.random()*6.28,c:couleurs[i%couleurs.length]});
    if(!anim)boucle();
  }
  function boucle(){
    c.clearRect(0,0,cv.width,cv.height);
    for(var i=0;i<pts.length;i++){var q=pts[i];q.y+=q.v;q.o+=0.02;q.x+=Math.sin(q.o)*0.6*devicePixelRatio;
      if(q.y>cv.height+10){q.y=-10;q.x=Math.random()*cv.width;}
      c.globalAlpha=0.35+0.35*Math.sin(q.o*2);c.fillStyle=q.c;c.beginPath();c.arc(q.x,q.y,q.r,0,6.28);c.fill();}
    anim=requestAnimationFrame(boucle);
  }
})();
</script>
</body>
</html>`;
  }

  window.Cartes = {
    LARGEUR, HAUTEUR, MODELES, TITRES, MESSAGES,
    css, carte, contenu, pageAnimee, lienPolices, echapper, luminance, contraste, nomComplet,
  };
})();
