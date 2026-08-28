import Link from 'next/link';
import { Store } from 'lucide-react';
import { SellerApplicationForm } from '@/components/auth/seller-application-form';

export const metadata = { title: 'Become a seller' };

export default async function SellerApplicationPage() {
  return (
    <div>
      <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
        <Store className="size-3.5" /> Seller onboarding
      </span>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground">
        Set up your store
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tell us about your business and farm. You can edit everything later from
        your seller dashboard.
      </p>
      <div className="mt-8">
        <SellerApplicationForm />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Want to shop instead?{' '}
        <Link
          href="/buyer"
          className="font-medium text-primary hover:underline"
        >
          Go to buyer dashboard
        </Link>
      </p>
    </div>
  );
}
