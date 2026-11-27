/* Cartes de vœux : logique de l'application. */
(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const C = window.Cartes;
  const CLE = 'cartes-voeux-v1';

  const EXEMPLE = { id: 'exemple', prenom: 'Marie', nom: 'Durand', entreprise: 'Atelier Durand', note: '', exemple: true };

  const etat = {
    charte: {
      nom: '', signature: '', site: '', logo: '',
      couleurs: { principale: '#24427a', secondaire: '#e0a84a', fond: '#fbf8f2', texte: '#1c1f26' },
      policeTitre: 'Playfair Display', policeTexte: 'Manrope',
    },
    reglages: {
      annee: new Date().getFullYear() + (new Date().getMonth() >= 6 ? 1 : 0),
      modele: 'elegant', titreChoix: '0', titrePerso: '', messageChoix: '0', messagePerso: '',
      formuleDedicace: 'Pour {qui}', logoClient: true, baseLiens: '',
    },
    clients: [],
    apercuId: '',
  };
  let serveur = false;
  let palette = [];
  let pastilleChoisie = '';
  let vue = 'pdf';

  /* ---------- Sauvegarde locale ---------- */

  function charger() {
    try {
      const d = JSON.parse(localStorage.getItem(CLE) || 'null');
      if (d) {
        Object.assign(etat.charte, d.charte || {});
        etat.charte.couleurs = Object.assign({}, etat.charte.couleurs, (d.charte || {}).couleurs || {});
        Object.assign(etat.reglages, d.reglages || {});
        etat.clients = Array.isArray(d.clients) ? d.clients : [];
        etat.apercuId = d.apercuId || '';
        palette = d.palette || [];
      }
    } catch (e) { /* stockage indisponible : on continue sans */ }
  }
  let minuteurSauvegarde = 0;
  function sauver() {
    clearTimeout(minuteurSauvegarde);
    minuteurSauvegarde = setTimeout(() => {
      try {
        localStorage.setItem(CLE, JSON.stringify({ charte: etat.charte, reglages: etat.reglages, clients: etat.clients, apercuId: etat.apercuId, palette }));
      } catch (e) {
        statut('#client-statut', "Le navigateur n'a pas pu tout enregistrer (logos trop lourds ?). Pensez à exporter avant de fermer.", 'erreur');
      }
    }, 300);
  }

  /* ---------- Utilitaires ---------- */

  function statut(sel, texte, type) {
    const el = $(sel);
    el.textContent = texte || '';
    el.className = 'statut' + (type ? ' ' + type : '');
  }

  function jeton() {
    const t = new Uint8Array(5);
    crypto.getRandomValues(t);
    return [...t].map((x) => x.toString(36).padStart(2, '0')).join('').slice(0, 8);
  }

  function slug(t) {
    return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'client';
  }

  function nomsFichiers(client) {
    const base = `voeux-${etat.reglages.annee}-${slug(C.nomComplet(client) || client.entreprise)}`;
    return { pdf: base + '.pdf', html: `${base}-${client.jeton || 'x'}.html` };
  }

  function lienCarte(client) {
    let b = (etat.reglages.baseLiens || '').trim();
    if (!b) return '';
    if (!b.endsWith('/')) b += '/';
    return b + nomsFichiers(client).html;
  }

  function telecharger(blob, nom) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nom;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function lireFichier(f) {
    return new Promise((ok, ko) => {
      const r = new FileReader();
      r.onload = () => ok(r.result);
      r.onerror = () => ko(r.error);
      r.readAsDataURL(f);
    });
  }

  function blobVersDataUrl(b) { return lireFichier(b); }

  /* Réduit une image matricielle à 640 px de large au plus (PNG, transparence gardée). */
  function reduire(dataUrl) {
    if (/^data:image\/svg/i.test(dataUrl)) return Promise.resolve(dataUrl);
    return new Promise((ok) => {
      const img = new Image();
      img.onload = () => {
        const max = 640;
        if (img.naturalWidth <= max && dataUrl.length < 400000) return ok(dataUrl);
        const k = Math.min(1, max / img.naturalWidth);
        const cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(img.naturalWidth * k));
        cv.height = Math.max(1, Math.round(img.naturalHeight * k));
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        try { ok(cv.toDataURL('image/png')); } catch (e) { ok(dataUrl); }
      };
      img.onerror = () => ok(dataUrl);
      img.src = dataUrl;
    });
  }

  /* Rapatrie une image distante dans la carte, pour qu'elle figure dans le PDF
   * et que la page animée ne dépende pas du site d'origine. */
  async function versDataUrl(url) {
    if (!url || /^data:/i.test(url)) return url;
    let blob = null;
    if (!serveur) {
      try {
        const r = await fetch(url, { mode: 'cors' });
        if (r.ok) blob = await r.blob();
      } catch (e) { /* le site refuse la lecture */ }
    }
    if (!blob && serveur) {
      const r = await fetch('/api/image?url=' + encodeURIComponent(url));
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).erreur || "Image introuvable");
      blob = await r.blob();
    }
    if (!blob) throw new Error('Image non récupérable sans le serveur local');
    if (!/^image\//.test(blob.type)) throw new Error("Ce lien n'est pas une image");
    return reduire(await blobVersDataUrl(blob));
  }

  async function lirePage(url) {
    if (!serveur) throw new Error("Lancez le serveur local pour analyser une adresse (voir LISEZMOI), ou collez le code de la page.");
    const r = await fetch('/api/page?url=' + encodeURIComponent(url));
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.erreur || 'Page inaccessible');
    return d;
  }

  function delier(nom) {
    // « de En Profondeur » → « d'En Profondeur »
    return /^[aeiouyhàâéèêëîïôûù]/i.test(nom) ? "d'" + nom : 'de ' + nom;
  }

  /* ---------- Charte ---------- */

  function remplirChampsCharte() {
    const ch = etat.charte;
    $('#c-principale').value = ch.couleurs.principale;
    $('#c-secondaire').value = ch.couleurs.secondaire;
    $('#c-fond').value = ch.couleurs.fond;
    $('#c-texte').value = ch.couleurs.texte;
    $('#police-titre').value = ch.policeTitre || '';
    $('#police-texte').value = ch.policeTexte || '';
    $('#charte-nom').value = ch.nom || '';
    $('#charte-signature').value = ch.signature || '';
    $('#charte-site').value = ch.site || '';
    afficherLogo();
    afficherPalette();
  }

  function afficherLogo() {
    const z = $('#logo-apercu');
    z.innerHTML = etat.charte.logo ? `<img src="${C.echapper(etat.charte.logo)}" alt="Logo">` : '<span>Aucun logo</span>';
  }

  function afficherPalette() {
    const z = $('#palette');
    z.innerHTML = '';
    palette.forEach((hex) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pastille' + (hex === pastilleChoisie ? ' choisie' : '');
      b.style.background = hex;
      b.title = hex;
      b.setAttribute('aria-label', 'Couleur ' + hex);
      b.addEventListener('click', () => { pastilleChoisie = hex === pastilleChoisie ? '' : hex; afficherPalette(); });
      z.appendChild(b);
    });
    if (pastilleChoisie) {
      const roles = document.createElement('span');
      roles.className = 'ligne-boutons';
      [['principale', 'Principale'], ['secondaire', 'Secondaire'], ['fond', 'Fond'], ['texte', 'Texte']].forEach(([k, l]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'secondaire';
        b.textContent = '→ ' + l;
        b.addEventListener('click', () => {
          etat.charte.couleurs[k] = pastilleChoisie;
          pastilleChoisie = '';
          remplirChampsCharte();
          actualiser();
        });
        roles.appendChild(b);
      });
      z.appendChild(roles);
    }
  }

  function proposerLogos(liste) {
    const z = $('#logos-proposes');
    z.innerHTML = '';
    liste.slice(0, 8).forEach((l) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.title = 'Utiliser ce logo';
      const img = document.createElement('img');
      img.src = l.url;
      img.alt = '';
      img.onerror = () => b.remove();
      b.appendChild(img);
      b.addEventListener('click', () => choisirLogo(l.url));
      z.appendChild(b);
    });
  }

  async function choisirLogo(url) {
    try {
      statut('#charte-statut', 'Récupération du logo…');
      etat.charte.logo = await versDataUrl(url);
      statut('#charte-statut', 'Logo intégré.', 'ok');
    } catch (e) {
      etat.charte.logo = url;
      statut('#charte-statut', `Logo affiché, mais ${e.message.toLowerCase()} : il risque de manquer dans le PDF. Enregistrez-le depuis votre site puis choisissez le fichier.`, 'erreur');
    }
    afficherLogo();
    actualiser();
  }

  async function appliquerAnalyse(r) {
    const ch = etat.charte;
    ch.couleurs = r.couleurs;
    palette = r.palette;
    if (r.polices.titre) ch.policeTitre = r.polices.titre;
    if (r.polices.texte) ch.policeTexte = r.polices.texte;
    const dl = $('#liste-polices');
    dl.innerHTML = '';
    [...new Set([...r.polices.liste, 'Playfair Display', 'Cormorant Garamond', 'Lora', 'Montserrat', 'Manrope', 'Poppins', 'Raleway', 'Open Sans', 'Lato', 'Great Vibes', 'Dancing Script'])]
      .forEach((f) => { const o = document.createElement('option'); o.value = f; dl.appendChild(o); });
    if (r.nom) {
      ch.nom = r.nom;
      if (!ch.signature || /^Toute l'équipe/.test(ch.signature)) ch.signature = "Toute l'équipe " + delier(r.nom);
    }
    if (r.base && /^https?:/.test(r.base)) ch.site = new URL(r.base).origin + '/';
    proposerLogos(r.logos);
    remplirChampsCharte();
    actualiser();
    const morceaux = [`${palette.length} couleurs`, r.polices.liste.length ? `${r.polices.liste.length} polices` : 'aucune police', `${r.logos.length} logo(s) possible(s)`];
    let msg = 'Trouvé : ' + morceaux.join(', ') + '. Vérifiez et ajustez ci-dessous.';
    if (!serveur && r.feuillesExternes.length && r.cssAnalyse < 4000) {
      msg += ` La page utilise ${r.feuillesExternes.length} feuille(s) de style externe(s) non analysée(s) : les couleurs peuvent être incomplètes.`;
    }
    statut('#charte-statut', msg, 'ok');
    // Premier logo exploitable
    for (const l of r.logos.filter((x) => x.type !== 'image').slice(0, 3)) {
      try {
        ch.logo = await versDataUrl(l.url);
        afficherLogo();
        actualiser();
        break;
      } catch (e) { /* suivant */ }
    }
  }

  async function analyserUrl() {
    const url = $('#charte-url').value.trim();
    if (!url) return statut('#charte-statut', 'Indiquez une adresse.', 'erreur');
    const b = $('#charte-analyser-url');
    b.disabled = true;
    statut('#charte-statut', 'Analyse du site…');
    try {
      const d = await lirePage(url);
      await appliquerAnalyse(Extraction.analyser(d.html, d.css, d.url));
    } catch (e) {
      statut('#charte-statut', e.message, 'erreur');
    } finally { b.disabled = false; }
  }

  async function analyserCode() {
    const code = $('#charte-code').value;
    if (!code.trim()) return statut('#charte-statut', 'Collez d’abord le code de votre page.', 'erreur');
    let base = $('#charte-base').value.trim();
    if (base && !/^https?:\/\//i.test(base)) base = 'https://' + base;
    let css = '';
    const r0 = Extraction.analyser(code, '', base);
    // Avec le serveur, on va aussi chercher les feuilles de style externes
    if (serveur && r0.feuillesExternes.length) {
      statut('#charte-statut', 'Lecture des feuilles de style…');
      const parts = await Promise.all(r0.feuillesExternes.slice(0, 8).map((h) =>
        fetch('/api/page?url=' + encodeURIComponent(h)).then((r) => r.json()).then((d) => d.html || '').catch(() => '')));
      css = parts.join('\n');
    }
    await appliquerAnalyse(css ? Extraction.analyser(code, css, base) : r0);
  }

  /* ---------- Réglages de la carte ---------- */

  function construireChoix() {
    const t = $('#titre-choix');
    t.innerHTML = C.TITRES.map((x, i) => `<option value="${i}">${C.echapper(x.replace('{annee}', etat.reglages.annee))}</option>`).join('') + '<option value="perso">Titre personnalisé…</option>';
    t.value = etat.reglages.titreChoix;

    const m = $('#messages');
    m.innerHTML = C.MESSAGES.map((x, i) => `<label><input type="radio" name="message" value="${i}"> <span>${C.echapper(x.replace(/\{annee\}/g, etat.reglages.annee).replace(/\{anneePrecedente\}/g, etat.reglages.annee - 1))}</span></label>`).join('')
      + '<label><input type="radio" name="message" value="perso"> <span><b>Message personnalisé</b></span></label>';
    const coche = m.querySelector(`input[value="${etat.reglages.messageChoix}"]`);
    if (coche) coche.checked = true;
    $('#message-perso').hidden = etat.reglages.messageChoix !== 'perso';
    $('#titre-perso-zone').hidden = etat.reglages.titreChoix !== 'perso';

    const cm = $('#client-message-choix');
    const val = cm.value;
    cm.innerHTML = '<option value="">Le message choisi pour tous</option>'
      + C.MESSAGES.map((x, i) => `<option value="${i}">${C.echapper(x.replace(/\{annee\}/g, etat.reglages.annee).replace(/\{anneePrecedente\}/g, etat.reglages.annee - 1).slice(0, 70))}…</option>`).join('')
      + '<option value="perso">Un message rien que pour ce client…</option>';
    cm.value = val;
  }

  function construireModeles() {
    const z = $('#modeles');
    z.innerHTML = Object.entries(C.MODELES).map(([k, l]) =>
      `<label class="modele"><input type="radio" name="modele" value="${k}"${k === etat.reglages.modele ? ' checked' : ''}><span class="vignette" data-modele="${k}"></span>${l}</label>`).join('');
  }

  function vignettes() {
    document.querySelectorAll('.vignette').forEach((v) => {
      const r = Object.assign({}, etat.reglages, { modele: v.dataset.modele });
      v.innerHTML = `<div>${C.carte(etat.charte, r, clientApercu())}</div>`;
      v.firstChild.style.transform = `scale(${v.clientWidth / C.LARGEUR})`;
    });
  }

  function remplirChampsReglages() {
    const r = etat.reglages;
    $('#annee').value = r.annee;
    $('#titre-perso').value = r.titrePerso;
    $('#message-perso').value = r.messagePerso;
    $('#formule-dedicace').value = r.formuleDedicace;
    $('#logo-client').checked = !!r.logoClient;
    $('#base-liens').value = r.baseLiens;
    construireChoix();
    construireModeles();
  }

  /* ---------- Clients ---------- */

  function clientApercu() {
    return etat.clients.find((c) => c.id === etat.apercuId) || etat.clients[0] || EXEMPLE;
  }

  function viderFormulaire() {
    $('#form-client').reset();
    $('#client-id').value = '';
    $('#client-logo').value = '';
    $('#client-logo-info').textContent = '';
    $('#client-message-perso').hidden = true;
    $('#client-enregistrer').textContent = 'Ajouter le client';
    $('#client-annuler').hidden = true;
  }

  function lireFormulaire() {
    return {
      prenom: $('#client-prenom').value.trim(),
      nom: $('#client-nom').value.trim(),
      entreprise: $('#client-entreprise').value.trim(),
      site: $('#client-site').value.trim(),
      email: $('#client-email').value.trim(),
      messageChoix: $('#client-message-choix').value,
      messagePerso: $('#client-message-perso').value.trim(),
      note: $('#client-note').value.trim(),
      logo: $('#client-logo').value,
    };
  }

  function enregistrerClient(ev) {
    ev.preventDefault();
    const d = lireFormulaire();
    if (!d.prenom && !d.nom && !d.entreprise) return statut('#client-statut', 'Indiquez au moins un nom, un prénom ou une entreprise.', 'erreur');
    const id = $('#client-id').value;
    if (id) {
      const c = etat.clients.find((x) => x.id === id);
      Object.assign(c, d);
      statut('#client-statut', 'Client modifié.', 'ok');
    } else {
      const c = Object.assign({ id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), jeton: jeton() }, d);
      etat.clients.push(c);
      etat.apercuId = c.id;
      statut('#client-statut', `${C.nomComplet(c) || c.entreprise} ajouté.`, 'ok');
    }
    viderFormulaire();
    listeClients();
    actualiser();
  }

  function modifierClient(c) {
    $('#client-id').value = c.id;
    $('#client-prenom').value = c.prenom || '';
    $('#client-nom').value = c.nom || '';
    $('#client-entreprise').value = c.entreprise || '';
    $('#client-site').value = c.site || '';
    $('#client-email').value = c.email || '';
    $('#client-message-choix').value = c.messageChoix || '';
    $('#client-message-perso').value = c.messagePerso || '';
    $('#client-message-perso').hidden = c.messageChoix !== 'perso';
    $('#client-note').value = c.note || '';
    $('#client-logo').value = c.logo || '';
    $('#client-logo-info').textContent = c.logo ? 'Logo du client enregistré.' : '';
    $('#client-enregistrer').textContent = 'Enregistrer les modifications';
    $('#client-annuler').hidden = false;
    etat.apercuId = c.id;
    actualiser();
    $('#form-client').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function listeClients() {
    const ul = $('#clients');
    ul.innerHTML = '';
    const n = etat.clients.length;
    $('#compte-clients').textContent = n ? `${n} client${n > 1 ? 's' : ''}` : 'Aucun client : l’aperçu montre un exemple.';
    $('#clients-vider').hidden = !n;
    etat.clients.forEach((c) => {
      const li = document.createElement('li');
      if (c.id === clientApercu().id) li.className = 'selection';
      const lien = lienCarte(c);
      const sujet = encodeURIComponent(`${C.contenu(etat.charte, etat.reglages, c).titre}${etat.charte.nom ? ' de la part ' + delier(etat.charte.nom) : ''}`);
      const corps = encodeURIComponent(`Bonjour${c.prenom ? ' ' + c.prenom : ''},\n\n` + (lien ? `Nous vous avons préparé une petite carte de vœux : ${lien}\n\n` : 'Vous trouverez notre carte de vœux en pièce jointe.\n\n') + `Très belle année ${etat.reglages.annee} !\n\n${etat.charte.signature || etat.charte.nom || ''}`);
      li.innerHTML = `${c.logo ? `<img src="${C.echapper(c.logo)}" alt="">` : ''}
        <div class="qui" tabindex="0" role="button" title="Afficher dans l'aperçu"><b>${C.echapper(C.nomComplet(c) || c.entreprise)}</b><small>${C.echapper([C.nomComplet(c) ? c.entreprise : '', c.email].filter(Boolean).join(' · '))}</small></div>
        <div class="actions">
          <button type="button" data-a="modifier">Modifier</button>
          <button type="button" data-a="pdf">PDF</button>
          <button type="button" data-a="html">HTML</button>
          ${c.email ? `<a href="mailto:${encodeURIComponent(c.email)}?subject=${sujet}&body=${corps}">E-mail</a>` : ''}
          <button type="button" data-a="suppr" class="suppr" aria-label="Supprimer ${C.echapper(C.nomComplet(c) || c.entreprise)}">✕</button>
        </div>`;
      const voir = () => { etat.apercuId = c.id; listeClients(); actualiser(); };
      li.querySelector('.qui').addEventListener('click', voir);
      li.querySelector('.qui').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); voir(); } });
      li.querySelector('[data-a="modifier"]').addEventListener('click', () => modifierClient(c));
      li.querySelector('[data-a="pdf"]').addEventListener('click', (e) => unPdf(c, e.currentTarget));
      li.querySelector('[data-a="html"]').addEventListener('click', () => unHtml(c));
      li.querySelector('[data-a="suppr"]').addEventListener('click', () => {
        if (!confirm(`Supprimer ${C.nomComplet(c) || c.entreprise} ?`)) return;
        etat.clients = etat.clients.filter((x) => x !== c);
        listeClients();
        actualiser();
      });
      ul.appendChild(li);
    });
    // Sélecteur de l'aperçu
    const s = $('#apercu-client');
    s.innerHTML = (etat.clients.length ? '' : '<option value="exemple">Exemple : Marie Durand</option>')
      + etat.clients.map((c) => `<option value="${c.id}">${C.echapper(C.nomComplet(c) || c.entreprise)}</option>`).join('');
    s.value = clientApercu().id;
  }

  async function analyserClient() {
    const url = $('#client-site').value.trim();
    if (!url) return statut('#client-statut', 'Indiquez le site du client.', 'erreur');
    const b = $('#client-analyser');
    b.disabled = true;
    statut('#client-statut', 'Lecture du site du client…');
    try {
      const d = await lirePage(url);
      const r = Extraction.analyser(d.html, d.css, d.url);
      if (r.nom && !$('#client-entreprise').value.trim()) $('#client-entreprise').value = r.nom;
      $('#client-site').value = d.url;
      let logo = '';
      for (const l of r.logos.filter((x) => x.type !== 'image').slice(0, 3)) {
        try { logo = await versDataUrl(l.url); break; } catch (e) { /* suivant */ }
      }
      $('#client-logo').value = logo;
      $('#client-logo-info').innerHTML = logo ? `Logo trouvé : <img src="${C.echapper(logo)}" alt="" style="height:24px;vertical-align:middle">` : 'Aucun logo exploitable trouvé.';
      statut('#client-statut', r.nom ? `Entreprise trouvée : ${r.nom}.` : 'Site lu. Complétez les champs.', 'ok');
    } catch (e) {
      statut('#client-statut', e.message, 'erreur');
    } finally { b.disabled = false; }
  }

  /* Lecture CSV tolérante : guillemets, « ; » « , » ou tabulation. */
  function lireCsv(texte) {
    texte = texte.replace(/^﻿/, '');
    const premiere = texte.split(/\r?\n/)[0] || '';
    const sep = [';', '\t', ','].map((s) => [s, premiere.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
    const lignes = [];
    let ligne = [], champ = '', guillemets = false;
    for (let i = 0; i < texte.length; i++) {
      const ch = texte[i];
      if (guillemets) {
        if (ch === '"' && texte[i + 1] === '"') { champ += '"'; i++; } else if (ch === '"') guillemets = false; else champ += ch;
      } else if (ch === '"') guillemets = true;
      else if (ch === sep) { ligne.push(champ); champ = ''; } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && texte[i + 1] === '\n') i++;
        ligne.push(champ); champ = '';
        if (ligne.some((x) => x.trim())) lignes.push(ligne);
        ligne = [];
      } else champ += ch;
    }
    ligne.push(champ);
    if (ligne.some((x) => x.trim())) lignes.push(ligne);
    return lignes;
  }

  function importerCsv(texte) {
    const lignes = lireCsv(texte);
    if (lignes.length < 2) return statut('#client-statut', 'Il faut une ligne d’en-tête puis au moins un client.', 'erreur');
    const norm = (h) => h.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    const correspondances = [
      ['prenom', /^(prenom|first ?name|given)/], ['nom', /^(nom( de famille)?|last ?name|surname|family)$/],
      ['entreprise', /^(entreprise|societe|company|organisation|organization|raison sociale|structure)/],
      ['site', /^(site|web|url|site web|website)/], ['email', /(e-?mail|courriel|mail)/],
      ['messagePerso', /^message/], ['note', /^(mot|note|mot personnel|commentaire)/],
    ];
    const entetes = lignes[0].map(norm);
    const colonnes = entetes.map((h) => (correspondances.find(([, re]) => re.test(h)) || [null])[0]);
    if (!colonnes.some(Boolean)) return statut('#client-statut', 'En-tête non reconnu. Exemple : prénom;nom;entreprise;site;email;mot', 'erreur');
    let n = 0;
    lignes.slice(1).forEach((l) => {
      const c = { id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), jeton: jeton(), messageChoix: '' };
      colonnes.forEach((k, i) => { if (k) c[k] = (l[i] || '').trim(); });
      if (c.messagePerso) c.messageChoix = 'perso';
      if (c.prenom || c.nom || c.entreprise) { etat.clients.push(c); n++; }
    });
    statut('#client-statut', `${n} client${n > 1 ? 's' : ''} importé${n > 1 ? 's' : ''}.`, 'ok');
    listeClients();
    actualiser();
  }

  /* ---------- Rendu ---------- */

  let policesChargees = '';
  async function chargerPolices() {
    const lien = C.lienPolices(etat.charte);
    const el = $('#polices-cartes');
    if (lien !== policesChargees) {
      policesChargees = lien;
      if (lien) el.href = lien; else el.removeAttribute('href');
    }
    const familles = [etat.charte.policeTitre, etat.charte.policeTexte].filter(Boolean);
    try {
      await Promise.race([
        Promise.all(familles.flatMap((f) => [`700 40px "${f}"`, `400 20px "${f}"`, `italic 400 20px "${f}"`].map((x) => document.fonts.load(x)))),
        new Promise((ok) => setTimeout(ok, 4000)),
      ]);
    } catch (e) { /* police inconnue : repli */ }
  }

  function echelle() {
    const cadre = $('#cadre-apercu');
    const z = $('#apercu-pdf');
    if (z.firstChild) z.style.transform = `scale(${cadre.clientWidth / C.LARGEUR})`;
  }

  let minuteurAnime = 0;
  function actualiser() {
    sauver();
    chargerPolices();
    const c = clientApercu();
    $('#apercu-pdf').innerHTML = C.carte(etat.charte, etat.reglages, c);
    echelle();
    vignettes();
    clearTimeout(minuteurAnime);
    if (vue === 'anime') minuteurAnime = setTimeout(rafraichirAnime, 500);
    document.querySelectorAll('#clients li').forEach((li, i) => li.classList.toggle('selection', etat.clients[i] && etat.clients[i].id === c.id));
    $('#apercu-client').value = c.id;
  }

  function rafraichirAnime() {
    $('#apercu-anime').srcdoc = C.pageAnimee(etat.charte, etat.reglages, clientApercu(), { ouvertureAuto: true });
  }

  function attendreImages(racine) {
    return Promise.all([...racine.querySelectorAll('img')].map((img) => (img.complete ? Promise.resolve() : new Promise((ok) => { img.onload = img.onerror = ok; }))));
  }

  async function genererPdf(client) {
    await chargerPolices();
    const atelier = $('#atelier');
    atelier.innerHTML = C.carte(etat.charte, etat.reglages, client);
    await attendreImages(atelier);
    const toile = await html2canvas(atelier.firstElementChild, { scale: 2, useCORS: true, backgroundColor: null, logging: false, width: C.LARGEUR, height: C.HAUTEUR });
    const pdf = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5', compress: true });
    pdf.addImage(toile.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 148);
    const k = C.contenu(etat.charte, etat.reglages, client);
    pdf.setProperties({ title: `${k.titre}${client.prenom ? ' · ' + client.prenom : ''}`, author: etat.charte.nom || '', creator: 'Cartes de vœux' });
    const lien = lienCarte(client);
    if (lien) pdf.link(0, 0, 210, 148, { url: lien }); // un clic sur le PDF ouvre la version animée
    atelier.innerHTML = '';
    return pdf.output('blob');
  }

  function genererHtml(client) {
    return new Blob([C.pageAnimee(etat.charte, etat.reglages, client)], { type: 'text/html;charset=utf-8' });
  }

  async function unPdf(client, bouton) {
    if (bouton) bouton.disabled = true;
    try { telecharger(await genererPdf(client), nomsFichiers(client).pdf); } catch (e) { alert('PDF impossible : ' + e.message); }
    if (bouton) bouton.disabled = false;
  }
  function unHtml(client) { telecharger(genererHtml(client), nomsFichiers(client).html); }

  function csvEnvoi() {
    const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const lignes = [['prenom', 'nom', 'entreprise', 'email', 'fichier_pdf', 'fichier_html', 'lien_carte_animee']];
    etat.clients.forEach((c) => {
      const f = nomsFichiers(c);
      lignes.push([c.prenom, c.nom, c.entreprise, c.email, f.pdf, f.html, lienCarte(c)]);
    });
    return '﻿' + lignes.map((l) => l.map(q).join(';')).join('\r\n');
  }

  async function exporter(pdf, html) {
    if (!etat.clients.length) return statut('#export-statut', 'Ajoutez d’abord vos clients (étape 3).', 'erreur');
    const boutons = ['#export-tout', '#export-pdf', '#export-html'].map($);
    boutons.forEach((b) => { b.disabled = true; });
    const barre = $('#progression');
    barre.hidden = false;
    const zip = new JSZip();
    const total = etat.clients.length;
    try {
      for (let i = 0; i < total; i++) {
        const c = etat.clients[i];
        const f = nomsFichiers(c);
        statut('#export-statut', `Carte ${i + 1} sur ${total} : ${C.nomComplet(c) || c.entreprise}…`);
        if (pdf) zip.file('pdf/' + f.pdf, await genererPdf(c));
        if (html) zip.file('html/' + f.html, genererHtml(c));
        barre.firstElementChild.style.width = Math.round(((i + 1) / total) * 100) + '%';
      }
      zip.file('envoi.csv', csvEnvoi());
      statut('#export-statut', 'Compression…');
      const blob = await zip.generateAsync({ type: 'blob' });
      telecharger(blob, `cartes-voeux-${etat.reglages.annee}.zip`);
      statut('#export-statut', `${total} carte${total > 1 ? 's' : ''} exportée${total > 1 ? 's' : ''}.`, 'ok');
    } catch (e) {
      statut('#export-statut', 'Export interrompu : ' + e.message, 'erreur');
    } finally {
      boutons.forEach((b) => { b.disabled = false; });
      setTimeout(() => { barre.hidden = true; barre.firstElementChild.style.width = '0'; }, 1500);
    }
  }

  /* ---------- Branchements ---------- */

  function brancher() {
    document.querySelectorAll('.onglets .onglet').forEach((o) => o.addEventListener('click', () => {
      document.querySelectorAll('.onglets .onglet').forEach((x) => { x.classList.toggle('actif', x === o); x.setAttribute('aria-selected', x === o); });
      document.querySelectorAll('.panneau').forEach((p) => { p.hidden = p.dataset.panneau !== o.dataset.onglet; });
    }));
    document.querySelectorAll('.apercu-onglets .onglet').forEach((o) => o.addEventListener('click', () => {
      vue = o.dataset.vue;
      document.querySelectorAll('.apercu-onglets .onglet').forEach((x) => { x.classList.toggle('actif', x === o); x.setAttribute('aria-selected', x === o); });
      $('#apercu-pdf').hidden = vue !== 'pdf';
      $('#apercu-anime').hidden = vue !== 'anime';
      $('#apercu-rejouer').hidden = vue !== 'anime';
      $('#cadre-apercu').classList.toggle('anime', vue === 'anime');
      if (vue === 'anime') rafraichirAnime(); else $('#apercu-anime').removeAttribute('srcdoc');
    }));
    $('#apercu-rejouer').addEventListener('click', rafraichirAnime);

    $('#charte-analyser-url').addEventListener('click', analyserUrl);
    $('#charte-url').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); analyserUrl(); } });
    $('#charte-analyser-code').addEventListener('click', analyserCode);

    const champsCharte = {
      '#c-principale': (v) => { etat.charte.couleurs.principale = v; }, '#c-secondaire': (v) => { etat.charte.couleurs.secondaire = v; },
      '#c-fond': (v) => { etat.charte.couleurs.fond = v; }, '#c-texte': (v) => { etat.charte.couleurs.texte = v; },
      '#police-titre': (v) => { etat.charte.policeTitre = v.trim(); }, '#police-texte': (v) => { etat.charte.policeTexte = v.trim(); },
      '#charte-nom': (v) => { etat.charte.nom = v; }, '#charte-signature': (v) => { etat.charte.signature = v; },
      '#charte-site': (v) => { etat.charte.site = v.trim(); },
      '#annee': (v) => { etat.reglages.annee = Number(v) || etat.reglages.annee; construireChoix(); },
      '#titre-perso': (v) => { etat.reglages.titrePerso = v; }, '#message-perso': (v) => { etat.reglages.messagePerso = v; },
      '#formule-dedicace': (v) => { etat.reglages.formuleDedicace = v; },
      '#base-liens': (v) => { etat.reglages.baseLiens = v.trim(); listeClients(); },
    };
    let minuteur = 0;
    Object.entries(champsCharte).forEach(([sel, fn]) => $(sel).addEventListener('input', (e) => {
      fn(e.target.value);
      clearTimeout(minuteur);
      minuteur = setTimeout(actualiser, 150);
    }));
    $('#logo-client').addEventListener('change', (e) => { etat.reglages.logoClient = e.target.checked; actualiser(); });
    $('#titre-choix').addEventListener('change', (e) => { etat.reglages.titreChoix = e.target.value; $('#titre-perso-zone').hidden = e.target.value !== 'perso'; actualiser(); });
    $('#messages').addEventListener('change', (e) => {
      if (e.target.name !== 'message') return;
      etat.reglages.messageChoix = e.target.value;
      $('#message-perso').hidden = e.target.value !== 'perso';
      if (e.target.value === 'perso') $('#message-perso').focus();
      actualiser();
    });
    $('#modeles').addEventListener('change', (e) => { if (e.target.name === 'modele') { etat.reglages.modele = e.target.value; actualiser(); } });

    $('#logo-fichier').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      etat.charte.logo = await reduire(await lireFichier(f));
      e.target.value = '';
      afficherLogo();
      actualiser();
      statut('#charte-statut', 'Logo intégré.', 'ok');
    });
    $('#logo-retirer').addEventListener('click', () => { etat.charte.logo = ''; afficherLogo(); actualiser(); });

    $('#form-client').addEventListener('submit', enregistrerClient);
    $('#client-annuler').addEventListener('click', viderFormulaire);
    $('#client-analyser').addEventListener('click', analyserClient);
    $('#client-message-choix').addEventListener('change', (e) => { $('#client-message-perso').hidden = e.target.value !== 'perso'; });
    $('#clients-vider').addEventListener('click', () => {
      if (!confirm('Effacer tous les clients de la liste ?')) return;
      etat.clients = [];
      listeClients();
      actualiser();
    });
    $('#csv-fichier').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const buf = await f.arrayBuffer();
      let txt = new TextDecoder('utf-8').decode(buf);
      if (txt.includes('�')) txt = new TextDecoder('windows-1252').decode(buf); // CSV d'Excel
      $('#csv-texte').value = txt;
      e.target.value = '';
    });
    $('#csv-importer').addEventListener('click', () => importerCsv($('#csv-texte').value));

    $('#apercu-client').addEventListener('change', (e) => { etat.apercuId = e.target.value; listeClients(); actualiser(); });
    $('#apercu-telecharger-pdf').addEventListener('click', (e) => unPdf(clientApercu(), e.currentTarget));
    $('#apercu-telecharger-html').addEventListener('click', () => unHtml(clientApercu()));
    $('#export-tout').addEventListener('click', () => exporter(true, true));
    $('#export-pdf').addEventListener('click', () => exporter(true, false));
    $('#export-html').addEventListener('click', () => exporter(false, true));

    new ResizeObserver(() => { echelle(); vignettes(); }).observe($('#cadre-apercu'));
  }

  async function detecterServeur() {
    if (!/^https?:/.test(location.protocol)) return false;
    try {
      const r = await fetch('/api/ping', { cache: 'no-store' });
      return r.ok && (await r.json()).ok === true;
    } catch (e) { return false; }
  }

  async function demarrer() {
    const style = document.createElement('style');
    style.textContent = C.css(); // même mise en forme que dans les fichiers exportés
    document.head.appendChild(style);
    charger();
    // Les clients importés avant l'ajout du jeton en reçoivent un
    etat.clients.forEach((c) => { if (!c.jeton) c.jeton = jeton(); });
    remplirChampsCharte();
    remplirChampsReglages();
    brancher();
    listeClients();
    actualiser();
    serveur = await detecterServeur();
    $('#mode').textContent = serveur ? 'Serveur local actif' : 'Mode hors serveur';
    $('#aide-serveur').textContent = serveur
      ? 'Le site est lu par le serveur local, feuilles de style comprises.'
      : 'Pour analyser une simple adresse, lancez le serveur local : node outils/cartes-voeux/serveur.mjs. Sinon, utilisez l’onglet « Coller le code de ma page ».';
    $('#client-analyser').disabled = !serveur;
    $('#client-analyser').title = serveur ? '' : 'Nécessite le serveur local';
    if (!serveur) document.querySelector('[data-onglet="code"]').click();
    if (!window.html2canvas || !window.jspdf || !window.JSZip) {
      statut('#export-statut', 'Les bibliothèques d’export ne se sont pas chargées : vérifiez votre connexion internet.', 'erreur');
    }
  }

  demarrer();
})();
