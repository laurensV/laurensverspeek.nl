// A greeting for people who hit View Source: an ASCII banner baked into the
// top of every prerendered page's <head>. Runs only at generate time — the
// deployed site is still plain static files. (HTML comments must not contain
// two consecutive hyphens, hence the box-drawing characters.)
const BANNER = `<!--

  ┌─────────────────────────────────────────────────┐
  │                                                 │
  │   >_ laurensverspeek.nl                         │
  │                                                 │
  │   hello, fellow view-sourcer. you found the     │
  │   second-best hidden layer of this site.        │
  │                                                 │
  │   the best one is in the dev console:           │
  │   type  lv.hunt()  and follow the trail.        │
  │   (or press ~ on the page and just explore.)    │
  │                                                 │
  │   built with nuxt, bulma and far too much       │
  │   affection for terminals.                      │
  │                                                 │
  └─────────────────────────────────────────────────┘

-->`

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html) => {
    html.head.unshift(BANNER)
  })
})
