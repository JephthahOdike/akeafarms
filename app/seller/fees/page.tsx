import Link from 'next/link';
import { Percent } from 'lucide-react';

export const metadata = { title: 'Seller Fees' };

export default function SellerFeesPage() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl prose prose-sm dark:prose-invert">
        <h1>Seller Fees & Commission</h1>
        <p>Akea Farms charges a transparent commission on each sale to sustain platform operations and support services.</p>
        <h2>How Commission Works</h2>
        <p>When a buyer purchases your product, the platform deducts a commission from the total before crediting your wallet. The default rate is 15% of the order subtotal.</p>
        <h2>Variable Rates</h2>
        <p>Commission can vary by product category or seller agreement. Check your seller dashboard for your specific rate.</p>
        <h2>Example</h2>
        <ul>
          <li>Product price: ₦10,000</li>
          <li>Commission (15%): ₦1,500</li>
          <li>Your earning: ₦8,500</li>
        </ul>
        <h2>Settlement</h2>
        <p>Earnings move from pending to available balance after the order is completed. Settlements are processed periodically. View your <Link href="/seller/wallet">wallet</Link> for details.</p>
      </div>
    </div>
  );
}
