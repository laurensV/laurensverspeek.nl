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
import { qrAsciiLines } from '~/utils/qrAscii'

useHead({ title: 'Contact — Laurens Verspeek' })
useSeoMeta({ description: 'Contact Laurens Verspeek — run the contact.sh wizard or send a plain email.' })

// half-block ascii QR pointing at the prerendered vCard
const qr = qrAsciiLines(`https://${profile.domain}/contact.vcf`).join('\n')

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
  }
}
</style>
