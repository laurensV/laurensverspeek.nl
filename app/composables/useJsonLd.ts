// Inject a JSON-LD structured-data block into <head>. Accepts a getter so the
// data can be reactive; re-serializes when it changes.
export function useJsonLd(data: MaybeRefOrGetter<Record<string, unknown>>) {
  useHead({
    script: [
      {
        type: 'application/ld+json',
        innerHTML: computed(() => JSON.stringify(toValue(data)))
      }
    ]
  })
}

export const SITE_URL = 'https://laurensverspeek.nl'

/**
 * A BreadcrumbList rooted at home, for pages that don't render the visible
 * PathBreadcrumbs trail (the full-viewport canvas pages /life and /desktop) but
 * should still emit the structured data every other content page does.
 */
export function breadcrumbList(trail: { name: string, item: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'home', item: SITE_URL },
      ...trail.map((crumb, i) => ({
        '@type': 'ListItem',
        position: i + 2,
        name: crumb.name,
        item: crumb.item
      }))
    ]
  }
}
