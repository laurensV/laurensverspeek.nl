<template>
  <section class="section">
    <div class="container keys-container">
      <p class="overline mb-2">keys $ ls ~/.keys</p>
      <h1 class="title is-2">Public keys</h1>
      <p class="subtitle is-5 has-text-grey mb-5">
        The two keys that prove it's me. PGP for encrypted mail and signatures,
        SSH for server access. Both are plain-text files you can curl.
      </p>

      <article class="key-card" data-testid="pgp-card">
        <header class="key-head">
          <h2 class="key-name is-family-code"><a href="/pgp.txt">pgp.txt</a></h2>
          <span class="key-tag is-family-code">pgp · rsa3072</span>
          <div class="key-actions is-family-code">
            <a href="/pgp.txt">[raw]</a>
            <button type="button" @click="copyPgpKey(pgp.publicKey)">{{ pgpKeyCopied ? '[copied ✓]' : '[copy key]' }}</button>
          </div>
        </header>
        <p class="key-desc">
          For sending me something confidential, or verifying that something
          signed actually came from me.
        </p>
        <p class="key-fact is-family-code">
          <span class="key-fact-label">fingerprint</span>
          <span class="key-fact-value">{{ pgp.fingerprint }}</span>
        </p>
        <div class="key-cmds">
          <KeyCommand label="import it into your keyring" :cmd="`curl -s ${site}/pgp.txt | gpg --import`" />
          <KeyCommand label="then make sure the fingerprint matches the one above" :cmd="`gpg --fingerprint ${pgp.uid}`" />
        </div>
      </article>

      <article class="key-card" data-testid="ssh-card">
        <header class="key-head">
          <h2 class="key-name is-family-code"><a href="/ssh.txt">ssh.txt</a></h2>
          <span class="key-tag is-family-code">ssh · rsa2048</span>
          <div class="key-actions is-family-code">
            <a href="/ssh.txt">[raw]</a>
            <button type="button" @click="copySshKey(sshKey)">{{ sshKeyCopied ? '[copied ✓]' : '[copy key]' }}</button>
          </div>
        </header>
        <p class="key-desc">
          For giving me access to a machine — this is the line that goes in
          <code>authorized_keys</code>.
        </p>
        <p class="key-fact is-family-code">
          <span class="key-fact-label">fingerprint</span>
          <span class="key-fact-value">{{ sshFingerprint }}</span>
        </p>
        <div class="key-cmds">
          <KeyCommand label="append it to a server's authorized_keys" :cmd="`curl -s ${site}/ssh.txt >> ~/.ssh/authorized_keys`" />
          <KeyCommand label="or check what you fetched against the fingerprint above" :cmd="`curl -s ${site}/ssh.txt | ssh-keygen -lf -`" />
        </div>
      </article>

      <p class="keys-note is-family-code is-size-7">
        // fetched these over a network you don't trust? compare the fingerprints
        through a second channel — or just <NuxtLink to="/contact">ask me</NuxtLink>.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { pgp, sshKey, sshFingerprint } from '~/data/pgp'

const site = SITE_URL

const { copied: pgpKeyCopied, copy: copyPgpKey } = useCopyFlag()
const { copied: sshKeyCopied, copy: copySshKey } = useCopyFlag()

const ogImage = `${SITE_URL}/og/page-keys.png`
useSeo({
  title: 'Public keys — Laurens Verspeek',
  description: 'PGP and SSH public keys of Laurens Verspeek — fingerprints, raw files and one-line import commands.',
  path: '/keys',
  image: ogImage,
  ogTitle: 'Public keys'
})
</script>

<style scoped lang="scss">
.keys-container {
  max-width: 44rem;
}

.key-card {
  margin-bottom: 1.5rem;
  padding: 1rem 1.25rem 1.25rem;
  border: 1px solid var(--bulma-border-weak);
  border-radius: 2px;
}

.key-head {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.35rem 0.75rem;
  margin-bottom: 0.6rem;

  .key-name {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;

    a {
      color: var(--bulma-text-strong);

      &:hover {
        color: var(--bulma-primary-on-scheme);
      }
    }
  }

  .key-tag {
    padding: 0.1rem 0.45rem;
    border: 1px solid var(--bulma-border-weak);
    border-radius: 2px;
    color: var(--bulma-text-weak);
    font-size: 0.68rem;
    letter-spacing: 0.05em;
  }

  .key-actions {
    margin-left: auto;
    display: flex;
    gap: 0.6rem;
    font-size: 0.75rem;

    a,
    button {
      padding: 0;
      border: none;
      background: none;
      font: inherit;
      color: var(--bulma-primary-on-scheme);
      cursor: pointer;

      &:hover,
      &:focus-visible {
        text-decoration: underline;
        text-underline-offset: 0.2em;
      }
    }
  }
}

.key-desc {
  margin-bottom: 0.75rem;
  color: var(--bulma-text);
  font-size: 0.9rem;
}

.key-fact {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem 0.6rem;
  margin-bottom: 0.9rem;
  font-size: 0.75rem;

  .key-fact-label {
    color: var(--bulma-text-weak);
  }

  .key-fact-value {
    color: var(--bulma-text);
    letter-spacing: 0.04em;
    // wraps at the fingerprint's spaces when there are any (pgp), and only
    // breaks inside the string when there aren't (the ssh SHA256 blob)
    overflow-wrap: anywhere;
    min-width: 0;
  }
}

.key-cmds {
  display: grid;
  gap: 0.75rem;
}

.keys-note {
  color: var(--bulma-text-weak);

  a {
    color: var(--bulma-primary-on-scheme);
  }
}
</style>
