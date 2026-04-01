# Add Button Inline Integration Design

## Goal

Replace the floating action button (FAB) on NutritionPage and PhotosPage with an inline card integrated directly into each page's content list/grid.

## Architecture

No new components needed. Both pages are self-contained — the change is purely presentational within each page file. The FAB `<button>` is removed and replaced with an inline element that triggers the same action.

## Tech Stack

React, TypeScript, Tailwind CSS v4

---

## Changes

### NutritionPage (`client/src/pages/NutritionPage.tsx`)

- Remove the FAB `<button>` (fixed bottom-20 right-4, bg-accent, rounded-full)
- Add a dashed-border card at the end of the meals list:
  - White background, `border border-dashed border-accent`, `rounded-card`
  - Left icon: small green circle with `+`
  - Label: "Ajouter un repas" in `text-accent`
  - `onClick={openModal}` — same handler as the old FAB

### PhotosPage (`client/src/pages/PhotosPage.tsx`)

- Remove the FAB `<button>` (fixed bottom-20 right-4, bg-blue, rounded-full)
- In gallery mode, add a dashed-border card at the end of the photo grid:
  - Same `aspect-ratio` and grid sizing as existing photo cards
  - White background, `border border-dashed border-blue`, `rounded-card`
  - Centered `+` icon (blue circle) and label "Ajouter\nune photo"
  - `onClick={handleUploadClick}` — same handler as the old FAB
  - Shows loading state ("...") when `uploading === true`, same as old FAB
- In evolution mode: no add button (unchanged)

## Behaviour

No functional changes — the new elements trigger the exact same handlers as the removed FABs.
