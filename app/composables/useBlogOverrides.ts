import type { Filesystem } from '~/utils/terminal/filesystem'
import { loadFs } from '~/utils/terminal/filesystem'
import { parseFrontmatter, parseTagList, renderMarkdownLite } from '~/utils/markdownLite'

export interface BlogOverride {
  title: string
  date: string
  description: string
  tags: string[]
  /** The edited markdown rendered to safe HTML (see utils/markdownLite) */
  html: string
}

/**
 * Blog posts edited through the terminal (`vim blog/<slug>.md`) really change
 * the site: the post pages and the lvOS blog reader check here first. An
 * override is a user-owned node at blog/<slug>.md — seeded site copies carry
 * the sys flag and don't count. `rm blog/<slug>.md` restores the original.
 */
export function useBlogOverrides() {
  // the shared home filesystem, by state key (avoids pulling in useTerminal)
  const files = useState<Filesystem>(STATE_KEYS.terminalFs, () => ({}))

  // overrides live in localStorage, which the server-rendered page can't see —
  // apply them only after mount so hydration matches the static markup
  const mounted = ref(false)
  onMounted(() => {
    mounted.value = true
    // the terminal normally restores the saved VFS into this state, but it's now
    // lazily mounted and may never open on a plain blog page — hydrate the user's
    // saved files ourselves so an edit made earlier still shows here
    if (!Object.keys(files.value).length) {
      const saved = loadFs()
      if (saved && Object.keys(saved).length) files.value = saved
    }
  })

  /** Plain reactive read — call it inside a computed or template. */
  const overrideFor = (slug: string): BlogOverride | null => {
    if (!mounted.value) return null
    const node = files.value[`blog/${slug}.md`]
    if (!node || node.dir || node.sys) return null
    const { meta, body } = parseFrontmatter(node.content)
    return {
      title: meta.title ?? slug,
      date: meta.date ?? '',
      description: meta.description ?? '',
      tags: parseTagList(meta.tags),
      html: renderMarkdownLite(body)
    }
  }

  /** Slugs with a local edit (for "edited" badges in lists). */
  const editedSlugs = computed(() => Object.keys(files.value)
    .filter((path) => /^blog\/[^/]+\.md$/.test(path) && !files.value[path]?.sys && !files.value[path]?.dir)
    .map((path) => path.slice(5, -3)))

  return { overrideFor, editedSlugs }
}
