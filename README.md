# Expense

Application web de gestion de finances personnelles : budget mensuel, épargne, portefeuille boursier et simulateur de projection, dans une seule interface.

J'ai construit ce projet pour suivre mon propre argent au même endroit : ce qui rentre et sort chaque mois, ce que je mets de côté, ce que j'investis en bourse, et à quoi ça peut ressembler dans 10 ou 20 ans.

## Fonctionnalités

- **Charges** : revenus, dépenses et placements récurrents ou ponctuels, avec calcul automatique du reste à vivre.
- **Dashboard** : vue d'ensemble du patrimoine (liquide / bloqué / bourse), répartition des dépenses par catégorie et échéances du mois.
- **Comptes d'épargne** : plusieurs comptes découpés en "poches" (projets), avec dépôts, retraits, virements internes et historique.
- **Bourse** : portefeuilles rattachés à des courtiers, suivi des positions, calcul du TRI et du rendement, import automatique de l'historique Trade Republic.
- **Simulateur** : projection d'épargne dans le temps ou calcul de l'effort nécessaire pour atteindre un objectif, avec sauvegarde des scénarios.
- Export Excel des données et envoi d'e-mails (réinitialisation de mot de passe).

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Server Actions) + React 19 + TypeScript
- [Prisma](https://www.prisma.io) (SQLite en local, SQL Server en production)
- [NextAuth v5](https://authjs.dev) avec identifiants et connexion Google
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) (Radix)
- [Recharts](https://recharts.org) pour les graphiques
- [Resend](https://resend.com) pour les e-mails

## Lancer en local

```bash
# 1. installer les dépendances
npm install

# 2. créer un .env (DATABASE_URL, AUTH_SECRET,
#    variables Google et Resend)

# 3. préparer la base
npx prisma migrate dev
npx prisma db seed

# 4. démarrer
npm run dev
```

L'app tourne sur [http://localhost:3000](http://localhost:3000).

## Organisation du code

```
src/
  actions/       server actions (charges, portfolio, wallet, ...)
  app/           routes App Router (auth + app)
  components/    features/ (par domaine) · shared/ · ui/ (shadcn)
  lib/           calculs (épargne, portfolio), auth, prisma, exports
  types/         types partagés dérivés du schéma Prisma
prisma/          schéma, migrations et seed
```
