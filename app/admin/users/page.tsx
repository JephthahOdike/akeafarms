import { Users, UserCheck, Store, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'Users' };

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, role, status, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  const buyers = users?.filter((u) => u.role === 'buyer').length ?? 0;
  const sellers = users?.filter((u) => u.role === 'seller').length ?? 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage all platform users.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Card>
          <CardContent className="pt-6">
            <Users className="size-5 text-muted-foreground mb-2" />
            <p className="text-2xl font-bold">{users?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <UserCheck className="size-5 text-muted-foreground mb-2" />
            <p className="text-2xl font-bold">{buyers}</p>
            <p className="text-xs text-muted-foreground">Buyers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Store className="size-5 text-muted-foreground mb-2" />
            <p className="text-2xl font-bold">{sellers}</p>
            <p className="text-xs text-muted-foreground">Sellers</p>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Role</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-4 py-3">{u.full_name || '—'}</td>
                <td className="px-4 py-3 capitalize">{u.role}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString('en-NG')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
