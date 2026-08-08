// Key publishing. /pgp.txt and /ssh.txt serve the keys as text/plain, /keys
// presents them with fingerprints + import commands, and the terminal's `gpg`
// command works. To rotate either key: paste the fresh public key (and its
// fingerprint) here and rebuild.

// My SSH public key — what someone would append to authorized_keys.
// Public keys are safe to publish.
export const sshKey = 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDEnXQKXT8A07B7tJPsFn6wAPM8P5OMWyL3F1xVGBgpqoEViy+zeOfOAnNJDxJmFn7Q6lQ74TgucnsTvUU4eLK2EECIfoi91SVp7EIDDW2stgOWShxSDvnw49kiMop9IC1/3V9d9842jMvptVy58WJcZlMz0tL8HzETPcMTslDut7cfZElaWYmFJJA58F9Hht8TMcSaXztmV6nMSTfk2DfDwx/lrmBzIeEorCqLBTLYSVycSwBZbPimY3e2nI2WUyeX8gjYSbRiEiSeBGrsqDH3lL0+h+czo/p2RVWDF3LfIWNZyGNDIZBQmGNAKre1cHz8Bu1SDWxwF3BT55ZQLXl7 laurens@laurensverspeek.nl'

// `ssh-keygen -lf ssh.txt` — shown on /keys so people can verify what they fetched
export const sshFingerprint = 'SHA256:lIjX693Uubmzr2tBA6DzakXDlv4qSA7IlUOjNoQHoAY'

export const pgp = {
  fingerprint: 'A0B4 BD58 7C98 CC7C 645B  BEEF 566B 20E9 06AB FCEB',
  // the email in the key's user ID (a dedicated alias, so the key outlives
  // whatever the contact address of the day is)
  uid: 'pgp@laurensverspeek.nl',
  publicKey: `-----BEGIN PGP PUBLIC KEY BLOCK-----

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
OHCtMFffJye0S7bw4juUu2WaelKlGoGC
=7ael
-----END PGP PUBLIC KEY BLOCK-----
`
}
