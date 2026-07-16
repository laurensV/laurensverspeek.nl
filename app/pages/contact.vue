<template>
  <section class="section">
    <div class="container contact-container">
      <p class="overline mb-2">contact $ ping laurens</p>
      <h1 class="title is-2">Let's build something</h1>
      <p class="subtitle is-5 has-text-grey mb-4">
        Got a project, an idea, or just want to say hi? Run the script.
      </p>

      <p class="local-time is-family-code is-size-7 mb-5" data-testid="local-time">
        <span class="lt-bracket">[</span> my local time <span class="lt-bracket">]</span> <span class="lt-clock">{{ localTime || '--:--' }}</span>
        <template v-if="localTime"> — {{ awakeHint }} · usually replies within a day</template>
      </p>

      <ContactWizard class="mb-5" />

      <div class="is-flex is-align-items-center is-justify-content-space-between is-flex-wrap-wrap contact-alt">
        <p class="is-family-code is-size-7 has-text-grey">
          // allergic to terminals?
          <a :href="`mailto:${profile.email}`">{{ profile.email }}</a>
        </p>
        <div class="is-flex" style="gap: 1rem">
          <a
            v-for="social in profile.socials"
            :key="social.label"
            :href="social.url"
            target="_blank"
            rel="noopener"
            class="contact-social is-family-code is-size-7"
          >
            [{{ social.label.toLowerCase() }}]
          </a>
        </div>
      </div>

      <p v-if="pgp.fingerprint" class="pgp-line is-family-code is-size-7 mt-4">
        <button type="button" class="key-cmd" :title="pgpCopied ? 'copied ✓' : 'click to copy — it really works'" @click="copyPgp">$ curl -s https://{{ profile.domain }}/pgp.txt | gpg --import</button>
        <span class="pgp-fpr">// {{ pgp.fingerprint }}</span>
        · <a href="/pgp.txt">public key</a>
        <span v-if="pgpCopied" class="key-copied">copied ✓</span>
      </p>
      <p class="ssh-line is-family-code is-size-7 mt-2">
        ssh key
        <button type="button" class="key-cmd" :title="sshCopied ? 'copied ✓' : 'click to copy my full ssh public key'" @click="copySsh">{{ sshShort }}</button>
        · <a href="https://github.com/laurensV.keys" target="_blank" rel="noopener">github</a>
        <span v-if="sshCopied" class="key-copied">copied ✓</span>
      </p>

      <details class="vcard-box is-family-code mt-5">
        <summary>$ cat contact.vcf <span class="vcard-hint">— save my contact card</span></summary>
        <div class="vcard-body">
          <a href="/contact.vcf" download class="vcard-download">[download contact.vcf]</a>
          <p class="vcard-scan">// or point your phone's camera at this:</p>
          <pre class="vcard-qr" aria-label="QR code linking to the contact card">{{ qr }}</pre>
        </div>
      </details>
    </div>
  </section>
</template>

<script setup lang="ts">
import { profile } from '~/data/profile'
import { pgp, sshKey } from '~/data/pgp'

// copyable key commands (recorded in the lvOS clipboard history). The pgp line
// copies a real, absolute-URL command that works when pasted into a terminal;
// the ssh line copies the full public key.
const { copied: pgpCopied, copy: pgpCopyFn } = useCopyFlag()
const { copied: sshCopied, copy: sshCopyFn } = useCopyFlag()
const copyPgp = () => pgpCopyFn(`curl -s https://${profile.domain}/pgp.txt | gpg --import`)
const copySsh = () => sshCopyFn(sshKey)
const sshShort = computed(() => {
  const parts = sshKey.split(' ')
  const type = parts[0] ?? 'ssh-rsa'
  const body = parts[1] ?? ''
  return `${type} ${body.slice(0, 12)}…${body.slice(-8)}`
})

