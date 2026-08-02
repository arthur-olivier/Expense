import {
  LayoutDashboard,
  Receipt,
  Wallet,
  LineChart,
  Calculator,
  PiggyBank,
  TrendingUp,
  CalendarClock,
  ArrowLeftRight,
  Layers,
  Percent,
  Landmark,
  type LucideIcon,
} from "lucide-react";

// une étape du guide. image optionnel : sans capture dans public/guide/<page>/, le PageGuide affiche un visuel de repli depuis icon
export type GuideStep = {
  icon: LucideIcon;
  title: string;
  text: string;
  image?: string;
};

export type PageGuide = {
  title: string;
  subtitle: string;
  steps: GuideStep[];
};

// clés = segment de route des pages sous app/(app)/
export const GUIDES: Record<string, PageGuide> = {
  dashboard: {
    title: "Le tableau de bord",
    subtitle: "Ta vue d'ensemble du mois en cours.",
    steps: [
      {
        icon: LayoutDashboard,
        title: "Vue d'ensemble",
        text: "Le tableau de bord résume ton mois : ce qu'il te reste à vivre, ce qu'il reste à prélever, et tes grands totaux (revenus, dépenses, placements).",
        image: "/guide/dashboard/1.png",
      },
      {
        icon: CalendarClock,
        title: "Ce qui reste à venir",
        text: "Les échéances non encore prélevées (dépenses et placements récurrents) sont mises en avant pour que tu saches ce qui va tomber d'ici la fin du mois.",
        image: "/guide/dashboard/2.png",
      },
      {
        icon: PiggyBank,
        title: "Ton patrimoine",
        text: "La carte patrimoine agrège tes comptes d'épargne et tes portefeuilles boursiers pour donner ta valeur nette totale, avec sa répartition.",
        image: "/guide/dashboard/3.png",
      },
    ],
  },
  charges: {
    title: "Les charges mensuelles",
    subtitle: "Gère tes revenus, dépenses et placements récurrents.",
    steps: [
      {
        icon: Receipt,
        title: "Revenus & dépenses",
        text: "Ajoute tes revenus et tes dépenses du mois. Le « reste à vivre » se recalcule automatiquement en haut de page.",
        image: "/guide/charges/1.png",
      },
      {
        icon: TrendingUp,
        title: "Placements",
        text: "Enregistre tes placements du mois. Marque-les comme récurrents pour qu'ils soient reproduits automatiquement chaque mois.",
        image: "/guide/charges/2.png",
      },
      {
        icon: ArrowLeftRight,
        title: "Suivi des prélèvements",
        text: "Coche ce qui a déjà été prélevé pour distinguer le réalisé du prévisionnel, et garder une vision juste de ta trésorerie.",
        image: "/guide/charges/3.png",
      },
    ],
  },
  wallet: {
    title: "Les comptes d'épargne",
    subtitle: "Soldes, poches et mouvements de tes comptes.",
    steps: [
      {
        icon: Wallet,
        title: "Tes comptes",
        text: "Crée un compte par livret ou enveloppe (Livret A, LDDS, compte courant...). Le solde total s'affiche en tête de page.",
        image: "/guide/wallet/1.png",
      },
      {
        icon: Layers,
        title: "Les poches",
        text: "Découpe un compte en poches (projet, précaution, vacances...) pour ventiler ton épargne à l'intérieur d'un même compte.",
        image: "/guide/wallet/2.png",
      },
      {
        icon: ArrowLeftRight,
        title: "Mouvements",
        text: "Enregistre dépôts, retraits et virements. Chaque mouvement met à jour le solde du compte et de la poche concernée.",
        image: "/guide/wallet/3.png",
      },
    ],
  },
  portfolio: {
    title: "La bourse",
    subtitle: "Suivi de tes portefeuilles boursiers (PEA, CTO...).",
    steps: [
      {
        icon: LineChart,
        title: "Tes portefeuilles",
        text: "Crée un portefeuille par enveloppe (PEA, CTO...). Chacun peut gérer son propre cash ou déléguer celui d'un courtier.",
        image: "/guide/portfolio/1.png",
      },
      {
        icon: TrendingUp,
        title: "Mouvements & positions",
        text: "Saisis achats, ventes, dividendes et dépôts. Les positions, le PRU et la plus-value latente se calculent automatiquement.",
        image: "/guide/portfolio/2.png",
      },
      {
        icon: Landmark,
        title: "Net après impôt",
        text: "L'app estime le net après impôt selon l'enveloppe et son ancienneté (ex. seuil des 5 ans du PEA), à partir de sa date d'ouverture.",
        image: "/guide/portfolio/3.png",
      },
    ],
  },
  simulateur: {
    title: "Le simulateur d'épargne",
    subtitle: "Visualise l'effet des intérêts composés.",
    steps: [
      {
        icon: Calculator,
        title: "Projection",
        text: "Renseigne un capital de départ, un versement mensuel et un rendement : le simulateur projette la croissance de ton épargne dans le temps.",
        image: "/guide/simulateur/1.png",
      },
      {
        icon: Percent,
        title: "Intérêts composés",
        text: "Le graphique distingue ce que tu as versé de ce que les intérêts ont généré, pour visualiser l'effet boule de neige.",
        image: "/guide/simulateur/2.png",
      },
    ],
  },
};
