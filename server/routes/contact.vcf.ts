import { profile } from '../../app/data/profile'

// Prerendered vCard (see nitro.prerender.routes) built from the central
// profile data — downloadable from /contact and encoded in the QR code there.
export default defineEventHandler((event) => {
  const [first = '', ...rest] = profile.name.split(' ')
  const body = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${rest.join(' ')};${first};;;`,
    `FN:${profile.name}`,
    `TITLE:${profile.roles[2] ?? profile.roles[0]}`,
    `EMAIL;TYPE=INTERNET:${profile.email}`,
    `URL:https://${profile.domain}`,
    ...profile.socials
      .filter((social) => !social.url.startsWith('mailto:'))
      .map((social) => `URL;TYPE=${social.label}:${social.url}`),
    'END:VCARD',
    ''
  ].join('\r\n')
  setHeader(event, 'content-type', 'text/vcard; charset=utf-8')
  return body
})
