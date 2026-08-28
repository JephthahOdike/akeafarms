import { getCurrentUser } from '@/lib/auth/helpers';
import { AddressForm } from '@/components/settings/address-form';

export const metadata = { title: 'Add Address' };

export default async function NewAddressPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="max-w-xl">
      <AddressForm mode="create" />
    </div>
  );
}
