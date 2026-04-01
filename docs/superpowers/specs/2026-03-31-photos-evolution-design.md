# Photos — Vue Évolution

**Date:** 2026-03-31

## Objectif

Ajouter une vue "Évolution" dans la page Photos permettant de visualiser sa progression dans le temps : comparaison de la plus ancienne vs la plus récente photo par catégorie, et timeline chronologique scrollable.

## UI / Navigation

La page Photos garde sa structure actuelle. Un toggle **Galerie | Évolution** est ajouté en haut à droite du titre. Il bascule entre deux modes sans changer de route.

- Mode **Galerie** : comportement actuel inchangé (grille + onglets de filtrage + FAB upload)
- Mode **Évolution** : nouveau contenu décrit ci-dessous

## Mode Évolution

### Sélecteur de catégorie

Trois pills cliquables : Face / Profil / Dos. Une seule catégorie active à la fois. Pas d'option "Toutes" (la comparaison n'a de sens que par catégorie). Catégorie par défaut : FRONT.

### Bloc Avant → Après

Affiche la plus ancienne et la plus récente photo de la catégorie sélectionnée côte à côte. Si la catégorie n'a qu'une seule photo, la même est affichée des deux côtés. Si aucune photo, un état vide est affiché.

- Photo gauche : date de la plus ancienne
- Photo droite : date de la plus récente
- Entre les deux : flèche →
- En dessous : "X jours de progression" (différence entre les deux dates, en jours)

### Timeline

Scroll horizontal de toutes les photos de la catégorie sélectionnée, triées par date croissante. Chaque item = vignette carrée + date courte en dessous. La plus récente est mise en avant (bordure accent).

## Données

Pas de nouvel endpoint nécessaire. L'endpoint existant `GET /photos?category=X` retourne toutes les photos triées par date desc. Le client dérive la plus ancienne (dernière du tableau) et la plus récente (première).

## Composants à créer / modifier

- `PhotosPage.tsx` : ajout du state `mode` (`'gallery' | 'evolution'`), toggle UI, rendu conditionnel
- Nouveau composant `PhotoEvolutionView.tsx` : contient le sélecteur de catégorie, le bloc avant/après, et la timeline

## États limites

- 0 photo dans la catégorie : message "Aucune photo pour cette catégorie"
- 1 photo : bloc avant/après affiche la même photo des deux côtés, "0 jour"
- Photos sans date cohérente : tri par `date` ASC pour la plus ancienne, `date` DESC pour la plus récente (déjà trié par l'API)
