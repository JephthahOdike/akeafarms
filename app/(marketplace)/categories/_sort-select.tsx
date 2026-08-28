'use client';

interface SortSelectProps {
  slug: string;
  sort?: string;
}

export default function SortSelect({ slug, sort }: SortSelectProps) {
  return (
    <select
      className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
      onChange={(e) => {
        const val = e.target.value;
        window.location.href = `/categories/${slug}${val ? '?sort=' + val : ''}`;
      }}
      value={sort || ''}
    >
      <option value="">Newest</option>
      <option value="price_asc">Price: Low → High</option>
      <option value="price_desc">Price: High → Low</option>
    </select>
  );
}
