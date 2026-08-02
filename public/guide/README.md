# Captures d'écran des guides de page

Chaque page a un bouton ℹ️ dans son en-tête qui ouvre un carousel expliquant son
fonctionnement (voir `components/shared/PageGuide.tsx` et `lib/guides.ts`).

Tant qu'aucune image n'est déposée ici, le carousel affiche un **visuel
schématique de repli** (dégradé + icône). Pour afficher une vraie capture,
dépose un PNG à l'emplacement attendu — il remplace automatiquement le repli.

## Emplacements attendus

| Page       | Fichiers                                                     |
| ---------- | ------------------------------------------------------------ |
| dashboard  | `dashboard/1.png`, `dashboard/2.png`, `dashboard/3.png`      |
| charges    | `charges/1.png`, `charges/2.png`, `charges/3.png`            |
| wallet     | `wallet/1.png`, `wallet/2.png`, `wallet/3.png`               |
| portfolio  | `portfolio/1.png`, `portfolio/2.png`, `portfolio/3.png`      |
| simulateur | `simulateur/1.png`, `simulateur/2.png`                       |

Format conseillé : ratio **16:9** (ex. 1280×720). Les chemins et libellés des
étapes se règlent dans `lib/guides.ts`.
