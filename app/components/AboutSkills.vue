<template>
  <div>
    <CodeSnippet title="laurens.ts" class="mb-5" :code="laurensSnippet" />
    <h2 class="title is-4 mb-2">Skills</h2>
    <p class="is-family-code is-size-7 has-text-grey mb-3">$ npm ls --depth=1</p>
    <div class="skill-tree is-family-code">
      <p class="skill-root">laurens@2.0.0</p>
      <p
        v-for="node in skillTree"
        :key="node.key"
        :class="node.isGroup ? 'skill-group' : 'skill-leaf'"
      >
        <span class="tree-glyph">{{ node.prefix }}</span>
        <template v-if="node.isGroup">{{ node.label }}</template>
        <template v-else>
          <span class="skill-name">{{ node.label }}</span><span class="skill-version">@{{ node.version }}</span>
        </template>
      </p>
    </div>

    <!-- author-declared comfort levels; the bars fill when scrolled in -->
    <div ref="metersRef" class="skill-meters is-family-code mt-5">
      <div v-for="skill in profile.proficiencies" :key="skill.name" class="skill-meter">
        <div class="skill-meter-head">
          <span>{{ skill.name }}</span>
          <span class="skill-meter-pct">{{ metersShown ? skill.level : 0 }}%</span>
        </div>
        <div class="skill-meter-track">
          <div
            class="skill-meter-fill"
            :style="{ width: `${metersShown ? skill.level : 0}%` }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useElementVisibility } from '@vueuse/core'
import { profile } from '~/data/profile'

// The skills column of /about: an `npm ls` skill tree plus author-declared
// proficiency meters that fill from 0 once scrolled into view.

const metersRef = ref<HTMLElement | null>(null)
const metersVisible = useElementVisibility(metersRef)
const metersShown = ref(false)
watch(metersVisible, (seen) => { if (seen) metersShown.value = true })

// playful semver-ish "version" per skill, derived deterministically so it's
// stable between renders (this is a package tree, after all)
const skillVersion = (skill: string) => {
  let hash = 0
  for (const char of skill) hash = (hash * 17 + char.charCodeAt(0)) >>> 0
  const major = (hash % 6) + 1
  const minor = (hash >> 3) % 12
  return `${major}.${minor}.0`
}

// flatten skills into an `npm ls` tree with the right ├─ │ └─ box characters
interface SkillNode { key: string, prefix: string, label: string, isGroup: boolean, version?: string }

const skillTree = computed<SkillNode[]>(() => {
  const nodes: SkillNode[] = []
  const groups = profile.skills
  groups.forEach((group, gi) => {
    const lastGroup = gi === groups.length - 1
    nodes.push({
      key: group.group,
      prefix: lastGroup ? '└─ ' : '├─ ',
      label: group.group.toLowerCase(),
      isGroup: true
    })
    const rail = lastGroup ? '   ' : '│  '
    group.items.forEach((skill, si) => {
      const lastItem = si === group.items.length - 1
      nodes.push({
        key: `${group.group}/${skill}`,
        prefix: `${rail}${lastItem ? '└─ ' : '├─ '}`,
        label: skill,
        isGroup: false,
        version: skillVersion(skill)
      })
    })
  })
  return nodes
})

const laurensSnippet = `<span class="tok-kw">const</span> laurens: <span class="tok-type">Developer</span> = {
  location: <span class="tok-str">'The Netherlands'</span>,
  roles: [<span class="tok-str">'head of dev @ Nosana'</span>,
          <span class="tok-str">'full-stack dev'</span>],
  languages: [<span class="tok-str">'TypeScript'</span>,
              <span class="tok-str">'Rust'</span>],
  fuel: <span class="tok-str">'coffee'</span>, <span class="tok-comment">// mostly</span>
  openTo: <span class="tok-str">'interesting problems'</span>,
  contact: () =&gt; <span class="tok-fn">open</span>(<span class="tok-str">'/contact'</span>)
}`
</script>

<style scoped lang="scss">
.skill-tree {
  font-size: 0.85rem;
  line-height: 1.75;
  white-space: pre;
  overflow-x: auto;

  .skill-root {
    color: var(--bulma-primary-on-scheme);
    font-weight: 600;
  }

  .skill-group {
    color: var(--bulma-text-strong);
  }

  .tree-glyph {
    color: var(--bulma-border);
  }

  .skill-leaf {
    color: var(--bulma-text-weak);
    transition: color 0.15s ease;

    .skill-name {
      color: var(--bulma-text);
    }

    .skill-version {
      color: var(--bulma-text-weak);
      opacity: 0.6;
    }

    &:hover {
      .skill-name {
        color: var(--bulma-primary-on-scheme);
      }

      .skill-version {
        opacity: 1;
      }
    }
  }
}

.skill-meters {
  font-size: 0.75rem;
}

.skill-meter {
  margin-bottom: 0.7rem;

  .skill-meter-head {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.2rem;
    color: var(--bulma-text);
  }

  .skill-meter-pct {
    color: var(--bulma-text-weak);
    transition: color 0.3s ease;
  }

  .skill-meter-track {
    height: 6px;
    border-radius: 3px;
    background: var(--bulma-border);
    overflow: hidden;
  }

  .skill-meter-fill {
    height: 100%;
    border-radius: 3px;
    background: linear-gradient(90deg, hsla(var(--lv-primary-hsl), 0.55), var(--bulma-primary));
    box-shadow: 0 0 8px hsla(var(--lv-primary-hsl), 0.4);
    width: 0;
    transition: width 1.1s cubic-bezier(0.16, 1, 0.3, 1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .skill-meter-fill {
    transition: none;
  }
}
</style>
