import type { IconName } from '~/utils/icons'
import { projects } from '~/data/projects'
import { profile } from '~/data/profile'
import { uses } from '~/data/uses'
import { storageGetJson, storageSetJson, isStringArray } from '~/utils/safeStorage'
import { writeClipboard } from '~/utils/clipboard'

export interface PaletteAction {
  id: string
  label: string
  hint?: string
  icon: IconName
  section: 'Pages' | 'Projects' | 'Blog' | 'Uses' | 'Theme' | 'Actions' | 'Socials' | 'Time Machine'
  keywords?: string
  perform: () => void
}

const RECENT_KEY = 'lv-palette-recent'
const COUNTS_KEY = 'lv-palette-counts'
const RECENT_MAX = 5

/** Simple subsequence fuzzy match, scores tighter matches higher */
export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  if (!q) return 1
  if (t.includes(q)) return 100 - t.indexOf(q)

  let qi = 0
  let score = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++
      score += 2
    }
  }
  return qi === q.length ? score : 0
}

export interface LabelSegment { text: string, match: boolean }

/**
 * Split a label into matched/unmatched segments for the query, so the palette
 * can highlight *why* an item matched. Prefers a contiguous substring; falls
 * back to a subsequence. Returns a single unmatched segment when the query only
 * matched the item's keywords (not its visible label).
 */
export function highlightLabel(query: string, label: string): LabelSegment[] {
  const q = query.trim().toLowerCase()
  if (!q) return [{ text: label, match: false }]
  const lower = label.toLowerCase()
  const matched = new Set<number>()

  const idx = lower.indexOf(q)
  if (idx >= 0) {
    for (let i = idx; i < idx + q.length; i++) matched.add(i)
  } else {
    let qi = 0
    for (let li = 0; li < label.length && qi < q.length; li++) {
      if (lower[li] === q[qi]) {
        matched.add(li)
        qi++
      }
    }
    if (qi < q.length) return [{ text: label, match: false }]
  }

  const segments: LabelSegment[] = []
  for (let i = 0; i < label.length; i++) {
    const isMatch = matched.has(i)
    const last = segments[segments.length - 1]
    if (last && last.match === isMatch) last.text += label[i] ?? ''
    else segments.push({ text: label[i]!, match: isMatch })
  }
  return segments
}

