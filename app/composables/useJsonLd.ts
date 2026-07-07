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
