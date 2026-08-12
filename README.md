<div align="center">

# Expense

Gestion de finances personnelles : budget, épargne, bourse et simulateur de projection.

**[Voir la démo en ligne](https://expense-demo-one.vercel.app)**

</div>

## À propos

Ce projet est né d'un double objectif : construire une application complète de bout
en bout, de la modélisation de la base de données au déploiement, et disposer d'un
outil que j'utilise réellement au quotidien pour suivre mes finances. Ce qui rentre
et sort chaque mois, ce que je mets de côté, ce que j'investis en bourse, et à quoi
tout cela peut ressembler dans dix ou vingt ans.

Je ne connaissais ni Next.js, ni Prisma, ni NextAuth avant de commencer, mon
quotidien professionnel étant plutôt Vue.js et C#.NET. Ce projet a donc été l'occasion
d'apprendre ces technologies en construisant quelque chose de réel plutôt qu'en
suivant un tutoriel : le découpage entre Server Components et Server Actions, la
modélisation avec Prisma sur SQL Server, et la mise en place de l'authentification
de bout en bout.

**La version publiée ici est une démo.** L'instance de production est réservée à un
usage personnel et familial, sa base de données étant hébergée sur Azure SQL sur un
tier volontairement modeste, dimensionné pour quelques utilisateurs. La démo permet
de parcourir l'ensemble des fonctionnalités avec des données d'exemple, stockées
uniquement le temps de la session : rien n'est persisté en base, et chaque visiteur
repart d'un jeu de données vierge.

## Fonctionnalités

**Flux mensuels** : revenus, dépenses et placements récurrents ou ponctuels, avec calcul automatique du reste à vivre.

**Dashboard** : vue d'ensemble du patrimoine (liquide, bloqué, bourse), répartition des dépenses par catégorie et échéances du mois.

**Comptes d'épargne** : plusieurs comptes découpés en « poches » (projets), avec dépôts, retraits, virements internes et historique.

**Bourse** : portefeuilles rattachés à des courtiers, suivi des positions, calcul du TRI et du rendement, import automatique de l'historique Trade Republic.

**Simulateur** : projection d'épargne dans le temps ou calcul de l'effort nécessaire pour atteindre un objectif, avec sauvegarde des scénarios.

L'application permet également d'exporter les données en Excel et envoie des e-mails pour la réinitialisation de mot de passe.

## Stack

[Next.js 16](https://nextjs.org) (React 19 + TypeScript) · [Prisma](https://www.prisma.io) sur SQL Server (Azure SQL en production) · [NextAuth v5](https://authjs.dev) avec identifiants et connexion Google · [Tailwind CSS v4](https://tailwindcss.com) et [shadcn/ui](https://ui.shadcn.com) · [Recharts](https://recharts.org) pour les graphiques · [Resend](https://resend.com) pour les e-mails

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
