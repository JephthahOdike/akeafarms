import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Seller Help' };

export default function SellerHelpPage() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl prose prose-sm dark:prose-invert">
        <h1>Seller Help Center</h1>
        <h2>Getting Started</h2>
        <ol>
          <li>Register as a seller on the <Link href="/register">registration page</Link></li>
          <li>Complete your seller profile with business details</li>
          <li>Wait for admin approval</li>
          <li>Set up your store — name, logo, banner, description</li>
          <li>Add products with images, pricing, and inventory</li>
        </ol>
        <h2>Managing Orders</h2>
        <p>Orders appear in your seller dashboard. Update order status as you process: Accept → Pack → Dispatch. Buyers can track progress in real-time.</p>
        <h2>Getting Paid</h2>
        <p>Earnings accumulate in your wallet. The platform deducts a small commission per sale. Settlements are processed on a schedule — check your wallet for details.</p>
        <h2>Commission</h2>
        <p>Commission rates depend on product category and seller agreement. View <Link href="/seller/fees">seller fees</Link> for more details.</p>
      </div>
    </div>
  );
}
