import { MessageSquare } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/helpers';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata = { title: 'Messages' };

export default async function BuyerMessagesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground mt-1">Communicate with sellers and support.</p>
      </div>

      <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-border">
        <MessageSquare className="size-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No messages yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Messages from sellers and support will appear here.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}
