import type { Ref } from 'vue'

/**
 * Post-render DOM garnish on a rendered post body: copy buttons + language
 * labels on code blocks, and copyable "#" deep-link anchors on headings.
 * Idempotent per element, so a re-run never doubles the chrome.
 */
export function usePostEnhancements(bodyRef: Ref<HTMLElement | undefined>) {
  const enhanceCodeBlocks = () => {
    const blocks = bodyRef.value?.querySelectorAll('pre')
    blocks?.forEach((pre) => {
      if (pre.querySelector('.code-copy')) return

      const language = /language-(\w+)/.exec(`${pre.className} ${pre.querySelector('code')?.className ?? ''}`)?.[1]
      if (language) {
        const label = document.createElement('span')
        label.className = 'code-lang is-family-code'
        label.textContent = language
        pre.appendChild(label)
      }

      const button = document.createElement('button')
      button.className = 'code-copy is-family-code'
      button.type = 'button'
      button.textContent = '[copy]'
      button.addEventListener('click', () => {
        navigator.clipboard
          .writeText(pre.querySelector('code')?.textContent ?? '')
          .then(() => {
            button.textContent = '[copied!]'
            button.classList.add('is-copied')
            setTimeout(() => {
              button.textContent = '[copy]'
              button.classList.remove('is-copied')
            }, 1600)
          })
          .catch(() => {
            button.textContent = '[nope :(]'
          })
      })
      pre.appendChild(button)
    })
  }

  // inline `code` spans become tap/click-to-copy, matching the fenced-block copy
  // button — handy on touch where there's no select-and-copy
  const enhanceInlineCode = () => {
    const codes = bodyRef.value?.querySelectorAll<HTMLElement>('code')
    codes?.forEach((code) => {
      // skip fenced blocks (their <code> lives in a <pre>) and re-runs
      if (code.closest('pre') || code.dataset.copyable) return
      code.dataset.copyable = '1'
      code.classList.add('inline-copy')
      code.title = 'click to copy'
      code.addEventListener('click', () => {
        navigator.clipboard
          .writeText(code.textContent)
          .then(() => {
            code.classList.add('is-copied')
            setTimeout(() => code.classList.remove('is-copied'), 1200)
          })
          .catch(() => {})
      })
    })
  }

  const addHeadingAnchors = () => {
    const headings = bodyRef.value?.querySelectorAll<HTMLElement>('h2[id], h3[id]')
    headings?.forEach((heading) => {
      if (heading.querySelector('.heading-anchor')) return
      const anchor = document.createElement('a')
      anchor.className = 'heading-anchor is-family-code'
      anchor.href = `#${heading.id}`
      anchor.setAttribute('aria-label', 'Copy a link to this section')
      anchor.textContent = '#'
      anchor.addEventListener('click', (event) => {
        event.preventDefault()
        history.replaceState(null, '', `#${heading.id}`)
        navigator.clipboard
          .writeText(`${location.origin}${location.pathname}#${heading.id}`)
          .then(() => {
            anchor.classList.add('is-copied')
            setTimeout(() => anchor.classList.remove('is-copied'), 1200)
          })
          .catch(() => {})
      })
      heading.appendChild(anchor)
    })
  }

  onMounted(() => {
    enhanceCodeBlocks()
    enhanceInlineCode()
    addHeadingAnchors()
  })
}
