import { getCurrentUser } from '@/lib/auth/helpers';
import { redirect } from 'next/navigation';
import { DashboardNav, type NavItem } from '@/components/layout/dashboard-nav';
import { DashboardTopbar } from '@/components/layout/dashboard-topbar';
import { Logo } from '@/components/brand/logo';

const ROLE_REDIRECT: Record<string, string> = {
  buyer: '/buyer',
  seller: '/seller',
  admin: '/admin'
};

export async function DashboardLayout({
  role,
  nav,
  children
}: {
  role: string;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.profile.role !== role) {
    redirect(ROLE_REDIRECT[user.profile.role] || '/');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-4">
          <Logo showText />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <DashboardNav items={nav} />
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardTopbar profile={user.profile} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
