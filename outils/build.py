"""Génère les 4 pages d'En Profondeur.
Usage : python3 build.py <dossier_sortie> [--maquette]
--maquette : coordonnées remplacées par des exemples + étiquette « maquette ».
"""
import sys, os

OUT = sys.argv[1]
MAQUETTE = '--maquette' in sys.argv
os.makedirs(OUT, exist_ok=True)

TEL = ('#', 'Téléphone (exemple)') if MAQUETTE else ('tel:+33763734512', '+33 7 63 73 45 12')
MAIL = ('#', 'E-mail (exemple)') if MAQUETTE else ('mailto:info@enprofondeur.fr', 'info@enprofondeur.fr')
BADGE = ('<div style="position:fixed;bottom:16px;right:16px;z-index:20;background:#ffd36b;color:#2a1d00;'
         'font:700 .72rem Manrope,sans-serif;padding:7px 12px;border-radius:999px;letter-spacing:.04em">'
         'MAQUETTE DE TRAVAIL · non officielle</div>') if MAQUETTE else ''

PAGES = [('index.html', 'Accueil'), ('about.html', 'Qui suis-je'),
         ('coaching.html', 'Coachings'), ('temoignages.html', 'Témoignages')]


def head(title, desc):
    return f'''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>
<div id="glow" aria-hidden="true"></div>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="water" x="-10%" y="-30%" width="120%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.06" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter></svg>
<canvas id="snow" aria-hidden="true"></canvas>
{BADGE}'''


def header(current):
    links = ''.join(
        f'<a href="{f}"{" aria-current=\"page\"" if f == current else ""}>{n}</a>'
        for f, n in PAGES[1:])
    mlinks = ''.join(
        f'<a href="{f}"{" aria-current=\"page\"" if f == current else ""}>{n}</a>'
        for f, n in PAGES)
    return f'''
<header class="site">
  <a class="logo" href="index.html">EN PROFONDEUR…</a>
  <nav class="menu" aria-label="Navigation principale">{links}</nav>
  <div class="hdr-actions">
    <button class="btn icon-btn" id="soundBtn" aria-pressed="false" aria-label="Activer la musique d'ambiance" title="Musique d'ambiance (désactivée par défaut)">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>
    </button>
    <a class="btn teal" href="#contact">Réserver un appel</a>
    <button class="btn icon-btn burger" id="burger" aria-expanded="false" aria-controls="mobileNav" aria-label="Menu">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 8h16M4 16h16"/></svg>
    </button>
  </div>
</header>
<nav class="mobile-nav" id="mobileNav" hidden aria-label="Navigation mobile">{mlinks}<a href="#contact" style="color:var(--teal)">Réserver un appel</a></nav>
<div class="side-title" aria-hidden="true"><span>Gregory Ortiz en profondeur</span><i></i></div>
'''


CONTACT = f'''
  <div class="wave-band" aria-hidden="true"><svg viewBox="0 0 1440 160" preserveAspectRatio="none"><path data-wave="line 18 60 2200 0"/><path data-wave="line 14 80 2800 1"/><path data-wave="line 22 100 3400 2"/></svg></div>
  <section id="contact">
    <div class="fond">
      <div>
        <p class="eyebrow reveal">Premier pas</p>
        <h2 class="reveal">Explorez vos <em>profondeurs..</em></h2>
        <p class="lead reveal">Un premier appel, sans engagement, pour faire connaissance et voir si l’accompagnement vous correspond.</p>
        <ol class="steps reveal">
          <li>Vous choisissez un créneau</li>
          <li>On échange sur votre situation et vos objectifs</li>
          <li>Je vous propose l’accompagnement adapté</li>
        </ol>
        <div class="contact-row reveal">
          <a class="btn teal" href="#" title="À brancher sur Calendly / Cal.com">Réserver un premier appel</a>
          <a class="btn" href="{TEL[0]}">{TEL[1]}</a>
          <a class="btn" href="{MAIL[0]}">{MAIL[1]}</a>
        </div>
      </div>
      <div class="round reveal"><img src="img/appel.webp" alt="Grégory Ortiz au téléphone" loading="lazy"></div>
    </div>
  </section>
'''


def footer():
    links = ''.join(f'<a href="{f}">{n}</a>' for f, n in PAGES)
    return f'''</main>
<footer class="site">
  <span>© Grégory Ortiz · En Profondeur</span>
  <nav aria-label="Pied de page">{links}</nav>
  <div class="legal"><a href="#" title="Obligatoire : page à créer">Mentions légales [ à créer ]</a><span>Made by mimi</span></div>
</footer>
<script src="assets/site.js"></script>
</body>
</html>
'''


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def version_assets(html):
    """Ajoute ?v=<empreinte du fichier> aux fichiers locaux (css, js, images, vidéo) :
    dès qu'un fichier change, son adresse change et le navigateur le recharge."""
    import hashlib, re
    def repl(m):
        attr, path = m.group(1), m.group(2)
        f = os.path.join(ROOT, path)
        if not os.path.isfile(f):
            return m.group(0)
        h = hashlib.md5(open(f, 'rb').read()).hexdigest()[:8]
        return f'{attr}="{path}?v={h}"'
    return re.sub(r'(src|href|poster)="((?:assets|img)/[^"?#]+)"', repl, html)