const ogImage = `${SITE_URL}/og/page-contact.png`
useSeo({
  title: 'Contact — Laurens Verspeek',
  description: 'Contact Laurens Verspeek — run the contact.sh wizard or send a plain email.',
  path: '/contact',
  image: ogImage
})

// half-block ascii QR pointing at the prerendered vCard — built client-side from
// a dynamically-imported generator so qrcode-generator (only ever needed on this
// one page) stays out of the site-wide preload bundle
const qr = ref('')
onMounted(async () => {
  const { qrAsciiLines } = await import('~/utils/qrAscii')
  qr.value = qrAsciiLines(`https://${profile.domain}/contact.vcf`).join('\n')
})

// live clock in my timezone — client-only (starts as --:-- in the static
// HTML), so the prerendered page never bakes in a stale time
const TIME_ZONE = 'Europe/Amsterdam'
const localTime = ref('')
const awakeHint = ref('')

const tick = () => {
  const now = new Date()
  localTime.value = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE, timeZoneName: 'short'
  }).format(now)
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: TIME_ZONE }).format(now))
  awakeHint.value = hour >= 8 && hour < 24 ? 'probably awake' : 'probably asleep'
}

let clock: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  tick()
  clock = setInterval(tick, 30_000)
})
onUnmounted(() => clearInterval(clock))
</script>

<style scoped lang="scss">
.contact-container {
  max-width: 44rem;
}

.contact-alt {
  gap: 0.75rem;
}

.pgp-line,
.ssh-line {
  color: var(--bulma-text-weak);

  .pgp-fpr {
    letter-spacing: 0.06em;
  }

  a {
    color: var(--bulma-primary-on-scheme);
  }
}

// the copyable key commands read as text but behave as a button
.key-cmd {
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-align: left;
  word-break: break-all;

  // the copy-key affordance measured 203×18 on a phone — pad it into a target
  @media (pointer: coarse) {
    padding: 0.6rem 0.2rem;
  }

  &:hover,
  &:focus-visible {
    color: var(--bulma-primary-on-scheme);
  }
}

.key-copied {
  margin-left: 0.4rem;
  color: var(--bulma-primary-on-scheme);
}

// status-line style local-time badge
.local-time {
  color: var(--bulma-text-weak);

  .lt-bracket {
    color: var(--bulma-primary-on-scheme);
  }

  .lt-clock {
    color: var(--bulma-text);
  }
}

.contact-social {
  color: var(--bulma-text-weak);

  &:hover {
    color: var(--bulma-primary-on-scheme);
  }
}

// expandable contact-card box with the ascii QR
.vcard-box {
  font-size: 0.8rem;
  border: 1px solid var(--bulma-border-weak);
  border-radius: 2px;
  padding: 0.6rem 0.9rem;

  summary {
    color: var(--bulma-primary-on-scheme);
    cursor: pointer;

    .vcard-hint {
      color: var(--bulma-text-weak);
    }
  }

  .vcard-body {
    padding-top: 0.7rem;
  }

  .vcard-download {
    color: var(--bulma-primary-on-scheme);

    &:hover {
      text-decoration: underline;
      text-underline-offset: 0.2em;
    }
  }

  .vcard-scan {
    margin: 0.6rem 0 0.4rem;
    color: var(--bulma-text-weak);
    font-size: 0.72rem;
  }

  // the QR only scans if the half blocks tile seamlessly
  .vcard-qr {
    display: inline-block;
    padding: 0.75rem;
    background-color: #fff;
    color: #000;
    line-height: 1;
    letter-spacing: 0;
    font-size: 0.85rem;
    border-radius: 2px;

    // the code is a fixed character grid, so on a 320px phone its right edge was
    // clipped ~12px past the viewport — cutting scannable modules. Shrink it (and
    // trim the quiet-zone padding) so the whole square fits and still scans.
    @media (max-width: 25rem) {
      padding: 0.5rem;
      font-size: 0.66rem;
    }
  }
}
</style>
