/* Extraction d'une charte graphique à partir du code HTML (et CSS) d'une page.
 * Fonctionne entièrement dans le navigateur. Exposé sous window.Extraction. */
(function () {
  'use strict';

  const GENERIQUES = /^(inherit|initial|unset|revert|serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-sans-serif|ui-serif|ui-monospace|-apple-system|blinkmacsystemfont|segoe ui|roboto|helvetica neue|helvetica|arial|noto sans|liberation sans|apple color emoji|segoe ui emoji|segoe ui symbol|noto color emoji|var\(.*\)|dashicons|fontawesome|.*awesome.*|.*icons?.*|.*glyph.*|eicons|swiper-icons|star|wp-.*|revicons|fontello|elementor.*)$/i;

  const NOMMES = {
    white: '#ffffff', black: '#000000', red: '#ff0000', navy: '#000080', gold: '#ffd700', orange: '#ffa500',
  };

  function hex2(n) { return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0'); }
  function rvbVersHex(r, g, b) { return '#' + hex2(r) + hex2(g) + hex2(b); }

  function hslVersRvb(h, s, l) {
    h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [f(0) * 255, f(8) * 255, f(4) * 255];
  }

  /* Convertit une écriture CSS de couleur en { hex, alpha } ou null. */
  function lireCouleur(txt) {
    txt = String(txt).trim().toLowerCase();
    let m;
    if ((m = txt.match(/^#([0-9a-f]{3,8})$/))) {
      let h = m[1];
      if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
      if (h.length !== 6 && h.length !== 8) return null;
      const a = h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1;
      return { hex: '#' + h.slice(0, 6), alpha: a };
    }
    if ((m = txt.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/))) {
      let a = m[4] == null ? 1 : (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
      return { hex: rvbVersHex(+m[1], +m[2], +m[3]), alpha: a };
    }
    if ((m = txt.match(/^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:[\s,/]+([\d.]+%?))?\s*\)$/))) {
      const [r, g, b] = hslVersRvb(+m[1], +m[2], +m[3]);
      let a = m[4] == null ? 1 : (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
      return { hex: rvbVersHex(r, g, b), alpha: a };
    }
    if (NOMMES[txt]) return { hex: NOMMES[txt], alpha: 1 };
    return null;
  }

  function rvb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function teinte(hex) {
    const [r, g, b] = rvb(hex).map((c) => c / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h, s, l };
  }

  function distance(a, b) {
    const x = rvb(a), y = rvb(b);
    return Math.sqrt((x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2);
  }

  const MOTIF_COULEUR = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g;

  /* Recense les couleurs, en donnant plus de poids aux indices forts. */
  function couleurs(css, doc) {
    const poids = new Map();
    const ajouter = (brut, p) => {
      const c = lireCouleur(brut);
      if (!c || c.alpha < 0.5) return;
      poids.set(c.hex, (poids.get(c.hex) || 0) + p);
    };

    const theme = doc && doc.querySelector('meta[name="theme-color"]');
    if (theme) ajouter(theme.getAttribute('content') || '', 25);

    // Variables CSS : les noms parlants pèsent plus lourd
    const reVar = /--([\w-]+)\s*:\s*([^;}{]+)/g;
    let m;
    while ((m = reVar.exec(css))) {
      const nom = m[1].toLowerCase();
      const fort = /(primary|primaire|principal|brand|marque|accent|main|theme|secondary|secondaire)/.test(nom);
      (m[2].match(MOTIF_COULEUR) || []).forEach((c) => ajouter(c, fort ? 12 : 3));
    }
    // Déclarations ordinaires
    const reDecl = /(^|[;{\s])(color|background(?:-color)?|border(?:-[a-z-]+)?|fill|stroke|outline(?:-color)?)\s*:\s*([^;}{]+)/gi;
    while ((m = reDecl.exec(css))) {
      const prop = m[2].toLowerCase();
      const p = prop.startsWith('background') ? 2 : prop === 'color' ? 1.5 : 1;
      (m[3].match(MOTIF_COULEUR) || []).forEach((c) => ajouter(c, p));
    }
    // Styles en ligne et attributs (SVG, Elementor…)
    if (doc) {
      doc.querySelectorAll('[style]').forEach((el) => {
        (el.getAttribute('style').match(MOTIF_COULEUR) || []).forEach((c) => ajouter(c, 1));
      });
      doc.querySelectorAll('[fill],[stroke]').forEach((el) => {
        ['fill', 'stroke'].forEach((a) => { const v = el.getAttribute(a); if (v) ajouter(v, 1); });
      });
    }

    // Regroupe les couleurs presque identiques
    const triees = [...poids.entries()].sort((a, b) => b[1] - a[1]);
    const groupes = [];
    for (const [hex, p] of triees) {
      const proche = groupes.find((g) => distance(g.hex, hex) < 28);
      if (proche) proche.poids += p; else groupes.push({ hex, poids: p });
    }
    groupes.sort((a, b) => b.poids - a.poids);
    return groupes;
  }

  /* Attribue un rôle à chaque couleur : principale, secondaire, fond, texte. */
  function roles(groupes) {
    const vives = groupes.filter((g) => { const t = teinte(g.hex); return t.s > 0.22 && t.l > 0.12 && t.l < 0.88; });
    const neutres = groupes.filter((g) => !vives.includes(g));
    const principale = vives[0] ? vives[0].hex : (neutres.find((g) => teinte(g.hex).l < 0.4) || { hex: '#1f3c88' }).hex;
    let secondaire = null;
    for (const g of vives.slice(1)) {
      const d = Math.abs(teinte(g.hex).h - teinte(principale).h);
      if (Math.min(d, 360 - d) > 25 || Math.abs(teinte(g.hex).l - teinte(principale).l) > 0.25) { secondaire = g.hex; break; }
    }
    if (!secondaire) secondaire = vives[1] ? vives[1].hex : '#e3b04b';
    const clairs = groupes.filter((g) => teinte(g.hex).l > 0.9);
    const sombres = groupes.filter((g) => teinte(g.hex).l < 0.25);
    return {
      principale,
      secondaire,
      fond: clairs[0] ? clairs[0].hex : '#fbf8f2',
      texte: sombres[0] ? sombres[0].hex : '#1c1c1c',
    };
  }

  function polices(css, doc) {
    const compte = new Map();
    const ajouter = (f, p) => {
      f = f.trim().replace(/^['"]|['"]$/g, '').trim();
      if (!f || GENERIQUES.test(f) || /^var\(|[(){}]/.test(f) || f.length > 40) return;
      compte.set(f, (compte.get(f) || 0) + p);
    };
    // Google Fonts chargées par la page
    if (doc) {
      doc.querySelectorAll('link[href*="fonts.googleapis.com"]').forEach((l) => {
        const href = l.getAttribute('href') || '';
        const re = /family=([^&:]+)/g;
        let m;
        while ((m = re.exec(href))) {
          decodeURIComponent(m[1].replace(/\+/g, ' ')).split('|').forEach((f) => ajouter(f.split(':')[0], 6));
        }
      });
    }
    const reImport = /fonts\.googleapis\.com\/css2?\?([^"')\s]+)/g;
    let m;
    while ((m = reImport.exec(css))) {
      const re = /family=([^&:]+)/g;
      let n;
      while ((n = re.exec(m[1]))) ajouter(decodeURIComponent(n[1].replace(/\+/g, ' ')), 6);
    }
    // Déclarations font-family : on retient la première famille de chaque pile
    const titres = new Map();
    const reRegle = /([^{}]+)\{([^{}]*)\}/g;
    while ((m = reRegle.exec(css))) {
      const selecteur = m[1], corps = m[2];
      const f = corps.match(/font-family\s*:\s*([^;]+)/i);
      if (!f) continue;
      const premiere = f[1].split(',').map((x) => x.trim().replace(/^['"]|['"]$/g, '')).find((x) => x && !GENERIQUES.test(x) && !/^var\(|[(){}]/.test(x));
      if (!premiere) continue;
      if (/@font-face/i.test(selecteur)) { ajouter(premiere, 2); continue; }
      ajouter(premiere, 1);
      if (/(^|[\s,])h[1-3]\b|title|titre|heading/i.test(selecteur)) titres.set(premiere, (titres.get(premiere) || 0) + 1);
    }
    // Variables de police (--font-heading, --wp--preset--font-family…)
    const reVar = /--([\w-]*font[\w-]*)\s*:\s*([^;}{]+)/gi;
    while ((m = reVar.exec(css))) {
      // ignore les raccourcis « font: normal 400 1em/1 … » (polices d'icônes)
      if (/\d/.test(m[2].split(',')[0]) || /awesome|icon/i.test(m[2])) continue;
      const premiere = m[2].split(',').map((x) => x.trim().replace(/^['"]|['"]$/g, '')).find((x) => x && !GENERIQUES.test(x) && !/^var\(|[(){}]/.test(x));
      if (premiere && !/^\d/.test(premiere)) {
        ajouter(premiere, 2);
        if (/head|title|titre|display/i.test(m[1])) titres.set(premiere, (titres.get(premiere) || 0) + 3);
      }
    }
    const classees = [...compte.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);
    const titre = [...titres.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0])[0] || classees[0] || '';
    const texte = classees.find((f) => f !== titre) || titre;
    return { liste: classees, titre, texte };
  }

  function absolue(url, base) {
    if (!url) return '';
    if (/^data:/i.test(url)) return url;
    try { return new URL(url, base || undefined).href; } catch (e) { return /^https?:/i.test(url) ? url : ''; }
  }

  function baseDe(doc, base) {
    const b = doc.querySelector('base[href]');
    const canon = doc.querySelector('link[rel="canonical"]');
    const og = doc.querySelector('meta[property="og:url"]');
    return base || (b && b.getAttribute('href')) || (canon && canon.getAttribute('href')) || (og && og.getAttribute('content')) || '';
  }

  function logos(doc, base) {
    const candidats = [];
    const vu = new Set();
    const ajouter = (src, p, type) => {
      const u = absolue(src, base);
      if (!u || vu.has(u)) return;
      vu.add(u);
      candidats.push({ url: u, poids: p, type });
    };
    doc.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
      const indices = [img.getAttribute('class'), img.id, img.getAttribute('alt'), src,
        img.parentElement && img.parentElement.getAttribute('class'),
        img.closest('header') ? 'header' : ''].join(' ').toLowerCase();
      if (/logo/.test(indices)) ajouter(src, img.closest('header') ? 30 : 20, 'logo');
      else if (img.closest('header') && img.closest('a[href="/"], a[href="./"], a[rel="home"]')) ajouter(src, 18, 'logo');
    });
    // Logos en SVG intégré dans l'en-tête
    const svg = doc.querySelector('header a[href="/"] svg, .logo svg, [class*="logo"] svg');
    if (svg) {
      const clone = svg.cloneNode(true);
      if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      try { ajouter('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(clone.outerHTML), 16, 'svg'); } catch (e) { /* rien */ }
    }
    const og = doc.querySelector('meta[property="og:logo"], meta[itemprop="logo"]');
    if (og) ajouter(og.getAttribute('content'), 15, 'logo');
    doc.querySelectorAll('link[rel~="apple-touch-icon"], link[rel~="icon"]').forEach((l) => {
      const taille = parseInt((l.getAttribute('sizes') || '0').split('x')[0], 10) || 0;
      ajouter(l.getAttribute('href'), 4 + Math.min(taille, 512) / 64, 'icone');
    });
    const ogi = doc.querySelector('meta[property="og:image"]');
    if (ogi) ajouter(ogi.getAttribute('content'), 3, 'image');
    return candidats.sort((a, b) => b.poids - a.poids);
  }

  const SEPARATEURS = /\s+[|–—·:-]\s+/;

  /* « EN PROFONDEUR » → « En Profondeur » ; les noms en casse mixte sont gardés. */
  function casse(t) {
    if (t !== t.toUpperCase() || t.length <= 4) return t;
    return t.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
  }

  function nom(doc) {
    const meta = (sel) => { const el = doc.querySelector(sel); return el ? (el.getAttribute('content') || '').trim() : ''; };
    // og:site_name contient parfois le slogan : « Nom - Slogan »
    const site = meta('meta[property="og:site_name"]') || meta('meta[name="application-name"]');
    if (site) return casse(site.split(SEPARATEURS)[0].trim());
    const t = ((doc.querySelector('title') || {}).textContent || '').trim();
    const morceaux = t.split(SEPARATEURS).map((x) => x.trim()).filter(Boolean);
    if (!morceaux.length) return '';
    if (morceaux.length === 1) return casse(morceaux[0]);
    // « Accueil | Mon entreprise » : on écarte les noms de page courants
    const pages = /^(accueil|home|bienvenue|welcome|page d'accueil)$/i;
    const utiles = morceaux.filter((x) => !pages.test(x));
    return casse((utiles.length ? utiles : morceaux).slice().sort((a, b) => a.length - b.length)[0]);
  }

  /* Point d'entrée : html (texte), css (texte facultatif), base (adresse de la page). */
  function analyser(html, css, base) {
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    base = baseDe(doc, base);
    let tout = css || '';
    doc.querySelectorAll('style').forEach((s) => { tout += '\n' + s.textContent; });
    // Code collé qui ne contient que du CSS
    if (!doc.body || (!doc.body.children.length && /[{};]/.test(html) && !/<\w/.test(html))) tout += '\n' + html;
    const groupes = couleurs(tout, doc);
    const p = polices(tout, doc);
    const l = logos(doc, base);
    const feuilles = [...doc.querySelectorAll('link[rel~="stylesheet"][href]')].map((x) => absolue(x.getAttribute('href'), base)).filter(Boolean);
    return {
      nom: nom(doc),
      base,
      couleurs: roles(groupes),
      palette: groupes.slice(0, 12).map((g) => g.hex),
      polices: p,
      logos: l,
      feuillesExternes: feuilles,
      cssAnalyse: tout.length,
    };
  }

  window.Extraction = { analyser, lireCouleur };
})();
