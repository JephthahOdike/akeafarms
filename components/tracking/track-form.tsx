'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Truck, Package, CheckCircle, Clock, AlertTriangle, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface TrackingEvent {
  id?: string;
  status: string;
  notes?: string | null;
  location?: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<
  string,
  { icon: typeof Package; color: string; bg: string; label: string }
> = {
  created: {
    icon: Clock,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950',
    label: 'Order Created'
  },
  confirmed: {
    icon: CheckCircle,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950',
    label: 'Order Confirmed'
  },
  processing: {
    icon: Package,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950',
    label: 'Processing'
  },
  packed: {
    icon: Package,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950',
    label: 'Packed'
  },
  dispatched: {
    icon: Truck,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950',
    label: 'Dispatched'
  },
  in_transit: {
    icon: Truck,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950',
    label: 'In Transit'
  },
  delivered: {
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-950',
    label: 'Delivered'
  },
  issue: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bg: 'bg-red-50 dark:bg-red-950',
    label: 'Delivery Issue'
  },
  failed: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bg: 'bg-red-50 dark:bg-red-950',
    label: 'Delivery Failed'
  },
  cancelled: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bg: 'bg-red-50 dark:bg-red-950',
    label: 'Cancelled'
  }
};

export default function TrackForm() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = search.trim();
    if (!query) return;
    router.push(`/track?order=${encodeURIComponent(query)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        name="order"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="e.g. ORD-20260001-ABCD"
        className="flex-1"
      />
      <Button type="submit">
        <Search className="mr-1 size-4" />
        Track
      </Button>
    </form>
  );
}

export function TrackingTimeline({ events }: { events: TrackingEvent[] }) {
  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <Clock className="size-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No tracking events yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Tracking information will appear here once your order is processed.
        </p>
      </div>
    );
  }

  return (
    <div className="relative mt-6">
      {/* Vertical line */}
      <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />

      <div className="space-y-6">
        {events
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          .map((event, i) => {
            const config = STATUS_CONFIG[event.status] || STATUS_CONFIG.created;
            const Icon = config.icon;

            return (
              <div key={event.id || i} className="relative flex gap-4">
                {/* Dot */}
                <div
                  className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full ${config.bg}`}
                >
                  <Icon className={`size-5 ${config.color}`} />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 pt-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${config.color}`}>
                      {config.label}
                    </span>
                    {i === 0 && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                        Latest
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {event.notes || event.location ? (
                      <>
                        {event.notes}
                        {event.location && (
                          <span className="ml-2 inline-flex items-center gap-0.5">
                            <MapPin className="size-3" />
                            {event.location}
                          </span>
                        )}
                      </>
                    ) : (
                      'Status update'
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(event.created_at).toLocaleString('en-NG', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

export function TrackingStatusBadge({
  status
}: {
  status: string;
}) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.created;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${config.bg} ${config.color}`}
    >
      <Icon className="size-3.5" />
      {config.label}
    </span>
  );
}