def write(name, html):
    with open(os.path.join(OUT, name), 'w', encoding='utf-8') as f:
        f.write(version_assets(html))


# ------------------------------------------------------------------ ACCUEIL
TESTIMONIAL_SHORT = '''
      <blockquote class="reveal"><p>« Greg m’a d’abord aidé à démêler le nœud de difficultés qui me paralysait. Après chaque échange, je me sentais soulagé et en confiance. »</p><cite>Léo P.</cite></blockquote>
      <blockquote class="reveal"><p>« J’ai pris conscience que je ne respirais pas. Par les exercices qu’il m’a conseillés, j’ai repris vie. Ces 3 mois ont changé ma façon de vivre. »</p><cite>Laure</cite></blockquote>
      <blockquote class="reveal"><p>« Son accompagnement m’a permis d’avoir des clefs que j’utilise encore 3 ans après. J’en suis ressortie grandie ! »</p><cite>Chloé</cite></blockquote>'''

index = head('En Profondeur — Coaching avec Grégory Ortiz',
             'Coaching de vie et coaching respiration avec Grégory Ortiz. Clarifier, reprendre confiance, retrouver le calme. Premier appel sans engagement.') \
    + header('index.html') + f'''
<main>
  <section id="accueil" class="hero2">
    <div class="hero2-grid">
      <div class="hero2-text">
        <p class="eyebrow reveal">Grégory Ortiz · Coach de vie · PNL · Respiration</p>
        <h1 class="hero2-title"><span class="ln"><span>En</span></span><span class="ln"><span>Profondeur</span></span></h1>
        <strong class="reveal">Clarifier ce qui vous bloque. Reprendre confiance. Retrouver le calme.</strong>
        <p class="reveal">Faites le premier pas vers votre transformation. Plongez avec moi dans cette aventure où, ensemble, nous explorerons vos profondeurs pour révéler votre potentiel.</p>
        <div class="ctas reveal">
          <a class="btn teal" href="#contact">Réserver un premier appel</a>
          <a class="btn" href="#teaser"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg>Voir le teaser · 54 s</a>
        </div>
      </div>
      <div class="hero2-visual" aria-hidden="false">
        <div class="morph-halo"></div>
        <div class="morph"></div>
        <img class="bust" id="portrait" src="img/portrait.webp" alt="Portrait de Grégory Ortiz" width="420" height="595">
        <span class="orbit o1"></span><span class="orbit o2"></span>
      </div>
    </div>
    <a class="scroll-cue" href="#teaser" aria-label="Faire défiler"><span></span></a>
    <svg class="hero-waves" viewBox="0 0 1440 600" preserveAspectRatio="none" aria-hidden="true">
      <path data-wave="fill-top 60 170 2600 0"/><path data-wave="fill-top 44 120 3300 1"/><path data-wave="fill-top 30 70 4100 2"/>
    </svg>
    <svg class="wave-sep" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true"><path data-wave="fill-bottom 14 48 1600 0"/><path data-wave="fill-bottom 10 66 2100 1"/></svg>
  </section>

  <section id="teaser">
    <p class="eyebrow reveal">En 54 secondes</p>
    <h2 class="reveal">Plongez <em>avec moi</em></h2>
    <figure class="teaser reveal">
      <video id="teaserVideo" preload="metadata" playsinline poster="img/teaser-poster.webp" src="assets/video/teaser.mp4"></video>
      <button class="teaser-play" id="teaserPlay" aria-label="Lancer le teaser avec le son">
        <span class="disc"><svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg></span>
        <span class="lbl">Regarder le teaser<small>54 s · avec le son</small></span>
      </button>
    </figure>
  </section>

  <section id="pour-qui">
    <p class="eyebrow reveal">Pour qui</p>
    <h2 class="reveal">Vous êtes au bon endroit <em>si…</em></h2>
    <div class="needs">
      <article class="need reveal"><span class="n">01</span><h3>Vous traversez une mauvaise passe</h3><p>Le professionnel, le personnel et le relationnel s’emmêlent, et vous ne savez plus par où commencer.</p></article>
      <article class="need reveal"><span class="n">02</span><h3>Le stress s’est installé dans votre corps</h3><p>Tensions, souffle court, nuits agitées : vous voulez reprendre le contrôle de vos émotions.</p></article>
      <article class="need reveal"><span class="n">03</span><h3>Vous voulez changer de cap</h3><p>Reconversion, nouveau projet, décision importante : vous avez besoin d’y voir clair et d’oser.</p></article>
      <article class="need reveal"><span class="n">04</span><h3>Vous visez une performance</h3><p>Ironman, boxe, compétition, mer : vous voulez progresser en gardant la tête froide.</p></article>
    </div>
  </section>

  <section id="approche" class="story">
    <div class="story-head">
      <p class="eyebrow reveal">Je vous accompagne</p>
      <h2 class="reveal">Aller au fond des choses, <em>ne rien laisser au hasard</em></h2>
    </div>
    <div class="story-grid">
      <div class="story-sticky">
        <div class="story-visual" id="storyVisual" data-step="0">
          <div class="sv-blob"></div><div class="sv-blob b2"></div>
          <span class="sv-word" id="storyWord">Intensité</span>
          <span class="sv-dots"><i></i><i></i><i></i></span>
        </div>
      </div>
      <div class="story-steps">
        <article class="ss-step" data-i="0"><span class="ss-num">01</span><h3>Intensité</h3><p>Un engagement total, à 100 % présent pour vous, séance après séance.</p></article>
        <article class="ss-step" data-i="1"><span class="ss-num">02</span><h3>Précision</h3><p>Des outils ajustés en continu selon vos résultats, et des exercices concrets entre les séances.</p></article>
        <article class="ss-step" data-i="2"><span class="ss-num">03</span><h3>Connexion</h3><p>Une écoute sans jugement, qui met à l’aise et permet d’aller là où ça bloque.</p></article>
      </div>
    </div>
  </section>

  <section id="qui-suis-je">
    <div class="recit">
      <div>
        <p class="eyebrow reveal">Je vous parle de moi</p>
        <h2 class="reveal">Ce que la mer <em>m’a appris sur l’humain</em></h2>
        <p class="lead reveal">Je suis Grégory, passionné par le monde sous-marin et par l’accompagnement humain à travers le coaching et la PNL. Ancien champion de pêche sous-marine et apnéiste confirmé, j’ai toujours cherché à allier mes deux amours : l’océan et l’interaction humaine.</p>
        <p class="lead reveal" style="margin-top:14px">Pour moi, réussir signifie aller au fond des choses. Que ce soit sous l’eau, où chaque respiration compte, ou lors d’une séance de coaching, où chaque mot a son importance, je cherche à créer une connexion profonde.</p>
        <a class="more reveal" href="about.html">Lire mon histoire →</a>
      </div>
      <div class="collage reveal">
        <figure class="c1" data-speed=".06"><img src="img/mer.webp" alt="Grégory en mer, en combinaison" loading="lazy"></figure>
        <figure class="c2" data-speed="-.05"><img src="img/noir-blanc.webp" alt="Portrait noir et blanc de Grégory" loading="lazy"></figure>
        <figure class="c3" data-speed=".12"><img src="img/bienvenue.webp" alt="Panneau Bienvenue en forme de poisson" loading="lazy"></figure>
      </div>
    </div>
    <div class="facts">
      <div class="fact reveal"><b>18 ans</b><span>Plus jeune moniteur de pêche sous-marine de France</span></div>
      <div class="fact reveal"><b>BPJEPS</b><span>Plongée sans scaphandre</span></div>
      <div class="fact reveal"><b>PNL</b><span>Coaching et programmation neuro-linguistique</span></div>
      <div class="fact reveal"><b>Engagé</b><span>Initiation d’enfants malades à l’apnée, sensibilisation à l’écologie marine</span></div>
    </div>
  </section>

  <section id="essayer">
    <p class="eyebrow reveal" style="justify-content:center">Essayez maintenant</p>
    <h2 class="reveal">Une minute pour <em>relâcher la pression</em></h2>
    <p class="lead reveal">Trois cycles de respiration guidée. C’est un aperçu de ce que l’on travaille en coaching respiration.</p>
    <div class="breath reveal" aria-live="polite">
      <div class="ring"></div>
      <div class="orb" id="orb"></div>
      <div><span class="label" id="bLabel">Prêt ?</span><span class="count" id="bCount">3 cycles · 42 s</span></div>
    </div>
    <button class="btn teal" id="bStart">Commencer</button>
    <p class="breath-after" id="bAfter"></p>
  </section>

  <section id="accompagnements">
    <p class="eyebrow reveal">Les programmes</p>
    <h2 class="reveal">Un accompagnement <em>sur mesure</em></h2>
    <div class="main-offers">
      <article class="offer reveal">
        <h3>Coaching de vie</h3>
        <p>Pour avancer sur un projet, une décision ou une période difficile.</p>
        <ul class="grow">
          <li>Clarifier vos objectifs</li>
          <li>Prendre conscience de vos ressources</li>
          <li>Renforcer votre confiance et votre efficacité</li>
        </ul>
        <div class="price"><div><b>150 €</b> <span>/ séance d’1 h</span><span class="cfp">18 000 CFP</span></div><a class="btn teal small" href="#contact">Réserver</a></div>
      </article>
      <article class="offer reveal">
        <h3>Respiration &amp; relaxation</h3>
        <p>Un coaching ancré dans le réel, issu de l’expérience de l’apnée, pas d’une théorie abstraite.</p>
        <ul class="grow">
          <li>Reprendre le contrôle émotionnel</li>
          <li>Idéal pour les personnes stressées</li>
        </ul>
        <div class="price"><div><b>200 €</b> <span>/ séance d’1 h</span><span class="cfp">24 000 CFP</span></div><a class="btn teal small" href="#contact">Réserver</a></div>
      </article>
    </div>
    <div class="other reveal">
      <h3>Sport &amp; mer</h3>
      <p>Pour les sportifs, apnéistes et chasseurs sous-marins.</p>
      <div class="rows">
        <a class="row" href="coaching.html#coaching-sportif"><b>Coaching sportif</b><span>Boxe, Ironman et autres disciplines</span><em>150 €<small>18 000 CFP</small></em></a>
        <a class="row" href="coaching.html#coaching-peche"><b>Pêche sous-marine</b><span>Tous niveaux, technique et sécurité</span><em>150 €<small>18 000 CFP</small></em></a>
        <a class="row" href="coaching.html#coaching-apnee"><b>Apnée</b><span>Capacité pulmonaire, endurance, sécurité</span><em>150 €<small>18 000 CFP</small></em></a>
        <a class="row" href="coaching.html#coaching-profondeur"><b>Gagner en profondeur</b><span>Séance d’1 h 30</span><em>150 €<small>18 000 CFP</small></em></a>
        <a class="row" href="coaching.html#coaching-securite"><b>Sécurité</b><span>Bonnes pratiques sous l’eau · 1 h 30</span><em>150 €<small>18 000 CFP</small></em></a>
      </div>
    </div>
    <a class="more reveal" href="coaching.html">Voir le détail des coachings →</a>
  </section>

  <section id="temoignages">
    <p class="eyebrow reveal">Ils vous parlent de leur expérience</p>
    <h2 class="reveal">Témoignages</h2>
    <div class="voices">{TESTIMONIAL_SHORT}
    </div>
    <a class="more reveal" href="temoignages.html">Lire les 7 témoignages et voir les vidéos →</a>
  </section>
''' + CONTACT + footer()
write('index.html', index)

