import type { TerminalContext } from '~/utils/terminal/types'
import { renderMarkdownToTerminal } from '~/utils/terminalMarkdown'

// Shared blog-post plumbing for the content command modules: `blog` lists and
// reads posts, `cat` falls back to them, `tree` counts them — all through the
// same fetch and slug cache.

export const postSlug = (path: string) => path.split('/').pop() ?? path

// filled after the first fetch, so tab completion for post names can be sync;
// module-scoped so every command module shares the one cache
let cachedPostSlugs: string[] = []
export const postSlugCandidates = () => cachedPostSlugs

export function createPostTools(ctx: TerminalContext) {
  const { push, out, muted, error, link } = ctx

  const fetchPosts = () =>
    ctx.fetchPosts().then((posts) => {
      cachedPostSlugs = posts.map((p) => postSlug(p.path))
      return posts
    })

  const readPost = (query: string, notFound: (query: string) => void) => {
    const q = query.toLowerCase().replace(/\.md$/, '')
    return fetchPosts()
      .then((posts) => {
        const post =
          posts.find((p) => postSlug(p.path) === q)
          ?? posts.find((p) => postSlug(p.path).includes(q) || p.title.toLowerCase().includes(q))
        if (!post) {
          notFound(query)
          return
        }
        push('primary', `# ${post.title}`)
        muted(`${post.date}${post.tags?.length ? ` · ${post.tags.map((t) => `#${t}`).join(' ')}` : ''}`)
        for (const line of renderMarkdownToTerminal(post.body)) {
          push(line.type, line.text, line.html)
        }
        out('')
        link(`Read in style → ${post.path}`, post.path)
      })
      .catch(() => error('blog: failed to load posts'))
  }

  return { fetchPosts, readPost }
}
