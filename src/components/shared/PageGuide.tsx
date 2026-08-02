// PageGuide.tsx
// bouton d'aide (icône info) dans l'en-tête : ouvre un guide carousel tiré de lib/guides.ts selon pageKey
// autoOpen l'ouvre une seule fois par page (drapeau localStorage)

"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";

import { GUIDES, type GuideStep } from "@/lib/guides";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// visuel d'une étape : la vraie capture si elle existe, sinon un repli schématique (dégradé + icône + fausses lignes)
function GuideVisual({ step }: { step: GuideStep }) {
  const [imageFailed, setImageFailed] = useState(false);
  const Icon = step.icon;

  if (step.image && !imageFailed) {
    return (
      // <img> plutôt que next/image : fallback onError plus simple, pas de dimensions fixes imposées
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={step.image}
        alt={step.title}
        onError={() => setImageFailed(true)}
        className="h-36 w-full rounded-xl border object-cover md:aspect-video md:h-auto"
        style={{ borderColor: "var(--color-border, #e2e8f0)" }}
      />
    );
  }

  return (
    <div
      className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-xl border md:aspect-video md:h-auto"
      style={{
        borderColor: "var(--color-border, #e2e8f0)",
        background: "linear-gradient(135deg, var(--color-investment-bg, #eef2ff), var(--color-bg-surface, #f8fafc))",
      }}
    >
      {/* fausses lignes d'UI pour évoquer une capture */}
      <div className="absolute inset-0 flex flex-col gap-2 p-5 opacity-40">
        <div className="h-2.5 w-1/3 rounded-full bg-slate-400/50" />
        <div className="mt-2 h-8 w-full rounded-lg bg-slate-400/30" />
        <div className="grid flex-1 grid-cols-3 gap-2">
          <div className="rounded-lg bg-slate-400/30" />
          <div className="rounded-lg bg-slate-400/30" />
          <div className="rounded-lg bg-slate-400/30" />
        </div>
      </div>
      <div
        className="relative flex size-16 items-center justify-center rounded-2xl"
        style={{ background: "var(--color-bg-card, #fff)", boxShadow: "var(--shadow-card-lg)" }}
      >
        <Icon className="size-8" style={{ color: "var(--color-investment)" }} />
      </div>
    </div>
  );
}

function GuideSlide({ step }: { step: GuideStep }) {
  const Icon = step.icon;
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <GuideVisual step={step} />
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: "var(--color-investment-bg)", color: "var(--color-investment)" }}
        >
          <Icon className="size-4" />
        </div>
        <div>
          <p className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {step.title}
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
            {step.text}
          </p>
        </div>
      </div>
    </div>
  );
}

// carousel des étapes (shadcn/embla). navigation via l'api embla : current maj sur l'évènement select, count = nb d'étapes
function GuideCarousel({ steps }: { steps: GuideStep[] }) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const count = steps.length;

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Carousel setApi={setApi} opts={{ align: "start" }}>
        <CarouselContent>
          {steps.map((step, i) => (
            <CarouselItem key={i}>
              <GuideSlide step={step} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {count > 1 && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => api?.scrollPrev()}
            disabled={current === 0}
            aria-label="Précédent"
            className="flex size-8 items-center justify-center rounded-full border transition-colors hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
            style={{ borderColor: "var(--color-border, #e2e8f0)" }}
          >
            <ChevronLeft className="size-4" />
          </button>

          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => api?.scrollTo(i)}
                aria-label={`Aller à l'étape ${i + 1}`}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === current ? 20 : 6,
                  background: i === current ? "var(--color-investment)" : "var(--color-text-caption, #94a3b8)",
                  opacity: i === current ? 1 : 0.4,
                }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => api?.scrollNext()}
            disabled={current === count - 1}
            aria-label="Suivant"
            className="flex size-8 items-center justify-center rounded-full border transition-colors hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
            style={{ borderColor: "var(--color-border, #e2e8f0)" }}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// bouton d'aide à poser dans l'en-tête. pageKey = clé de lib/guides.ts
// autoOpen (page vide) ouvre le guide une seule fois, ensuite un drapeau localStorage bloque la réouverture auto
export default function PageGuide({ pageKey, autoOpen = false }: { pageKey: string; autoOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  const guide = GUIDES[pageKey];

  useEffect(() => {
    if (!autoOpen) return;
    const key = `guide-autoseen:${pageKey}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      // localStorage indispo (nav privé) : on ouvre quand même une fois
    }
    // ouverture post-montage : localStorage n'existe pas au SSR, sinon écart d'hydratation
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
  }, [autoOpen, pageKey]);

  if (!guide) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Comment fonctionne : ${guide.title}`}
        title="Comment fonctionne cette page ?"
        className="flex size-7 items-center justify-center rounded-full transition-colors hover:bg-slate-100"
        style={{ color: "var(--color-text-muted)" }}
      >
        <Info className="size-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-x-hidden md:max-w-lg">
          <DialogHeader>
            <DialogTitle>{guide.title}</DialogTitle>
            <DialogDescription>{guide.subtitle}</DialogDescription>
          </DialogHeader>

          <GuideCarousel steps={guide.steps} />
        </DialogContent>
      </Dialog>
    </>
  );
}
