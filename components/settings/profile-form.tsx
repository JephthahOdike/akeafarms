'use client';

import { useActionState, useRef, useState } from 'react';
import { Camera, Loader2, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { updateProfile } from '@/lib/settings/actions';
import type { SettingsActionResult } from '@/lib/settings/actions';
import type { Profile } from '@/lib/types/database';

export function ProfileForm({ profile }: { profile: Profile }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<SettingsActionResult | null, FormData>(
    updateProfile,
    null
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Update your name and contact details.</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              name="full_name"
              defaultValue={profile.full_name}
              required
              minLength={2}
              maxLength={100}
              placeholder="Your full name"
            />
            {state?.fieldErrors?.full_name && (
              <p className="text-xs text-destructive">{state.fieldErrors.full_name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={profile.email}
              disabled
              className="text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Email changes require verification. Use the Security section below.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={profile.phone || ''}
              placeholder="08029965942"
            />
            {state?.fieldErrors?.phone && (
              <p className="text-xs text-destructive">{state.fieldErrors.phone}</p>
            )}
          </div>

          {state?.success && (
            <p className="text-sm text-green-600 font-medium">Profile updated successfully.</p>
          )}
          {state?.error && !state.fieldErrors && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 size-4" />
                Save Changes
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function AvatarUpload({ profile }: { profile: Profile }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [error, setError] = useState('');

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/settings/avatar', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (res.ok && data.url) {
      setAvatarUrl(data.url);
    } else {
      setError(data.error || 'Upload failed.');
    }

    setUploading(false);
  }

  async function handleRemove() {
    setUploading(true);
    setError('');

    const res = await fetch('/api/settings/avatar', { method: 'DELETE' });
    const data = await res.json();

    if (res.ok) {
      setAvatarUrl(null);
    } else {
      setError(data.error || 'Failed to remove avatar.');
    }

    setUploading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Photo</CardTitle>
        <CardDescription>Upload a profile photo. Square images work best.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={profile.full_name}
                className="size-20 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-border">
                <span className="text-2xl font-bold text-primary">
                  {profile.full_name
                    .split(' ')
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </span>
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-background/70 flex items-center justify-center">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <Camera className="mr-1 size-4" />
              {avatarUrl ? 'Change' : 'Upload'}
            </Button>
            {avatarUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={uploading}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-1 size-4" />
                Remove
              </Button>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">JPEG, PNG, WebP or AVIF. Max 5 MB.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
