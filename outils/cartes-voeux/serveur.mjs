#!/usr/bin/env node
/* Serveur local de l'outil « Cartes de vœux ».
 *
 *   node outils/cartes-voeux/serveur.mjs      puis ouvrir http://localhost:5177
 *
 * Il sert l'application et ajoute deux fonctions qu'un navigateur seul ne peut
 * pas faire, car les sites refusent d'être lus par une autre page :
 *   /api/page?url=…   récupère le HTML d'un site et ses feuilles de style ;
 *   /api/image?url=…  récupère une image (logo) pour l'intégrer aux cartes.
 * Aucune dépendance : Node 18 ou plus suffit. Rien n'est enregistré sur disque.
 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { lookup } from 'node:dns/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const DOSSIER = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 5177;
const AGENT = 'Mozilla/5.0 (outil local de cartes de voeux)';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.md': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
};
const MAX_PAGE = 3 * 1024 * 1024, MAX_IMAGE = 4 * 1024 * 1024, MAX_FEUILLES = 8;

function privee(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  const x = ip.toLowerCase();
  return x === '::1' || x === '::' || x.startsWith('fc') || x.startsWith('fd') || x.startsWith('fe80') || x.startsWith('::ffff:127.') || x.startsWith('::ffff:10.') || x.startsWith('::ffff:192.168.');
}

/* N'accepte que des adresses web publiques (évite de sonder le réseau local). */
async function verifier(adresse) {
  let u;
  try { u = new URL(/^https?:\/\//i.test(adresse) ? adresse : 'https://' + adresse); } catch { throw new Error('Adresse invalide'); }
  if (!/^https?:$/.test(u.protocol)) throw new Error('Seules les adresses http et https sont acceptées');
  const { address } = await lookup(u.hostname);
  if (privee(address)) throw new Error('Adresse locale refusée');
  return u;
}

async function telecharger(adresse, max, accepte) {
  let u = await verifier(adresse);
  // Suit les redirections à la main pour vérifier chaque étape
  for (let i = 0; i < 6; i++) {
    const r = await fetch(u, { redirect: 'manual', headers: { 'user-agent': AGENT, accept: accepte, 'accept-language': 'fr,en;q=0.8' }, signal: AbortSignal.timeout(15000) });
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
      u = await verifier(new URL(r.headers.get('location'), u).href);
      continue;
    }
    if (!r.ok) throw new Error(`Le site a répondu ${r.status}`);
    const taille = Number(r.headers.get('content-length') || 0);
    if (taille > max) throw new Error('Fichier trop volumineux');
    const tampon = Buffer.from(await r.arrayBuffer());
    if (tampon.length > max) throw new Error('Fichier trop volumineux');
    return { tampon, type: r.headers.get('content-type') || '', url: u.href };
  }
  throw new Error('Trop de redirections');
}

function json(res, code, objet) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(objet));
}

async function page(req, res, q) {
  const { tampon, url } = await telecharger(q.get('url') || '', MAX_PAGE, 'text/html,*/*;q=0.5');
  const html = tampon.toString('utf8');
  // Feuilles de style liées, et @import de premier niveau
  const liens = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0])
    .filter((t) => /rel\s*=\s*["']?[^"'>]*stylesheet/i.test(t))
    .map((t) => (t.match(/href\s*=\s*["']([^"']+)["']/i) || [])[1]).filter(Boolean)
    .map((h) => new URL(h.replace(/&amp;/g, '&'), url).href)
    .filter((h) => !/fonts\.googleapis\.com/.test(h)).slice(0, MAX_FEUILLES);
  const morceaux = await Promise.all(liens.map(async (h) => {
    try {
      const f = await telecharger(h, MAX_PAGE, 'text/css,*/*;q=0.1');
      return `/* ${h} */\n` + f.tampon.toString('utf8');
    } catch { return ''; }
  }));
  json(res, 200, { url, html, css: morceaux.join('\n'), feuilles: liens.length });
}

async function image(req, res, q) {
  const { tampon, type } = await telecharger(q.get('url') || '', MAX_IMAGE, 'image/*');
  if (!/^image\//i.test(type)) throw new Error("Ce lien ne mène pas à une image");
  res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(tampon);
}

async function fichier(req, res, chemin) {
  if (chemin === '/') chemin = '/index.html';
  const cible = normalize(join(DOSSIER, decodeURIComponent(chemin)));
  if (!cible.startsWith(DOSSIER) || /serveur\.mjs$/.test(cible)) { res.writeHead(404); return res.end(); }
  try {
    const contenu = await readFile(cible);
    res.writeHead(200, { 'content-type': TYPES[extname(cible)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(contenu);
  } catch { res.writeHead(404); res.end('Introuvable'); }
}

const serveur = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  try {
    if (u.pathname === '/api/ping') return json(res, 200, { ok: true });
    if (u.pathname === '/api/page') return await page(req, res, u.searchParams);
    if (u.pathname === '/api/image') return await image(req, res, u.searchParams);
    return await fichier(req, res, u.pathname);
  } catch (e) {
    const msg = e && e.name === 'TimeoutError' ? 'Le site met trop de temps à répondre' : (e && e.message) || 'Erreur';
    if (u.pathname.startsWith('/api/')) return json(res, 502, { erreur: msg });
    res.writeHead(500); res.end(msg);
  }
});

serveur.listen(PORT, '127.0.0.1', () => {
  console.log(`Cartes de vœux : http://localhost:${PORT}`);
  console.log('Ctrl+C pour arrêter.');
});
