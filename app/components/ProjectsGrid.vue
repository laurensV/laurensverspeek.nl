<template>
  <div>
    <div
      v-if="withFilters"
      ref="filtersEl"
      class="filter-flags is-family-code mb-5"
      role="tablist"
      aria-label="Filter projects"
      @keydown="onFilterKey"
    >
      <span class="filter-prompt" aria-hidden="true">$ ls</span>
      <button
        class="filter-flag"
        role="tab"
        :aria-selected="activeCategory === null"
        :tabindex="activeCategory === null ? 0 : -1"
        :class="{ 'is-active': activeCategory === null }"
        @click="activeCategory = null"
      >--all<span class="flag-count">={{ projects.length }}</span></button>
      <button
        v-for="category in categories"
        :key="category.value"
        class="filter-flag"
        role="tab"
        :aria-selected="activeCategory === category.value"
        :tabindex="activeCategory === category.value ? 0 : -1"
        :class="{ 'is-active': activeCategory === category.value }"
        @click="activeCategory = category.value"
      >--{{ category.value }}<span class="flag-count">={{ countFor(category.value) }}</span></button>
      <span class="filter-cursor" aria-hidden="true" />
    </div>

    <TransitionGroup
      ref="gridEl"
      name="grid"
      tag="div"
      class="columns is-multiline"
    >
      <div
        v-for="project in visibleProjects"
        :key="project.slug"
        class="column is-one-third-desktop is-half-tablet"
      >
        <ProjectCard :project="project" />
      </div>
    </TransitionGroup>

    <div v-if="!visibleProjects.length" class="notification empty-state has-text-centered is-family-code">
      <p class="mb-1">ls: no projects found in ./{{ activeCategory }}</p>
      <p class="is-size-7 has-text-grey">More coming soon — check another category.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { categories, type Project, type ProjectCategory } from '~/data/projects'

const props = withDefaults(
  defineProps<{ projects: Project[]; withFilters?: boolean }>(),
  { withFilters: false }
)

const activeCategory = ref<ProjectCategory | null>(null)

const countFor = (category: ProjectCategory) =>
  props.projects.filter((p) => p.category === category).length

// keyboard support for the filter tablist: ←/→ move (and activate) tabs,
// Home/End jump to the ends, with a roving tabindex (only the active tab is
// in the tab order). Activation follows focus, the common tablist pattern.
const filtersEl = ref<HTMLElement>()
const tabValues = computed<(ProjectCategory | null)[]>(() => [null, ...categories.map((c) => c.value)])
const onFilterKey = (event: KeyboardEvent) => {
  if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const values = tabValues.value
  const current = values.indexOf(activeCategory.value)
  const nextIndex
    = event.key === 'Home' ? 0
      : event.key === 'End' ? values.length - 1
        : event.key === 'ArrowRight' ? (current + 1) % values.length
          : (current - 1 + values.length) % values.length
  activeCategory.value = values[nextIndex]!
  void nextTick(() => filtersEl.value?.querySelectorAll<HTMLElement>('.filter-flag')[nextIndex]?.focus())
}

// 2D keyboard navigation across the project cards: arrows move focus between
// the card links, Enter/Space follow them (native to the <a>). Columns are
// detected from the rendered layout so it works across breakpoints.
const gridEl = ref<{ $el: HTMLElement } | HTMLElement>()
const gridRoot = () => (gridEl.value && '$el' in gridEl.value ? gridEl.value.$el : gridEl.value)
const onGridKey = (event: KeyboardEvent) => {
  if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
  const root = gridRoot()
  const links = [...(root?.querySelectorAll<HTMLElement>('.project-thumb') ?? [])]
  if (!links.length) return
  const active = document.activeElement as HTMLElement
  const current = links.indexOf(active)
  if (current < 0) return
  event.preventDefault()
  // columns = how many cards share the top row's offsetTop
  const firstTop = links[0]!.offsetTop
  const cols = Math.max(1, links.filter((el) => el.offsetTop === firstTop).length)
  const delta = event.key === 'ArrowRight' ? 1
    : event.key === 'ArrowLeft' ? -1
      : event.key === 'ArrowDown' ? cols : -cols
  const next = Math.max(0, Math.min(links.length - 1, current + delta))
  links[next]?.focus()
}

// listen on the rendered element (TransitionGroup takes no native listeners)
useEventListener(() => gridRoot() ?? null, 'keydown', onGridKey)

const visibleProjects = computed(() =>
  activeCategory.value
    ? props.projects.filter((p) => p.category === activeCategory.value)
    : props.projects
)
</script>

<style scoped lang="scss">
// filters as command-line flags: $ ls --work=3
.filter-flags {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.35rem 1rem;
  font-size: 0.85rem;

  .filter-prompt {
    color: var(--bulma-text-weak);
  }

  .filter-flag {
    position: relative;
    border: none;
    background: none;
    padding: 0.1rem 0;
    color: var(--bulma-text-weak);
    font: inherit;
    cursor: pointer;
    transition: color 0.2s ease;

    // taller vertical tap area on touch (the ~24px text buttons are fiddly)
    @media (pointer: coarse) {
      padding: 0.55rem 0.3rem;
    }

    .flag-count {
      color: var(--bulma-text-weak);
      opacity: 0.6;
      font-size: 0.78em;
    }

    // active flag gets an underline that types itself in
    &::after {
      content: '';
      position: absolute;
      left: 0;
      bottom: -2px;
      width: 0;
      height: 1px;
      background-color: var(--bulma-primary);
      transition: width 0.25s ease;
    }

    &:hover {
      color: var(--bulma-text-strong);
    }

    &.is-active {
      color: var(--bulma-primary-on-scheme);

      .flag-count {
        color: var(--bulma-primary-on-scheme);
        opacity: 0.8;
      }

      &::after {
        width: 100%;
      }
    }
  }

  .filter-cursor {
    align-self: center;
    width: 0.5em;
    height: 1.05em;
    background-color: var(--bulma-primary);
    opacity: 0.75;
    animation: filter-cursor-blink 1.15s steps(2, start) infinite;
  }
}

@keyframes filter-cursor-blink {
  to {
    visibility: hidden;
  }
}

@media (prefers-reduced-motion: reduce) {
  .filter-flags .filter-cursor {
    animation: none;
  }
}

.grid-move {
  transition: transform 0.35s ease;
}

.grid-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.grid-enter-from {
  opacity: 0;
  transform: translateY(0.5rem);
}

.grid-leave-active {
  display: none;
}

.empty-state {
  background-color: var(--bulma-scheme-main-bis);
}
</style>