# ------------------------------------------------------------------ QUI SUIS-JE
about = head('Qui suis-je ? — Grégory Ortiz · En Profondeur',
             'Grégory Ortiz : enfant des montagnes grenobloises, champion de pêche sous-marine, moniteur d’apnée et coach. Son parcours.') \
    + header('about.html') + '''
<main>
  <section class="page-head">
    <div class="about-head">
      <div>
        <p class="eyebrow reveal">Qui suis-je ?</p>
        <h1 class="emerge">Grégory <em>Ortiz</em></h1>
        <p class="intro reveal">Je suis Grégory Ortiz, enfant des montagnes grenobloises, dont le cœur a été capturé par l’appel du grand large. Ma passion pour l’apnée et la pêche sous-marine a été inspirée par les exploits de Jacques Mayol et immortalisée par le cinéma. Je suis devenu compétiteur, formateur, et même pêcheur professionnel, toujours en quête d’harmonie avec la mer.</p>
        <p class="lead reveal" style="margin-top:16px">À travers l’enseignement, j’ai partagé mon savoir et ma passion pour l’apnée, en prenant soin de véhiculer les valeurs d’écologie et de respect de la nature. Mon parcours est un témoignage vivant de la manière dont une passion peut guider une vie et inspirer les autres.</p>
      </div>
      <div class="portrait-card reveal"><img src="img/sourire.webp" alt="Grégory Ortiz, souriant" width="370" height="370"></div>
    </div>
  </section>

  <div class="wave-band" aria-hidden="true"><svg viewBox="0 0 1440 160" preserveAspectRatio="none"><path data-wave="line 18 60 2200 0"/><path data-wave="line 14 80 2800 1"/><path data-wave="line 22 100 3400 2"/></svg></div>
  <section class="story" style="padding-top:2vh">
    <article class="chapter reveal">
      <div class="mark">Grenoble<small>Les origines</small></div>
      <div>
        <p>Je suis né à Grenoble, une ville nichée au cœur des montagnes, mais c’est vers les vastes étendues bleues des océans que mon cœur d’enfant a toujours penché. Je rêve d’océans, de profondeurs abyssales et de la liberté offerte par l’apnée. Avant même que Luc Besson immortalise l’apnée dans son film « Le Grand Bleu », je m’étais déjà plongé dans la lecture de « Homo Delphinus » de Jacques Mayol, un pionnier qui a su briser les frontières entre l’homme et la mer. L’apnée et la pêche étaient alors des mondes inexplorés, surtout pour un jeune des Alpes.</p>
        <p>L’incrédulité était mon quotidien lorsque je racontais à mon entourage que Jacques Mayol pouvait cesser de respirer pendant cinq minutes sans effort. Moi-même, idolâtrant ce héros, je doutais pourtant de pouvoir atteindre de telles prouesses. Cependant, avec un record personnel avoisinant les trois minutes, je me sentais presque sorti d’un autre monde.</p>
      </div>
    </article>

    <article class="chapter reveal">
      <div class="mark">16 – 18 ans<small>La compétition</small></div>
      <div>
        <p>À 16 ans, je commençais déjà à me distinguer dans les compétitions de pêche sous-marine et à 18 ans, je devenais le plus jeune moniteur de cette discipline en France. Ma vie était rythmée par l’eau, par la profondeur et par un engagement sans faille envers la discipline qui définissait mon existence.</p>
        <div class="photo"><img src="img/mer.webp" alt="Grégory en mer, en combinaison d'apnée" loading="lazy"></div>
      </div>
    </article>

    <article class="chapter reveal">
      <div class="mark">Transmettre<small>L’enseignement</small></div>
      <div>
        <p>Enseigner l’apnée au sein de ma fédération est devenu une seconde nature pour moi. J’ai investi dans cette passion en participant activement à des groupes de réflexion, surtout après le succès populaire du « Grand Bleu ». J’ai œuvré à développer un tronc commun en poche pour les brevets d’État de pêche sous-marine et d’apnée.</p>
        <div class="photo"><img src="img/enfant-apnee.webp" alt="Grégory dans l'eau avec un jeune élève équipé de brassards" loading="lazy"></div>
      </div>
    </article>

    <article class="chapter reveal">
      <div class="mark">2350 m<small>Deux mondes</small></div>
      <div>
        <p>Ma passion pour l’apnée ne se limitait pas aux bassins de compétition. Je l’ai emportée avec moi sur les pistes enneigées, en donnant des cours dans une piscine à 2350 mètres d’altitude. Là, j’ai appris à des montagnards à retenir leur souffle, à plonger dans le froid glacial, entourés de neige, dans un mélange saisissant de deux mondes que tout semble opposer.</p>
      </div>
    </article>

    <article class="chapter reveal">
      <div class="mark">La mer<small>Pêcheur professionnel</small></div>
      <div>
        <p>Par la suite, je suis devenu pêcheur professionnel, mais toujours en apnée, en communion avec la mer. Cette pratique me permettait de sélectionner avec soin et respect les espèces que je remontais à la surface, dans un geste que je considère comme une pêche sélective, respectueuse de la biodiversité marine.</p>
        <div class="photo tall"><img src="img/noir-blanc.webp" alt="Portrait noir et blanc de Grégory" loading="lazy"></div>
      </div>
    </article>

    <article class="chapter reveal">
      <div class="mark">S’engager<small>Les causes</small></div>
      <div>
        <p>J’ai également consacré du temps à des causes nobles, comme initier à l’apnée des enfants atteints de cancer, ou sensibiliser les jeunes générations à l’écologie marine. Chaque souffle retenu, chaque plongée, était une leçon de vie, un rappel de la fragilité de notre existence et de celle de notre planète.</p>
      </div>
    </article>

    <article class="chapter reveal">
      <div class="mark">Aujourd’hui<small>Transmettre encore</small></div>
      <div>
        <p>Aujourd’hui, je continue de partager mon expérience, de transmettre ce respect profond pour l’apnée et l’océan. La mer est au cœur de ma vie, et chaque immersion est un retour aux sources, un voyage intérieur aussi profond que les eaux dans lesquelles je plonge. Le BPJEPS plongée sans scaphandre n’est pas seulement un diplôme pour moi, c’est la reconnaissance d’un parcours de vie dédié à la passion de l’apnée.</p>
        <a class="more" href="coaching.html">Découvrir mes coachings →</a>
      </div>
    </article>
  </section>

  <section id="medias">
    <p class="eyebrow reveal">Dans les médias</p>
    <h2 class="reveal">Ils m’ont <em>tendu le micro</em></h2>
    <p class="lead reveal">Interviews et podcasts où je raconte mon parcours, la respiration, le mental et la mer.</p>
    <div class="media-grid">
      <article class="media-card reveal">
        <div class="embed video" data-embed="https://www.youtube-nocookie.com/embed/V1ZvX-F8CbA?autoplay=1&amp;rel=0" data-title="Origin Média, entretien avec Grégory Ortiz">
          <img src="img/medias/yt-origin.webp" alt="" loading="lazy">
          <button class="embed-play" aria-label="Lire la vidéo"><svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg></button>
        </div>
        <div class="media-meta"><span class="kind">Vidéo · YouTube</span><h3>Apnéiste, attaque de baleine, AVC : survivre grâce au mental</h3><p>Origin Média</p></div>
      </article>
      <article class="media-card reveal">
        <div class="embed video" data-embed="https://www.youtube-nocookie.com/embed/kgQtx-jkKqg?autoplay=1&amp;rel=0" data-title="Still Point Podcast, épisode 17">
          <img src="img/medias/yt-stillpoint.webp" alt="" loading="lazy">
          <button class="embed-play" aria-label="Lire la vidéo"><svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg></button>
        </div>
        <div class="media-meta"><span class="kind">Vidéo · YouTube</span><h3>Respirer, plonger dans ses profondeurs, renaître à soi</h3><p>Still Point Podcast · épisode 17</p></div>
      </article>
      <article class="media-card audio reveal">
        <img class="cover" src="img/medias/in-the-air.webp" alt="" loading="lazy">
        <div class="media-meta"><span class="kind">Podcast · 61 min · octobre 2026</span><h3>La chasse sous-marine, à la frontière de l’air</h3><p>In the Air</p>
          <div class="embed audio" data-embed="https://open.spotify.com/embed/episode/730JL1DTndHAkJctj1Ofli?autoplay=1" data-height="152" data-title="In the Air, épisode avec Grégory Ortiz"><button class="btn small">▶ Écouter ici</button><a class="ext" href="https://open.spotify.com/episode/730JL1DTndHAkJctj1Ofli" target="_blank" rel="noopener">Ouvrir sur Spotify ↗</a></div>
        </div>
      </article>
      <article class="media-card audio reveal">
        <img class="cover" src="img/medias/voix-impact.webp" alt="" loading="lazy">
        <div class="media-meta"><span class="kind">Podcast · 42 min · juillet 2025</span><h3>Respiration, résilience et renaissance</h3><p>Les Voix de l’Impact</p>
          <div class="embed audio" data-embed="https://www.buzzsprout.com/2458383/17482859?client_source=small_player&amp;iframe=true" data-height="200" data-title="Les Voix de l'Impact, épisode avec Grégory Ortiz"><button class="btn small">▶ Écouter ici</button><a class="ext" href="https://www.buzzsprout.com/2458383/episodes/17482859" target="_blank" rel="noopener">Ouvrir sur Buzzsprout ↗</a></div>
        </div>
      </article>
    </div>
  </section>
''' + CONTACT + footer()
write('about.html', about)

