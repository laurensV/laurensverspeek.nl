// A note for the people who open the console. (Hi! 👋)
export default defineNuxtPlugin(() => {
  const ascii = String.raw`
 _    __      __
| |   \ \    / /
| |    \ \  / /
| |___  \ \/ /
|_____|  \__/
`

  console.log(
    `%c${ascii}`,
    'color: #ffba00; font-family: monospace; font-weight: bold;'
  )
  console.log(
    '%cWell hello there, fellow dev 👋',
    'color: #ffba00; font-size: 14px; font-weight: bold;'
  )
  console.log(
    [
      'You look like someone who reads source code for fun.',
      'The whole site is open source: https://github.com/laurensV/laurensverspeek.nl',
      '',
      "Psst — press ~ for the terminal and try 'secrets' for the hidden stuff.",
      'And if you enjoy digging this deep: my inbox is open → contact@laurensverspeek.nl'
    ].join('\n'),
    ''
  )
})
