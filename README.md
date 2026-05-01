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

## Stack de démarrage actuelle

Pour aller vite avec GitHub Pages, la V1 est volontairement **statique** :

- Front : HTML + CSS + JavaScript vanilla
- Hébergement : GitHub Pages
- Géolocalisation : navigateur
- Reverse geocoding : API Géoplateforme / BAN
- Connaissance : Wikipédia + Wikidata + Wikimedia Commons

Une V2 pourra migrer vers Next.js si on veut un backend, du cache serveur, des overrides éditoriaux ou des appels LLM plus propres.

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

## Structure actuelle

- `docs/index.html` : interface principale
- `docs/styles.css` : styles
- `docs/app.js` : logique front, géolocalisation, saisie manuelle d’adresse, reverse geocoding, matching Wikipédia/Wikidata
- GitHub Pages publie le dossier `docs/` depuis la branche `main`

## Priorités techniques immédiates

1. Tester la V1 sur plusieurs rues réelles
2. Améliorer la normalisation des noms de rue
3. Ajouter des overrides manuels pour les cas ambigus
4. Ajouter quelques exemples / démos prêts à l’emploi
5. Décider quand passer à une V2 avec backend