# ------------------------------------------------------------------ COACHINGS
CFP = {'150 €': '18 000 CFP', '200 €': '24 000 CFP'}


def offer(id_, title, body, price, dur, cls='offer reveal'):
    return f'''
      <article class="{cls}" id="{id_}">
        <h3>{title}</h3>
        <div class="grow">{body}</div>
        <div class="price"><div><b>{price}</b> <span>/ {dur}</span><span class="cfp">{CFP[price]}</span></div><a class="btn teal small" href="#contact">Réserver</a></div>
      </article>'''

coaching = head('Mes différents coachings — En Profondeur',
                'Coaching de vie, respiration et relaxation, coaching sportif, apnée, pêche sous-marine, profondeur et sécurité. Tarifs et réservation.') \
    + header('coaching.html') + '''
<main>
  <section class="page-head">
    <p class="eyebrow reveal">Les programmes</p>
    <h1 class="emerge">Mes différents <em>coachings</em></h1>
    <p class="lead reveal">Je vous propose une gamme complète de services de coaching adaptés à vos besoins spécifiques, que ce soit pour améliorer votre vie personnelle, vos performances sportives ou votre sécurité en mer. Mon engagement est de vous offrir un accompagnement personnalisé et attentif, en mettant à profit mes compétences et mon expérience pour vous aider à atteindre vos objectifs. Que vous souhaitiez renforcer votre confiance en vous, optimiser votre efficacité ou explorer de nouvelles profondeurs sous-marines, je suis à votre écoute et prêt à vous guider à chaque étape de votre parcours.</p>
  </section>

  <div class="wave-band" aria-hidden="true"><svg viewBox="0 0 1440 160" preserveAspectRatio="none"><path data-wave="line 18 60 2200 0"/><path data-wave="line 14 80 2800 1"/><path data-wave="line 22 100 3400 2"/></svg></div>
  <section style="padding-top:0">
    <div class="group-title reveal" style="margin-top:0"><h2>Vie &amp; émotions</h2><p>Pour avancer, se libérer du stress, reprendre confiance.</p></div>
    <div class="main-offers">''' \
    + offer('coaching-vie', 'Coaching de vie',
            '<p>Vous accompagner est un privilège. Mon objectif est d’être à 100 % présent pour vous, à votre écoute et prêt à vous aider dans la réalisation de vos projets. Grâce à mon coaching de vie, je vous aiderai à :</p>'
            '<ul style="margin-top:14px"><li>Clarifier vos objectifs</li><li>Prendre conscience de vos ressources</li><li>Puiser dans vos ressources des solutions bénéfiques pour vous et votre entourage</li><li>Renforcer votre confiance en vous</li><li>Augmenter votre efficacité</li></ul>',
            '150 €', 'séance d’1 h') \
    + offer('coaching-respiration', 'Coaching respiration &amp; relaxation',
            '<p>Je propose un <strong>coaching respiration ancré dans le réel</strong>, issu de mes expériences de vie, pas d’une théorie abstraite.</p>'
            '<p style="margin-top:12px">Un accompagnement concret pour <strong>reprendre le contrôle émotionnel</strong>, idéal pour les personnes <strong>stressées</strong>.</p>'
            '<p style="margin-top:12px"><a href="index.html#essayer" style="color:var(--teal)">Essayer une minute de respiration guidée →</a></p>',
            '200 €', 'séance d’1 h') + '''
    </div>

    <div class="group-title reveal"><h2>Sport &amp; mer</h2><p>Pour les sportifs, apnéistes et chasseurs sous-marins.</p></div>
    <div class="strip reveal">
      <figure class="photo"><img src="img/langoustes.webp" alt="Grégory en combinaison, deux langoustes à la main" loading="lazy"></figure>
      <figure class="photo"><img src="img/merou.webp" alt="Grégory sur un bateau avec un mérou rouge" loading="lazy"></figure>
      <figure class="photo"><img src="img/poisson-falaise.webp" alt="Grégory dans l'eau avec un poisson, devant une falaise" loading="lazy"></figure>
    </div>
    <div class="offers-sm">''' \
    + offer('coaching-sportif', 'Coaching sportif',
            '<p>Je propose un accompagnement personnalisé pour divers sports, y compris la boxe et les Ironman. En plus de l’apnée et de la pêche sous-marine, j’accompagne d’autres sportifs dans l’atteinte de leurs objectifs.</p>',
            '150 €', 'séance') \
    + offer('coaching-peche', 'Coaching pêche sous-marine',
            '<p>J’offre un coaching spécialisé pour la pêche sous-marine, adapté à tous les niveaux, pour améliorer vos compétences et votre sécurité en mer.</p>',
            '150 €', 'séance') \
    + offer('coaching-apnee', 'Coaching apnée',
            '<p>Mon coaching apnée est conçu pour vous aider à améliorer votre capacité pulmonaire, votre endurance et votre sécurité lors de la plongée en apnée.</p>',
            '150 €', 'séance') \
    + offer('coaching-profondeur', 'Coaching gagner en profondeur',
            '<p>Coaching spécialisé pour améliorer votre capacité à plonger plus en profondeur en toute sécurité.</p>',
            '150 €', 'séance d’1 h 30') \
    + offer('coaching-securite', 'Coaching sécurité',
            '<p>Je propose un coaching crucial pour vous apprendre les meilleures pratiques de sécurité sous l’eau et éviter les risques potentiels de la plongée.</p>',
            '150 €', 'séance d’1 h 30') + '''
    </div>
    <p class="lead reveal" style="margin-top:60px">Pour toute information supplémentaire ou pour réserver une séance, contactez-moi. Je suis impatient de vous accompagner dans vos projets et de vous aider à atteindre vos objectifs !</p>
  </section>
''' + CONTACT + footer()
write('coaching.html', coaching)

