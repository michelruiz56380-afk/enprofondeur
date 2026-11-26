#!/usr/bin/env bash
# Publie l'état actuel de `main` sur le site de test Hostinger.
#
# Étapes :
#   1. copie les fichiers du site dans la branche `hostinger-test`,
#      en ajoutant le noindex propre au site de test ;
#   2. pousse cette branche sur GitHub ;
#   3. en fait une archive, l'envoie sur Hostinger et la déploie
#      (ce qui remplace tout le contenu du site de test) ;
#   4. vide le cache et vérifie que la page d'accueil répond.
#
# La clé d'API Hostinger n'est PAS dans ce script. Dans une session Claude,
# elle est ajoutée automatiquement aux requêtes vers developers.hostinger.com.
# Ailleurs, définir HOSTINGER_API_TOKEN avant de lancer le script.
set -euo pipefail

USERNAME="u537196489"
DOMAIN="legendary-mediumturquoise-fox-24.hostingersite.com"
API="https://developers.hostinger.com/api/hosting/v1"
REPO="$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)"
WORK="$(mktemp -d)"
trap 'cd "$REPO"; git -C "$REPO" worktree remove --force "$WORK/wt" >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT

AUTH=()
if [ -n "${HOSTINGER_API_TOKEN:-}" ]; then AUTH=(-H "Authorization: Bearer $HOSTINGER_API_TOKEN"); fi

echo "1/4  Préparation de la branche hostinger-test…"
git -C "$REPO" fetch -q origin hostinger-test || true
git -C "$REPO" worktree add -q "$WORK/wt" hostinger-test
cd "$WORK/wt"
git rm -rq --ignore-unmatch . >/dev/null
cp "$REPO"/*.html .
cp -r "$REPO/assets" "$REPO/img" .
for f in *.html; do
  sed -i 's#<meta name="viewport" content="width=device-width, initial-scale=1">#&\n<meta name="robots" content="noindex, nofollow">#' "$f"
done
printf 'User-agent: *\nDisallow: /\n' > robots.txt
cat > .htaccess <<'EOF'
# Site de test : ne pas indexer, et ne jamais servir le dossier .git
Header set X-Robots-Tag "noindex, nofollow"
RedirectMatch 404 /\.git

# Cache navigateur : les pages sont revérifiées à chaque visite ;
# les fichiers versionnés (?v=empreinte) peuvent être gardés longtemps.
<IfModule mod_headers.c>
  <FilesMatch "\.html$">
    Header set Cache-Control "no-cache, must-revalidate"
  </FilesMatch>
  <FilesMatch "\.(css|js|webp|png|jpg|mp4)$">
    Header set Cache-Control "public, max-age=31536000"
  </FilesMatch>
</IfModule>
EOF
git add -A
if git diff --cached --quiet; then
  echo "     Rien de nouveau depuis le dernier déploiement."
else
  git commit -q -m "Site de test : synchronisation depuis main ($(git -C "$REPO" rev-parse --short main))"
  git -c push.negotiate=true push -q origin hostinger-test
fi

echo "2/4  Archive…"
ZIP="$WORK/site.zip"
git archive --format=zip -o "$ZIP" HEAD
SIZE=$(wc -c < "$ZIP" | tr -d ' ')

echo "3/4  Envoi et déploiement sur $DOMAIN…"
UP=$(curl -sSf "${AUTH[@]}" -X POST "$API/files/upload-urls" -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"domain\":\"$DOMAIN\"}")
URL=$(python3 -c 'import json,sys;print(json.load(sys.stdin)["url"])' <<<"$UP")
AK=$(python3 -c 'import json,sys;print(json.load(sys.stdin)["auth_key"])' <<<"$UP")
RK=$(python3 -c 'import json,sys;print(json.load(sys.stdin)["rest_auth_key"])' <<<"$UP")
H=(-H "X-Auth: $AK" -H "X-Auth-Rest: $RK" -H "Tus-Resumable: 1.0.0")
curl -sSf -o /dev/null -X POST "$URL/site.zip?override=true" "${H[@]}" -H "Upload-Length: $SIZE" -H "Upload-Offset: 0"
curl -sSf -o /dev/null -X PATCH "$URL/site.zip?override=true" "${H[@]}" \
  -H "Content-Type: application/offset+octet-stream" -H "Upload-Offset: 0" --data-binary "@$ZIP"
curl -sSf "${AUTH[@]}" -X POST "$API/accounts/$USERNAME/websites/$DOMAIN/deploy" \
  -H "Content-Type: application/json" -d '{"archive_path":"site.zip"}' >/dev/null

echo "4/4  Cache et vérification…"
sleep 10
curl -sSf "${AUTH[@]}" -X DELETE "$API/accounts/$USERNAME/websites/$DOMAIN/cache/clear" >/dev/null || true
curl -sSf "${AUTH[@]}" -X DELETE "$API/accounts/$USERNAME/websites/$DOMAIN/cdn/purge" >/dev/null || true
sleep 5
CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/?v=$(date +%s)")
echo "     https://$DOMAIN  →  HTTP $CODE"
[ "$CODE" = "200" ]
