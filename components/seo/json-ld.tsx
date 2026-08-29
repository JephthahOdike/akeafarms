import type { JsonLdObject } from '@/lib/seo';

/**
 * Renders a JSON-LD structured data script tag.
 * `<` is escaped to prevent injection from database-sourced strings.
 */
export function JsonLd({ data }: { data: JsonLdObject }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c')
      }}
    />
  );
}