# ------------------------------------------------------------------ TÉMOIGNAGES
def tcard(name, detail, hl, paras):
    body = ''.join(f'<p>{p}</p>' for p in paras)
    return f'''
      <article class="tcard reveal">
        <span class="q" aria-hidden="true">“</span>
        <p class="hl">{hl}</p>{body}
        <footer><b>{name}</b><span>{detail}</span></footer>
      </article>'''

T = [
    tcard('Léo P.', 'Programme de coaching',
          'Après chaque échange, je me sentais toujours soulagé et en confiance.',
          ['J’ai souscrit à un programme de coaching de Greg alors que je traversais une mauvaise passe totale, c’est-à-dire à la fois professionnelle, personnelle et relationnelle. Greg m’a d’abord aidé à clarifier la situation, à démêler le nœud de difficultés auquel je faisais face et qui me paralysait.',
           'Par la suite, Greg m’a accompagné pendant plusieurs semaines, au travers de séances de coaching et d’exercices à réaliser en autonomie. Grâce à son empathie exceptionnelle, Greg cerne rapidement et « au plus près » les demandes et difficultés de ses interlocuteurs. Son approche est très complète et repose sur une variété de méthodes qu’il ajuste continuellement en fonction des résultats obtenus.',
           'Après chaque échange, je me sentais toujours soulagé et en confiance, un sentiment que j’ai pu conserver après la fin du programme.']),
    tcard('Laure', 'Respiration · 3 mois',
          'Je remercie Grégory pour ces 3 mois qui ont changé ma façon de vivre !',
          ['J’ai consulté Grégory car j’avais tout le haut de mon corps verrouillé : cou, épaules coincées, dos recroquevillé. L’ostéopathe régulièrement me permettait de débloquer mon corps, mais cela revenait régulièrement.',
           'Grâce à Grégory j’ai pris conscience du fait que je ne respirais pas. Par les exercices respiratoires qu’il m’a conseillés j’ai repris vie. Il me suffisait juste de forcer ma respiration régulièrement dans la journée. J’ai facilement dès le lendemain mis en place de petits rituels.',
           'Un an après je continue à réaliser mes exercices car j’en vois les bénéfices au quotidien. Je fais circuler et je sens la circulation, ce qui m’a permis de reprendre le contrôle de mon corps et de ma vie. Ce fut un véritable cadeau.',
           'Nous avons commencé par cela et un nouveau chemin a pu s’ouvrir. Nous avons pu travailler sur mes projets, comment y aboutir et surtout me confronter aux obstacles que j’imaginais, à mon fonctionnement d’autosabotage et la mise en place par réflexe des armes pour pouvoir les repérer et les rejeter.']),
    tcard('Anonyme', 'Kinésithérapeute',
          'Je me suis sentie comprise et écoutée comme jamais auparavant.',
          ['Je recommande Greg sans hésitation à quiconque cherche un coach, que ce soit pour du développement physique (sportif), émotionnel ou pour trouver la réponse à une problématique précise. Je suis kinésithérapeute, mère de trois enfants, et suite à un divorce récent, avais décidé de quitter mon poste de cadre pour me lancer dans un nouveau projet professionnel.',
           'En tant que kiné spécialisée en soins palliatifs, je suis habituée à avoir des conversations difficiles avec mes patients et leurs familles. J’ai été impressionnée par les compétences de Greg. Il est capable d’une écoute exceptionnellement attentive, professionnelle, sans jugement, qui met immédiatement à l’aise.',
           'En outre, Greg a su utiliser de multiples outils qui m’ont aidée à avancer dans les problématiques auxquelles je faisais face, là où mon autre coach avait échoué. J’ai eu des séances de coaching auparavant, et bien que gentille, ma coach n’avait pas su trouver les moyens de me faire avancer. Greg m’a permis de clarifier mon projet, identifier les obstacles et trouver des moyens d’y faire face, non sans me donner des devoirs à faire… qui continuent, un an après, à m’aider pour surmonter les obstacles de la vie de tous les jours.',
           'Greg est passionné et possède un talent inné et unique pour guider ses clients vers leur but. Je referais des séances dans le futur sans hésitation.']),
    tcard('Bénédicte', 'Coaching de vie',
          'Un coach sportif et un coach de vie exceptionnel.',
          ['Gregory allie dans ses accompagnements une connexion à l’autre d’une grande puissance, une compréhension en finesse des systèmes relationnels et une capacité à questionner avec bienveillance les modes de fonctionnement, les croyances limitantes, les comportements contre-productifs : ce cocktail ouvre la possibilité d’une remise en question en douceur qui permet d’avancer et de sortir des angles morts, dans le respect des choix de vie de chacun.',
           'Sa grande capacité d’empathie, son expérience de sportif de haut niveau ainsi que sa très grande maîtrise des fonctionnements physiologiques en font un coach sportif et un coach de vie exceptionnel.']),
    tcard('Bruno', 'Préparation Ironman',
          'Au fil du temps, les zones de doutes se sont estompées et j’ai pu aborder cette épreuve de façon plus apaisée et confiante.',
          ['J’ai eu la chance de pouvoir bénéficier du coaching de Greg pour la préparation de mon premier Ironman. Je n’avais jusque-là jamais exploré les apports du coaching mental. Je dois dire que Greg, grâce à son écoute et à son questionnement, a su me projeter dans les situations de l’épreuve en mettant en avant les zones d’incertitude.',
           'Pour chacune de ces situations, Greg a su me proposer des solutions afin de lever les doutes. Je me suis très facilement laissé accompagner par Greg qui a su très grandement augmenter ma confiance dans mes capacités à relever ce défi. Entre chaque rendez-vous de coaching, j’ai pu tester et valider les propositions de Greg.',
           'Je garde bien évidemment un super souvenir du coaching de Greg qui apporte un super complément très utile à une préparation physique.']),
    tcard('Chloé', 'Coaching · 5 mois',
          'Son accompagnement m’a permis d’avoir des clefs que j’utilise encore 3 ans après.',
          ['J’ai eu la chance d’être accompagnée par Grégory pour un coaching qui a duré 5 mois. Il est très à l’écoute, disponible et réactif ! Et super sympa ! Il m’a permis d’affronter et résoudre le problème majeur pour lequel je l’ai contacté. Il a su me pousser en avant et me rassurer quand je doutais.',
           'J’ai été très bien suivie tout au long de cette remise en question et j’en suis ressortie grandie ! Si vous souhaitez effectuer un coaching alors foncez ! N’hésitez pas à contacter Grégory !']),
    tcard('Patrick Guinier', '70 ans',
          'Il m’a permis de remettre mes propres pendules, horloges, montres, bio-psycho-logiques à l’heure.',
          ['Client de Grégory Ortiz (GO) et heureux de l’être. Mon expérience de coaching avec GO m’a permis de « remettre mon horloge à l’heure ».',
           'Je connais ce personnage depuis les années 2010, rencontre bénéfique, nous partagions chacun une forme de passion pour le milieu naturel de la mer ! Confronté aux épreuves de la vie et aux conflits psychologiques, il m’a permis de régler mes pendules grâce à son écoute, ses analyses, conseils et ses exercices.',
           'Son passé et présent d’homme des profondeurs lui confère un calme et une maîtrise qu’il transmet par son approche, sa méthode et ses objectifs précis et facilement réalisables. Je pourrais être beaucoup plus dithyrambique mais en fait le mieux c’est de lui faire confiance.']),
]

