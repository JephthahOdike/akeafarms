'use client';

interface MobileFiltersProps {
  q?: string;
  category?: string;
  sort?: string;
  categories: { id: string; name: string; slug: string }[] | null;
}

export default function MobileFilters({ q, category, sort, categories }: MobileFiltersProps) {
  function navigate(params: Record<string, string | undefined>) {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (params.category && params.category !== 'all') search.set('category', params.category);
    if (params.sort) search.set('sort', params.sort);
    const qs = search.toString();
    window.location.href = `/products${qs ? '?' + qs : ''}`;
  }

  return (
    <div className="mb-4 flex items-center gap-2 lg:hidden">
      <select
        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        onChange={(e) => navigate({ q, category: e.target.value, sort })}
        value={category || 'all'}
      >
        <option value="all">All Categories</option>
        {categories?.map((c) => (
          <option key={c.id} value={c.slug}>{c.name}</option>
        ))}
      </select>
      <select
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        onChange={(e) => navigate({ q, category, sort: e.target.value || undefined })}
        value={sort || 'newest'}
      >
        <option value="newest">Newest</option>
        <option value="price_asc">Price: Low → High</option>
        <option value="price_desc">Price: High → Low</option>
      </select>
    </div>
  );
}
