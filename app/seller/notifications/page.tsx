import { NotificationCenter } from '@/components/notifications/notification-center';

export const metadata = { title: 'Notifications' };

export default async function SellerNotificationsPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);

  return <NotificationCenter basePath="/seller/notifications" page={pageNum} />;
}
