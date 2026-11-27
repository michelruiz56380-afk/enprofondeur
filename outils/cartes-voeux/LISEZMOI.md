# Cartes de vœux

Petit outil pour créer une carte de vœux personnalisée pour chaque client, sous deux formes :

- **PDF** (format A5 paysage), à joindre à un e-mail ;
- **page HTML animée** (une enveloppe qui s'ouvre, puis la carte qui apparaît), à déposer sur un site et à envoyer en lien.

Tout se passe dans le navigateur. Les clients et la charte sont gardés **dans ce navigateur uniquement** (stockage local), jamais dans le dépôt, qui est public.

## Lancer l'outil

Avec Node 18 ou plus récent (aucune installation de paquet) :

```bash
node outils/cartes-voeux/serveur.mjs
```

puis ouvrir http://localhost:5177.

Sans Node, on peut aussi ouvrir directement `index.html`. Tout fonctionne alors, **sauf** l'analyse d'un site à partir de sa simple adresse : il faut coller le code de la page (voir plus bas). La raison : un navigateur n'a pas le droit de lire une page d'un autre site, alors que le petit serveur local, lui, peut le faire.

Une connexion internet est nécessaire (polices Google et bibliothèques d'export PDF et ZIP).

## Les 4 étapes

1. **Ma charte graphique.** Donnez l'adresse de votre site, ou collez son code source (clic droit › *Afficher le code source*, tout copier). L'outil propose les couleurs, les polices, le nom et le logo. Tout se corrige à la main : pastilles de couleur à attribuer, champs de police, choix du logo ou envoi d'un fichier.
2. **La carte.** L'année, le titre, le modèle (*Élégant*, *Festif*, *Épuré*) et le message commun, choisi parmi cinq propositions ou écrit librement. Variables possibles : `{prenom}`, `{nom}`, `{entreprise}`, `{annee}`, `{anneePrecedente}`.
3. **Mes clients.** Un par un (le site web est facultatif : avec le serveur local, « Récupérer » lit le nom de l'entreprise et son logo), ou par import CSV. Pour chaque client, on peut changer le message et ajouter un mot personnel.
4. **Export.** Un ZIP avec `pdf/`, `html/` et `envoi.csv` (prénom, nom, e-mail, nom du PDF, lien de la carte animée), prêt pour un publipostage.

### Import CSV

Une ligne d'en-tête, puis un client par ligne. Colonnes reconnues (dans n'importe quel ordre) : `prénom`, `nom`, `entreprise`, `site`, `email`, `message`, `mot`. Séparateur `;` ou `,`. Exemple :

```
prénom;nom;entreprise;email;mot
Marie;Durand;Atelier Durand;marie@exemple.fr;Merci pour cette belle année !
```

## Publier les cartes animées

1. Choisissez l'adresse de publication à l'étape 4 (par exemple `https://www.monsite.fr/voeux-2027/`), **avant** d'exporter : elle sert à écrire les liens dans `envoi.csv`, dans le bouton « E-mail » et dans le PDF (un clic sur le PDF ouvre la carte animée).
2. Déposez le contenu du dossier `html/` à cette adresse (gestionnaire de fichiers Hostinger, FTP…).
3. Ouvrez un ou deux liens pour vérifier avant l'envoi.

Chaque fichier contient un code aléatoire (`voeux-2027-marie-durand-k3f9a2b1.html`) pour qu'on ne puisse pas deviner la carte d'un autre client, et les pages demandent à ne pas être indexées par les moteurs de recherche. Ce n'est pas une protection forte : n'y mettez rien de confidentiel.

Le code aléatoire est fixé à l'ajout du client : réexporter garde les mêmes liens, tant que le nom du client et l'année ne changent pas.

## Limites connues

- **Couleurs proposées, pas devinées à coup sûr.** L'outil compte les couleurs présentes dans le code. Un thème WordPress peut contenir des couleurs par défaut que le site n'affiche pas : vérifiez toujours.
- **Logo.** Un logo sur fond blanc (JPEG) gardera ce fond blanc sur une carte foncée. Préférez un PNG ou un SVG transparent (« Choisir un fichier… »).
- **PDF en image.** Le PDF est une image haute définition de la carte : le texte n'y est pas sélectionnable.
- **Polices.** Seules les polices disponibles sur Google Fonts s'affichent telles quelles. Une police payante du site sera remplacée par une police de secours.
- **Le stockage local** est propre à ce navigateur et à cette adresse (`localhost:5177` et `index.html` ouvert directement ne partagent pas les mêmes données). Vider les données du navigateur efface la liste : gardez votre fichier CSV.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html`, `app.css`, `app.js` | L'interface |
| `cartes.js` | Le dessin des cartes (aperçu, PDF et page animée partagent le même code) |
| `extraction.js` | La lecture de la charte graphique à partir du code d'une page |
| `serveur.mjs` | Le serveur local facultatif (lecture des sites et des logos) |

Ce dossier n'est pas publié avec le site : `outils/deployer-test.sh` ne copie que les pages, `assets/` et `img/`.
