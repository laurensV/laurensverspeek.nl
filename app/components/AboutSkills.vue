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
          <span class="skill-name">{{ node.label }}</span>
        </template>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { profile } from '~/data/profile'

// The skills column of /about: an `npm ls` skill tree of grouped skills.

// flatten skills into an `npm ls` tree with the right ├─ │ └─ box characters.
// no version tags — real versions would drift out of date and fake ones are just
// noise, so the leaves are the bare package names
interface SkillNode { key: string, prefix: string, label: string, isGroup: boolean }

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
        isGroup: false
      })
    })
  })
  return nodes
})

const laurensSnippet = `<span class="tok-kw">const</span> laurens: <span class="tok-type">Developer</span> = {
  location: <span class="tok-str">'The Netherlands'</span>,
  roles: [<span class="tok-str">'head of dev @ Nosana'</span>,
          <span class="tok-str">'co-founder @ Effect.AI'</span>,
          <span class="tok-str">'full-stack dev'</span>],
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

    &:hover {
      .skill-name {
        color: var(--bulma-primary-on-scheme);
      }
    }
  }
}

</style>
