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
      items: ['Vue', 'Nuxt', 'TypeScript', 'SCSS', 'Bulma']
    },
    {
      group: 'Backend',
      items: ['Node.js', 'PHP', 'Python', 'REST & GraphQL APIs']
    },
    {
      group: 'Blockchain',
      items: ['Solana', 'Rust', 'EOS', 'Smart Contracts', 'Token Economics']
    },
    {
      group: 'Other',
      items: ['AI / Genetic Algorithms', 'CI/CD', 'Docker', 'Linux']
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
      period: '2014 — 2016',
      title: 'MSc Computer Science — University of Amsterdam',
      description:
        'Graduated on automated multivariate web design optimization using AI genetic algorithms.',
      stack: ['Python', 'AI', 'LaTex', 'Genetic algorithms']
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
