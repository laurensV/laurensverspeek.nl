import type { IconName } from '~/components/AppIcon.vue'
import { projects } from '~/data/projects'
import { profile } from '~/data/profile'

export interface PaletteAction {
  id: string
  label: string
  hint?: string
  icon: IconName
  section: 'Pages' | 'Projects' | 'Blog' | 'Theme' | 'Actions' | 'Socials'
  keywords?: string
  perform: () => void
}

const RECENT_KEY = 'lv-palette-recent'
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

export function useCommandPalette() {
  const isOpen = useState('palette-open', () => false)

  const router = useRouter()
  const colorMode = useColorMode()
  const terminal = useTerminal()
  const { desktopActive } = useSiteEffects()
  const { accents, setAccent } = useAccent()

  const open = () => (isOpen.value = true)
  const close = () => (isOpen.value = false)
  const toggle = () => (isOpen.value = !isOpen.value)

  const go = (path: string) => {
    close()
    router.push(path)
  }

  // most-recently-used actions, persisted so the palette can surface them first
  const recent = useState<string[]>('palette-recent', () => [])
  if (import.meta.client && !recent.value.length) {
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as unknown
      if (Array.isArray(saved)) recent.value = saved.filter((x): x is string => typeof x === 'string')
    } catch { /* ignore corrupted storage */ }
  }

  const recordUse = (id: string) => {
    recent.value = [id, ...recent.value.filter((x) => x !== id)].slice(0, RECENT_MAX)
    if (import.meta.client) {
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(recent.value))
      } catch { /* ignore */ }
    }
  }

  // blog posts as searchable entries (loaded lazily, empty until resolved)
  const { data: posts } = useLazyAsyncData('palette-posts', () =>
    queryCollection('blog').order('date', 'DESC').all()
  )

  const actions = computed<PaletteAction[]>(() => [
    { id: 'home', label: 'Home', icon: 'terminal', section: 'Pages', keywords: 'index start', perform: () => go('/') },
    { id: 'projects', label: 'Projects', icon: 'code', section: 'Pages', keywords: 'work portfolio', perform: () => go('/projects') },
    { id: 'blog', label: 'Blog', icon: 'file', section: 'Pages', keywords: 'posts writing articles', perform: () => go('/blog') },
    { id: 'about', label: 'About', icon: 'globe', section: 'Pages', keywords: 'bio skills timeline', perform: () => go('/about') },
    { id: 'uses', label: 'Uses', icon: 'cpu', section: 'Pages', keywords: 'gear tools stack setup', perform: () => go('/uses') },
    { id: 'now', label: 'Now', icon: 'globe', section: 'Pages', keywords: 'current doing building learning', perform: () => go('/now') },
    { id: 'cv', label: 'CV / Resume', icon: 'file', section: 'Pages', keywords: 'resume curriculum print pdf', perform: () => go('/cv') },
    { id: 'contact', label: 'Contact', icon: 'mail', section: 'Pages', keywords: 'email reach', perform: () => go('/contact') },
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
      keywords: `${post.tags?.join(' ') ?? ''} ${post.description ?? ''}`,
      perform: () => go(post.path)
    })),
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
      perform: () => {
        close()
        desktopActive.value = true
      }
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
        colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
        close()
      }
    },
    ...profile.socials.map<PaletteAction>((social) => ({
      id: `social-${social.label}`,
      label: social.label,
      hint: 'opens in new tab',
      icon: (social.icon as IconName) ?? 'external',
      section: 'Socials',
      keywords: 'social link',
      perform: () => {
        close()
        window.open(social.url, '_blank', 'noopener')
      }
    }))
  ])

  return { isOpen, open, close, toggle, actions, recent, recordUse }
}
