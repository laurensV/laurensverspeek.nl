// PGP publishing, off until a real key is pasted in. While `publicKey` is
// empty: /pgp.txt answers 404, the contact page shows no PGP line, and the
// terminal's `gpg` command explains itself. To publish: paste the ASCII-
// armored public key + its fingerprint here and rebuild.
export const pgp = {
  fingerprint: '',
  publicKey: ''
}
