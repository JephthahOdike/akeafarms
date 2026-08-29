import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Shipping Information',
  description:
    'Delivery options, timelines and fees for Akea Farms orders across Nigeria.',
  path: '/shipping'
});

export default function ShippingPage() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl prose prose-sm dark:prose-invert">
        <h1>Shipping Information</h1>
        <p>We deliver across all 36 states in Nigeria and the Federal Capital Territory. Delivery timelines and fees vary by location and seller.</p>
        <h2>Delivery Options</h2>
        <ul>
          <li><strong>Standard</strong>: 3–7 business days</li>
          <li><strong>Express</strong>: 1–3 business days (selected areas)</li>
          <li><strong>Pickup</strong>: Available at select seller locations</li>
        </ul>
        <h2>Shipping Fees</h2>
        <p>Shipping fees are calculated based on your location and the items in your order. Fees are displayed at checkout before payment.</p>
        <h2>Tracking</h2>
        <p>Once your order ships, you will receive a tracking code to monitor your delivery. Visit our <a href="/track">tracking page</a> to check your order status.</p>
      </div>
    </div>
  );
}
