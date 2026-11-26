# En Profondeur : refonte du site

Nouvelle version du site [enprofondeur.fr](https://enprofondeur.fr) de Grégory Ortiz (coaching de vie, respiration, apnée). C'est un site **statique** en HTML, CSS et JavaScript, sans WordPress, sans framework et sans étape de compilation.

## Voir le site en local

Ouvrir `index.html` dans un navigateur suffit. Pour un rendu identique à la mise en ligne, mieux vaut un petit serveur local :

```bash
python3 -m http.server 8000
```

Le site est alors visible sur http://localhost:8000.

## Organisation

| Chemin | Contenu |
|---|---|
| `index.html` | Accueil |
| `about.html` | Qui suis-je (récit complet de Grégory) |
| `coaching.html` | Les 7 coachings, avec leurs tarifs |
| `temoignages.html` | Les 7 témoignages écrits et les 2 vidéos |
| `assets/style.css` | Styles communs aux 4 pages |
| `assets/site.js` | Effets communs : ambiance sous-marine, particules, respiration guidée, son, menu mobile |
| `img/` | Images optimisées (format WebP) utilisées par le site |
| `medias/gregory/` | Photos originales de Grégory, en pleine qualité. Les photos avec un enfant (`avec-enfant-dans-eau.jpeg`) et avec des amis (`avec-ami-*`) sont publiées avec l'accord des personnes concernées (et des parents pour l'enfant) |
| `maquettes/` | Versions précédentes de la maquette (v1 immersive, v2 identité d'origine, v3 orientée coaching) |
| `outils/build.py` | Script qui a généré les 4 pages : voir plus bas |

### À propos de `outils/build.py`

Les 4 pages ont été générées par ce script : en-tête, bloc contact et pied de page communs. Deux façons de travailler :

- **Modifier directement les fichiers `.html`.** Dans ce cas, ne relancez plus le script, sinon vos modifications seront écrasées.
- **Modifier le script, puis régénérer.**

```bash
python3 outils/build.py .
```

## Site de test sur Hostinger

Le site est publié pour test sur https://legendary-mediumturquoise-fox-24.hostingersite.com, avec l'indexation Google bloquée.

Pour publier l'état actuel du dépôt :

```bash
outils/deployer-test.sh
```

Le script met à jour la branche `hostinger-test` (les seuls fichiers servis en ligne, avec le noindex), la pousse sur GitHub, l'envoie sur Hostinger, vide le cache et vérifie que la page répond. **Il remplace tout le contenu du site de test.** La clé d'API Hostinger n'est pas dans le dépôt : dans une session Claude, elle est ajoutée automatiquement ; ailleurs, définir `HOSTINGER_API_TOKEN`.

Pour la mise en ligne définitive sur `enprofondeur.fr`, il ne faudra **pas** reprendre ce script tel quel : il ajoute le noindex et remplacerait le WordPress actuel.

## Ce qui n'est volontairement pas dans ce dépôt

Le dépôt est **public**. Les éléments suivants restent hors du dépôt pour des raisons de droits ou de vie privée :

- **Les images Storyblocks** (dauphins, banc de poissons, coucher de soleil…) : licence liée au compte de l'acheteur.
- **L'image du film *Le Grand Bleu*** : protégée par le droit d'auteur.
- **Les images de démonstration du modèle Slider Revolution.**
- **Les images génériques ajoutées par l'assistant Hostinger,** et une photo de Grenoble dont l'origine est inconnue.
- **Le logo baleine** : il vient d'une banque de vecteurs, et sa licence n'autorise probablement pas sa redistribution.

Les deux vidéos de témoignages sont lues directement depuis `enprofondeur.fr`. Leurs fichiers ne sont pas dans le dépôt.

## Reste à faire avant la mise en ligne

- [ ] Tarifs alignés sur le site en ligne au 26/11/2026 (€ et CFP) : à revérifier juste avant la mise en ligne.
- [ ] Faire confirmer par Grégory que l'homme assis à côté de lui dans le teaser accepte d'apparaître sur le site.
- [ ] Brancher le bouton « Réserver un premier appel » sur un outil de réservation (Cal.com ou Calendly). Il pointe aujourd'hui vers `#`.
- [ ] Créer la page **Mentions légales**, obligatoire pour un site professionnel en France.
- [ ] Faire valider par Grégory les textes marqués `[ texte à valider ]` (Intensité / Précision / Connexion).
- [ ] Faire écrire par Grégory le paragraphe sur son passage de l'apnée au coaching (encadré sur `about.html`).
- [ ] Confirmer à quoi correspond « 07:12 » sur la photo de la montre d'apnée (record d'apnée statique ?).
- [ ] Obtenir une version haute définition et non détourée du portrait au bonnet (actuellement 420 × 595 px).
- [ ] Choisir une signature pour le témoignage de la kinésithérapeute : « Anonyme » ou « Stéphanie » ? Il est signé « Stéphanie » sur l'accueil du site actuel et « Anonyme » sur sa page Témoignages.
- [ ] Remplacer le logo baleine par un logo propre à Grégory.
- [ ] Prévoir un outil de mesure d'audience compatible avec les règles sur les cookies (RGPD).
- [ ] Mettre le site en ligne en conservant les adresses `/about/`, `/coaching/` et `/temoignages/`, pour garder le référencement acquis.
