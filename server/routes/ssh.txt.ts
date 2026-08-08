import { sshKey } from '../../app/data/pgp'

// The SSH public key as plain text, only when one is published (see
// app/data/pgp.ts). Ends in a newline so `curl >> authorized_keys` is safe.
export default defineEventHandler((event) => {
  if (!sshKey) {
    throw createError({ statusCode: 404, statusMessage: 'No SSH key published' })
  }
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  return sshKey.endsWith('\n') ? sshKey : `${sshKey}\n`
})
