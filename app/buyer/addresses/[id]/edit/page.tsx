import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/helpers';
import { createClient } from '@/lib/supabase/server';
import { AddressForm } from '@/components/settings/address-form';

export const metadata = { title: 'Edit Address' };

export default async function EditAddressPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const supabase = await createClient();

  const { data: address } = await supabase
    .from('shipping_addresses')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!address) notFound();

  return (
    <div className="max-w-xl">
      <AddressForm
        mode="edit"
        addressId={address.id}
        defaultValues={address as Record<string, string | boolean | null>}
      />
    </div>
  );
}