VID_BASE = 'https://enprofondeur.fr/wp-content/uploads/2024/07/'
temoignages = head('Témoignages — En Profondeur',
                   'Ils racontent leur accompagnement avec Grégory Ortiz : coaching de vie, respiration, préparation Ironman. 7 témoignages écrits et 2 en vidéo.') \
    + header('temoignages.html') + f'''
<main>
  <section class="page-head">
    <p class="eyebrow reveal">Ils vous parlent de leur expérience</p>
    <h1 class="emerge">Ils <em>témoignent…</em></h1>
    <p class="lead reveal">Sept personnes accompagnées racontent avec leurs mots ce que le coaching a changé pour elles.</p>
  </section>

  <div class="wave-band" aria-hidden="true"><svg viewBox="0 0 1440 160" preserveAspectRatio="none"><path data-wave="line 18 60 2200 0"/><path data-wave="line 14 80 2800 1"/><path data-wave="line 22 100 3400 2"/></svg></div>
  <section style="padding-top:0">
    <div class="tgrid">{''.join(T)}
    </div>
  </section>

  <section id="videos">
    <p class="eyebrow reveal">En vidéo</p>
    <h2 class="reveal">Ils en parlent <em>face caméra</em></h2>
    <div class="videos">
      <figure class="video reveal"><video controls playsinline preload="none" poster="img/video-1.webp" src="{VID_BASE}VIDEO-2024-06-28-12-50-25-1.mp4"></video><figcaption><span>Témoignage vidéo</span><span>1 min 16</span></figcaption></figure>
      <figure class="video reveal"><video controls playsinline preload="none" poster="img/video-2.webp" src="{VID_BASE}VIDEO-2024-07-02-16-28-14-1.mp4"></video><figcaption><span>Témoignage vidéo</span><span>6 min 57</span></figcaption></figure>
    </div>
  </section>
''' + CONTACT + footer()
write('temoignages.html', temoignages)
print('ok', OUT, 'maquette' if MAQUETTE else 'production')
