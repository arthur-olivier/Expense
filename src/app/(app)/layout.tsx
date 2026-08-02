import { auth } from "@/lib/auth";
import Sidebar from "@/components/shared/SideBar";
import MobileTabBar from "@/components/shared/MobileTabBar";
import { processRecurringInvestments } from "@/lib/processRecurringInvestments";
import { isDemo } from "@/lib/demo";
import DemoBanner from "@/components/features/demo/DemoBanner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // En démo : pas d'auth ni de génération récurrente (aucune base). Bandeau permanent en haut.
  if (isDemo) {
    return (
      <div className="flex h-full w-full flex-col">
        <DemoBanner />
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <main className="flex-1 overflow-y-auto px-4 py-4 pb-[calc(72px+env(safe-area-inset-bottom)+16px)] md:px-10 md:py-8 md:pb-8">
            {children}
          </main>
        </div>
        <MobileTabBar />
      </div>
    );
  }

  const session = await auth();
  if (session?.user?.id) {
    await processRecurringInvestments(session.user.id).catch(() => {});
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-[calc(72px+env(safe-area-inset-bottom)+16px)] md:px-10 md:py-8 md:pb-8">
        {children}
      </main>
      <MobileTabBar />
    </>
  );
}
