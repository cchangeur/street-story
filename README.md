# street-story

Site web de géolocalisation qui raconte l'histoire de la personne, du lieu ou de l'événement derrière le nom de la rue où l'on se trouve.

## Exemple d'usage

- L'utilisateur autorise la géolocalisation
- L'application récupère l'adresse courante
- Elle détecte le nom de rue, par exemple `avenue Charles-de-Gaulle`
- Elle identifie l'entité historique associée
- Elle affiche une fiche courte avec :
  - photo
  - type d'entité (personne, lieu, événement)
  - 3 à 5 points marquants
  - personnages liés
  - sources

## MVP

### Parcours
1. Géolocaliser l'utilisateur
2. Faire un reverse geocoding précis
3. Extraire et normaliser le nom de rue
4. Résoudre l'entité historique
5. Afficher une fiche courte, fiable et rapide à lire

### Données
- Adresse : Géoplateforme / BAN
- Entité : Wikidata
- Résumé : Wikipedia
- Image : Wikimedia Commons

### Principe produit
Les faits viennent de sources structurées.
Le LLM sert uniquement à condenser l'information en quelques bullets points lisibles.

## Stack recommandée

- Front : Next.js + Tailwind
- API : routes Next.js
- Cache : SQLite au début, Postgres plus tard si besoin
- Cartographie optionnelle : Leaflet

## V1

- géolocalisation navigateur
- reverse geocoding
- identification du nom de rue
- fiche courte avec image + résumé + points marquants
- cache simple
- fallback si la rue est ambiguë ou introuvable

## V2

- overrides manuels pour les rues ambiguës
- historique des rues consultées
- mode autour de moi
- audio / narration

## Risques produit

- Beaucoup de rues sont ambiguës
- Certaines rues ne renvoient pas à une personne mais à un lieu, une date ou une bataille
- La qualité du produit dépend fortement de la normalisation et du matching

## Priorités techniques immédiates

1. Faire un proof of concept de reverse geocoding
2. Définir une pipeline de normalisation des noms de rue
3. Tester la résolution Wikidata / Wikipedia sur 20 rues réelles
4. Construire l'API `GET /api/story?lat=...&lng=...`
5. Créer une UI mobile simple
