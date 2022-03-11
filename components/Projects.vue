<template>
    <div class="columns is-multiline">
      <div class="column is-4" v-for="project in projects" :key="project.title">
        <div class="card">
          <header class="card-header">
            <div class="card-header-title">
              <span>{{ project.title }}</span>
            </div>
            <div class="card-header-icon">
                <span class="tag is-default is-accent" title="Category">{{ project.category }}</span>
            </div>
          </header>
          <div class="card-image">
            <div class="image">
              <a :href="project.url" target="_blank"><img :src="project.thumbnail" alt="Project Screenshot"></a>
            </div>
          </div>
          <div class="card-content">
            <div>
              {{ project.description }}
            </div>
          </div>
          <footer class="card-footer is-size-7">
            <a :href="project.source" target="_blank" class="card-footer-item has-text-dark">
              <i class="fas fa-code mr-2" aria-hidden="true"></i> Source Code
            </a>
            <a :href="project.url" target="_blank" class="card-footer-item has-text-dark">
              <i class="fas fa-search mr-2" aria-hidden="true"></i> Preview
            </a>
          </footer>
        </div>
      </div>
    </div>
</template>
<script>
  export default {
    components: {},
    data () {
      return {
        projects: [
          {
            title: 'Self-Coding Website',
            description: 'Website that will style itself with some tricks to display the style block and make it editable. With a small auto-typing javascript function you can make a website that will `code` itself.',
            category: 'hobby',
            thumbnail: 'https://raw.githubusercontent.com/laurensV/self-coding-website/main/docs/self-coding-website-snippet.gif',
            source: 'https://github.com/laurensV/self-coding-website',
            url: 'https://laurensv.github.io/self-coding-website/'
          },
          {
            title: 'Self-Coding Website',
            description: 'Website that will style itself with some tricks to display the style block and make it editable. With a small auto-typing javascript function you can make a website that will `code` itself.',
            category: 'hobby',
            thumbnail: 'https://bulma.io/images/placeholders/1280x960.png',
            source: 'https://github.com/laurensV/self-coding-website',
            url: 'https://laurensv.github.io/self-coding-website/'
          },
          {
            title: 'Self-Coding Website',
            description: 'Website that will style itself with some tricks to display the style block and make it editable. With a small auto-typing javascript function you can make a website that will `code` itself.',
            category: 'hobby',
            thumbnail: 'https://raw.githubusercontent.com/laurensV/self-coding-website/main/docs/self-coding-website-snippet.gif',
            source: 'https://github.com/laurensV/self-coding-website',
            url: 'https://laurensv.github.io/self-coding-website/'
          },
          {
            title: 'Self-Coding Website',
            description: 'Website that will style itself with some tricks to display the style block and make it editable. With a small auto-typing javascript function you can make a website that will `code` itself.',
            category: 'hobby',
            thumbnail: 'https://raw.githubusercontent.com/laurensV/self-coding-website/main/docs/self-coding-website-snippet.gif',
            source: 'https://github.com/laurensV/self-coding-website',
            url: 'https://laurensv.github.io/self-coding-website/'
          }
        ]
      }
    }
  }
</script>
<style lang="scss" scoped>
.card {
    height: 100%;
    display: flex;
    flex-direction: column;
}
  
.card-content {
      height: 100%;
}
</style>