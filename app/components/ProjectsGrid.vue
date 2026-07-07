<template>
  <div>
    <div v-if="withFilters" class="tabs is-toggle is-small mb-5 filter-tabs">
      <ul>
        <li :class="{ 'is-active': activeCategory === null }">
          <a @click="activeCategory = null">All</a>
        </li>
        <li
          v-for="category in categories"
          :key="category.value"
          :class="{ 'is-active': activeCategory === category.value }"
        >
          <a @click="activeCategory = category.value">{{ category.label }}</a>
        </li>
      </ul>
    </div>

    <TransitionGroup name="grid" tag="div" class="columns is-multiline">
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

const visibleProjects = computed(() =>
  activeCategory.value
    ? props.projects.filter((p) => p.category === activeCategory.value)
    : props.projects
)
</script>

<style scoped lang="scss">
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
