import { profile } from '../../app/data/profile'

// Prerendered JSON Resume (jsonresume.org schema v1) built from the central
// profile data, so /resume.json stays in sync with the rest of the site.
export default defineEventHandler((event) => {
  const resume = {
    $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
    basics: {
      name: profile.name,
      label: profile.roles[0],
      email: profile.email,
      url: `https://${profile.domain}`,
      location: { region: profile.location },
      summary: profile.bio.join(' '),
      profiles: profile.socials
        .filter((social) => !social.url.startsWith('mailto:'))
        .map((social) => ({ network: social.label, url: social.url }))
    },
    work: profile.timeline
      .filter((entry) => !/MSc|BSc/i.test(entry.title))
      .map((entry) => {
        const [name, position] = entry.title.split(' — ').reverse()
        return {
          name: name ?? entry.title,
          position: position ?? entry.title,
          summary: entry.description,
          keywords: entry.stack
        }
      }),
    education: profile.timeline
      .filter((entry) => /MSc|BSc/i.test(entry.title))
      .map((entry) => ({
        studyType: entry.title.split(' — ')[0],
        area: entry.title.split(' — ')[1] ?? '',
        summary: entry.description
      })),
    skills: profile.skills.map((group) => ({ name: group.group, keywords: group.items }))
  }
  setHeader(event, 'content-type', 'application/json; charset=utf-8')
  return resume
})
