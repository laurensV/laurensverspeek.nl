// Central place for personal info — edit freely, everything on the site reads from here.

export const profile = {
  name: 'Laurens Verspeek',
  domain: 'laurensverspeek.nl',
  email: 'contact@laurensverspeek.nl',
  location: 'The Netherlands',
  roles: [
    'full-stack developer',
    'blockchain engineer',
    'head of development @ Nosana',
    'co-founder @ Effect.AI',
    'computer scientist'
  ],
  bio: [
    'Hey, I’m Laurens, a full-stack developer with a background in Computer Science and a passion for building with blockchain and AI.',
    'I co-founded Effect.AI, a blockchain-powered micro-tasking platform providing work for thousands of people around the globe. Today I am Head of Development at Nosana, a decentralized GPU compute grid on Solana powering AI inference workloads.'
  ],
  socials: [
    { label: 'GitHub', icon: 'github', url: 'https://github.com/laurensV' },
    { label: 'LinkedIn', icon: 'linkedin', url: 'https://linkedin.com/in/laurensverspeek' },
    { label: 'Keybase', icon: 'key', url: 'https://keybase.io/laurensv6' },
    { label: 'Email', icon: 'mail', url: 'mailto:contact@laurensverspeek.nl' }
  ] as { label: string; icon: string; url: string }[],
  skills: [
    {
      group: 'Frontend',
      items: ['Vue', 'Nuxt', 'React', 'TypeScript', 'Tailwind', 'SCSS', 'Bulma']
    },
    {
      group: 'Backend',
      items: ['Node.js', 'PHP', 'Python', 'REST & GraphQL APIs']
    },
    {
      group: 'Blockchain',
      items: ['Solana', 'Ethereum', 'Rust', 'EOS', 'Smart Contracts', 'Token Economics']
    },
    {
      group: 'Databases',
      items: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis']
    },
    {
      group: 'Infra',
      items: ['Docker', 'Kubernetes', 'CI/CD', 'Linux']
    },
    {
      group: 'Other',
      items: ['AI / Genetic Algorithms', 'Git']
    }
  ],
  timeline: [
    {
      period: '2021 — now',
      title: 'Head of Development — Nosana',
      description:
        'Joined Nosana at its inception and leading the development of its decentralized GPU computing platform, combining technical strategy, architecture and team leadership.',
      stack: ['Solana', 'Rust', 'TypeScript', 'Vue', 'Node.js']
    },
    {
      period: '2017 — now',
      title: 'Co-founder — Effect.AI',
      description:
        'Co-founded Effect.AI and building a global decentralized platform connecting people, businesses and AI through blockchain technology.',
      stack: ['Blockchain', 'Vue', 'TypeScript', 'Node.js']
    },
    {
      period: '2022 — 2024',
      title: 'Co-founder — Tappy',
      description:
        'Co-founded Tappy, a Web3 platform for simple, secure and shareable crypto payment links. Led product and technical development from concept to launch, making crypto payments approachable for people who never want to see an address.',
      stack: ['Solana', 'Ethereum', 'TypeScript', 'Vue', 'USDC']
    },
    {
      period: '2016 — 2018',
      title: 'Lead Developer — Itsavirus',
      description:
        'Led the development of digital platforms for major clients around the world, combining hands-on engineering with technical direction and team leadership.',
      stack: ['PHP', 'JavaScript', 'MySQL', 'Docker']
    },
    {
      period: '2014 — 2016',
      title: 'MSc Computer Science — University of Amsterdam',
      description:
        'Graduated on automated multivariate web design optimization using AI genetic algorithms.',
      stack: ['Python', 'AI', 'LaTex', 'Genetic algorithms']
    },
    {
      period: '2012 — 2016',
      title: 'Web Developer — Itsavirus',
      description:
        'Built websites and web applications for clients across the Randstad and beyond, from first pixel to production.',
      stack: ['PHP', 'JavaScript', 'MySQL', 'HTML & CSS']
    },
    {
      period: '2011 — 2014',
      title: 'BSc Computer Science',
      description:
        'Thesis on detecting malicious websites through geographical consistency of website components.',
      stack: ['Algorithms', 'Security']
    }
  ]
}
