import Link from 'next/link';
import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/register-form';
import type { UserRole } from '@/lib/types/database';

export const metadata: Metadata = { title: 'Create an account' };

type Props = {
  searchParams: Promise<{ role?: string }>;
};

export default async function RegisterPage({ searchParams }: Props) {
  const sp = await searchParams;
  const defaultRole: UserRole = sp.role === 'seller' ? 'seller' : 'buyer';

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Create your account
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Join Akea Farms as a buyer or seller — it only takes a minute.
      </p>
      <div className="mt-8">
        <RegisterForm defaultRole={defaultRole} />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
