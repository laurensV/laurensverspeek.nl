import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    blog: defineCollection({
      type: 'page',
      source: 'blog/*.md',
      schema: z.object({
        date: z.string(),
        description: z.string(),
        tags: z.array(z.string()).optional(),
        // declaring rawbody makes Nuxt Content keep the raw markdown source —
        // the terminal's virtual filesystem serves posts as real .md files
        rawbody: z.string().optional()
      })
    })
  }
})
