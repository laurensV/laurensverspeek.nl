import { SITE_URL } from './useJsonLd'

export interface SeoOptions {
  /** The full document <title>, e.g. 'Uses — Laurens Verspeek'. */
  title: string
  /** One-sentence page description — feeds <meta description>, og and twitter. */
  description: string
  /** Absolute site path, e.g. '/uses' — becomes the canonical og:url. */
  path: string
  /** Absolute OG/Twitter card image URL. Defaults to the site's default card. */
  image?: string
  /** og:type — 'website' for pages, 'article' for posts/projects. */
  type?: 'website' | 'article'
  /**
   * Social card title, if it should differ from the document title. Defaults to
   * the document title with the ' — Laurens Verspeek' suffix trimmed, so a share
   * reads 'Uses' rather than 'Uses — Laurens Verspeek'.
   */
  ogTitle?: string
}

/**
 * One call sets the search-facing title/description AND the full Open Graph +
 * Twitter card, so a page can't set a good <title> yet fall back to the site's
 * generic social meta (which left ~13 pages sharing one card). Every page should
 * route its SEO through here instead of a partial useSeoMeta().
 */
export function useSeo(opts: SeoOptions) {
  const socialTitle = opts.ogTitle ?? opts.title.replace(/\s*[—–-]\s*Laurens Verspeek\s*$/, '')
  const image = opts.image ?? `${SITE_URL}/og/default.png`
  useHead({ title: opts.title })
  useSeoMeta({
    description: opts.description,
    ogTitle: socialTitle,
    ogDescription: opts.description,
    ogType: opts.type ?? 'website',
    ogUrl: `${SITE_URL}${opts.path}`,
    ogImage: image,
    twitterTitle: socialTitle,
    twitterDescription: opts.description,
    twitterImage: image
  })
}
