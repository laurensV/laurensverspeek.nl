// SCSS linting for global.scss and every <style lang="scss"> block.
// Rules are dialed to describe the codebase's existing conventions, not to
// fight them — hex colors, Bulma var() usage and kebab-case names.
export default {
  extends: ['stylelint-config-standard-scss'],
  overrides: [
    {
      files: ['**/*.vue'],
      customSyntax: 'postcss-html'
    }
  ],
  rules: {
    // the design system leans on hsl()/hsla() with CSS-var channels — the
    // legacy comma syntax there is deliberate (custom properties inside)
    'color-function-notation': null,
    'color-function-alias-notation': null,
    'alpha-value-notation': null,
    'hue-degree-notation': null,
    'media-feature-range-notation': null,
    // no autoprefixer in this build: the -webkit- mask/background-clip
    // prefixes are written on purpose next to their standard property
    'property-no-vendor-prefix': [true, { ignoreProperties: ['-webkit-mask-image', '-webkit-background-clip'] }],
    'declaration-empty-line-before': null,
    'scss/double-slash-comment-empty-line-before': null,
    // single-line grouped declarations (resize handles, ascii tables) are used
    // deliberately for readability
    'declaration-block-single-line-max-declarations': null,
    'rule-empty-line-before': null,
    // Vue deep/slotted pseudo selectors
    'selector-pseudo-class-no-unknown': [true, {
      ignorePseudoClasses: ['deep', 'slotted', 'global']
    }],
    'selector-pseudo-element-no-unknown': [true, {
      ignorePseudoElements: ['v-deep', 'v-slotted', 'v-global']
    }]
  }
}
