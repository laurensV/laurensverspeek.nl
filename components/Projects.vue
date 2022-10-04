<template>
    <div class="columns is-multiline">
      <div class="column is-4" v-for="project in projects" :key="project.title">
        <a class="card" :href="project.url" target="_blank">
          <header class="card-header">
            <div class="card-header-title">
              <small>{{ project.title }}</small>
            </div>
            <div class="card-header-icon">
                <span class="tag is-default" title="Category"
                :class="{
                  'is-accent': project.category === 'hobby', 
                  'is-secondary': project.category === 'study',
                  'is-primary': project.category === 'work'
                }">{{ project.category }}</span>
            </div>
          </header>
          <div class="card-image">
            <div class="thumbnail" :style="{backgroundImage: `url(${project.thumbnail})`}"></div>
            <div class="thumbnail-hover" :style="{backgroundImage: `url(${project.thumbnail_hover ? project.thumbnail_hover: project.thumbnail})`}"></div>
          </div>
          <div class="card-content">
            <div class="has-text-justified">
              {{ project.description }}
            </div>
          </div>
          <footer class="card-footer is-size-7">
            <a :href="project.source" target="_blank" class="card-footer-item is-accent">
              <i class="fas fa-code mr-2" aria-hidden="true"></i> Source Code
            </a>
            <a :href="project.url" target="_blank" class="card-footer-item is-accent">
              <i class="fas fa-search mr-2" aria-hidden="true"></i> Preview
            </a>
          </footer>
        </a>
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
            title: 'Effect Network',
            description: 'The first Blockchain-based framework for the Future-of-Work. Access a global, on-demand, 24x7 scalable WorkForce. EFX is the cryptographic token that fuels the Effect Network',
            category: 'work',
            thumbnail: 'https://effect.network/img/logo/logo.png',
            thumbnail_hover: 'https://raw.githubusercontent.com/effectai/force-frontend/main/docs/Effect-Force_Select-Screen.gif',
            source: 'https://effect.network/download/effect_whitepaper.pdf',
            url: 'https://effect.network'
          },
          {
            title: 'Self-Coding Website',
            description: 'Website that will style itself with some tricks to display the style block and make it editable. With a small auto-typing javascript function you can make a website that will `code` itself.',
            category: 'hobby',
            thumbnail: 'https://raw.githubusercontent.com/laurensV/self-coding-website/main/docs/self-coding-website-snippet.png',
            thumbnail_hover: 'https://raw.githubusercontent.com/laurensV/self-coding-website/main/docs/self-coding-website-snippet.gif',
            source: 'https://github.com/laurensV/self-coding-website',
            url: 'https://laurensv.github.io/self-coding-website/'
          },
          {
            title: 'Nosana',
            description: 'Decentralized computations for CI/CD pipelines, running on the Solana Blockchain. Also includes a decentralized staking program for the NOS token.',
            category: 'work',
            thumbnail: 'https://nosana.io/img/Nosana_Logo_vertical_color_black.png',
            source: 'https://github.com/nosana-ci',
            url: 'https://nosana.io'
          },
          {
            title: 'Automated Web Design',
            description: 'Master Thesis: Online Automated Multivariate Web Design Optimization - Using a modified AI Genetic Algorithm to optimize and automatically adjust web design',
            category: 'paper',
            thumbnail: 'https://raw.githubusercontent.com/laurensV/amos/master/thumbnail_master-thesis.png',
            source: 'https://github.com/laurensV/amos',
            url: 'https://github.com/laurensV/amos/blob/master/master_thesis_AMOS_laurens_verspeek.pdf'
          },
          {
            title: 'Detect Malicious Websites',
            description: 'Bachelor Thesis: An experiment where the participants had to classify websites based on the geograhpical consistency of different components of a website',
            category: 'paper',
            thumbnail: 'https://raw.githubusercontent.com/laurensV/TrustingWebsites/master/paper/img/tool.PNG',
            source: 'https://github.com/laurensV/TrustingWebsites',
            url: 'https://github.com/laurensV/TrustingWebsites/blob/master/trusting-website-using-geographical-consistency_laurens-verspeek.pdf'
          },
          {
            title: 'Kids Age Website',
            description: 'Website to display current age for baby/kids with interactive fireworks on their birthday. Both a boy version an a girl version are available',
            category: 'hobby',
            thumbnail: 'https://raw.githubusercontent.com/laurensV/age/main/docs/screenshot_fireworks.png',
            thumbnail_hover: 'https://raw.githubusercontent.com/laurensV/age/main/docs/screenshot_fireworks.gif',
            source: 'https://github.com/laurensV/age',
            url: 'https://laurensv.github.io/age/'
          },
          {
            title: 'Hangman Android App',
            description: 'Hangman is an application for Android based on the classic Hangman game for the course Native App Studios - University of Amsterdam',
            category: 'study',
            thumbnail: 'https://raw.githubusercontent.com/laurensV/Hangman/master/doc/hangman.png',
            source: 'https://github.com/laurensV/Hangman',
            url: 'https://github.com/laurensV/Hangman/blob/master/README.md'
          }
        ]
      }
    }
  }
</script>
<style lang="scss" scoped>
.image {
    img:nth-child(2) {
        display:none;
    }
}
.thumbnail, .thumbnail-hover {
    background-size: cover;
    background-repeat: none;
    background-position: top center;
    height: 150px;
    width: 100%;
}
.thumbnail-hover {
    display: none;
}
.card {
    height: 100%;
    display: flex;
    flex-direction: column;
    &:hover {
        .thumbnail {
            display: none;
        }
        .thumbnail-hover {
            display: block;
        }
    }
}
  
.card-content {
    height: 100%;
}
</style>