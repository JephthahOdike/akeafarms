import { MessageSquare } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/helpers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'Messages' };

export default async function SellerMessagesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  // Fetch messages (placeholder - real impl reads from messages table)
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground mt-1">Communicate with buyers and platform support.</p>
      </div>

      <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-border">
        <MessageSquare className="size-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No messages yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Messages from buyers and support will appear here.
        </p>
      </div>
    </div>
  );
}
