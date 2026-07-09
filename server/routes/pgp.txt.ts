import { pgp } from '../../app/data/pgp'

// The ASCII-armored public key, only when one is published (see app/data/pgp.ts).
export default defineEventHandler((event) => {
  if (!pgp.publicKey) {
    throw createError({ statusCode: 404, statusMessage: 'No PGP key published' })
  }
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  return pgp.publicKey
})