export function useCommandPalette() {
  const isOpen = useState(STATE_KEYS.paletteOpen, () => false)

  const router = useRouter()
  const colorMode = useColorMode()
  const terminal = useTerminal()
  const { toggleCrt } = useSiteEffects()
  const { accents, setAccent } = useAccent()
  const timeMachine = useTimeMachine()

  const open = () => (isOpen.value = true)
  const close = () => (isOpen.value = false)
  const toggle = () => (isOpen.value = !isOpen.value)

  const go = (path: string) => {
    close()
    void router.push(path)
  }

  // most-recently-used actions, persisted so the palette can surface them first
  const recent = useState<string[]>(STATE_KEYS.paletteRecent, () => [])
  if (import.meta.client && !recent.value.length) {
    recent.value = storageGetJson(RECENT_KEY, isStringArray) ?? []
  }

  // how often each action is chosen, so frequently-used items win ranking ties
  const counts = useState<Record<string, number>>('palette-counts', () => ({}))
  if (import.meta.client && !Object.keys(counts.value).length) {
    const isCounts = (value: unknown): value is Record<string, number> =>
      !!value && typeof value === 'object' && !Array.isArray(value)
    counts.value = storageGetJson(COUNTS_KEY, isCounts) ?? {}
  }

  const recordUse = (id: string) => {
    recent.value = [id, ...recent.value.filter((x) => x !== id)].slice(0, RECENT_MAX)
    counts.value = { ...counts.value, [id]: (counts.value[id] ?? 0) + 1 }
    if (import.meta.client) {
      storageSetJson(RECENT_KEY, recent.value)
      storageSetJson(COUNTS_KEY, counts.value)
    }
  }

  // blog posts as searchable entries (loaded lazily, empty until resolved)
  const { data: posts } = useLazyAsyncData('palette-posts', () =>
    queryCollection('blog').order('date', 'DESC').all()
  )

  // deploy history, so the palette can offer time-travel jumps (same
  // useTimeMachine the terminal `git checkout` and the lvOS app use); load()
  // fills the shared deploys ref the actions read
  void useLazyAsyncData('palette-deploys', () => timeMachine.load())

  const actions = computed<PaletteAction[]>(() => [
    { id: 'home', label: 'Home', icon: 'terminal', section: 'Pages', keywords: 'index start', perform: () => go('/') },
    { id: 'projects', label: 'Projects', icon: 'code', section: 'Pages', keywords: 'work portfolio', perform: () => go('/projects') },
    { id: 'blog', label: 'Blog', icon: 'file', section: 'Pages', keywords: 'posts writing articles', perform: () => go('/blog') },
    { id: 'about', label: 'About', icon: 'globe', section: 'Pages', keywords: 'bio skills timeline', perform: () => go('/about') },
    { id: 'uses', label: 'Uses', icon: 'cpu', section: 'Pages', keywords: 'gear tools stack setup', perform: () => go('/uses') },
    { id: 'now', label: 'Now', icon: 'globe', section: 'Pages', keywords: 'current doing building learning', perform: () => go('/now') },
    { id: 'changelog', label: 'Changelog', icon: 'code', section: 'Pages', keywords: 'git history commits updates', perform: () => go('/changelog') },
    { id: 'cv', label: 'CV / Resume', icon: 'file', section: 'Pages', keywords: 'resume curriculum print pdf', perform: () => go('/cv') },
    { id: 'contact', label: 'Contact', icon: 'mail', section: 'Pages', keywords: 'email reach', perform: () => go('/contact') },
    { id: 'museum', label: 'Museum', icon: 'layers', section: 'Pages', keywords: 'exhibits features catalog easter eggs', perform: () => go('/museum') },
    { id: 'keyboard', label: 'Keyboard shortcuts', icon: 'terminal', section: 'Pages', keywords: 'keys shortcuts reference vim chords', perform: () => go('/keyboard') },
    { id: 'stats', label: 'Stats', icon: 'code', section: 'Pages', keywords: 'analytics counters visits traffic', perform: () => go('/stats') },
    { id: 'status', label: 'Status', icon: 'monitor', section: 'Pages', keywords: 'relay health uptime services', perform: () => go('/status') },
    ...projects.map<PaletteAction>((project) => ({
      id: `project-${project.slug}`,
      label: project.title,
      hint: project.category,
      icon: 'layers',
      section: 'Projects',
      keywords: project.tech.join(' '),
      perform: () => go(`/projects/${project.slug}`)
    })),
    ...(posts.value ?? []).map<PaletteAction>((post) => ({
      id: `post-${post.path}`,
      label: post.title,
      hint: 'post',
      icon: 'file',
      section: 'Blog',
      keywords: `${post.tags?.join(' ') ?? ''} ${post.description}`,
      perform: () => go(post.path)
    })),
    // every gear item from /uses, so searching a tool name finds it — external
    // links open in a tab, the rest jump to the page
    ...uses.flatMap<PaletteAction>((group) =>
      group.items.map((item) => ({
        id: `uses-${item.name}`,
        label: item.name,
        hint: 'uses',
        icon: item.icon ?? 'cpu',
        section: 'Uses',
        keywords: `${group.group} ${item.note ?? ''} gear tools setup`,
        perform: () => {
          if (item.url) {
            close()
            window.open(item.url, '_blank', 'noopener')
          } else {
            go('/uses')
          }
        }
      }))
    ),
    ...accents.map<PaletteAction>((a) => ({
      id: `accent-${a.name}`,
      label: `Accent: ${a.name}`,
      hint: 'colorscheme',
      icon: 'sun',
      section: 'Theme',
      keywords: 'accent color colorscheme palette',
      perform: () => {
        setAccent(a.name)
        close()
      }
    })),
    {
      id: 'terminal',
      label: 'Open terminal',
      hint: '~',
      icon: 'terminal',
      section: 'Actions',
      keywords: 'shell cli console',
      perform: () => {
        close()
        terminal.open()
      }
    },
    {
      id: 'desktop',
      label: 'Boot lvOS desktop',
      hint: 'easter egg',
      icon: 'cpu',
      section: 'Actions',
      keywords: 'os desktop windows startx',
      perform: () => go('/desktop')
    },
    {
      id: 'life',
      label: "Play Conway's Game of Life",
      hint: 'easter egg',
      icon: 'zap',
      section: 'Actions',
      keywords: 'conway cellular automaton game life simulation play grid',
      perform: () => go('/life')
    },
    {
      id: 'resume',
      label: 'Download resume (PDF)',
      hint: 'pdf',
      icon: 'file',
      section: 'Actions',
      keywords: 'cv resume pdf download',
      perform: () => {
        close()
        window.open('/laurens-verspeek-resume.pdf', '_blank', 'noopener')
      }
    },
    {
      id: 'theme',
      label: 'Toggle theme',
      hint: colorMode.value === 'dark' ? 'to light' : 'to dark',
      icon: colorMode.value === 'dark' ? 'sun' : 'moon',
      section: 'Actions',
      keywords: 'dark light mode color',
      perform: () => {
        useThemeSwitch().toggle()
        close()
      }
    },
    {
      id: 'crt',
      label: 'Toggle CRT mode',
      hint: 'retro',
      icon: 'monitor',
      section: 'Actions',
      keywords: 'crt retro scanlines vintage screen',
      perform: () => {
        toggleCrt()
        close()
      }
    },
    {
      id: 'copy-link',
      label: 'Copy link to this page',
      hint: 'clipboard',
      icon: 'external',
      section: 'Actions',
      keywords: 'share url copy clipboard link',
      perform: () => {
        close()
        void writeClipboard(window.location.href)
      }
    },
    // jump to a past deploy without opening the terminal — only when the
    // time machine is actually usable (service worker + public gh-pages history)
    ...(timeMachine.isAvailable() && timeMachine.active.value
      ? [{
          id: 'travel-present',
          label: 'Return to the present',
          hint: 'exit time travel',
          icon: 'clock' as IconName,
          section: 'Time Machine' as const,
          keywords: 'return present exit time travel now live current',
          perform: () => {
            close()
            void timeMachine.returnToPresent()
          }
        }]
      : []),
    ...(timeMachine.isAvailable()
      ? timeMachine.deploys.value
          .filter((deploy) => !deploy.current)
          .slice(0, 25)
          .map<PaletteAction>((deploy) => ({
            id: `travel-${deploy.source}`,
            label: `Travel to ${deploy.tag ?? deploy.date}`,
            hint: deploy.subject.slice(0, 42),
            icon: 'clock',
            section: 'Time Machine',
            keywords: `time machine travel history deploy version snapshot ${deploy.date} ${deploy.tag ?? ''} ${deploy.source}`,
            perform: () => {
              close()
              void timeMachine.travelTo(deploy)
            }
          }))
      : []),
    ...profile.socials.map<PaletteAction>((social) => ({
      id: `social-${social.label}`,
      label: social.label,
      hint: 'opens in new tab',
      icon: social.icon as IconName,
      section: 'Socials',
      keywords: 'social link',
      perform: () => {
        close()
        window.open(social.url, '_blank', 'noopener')
      }
    }))
  ])

  return { isOpen, open, close, toggle, actions, recent, counts, recordUse }
}
