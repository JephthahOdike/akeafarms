import Link from 'next/link';
import Image from 'next/image';
import { Leaf } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Categories' };

const CATEGORY_IMAGES: Record<string, string> = {
  'grains-cereals': 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&q=80',
  'tubers-roots': 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=400&q=80',
  'vegetables': 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=400&q=80',
  'fruits': 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&q=80',
  'livestock': 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=400&q=80',
  'poultry': 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400&q=80',
  'cash-crops': 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=400&q=80',
  'processed-foods': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80'
};

export default async function CategoriesPage() {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug, description, image_url')
    .is('parent_id', null)
    .eq('is_active', true)
    .order('sort_order');

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="mt-2 text-muted-foreground">
            Browse agricultural products by category — from fresh grains to livestock.
          </p>
        </div>

        {categories && categories.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((cat) => {
              const imgSrc = cat.image_url || CATEGORY_IMAGES[cat.slug];
              return (
                <Link
                  key={cat.id}
                  href={`/categories/${cat.slug}`}
                  className="group rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-md hover:border-primary/30"
                >
                  <div className="aspect-[4/3] relative bg-muted overflow-hidden">
                    {imgSrc ? (
                      <Image
                        src={imgSrc}
                        alt={cat.name}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="flex items-center justify-center size-full">
                        <Leaf className="size-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold group-hover:text-primary">{cat.name}</h3>
                    {cat.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{cat.description}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Leaf className="size-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No categories yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">Categories will appear here soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
