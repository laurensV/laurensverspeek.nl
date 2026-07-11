<template>
  <div class="resume is-family-code">
    <div class="resume-bar">
      <span class="resume-file">~/resume.pdf</span>
      <span class="resume-actions">
        <a href="/laurens-verspeek-resume.pdf" download class="resume-btn">⤓ download</a>
        <a href="/cv" target="_blank" rel="noopener" class="resume-btn">⎋ printable /cv</a>
      </span>
    </div>
    <iframe
      src="/laurens-verspeek-resume.pdf#toolbar=0&navpanes=0"
      class="resume-frame"
      title="Resume PDF"
    />
    <p class="resume-note">rendered by your browser's PDF viewer — download if it stays blank</p>
  </div>
</template>

<script setup lang="ts">
// The resume.pdf desktop icon opens an actual viewer window instead of
// navigating away from lvOS: the real PDF in an iframe, plus escape hatches.
</script>

<style scoped lang="scss">
.resume {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  height: 100%;
  min-height: 24rem;
}

.resume-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.72rem;

  .resume-file {
    color: hsl(var(--lv-scheme-hs), 55%);
  }

  .resume-actions {
    display: flex;
    gap: 0.75rem;
  }

  .resume-btn {
    color: var(--bulma-primary);

    &:hover {
      text-decoration: underline;
    }
  }
}

.resume-frame {
  flex: 1;
  width: 100%;
  min-height: 20rem;
  border: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.2);
  border-radius: var(--bulma-radius-small);
  background-color: hsl(var(--lv-scheme-hs), 15%);
}

.resume-note {
  font-size: 0.65rem;
  color: hsl(var(--lv-scheme-hs), 55%);
}
</style>
