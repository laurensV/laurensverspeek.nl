export type ProjectCategory = 'work' | 'hobby' | 'study' | 'paper'

export interface Project {
  /** Unique id, also used by the terminal (`open <slug>`) and the /projects/<slug> route */
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
  /** Years the project was active, e.g. '2021 — now' */
  year?: string
  /** My role in the project */
  role?: string
  /** Longer write-up shown on the project detail page */
  story?: string[]
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
    thumbnail: '/img/projects/nosana.png',
    source: 'https://github.com/nosana-ci',
    url: 'https://nosana.io',
    featured: true,
    year: '2021 — now',
    role: 'Head of Development',
    story: [
      'Nosana started as a decentralized CI/CD platform: instead of renting build servers from a cloud provider, pipelines would run on a permissionless network of nodes, paid in the NOS token on Solana.',
      'As the AI wave hit, we pivoted the same infrastructure to something the market needed even more: GPU compute. Today Nosana is a decentralized GPU grid where anyone with a graphics card can earn by running AI inference workloads, and teams can access affordable compute without a big cloud contract.',
      'As Head of Development I lead the technical direction: the Solana programs (staking, jobs, rewards), the node software that turns a gaming PC into a compute provider, and the marketplace that ties it all together.'
    ]
  },
  {
    slug: 'effect-ai',
    title: 'Effect.AI',
    description:
      'The first blockchain-based framework for the future of work: a global, on-demand, 24×7 scalable workforce for micro-tasking and AI data labeling, powered by the EFX token.',
    category: 'work',
    tech: ['EOS', 'Blockchain', 'Vue', 'Node.js'],
    thumbnail: '/img/projects/effect-ai.png',
    source: 'https://effect.ai/download/effect_whitepaper.pdf',
    url: 'https://effect.ai',
    featured: true,
    year: '2017 — 2021',
    role: 'Co-founder',
    story: [
      'Effect.AI set out to build "the future of work" on the blockchain: a micro-tasking platform where anyone in the world could earn money by completing small data tasks — labeling images, transcribing audio, moderating content — the fuel that machine learning models run on.',
      'We grew a global workforce of thousands of workers, processed millions of tasks for AI companies, and built the whole platform on smart contracts (first NEO, later EOS) with the EFX token as its currency.',
      'Co-founding Effect.AI taught me how to take a whitepaper to a live product with real users and real token economics — and it planted the seed for Nosana.'
    ]
  },
  {
    slug: 'tappy',
    title: 'Tappy',
    description:
      'The easiest way to request a payment in crypto: create a payment link, share it anywhere, and get paid in USDC — non-custodial, no KYC, no fees.',
    category: 'work',
    tech: ['Solana', 'Ethereum', 'USDC', 'Vue'],
    thumbnail: '/img/projects/tappy.png',
    url: 'https://tappy.cc',
    year: '2022 — 2024',
    role: 'Co-founder',
    story: [
      'Tappy makes requesting a crypto payment as easy as sharing a link. You connect a wallet, create a request for an amount, and send the link — the payer opens it and pays in a couple of taps, with no addresses to copy or chains to explain.',
      'Under the hood it settles in USDC across Ethereum and Solana, and can swap other tokens into USDC automatically through DeFi so the recipient always gets the stablecoin they asked for. It is non-custodial (Tappy never holds anyone\'s funds), needs no KYC and charges no fees — a payment-request app, explicitly not a wallet.',
      'As co-founder I helped shape the product and build it end to end: the payment-request flow, the multi-chain wallet connections, and the swaps that make "just tap to pay" actually work.'
    ]
  },
  {
    slug: 'self-coding-website',
    title: 'Self-Coding Website',
    description:
      'A website that styles itself: the style block is displayed and editable while a small auto-typing script makes the site literally write its own code.',
    category: 'hobby',
    tech: ['JavaScript', 'CSS'],
    thumbnail:
      '/img/projects/self-coding-website.png',
    thumbnailHover:
      '/img/projects/self-coding-website-hover.webm',
    source: 'https://github.com/laurensV/self-coding-website',
    url: 'https://laurensv.github.io/self-coding-website/',
    featured: true,
    year: '2021',
    role: 'Creator',
    story: [
      'A tiny experiment with a fun premise: what if a website wrote its own source code, live, in front of you?',
      'The page displays its own style block and types it out character by character — and because the style block is actually applied to the document, the page styles itself as it "codes". You can even edit the code and watch the page change.',
      'No frameworks, no build step: one HTML file, a sprinkle of JavaScript, and a CSS trick (`style { display: block }`) doing all the heavy lifting.'
    ]
  },
  {
    slug: 'portfolio',
    title: 'laurensverspeek.nl',
    description:
      'This very website. Built with Nuxt 4, TypeScript and Bulma, featuring an interactive terminal mode and an animated flow-field background. Yes, it is finally finished(ish).',
    category: 'hobby',
    tech: ['Nuxt 4', 'TypeScript', 'Bulma'],
    thumbnail: '/img/projects/portfolio.png',
    source: 'https://github.com/laurensV/laurensverspeek.nl',
    url: 'https://laurensverspeek.nl',
    year: '2022 — now',
    role: 'Creator',
    story: [
      'My personal slice of the web. Version 1 was an unfinished Nuxt 2 site that spent four years saying "coming soon(ish)" — version 2 is what you are looking at right now.',
      'Rebuilt from scratch on Nuxt 4 with TypeScript and Bulma, it doubles as a playground: an interactive terminal (press ~), an animated flow-field background, and more easter eggs than strictly necessary.',
      'The source is public, so if you are curious how something on this site works — go ahead and peek.'
    ]
  },
  {
    slug: 'automated-web-design',
    title: 'Automated Web Design',
    description:
      'Master thesis: Online Automated Multivariate Web Design Optimization — using a modified genetic algorithm to optimize and automatically adjust web design.',
    category: 'paper',
    tech: ['AI', 'Genetic Algorithms', 'Research'],
    thumbnail: '/img/projects/automated-web-design.png',
    source: 'https://github.com/laurensV/amos',
    url: 'https://github.com/laurensV/amos/blob/master/master_thesis_AMOS_laurens_verspeek.pdf',
    year: '2017',
    role: 'MSc thesis — University of Amsterdam',
    story: [
      'Can a website redesign itself to convert better, without an A/B-testing team? My master thesis explored exactly that: online automated multivariate web design optimization.',
      'The system (AMOS) treats a page design as a genome — colors, layout, typography as genes — and uses a modified genetic algorithm to evolve the design against live user behavior, converging on higher-performing variants while visitors browse.',
      'The fun part was fighting the explore/exploit trade-off: showing experimental designs to enough visitors to learn, without hurting the experience for everyone else.'
    ]
  },
  {
    slug: 'detect-malicious-websites',
    title: 'Detecting Malicious Websites',
    description:
      'Bachelor thesis: an experiment where participants classified websites based on the geographical consistency of different components of a website.',
    category: 'paper',
    tech: ['Security', 'Research'],
    thumbnail: '/img/projects/detect-malicious-websites.png',
    source: 'https://github.com/laurensV/TrustingWebsites',
    url: 'https://github.com/laurensV/TrustingWebsites/blob/master/trusting-website-using-geographical-consistency_laurens-verspeek.pdf',
    year: '2015',
    role: 'BSc thesis',
    story: [
      'Phishing sites often look pixel-perfect — but their infrastructure rarely adds up. My bachelor thesis investigated whether the geographical consistency of a website\'s components (server location, domain registration, content origin) can help users spot malicious sites.',
      'I built an experiment tool that visualized where each part of a website physically came from, and had participants classify sites as trustworthy or malicious based on that signal.'
    ]
  },
  {
    slug: 'kids-age',
    title: 'Kids Age Website',
    description:
      'Website that displays the current age of a baby or kid, with interactive fireworks on their birthday. Available in a boy and a girl version.',
    category: 'hobby',
    tech: ['JavaScript', 'Canvas'],
    thumbnail: '/img/projects/kids-age.png',
    thumbnailHover: '/img/projects/kids-age-hover.webm',
    source: 'https://github.com/laurensV/age',
    url: 'https://laurensv.github.io/age/',
    year: '2021',
    role: 'Creator (and dad)',
    story: [
      'Built for the most demanding clients I have: kids. The site shows exactly how old a kid is — down to the second — and on their birthday the page erupts in interactive canvas fireworks you can launch by clicking.',
      'It ships in a boy and a girl theme and makes a surprisingly good "how long until my birthday" countdown for impatient young stakeholders.'
    ]
  },
  {
    slug: 'wordclock',
    title: 'WordClock',
    description:
      'A clock that tells the time in words on a grid of glowing letters, driven by an ESP8266. I develop the firmware — WiFi onboarding, LED effects and time sync. Sold as Jouw Woordklok.',
    category: 'hobby',
    tech: ['ESP8266', 'C++', 'Arduino'],
    thumbnail: '/img/projects/wordclock.png',
    url: 'https://www.jouwwoordklok.nl',
    year: '2023 — now',
    role: 'Software developer',
    story: [
      'A word clock tells the time in full words: a grid of letters lights up to spell out the time — "it is ten past half three" — instead of showing digits. Mine ships to Dutch homes as Jouw Woordklok.',
      'I develop the software that runs on the clock\'s ESP8266 microcontroller: the WiFi onboarding, the LED animations and colour effects, and keeping the displayed time correct — so the clock keeps getting better after it is on your wall.'
    ]
  },
  {
    slug: 'hangman',
    title: 'Hangman Android App',
    description:
      'Android app based on the classic Hangman game, built for the course Native App Studios at the University of Amsterdam.',
    category: 'study',
    tech: ['Java', 'Android'],
    thumbnail: '/img/projects/hangman.png',
    source: 'https://github.com/laurensV/Hangman',
    url: 'https://github.com/laurensV/Hangman/blob/master/README.md',
    year: '2014',
    role: 'Student — University of Amsterdam',
    story: [
      'The classic Hangman game as a native Android app, built in Java for the Native App Studios course at the University of Amsterdam.',
      'It also lives on in this website: open the terminal and type `hangman` to play a word-guessing round against my tech stack.'
    ]
  }
]

export const featuredProjects = projects.filter((p) => p.featured)
