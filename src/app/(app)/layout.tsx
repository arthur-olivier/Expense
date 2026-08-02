import { auth } from "@/lib/auth";
import Sidebar from "@/components/shared/SideBar";
import MobileTabBar from "@/components/shared/MobileTabBar";
import { processRecurringInvestments } from "@/lib/processRecurringInvestments";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
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
