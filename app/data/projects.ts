export type ProjectCategory = 'work' | 'hobby' | 'study' | 'paper'

export interface Project {
  /** Unique id, also used by the terminal (`open <slug>`) */
  slug: string
  title: string
  description: string
  category: ProjectCategory
  tech: string[]
  thumbnail?: string
  /** Optional animated/alternative thumbnail shown on hover */
  thumbnailHover?: string
  /** Link to source code / paper */
  source?: string
  /** Link to the live project */
  url?: string
  /** Featured projects are shown on the home page */
  featured?: boolean
}

export const categories: { value: ProjectCategory; label: string; color: string }[] = [
  { value: 'work', label: 'Work', color: 'is-primary' },
  { value: 'hobby', label: 'Hobby', color: 'is-info' },
  { value: 'study', label: 'Study', color: 'is-success' },
  { value: 'paper', label: 'Papers', color: 'is-danger' }
]

export const projects: Project[] = [
  {
    slug: 'nosana',
    title: 'Nosana',
    description:
      'Decentralized GPU compute grid on Solana. Started out as decentralized CI/CD, now powering AI inference workloads worldwide, fueled by the NOS token.',
    category: 'work',
    tech: ['Solana', 'Rust', 'TypeScript', 'Vue'],
    thumbnail: 'https://nosana.io/img/Nosana_Logo_vertical_color_black.png',
    source: 'https://github.com/nosana-ci',
    url: 'https://nosana.io',
    featured: true
  },
  {
    slug: 'effect-network',
    title: 'Effect Network',
    description:
      'The first blockchain-based framework for the future of work: a global, on-demand, 24×7 scalable workforce for micro-tasking and AI data labeling, powered by the EFX token.',
    category: 'work',
    tech: ['EOS', 'Blockchain', 'Vue', 'Node.js'],
    thumbnail: 'https://effect.network/img/logo/logo.png',
    thumbnailHover:
      'https://raw.githubusercontent.com/effectai/force-frontend/main/docs/Effect-Force_Select-Screen.gif',
    source: 'https://effect.network/download/effect_whitepaper.pdf',
    url: 'https://effect.network',
    featured: true
  },
  {
    slug: 'self-coding-website',
    title: 'Self-Coding Website',
    description:
      'A website that styles itself: the style block is displayed and editable while a small auto-typing script makes the site literally write its own code.',
    category: 'hobby',
    tech: ['JavaScript', 'CSS'],
    thumbnail:
      'https://raw.githubusercontent.com/laurensV/self-coding-website/main/docs/self-coding-website-snippet.png',
    thumbnailHover:
      'https://raw.githubusercontent.com/laurensV/self-coding-website/main/docs/self-coding-website-snippet.gif',
    source: 'https://github.com/laurensV/self-coding-website',
    url: 'https://laurensv.github.io/self-coding-website/',
    featured: true
  },
  {
    slug: 'portfolio',
    title: 'laurensverspeek.nl',
    description:
      'This very website. Built with Nuxt 4, TypeScript and Bulma, featuring an interactive terminal mode and a particle network background. Yes, it is finally finished(ish).',
    category: 'hobby',
    tech: ['Nuxt 4', 'TypeScript', 'Bulma'],
    source: 'https://github.com/laurensV/laurensverspeek.nl',
    url: 'https://laurensverspeek.nl'
  },
  {
    slug: 'automated-web-design',
    title: 'Automated Web Design',
    description:
      'Master thesis: Online Automated Multivariate Web Design Optimization — using a modified genetic algorithm to optimize and automatically adjust web design.',
    category: 'paper',
    tech: ['AI', 'Genetic Algorithms', 'Research'],
    thumbnail: 'https://raw.githubusercontent.com/laurensV/amos/master/thumbnail_master-thesis.png',
    source: 'https://github.com/laurensV/amos',
    url: 'https://github.com/laurensV/amos/blob/master/master_thesis_AMOS_laurens_verspeek.pdf'
  },
  {
    slug: 'detect-malicious-websites',
    title: 'Detecting Malicious Websites',
    description:
      'Bachelor thesis: an experiment where participants classified websites based on the geographical consistency of different components of a website.',
    category: 'paper',
    tech: ['Security', 'Research'],
    thumbnail: 'https://raw.githubusercontent.com/laurensV/TrustingWebsites/master/paper/img/tool.PNG',
    source: 'https://github.com/laurensV/TrustingWebsites',
    url: 'https://github.com/laurensV/TrustingWebsites/blob/master/trusting-website-using-geographical-consistency_laurens-verspeek.pdf'
  },
  {
    slug: 'kids-age',
    title: 'Kids Age Website',
    description:
      'Website that displays the current age of a baby or kid, with interactive fireworks on their birthday. Available in a boy and a girl version.',
    category: 'hobby',
    tech: ['JavaScript', 'Canvas'],
    thumbnail: 'https://raw.githubusercontent.com/laurensV/age/main/docs/screenshot_fireworks.png',
    thumbnailHover: 'https://raw.githubusercontent.com/laurensV/age/main/docs/screenshot_fireworks.gif',
    source: 'https://github.com/laurensV/age',
    url: 'https://laurensv.github.io/age/'
  },
  {
    slug: 'hangman',
    title: 'Hangman Android App',
    description:
      'Android app based on the classic Hangman game, built for the course Native App Studios at the University of Amsterdam.',
    category: 'study',
    tech: ['Java', 'Android'],
    thumbnail: 'https://raw.githubusercontent.com/laurensV/Hangman/master/doc/hangman.png',
    source: 'https://github.com/laurensV/Hangman',
    url: 'https://github.com/laurensV/Hangman/blob/master/README.md'
  }
]

export const featuredProjects = projects.filter((p) => p.featured)
