// The museum's collection: every notable feature and easter egg on the site,
// catalogued like exhibits. Grouped into wings; each plaque says how to find
// the piece. The blurbs are exhibit-label voice on purpose.

interface Exhibit {
  name: string
  /** How to find/trigger it — a command, key, or place */
  how: string
  blurb: string
}

export interface Wing {
  title: string
  intro: string
  exhibits: Exhibit[]
}

export const museum: Wing[] = [
  {
    title: 'the terminal wing',
    intro: 'The centerpiece. Press ~ anywhere and a real shell opens.',
    exhibits: [
      { name: 'lvsh', how: 'press ~', blurb: 'A command interpreter with history, tab completion, aliases, env vars and man pages. The navbar, footer and lvOS all talk to the same instance.' },
      { name: 'the virtual filesystem', how: 'mkdir, touch, echo >', blurb: 'Files you make persist across visits. cat, cp, mv, globs, nested directories — and everything you rm lands in the recycle bin.' },
      { name: 'pipes & redirection', how: 'help | grep blog > out.txt', blurb: 'grep, sort, uniq, head, tail, wc — chainable, redirectable, and | copy sends output to your clipboard.' },
      { name: 'command chaining', how: 'cd blog && ls ; echo done', blurb: '&&, || and ; behave like the real thing, short-circuiting on a command\'s exit status.' },
      { name: 'shell scripts', how: "echo 'fortune' > x.sh; sh x.sh", blurb: 'Write scripts with echo or vim, run them line by line with a proper sh -x trace. Fork bombs are politely declined.' },
      { name: 'tmux panes', how: 'ctrl+b then % or "', blurb: 'Split the terminal into up to four panes, each with its own scrollback, all sharing one shell.' },
      { name: 'vim & nano', how: 'vim notes.txt', blurb: 'Real modal editing over the real filesystem. Yes, :wq works. That alone makes it better than the original.' },
      { name: 'reverse search', how: 'ctrl+r', blurb: 'Incremental history search, cycling matches like the shell you grew up with.' },
      { name: 'ssh', how: 'ssh guest@laurensverspeek.nl', blurb: 'Connects to the server you are already on. Authentication method: "vibes".' },
      { name: 'the process table', how: 'ps, kill, top', blurb: 'Effects, lvOS windows and running games are one process table. kill 1231 ends the fireworks; kill 7 ends you.' }
    ]
  },
  {
    title: 'the lvOS pavilion',
    intro: 'An operating system hiding behind a terminal command.',
    exhibits: [
      { name: 'lvOS 2.0', how: 'type desktop, or visit /desktop', blurb: 'A BIOS boot, draggable windows, a taskbar, a start menu. The whole desktop metaphor, in a route.' },
      { name: 'window management', how: 'drag to edges, ctrl+alt+arrows', blurb: 'Aero snapping with a live preview, quadrants, keyboard snapping, Alt+Tab, tile-all and a genie minimize.' },
      { name: 'the app suite', how: 'the icon grid', blurb: 'Files, Paint, Notes, Calculator, Minesweeper, Snake, a media player, a visualizer, a browser browsing this very site.' },
      { name: 'the run dialog', how: 'alt+r', blurb: 'Type an app, Tab completes, Enter launches. The fastest way around the desktop.' },
      { name: 'the recycle bin', how: 'rm anything, then open the bin', blurb: 'Deleted files wait here to be restored or emptied for good. The terminal and the Files app share it.' },
      { name: 'task manager', how: 'the taskmgr icon', blurb: 'Windows, terminal effects and games as killable processes — the same pids ps shows.' },
      { name: 'paint → wallpaper', how: 'lvpaint, then set as wallpaper', blurb: 'Your masterpiece becomes the desktop background. The museum does not judge.' },
      { name: 'about this computer', how: 'the start menu', blurb: 'Real uptime, your real resolution and browser, and exactly how much localStorage this whole circus uses.' },
      { name: 'the lock screen', how: 'start menu → lock', blurb: 'Any password unlocks it. The security is ceremonial; the commitment is real.' },
      { name: 'the boot sequence', how: 'reboot from the start menu', blurb: 'A BIOS POST screen with a memory check that has never once found a problem.' },
      { name: 'mail & the feed reader', how: 'the mail and rss icons', blurb: 'An inbox of lovingly fake mail (the prince remains hopeful) and an RSS reader subscribed to this very site. Dog food: eaten.' },
      { name: 'lvos-2.0.iso', how: 'start menu → download', blurb: 'Actual installation media for an operating system with no hardware. Do not burn to disc; the release notes explain everything.' }
    ]
  },
  {
    title: 'the games gallery',
    intro: 'Playable, in a terminal, because a website should be fun.',
    exhibits: [
      { name: 'snake', how: 'type snake', blurb: 'The classic, with a high score that survives your visit. Also playable on the offline page, because outages are boring.' },
      { name: 'tetris', how: 'type tetris', blurb: 'Hold pieces, ghost preview, hard drops. Rendered entirely in monospace.' },
      { name: 'the text adventure', how: 'type adventure', blurb: 'The site as a dungeon: an amber key under a keyboard, a hint-dispensing duck, a grue in the dark basement, and a floppy that deploys the site.' },
      { name: '2048, pong, hangman', how: 'you know the drill', blurb: 'The complete waiting-room canon, faithfully ported to ASCII.' },
      { name: 'the typing test', how: 'type wpm', blurb: 'Measures how fast you type by making you type about typing.' },
      { name: 'conway\'s game of life', how: 'type life, or click the hero', blurb: 'It is in the terminal, it is the homepage hero, it has its own page, and it can be your lvOS wallpaper. The museum has a favorite automaton.' },
      { name: 'ascii star wars', how: 'telnet towel.blinkenlights.nl', blurb: 'An original homage to the greatest telnet server that ever ran.' },
      { name: 'minesweeper', how: 'mines.exe on the desktop', blurb: 'Right-click flags. The corner cells are as unfair as you remember.' }
    ]
  },
  {
    title: 'the effects hall',
    intro: 'Site-wide spectacles, each one a killable process.',
    exhibits: [
      { name: 'matrix rain', how: 'type matrix', blurb: 'There is no spoon. Any key wakes you up; kill 314 also works.' },
      { name: 'fireworks', how: 'type fireworks', blurb: 'Canvas pyrotechnics over the page. Under reduced motion you get one artisanal ASCII firework instead.' },
      { name: 'destroy mode', how: 'type destroy', blurb: 'A ship that shoots the actual DOM to pieces. Esc repairs the site, no refunds needed.' },
      { name: 'the boss key', how: 'press b twice, fast', blurb: 'Instantly replaces everything with Q3_forecast_v7_FINAL(2).xlsx. Esc when the coast is clear.' },
      { name: 'CRT mode', how: 'type crt, or triple-click the logo', blurb: 'Scanlines and glow. Welcome back to 1985.' },
      { name: 'the steam locomotive', how: 'mistype ls as sl', blurb: 'You know exactly what you did.' },
      { name: 'party mode', how: '↑↑↓↓←→←→BA', blurb: 'The Konami code does what the Konami code must.' },
      { name: 'barrel roll', how: 'do a barrel roll', blurb: 'Star Fox taught us well. Reduced motion politely asks you to imagine it.' }
    ]
  },
  {
    title: 'the hidden collection',
    intro: 'Pieces you have to earn. This label is already too generous.',
    exhibits: [
      { name: 'the console hunt', how: 'open devtools, follow window.lv', blurb: 'A three-step riddle that ends in a party and a job-application command.' },
      { name: 'the tamagotchi', how: 'pet adopt <name>', blurb: 'Lives in the status bar, wanders the lvOS desktop, hatches within the hour, sleeps at night, sulks when unfed. Forgives instantly.' },
      { name: 'the 418 teapot', how: 'ask the terminal for coffee', blurb: 'RFC 2324, implemented: an ASCII teapot in real 3D, rendered with arithmetic and stubbornness. Drag it to pour.' },
      { name: 'status bar toys', how: 'click everything down there', blurb: 'A presence dot, cycling line endings, language modes, a live clock — and five rapid clicks on v2.0.0 arm something regrettable.' },
      { name: 'secrets', how: 'type secrets', blurb: 'The self-aware index of everything this wing refuses to spell out.' },
      { name: 'sudo', how: 'try it', blurb: 'This incident will be reported.' },
      { name: 'emacs', how: 'ask for it three times', blurb: 'The other editor. Persistence is noted, respected, and ultimately futile.' },
      { name: 'the terminal favicon', how: 'open the terminal, watch the tab', blurb: 'The tab icon becomes a prompt while the shell is open. The smallest exhibit in the museum.' },
      { name: 'say', how: 'say hello (with cursors enabled)', blurb: 'A speech bubble over your live cursor, visible to everyone browsing right now.' }
    ]
  },
  {
    title: 'the craft annex',
    intro: 'Engineering exhibits — invisible when they work, which is the point.',
    exhibits: [
      { name: 'fully static', how: 'view-source', blurb: 'Everything you have seen ships as static files from a generate step. There is no server having a bad day.' },
      { name: 'the real git log', how: 'git log, or /changelog', blurb: 'The site\'s actual commit history, baked in at build time, diffstats included.' },
      { name: 'view transitions', how: 'click a project card', blurb: 'Titles and thumbnails morph between list and detail using the native View Transitions API.' },
      { name: 'both themes, all of it', how: 'the sun/moon toggle', blurb: 'Every exhibit works in light and dark, keys off one data-theme attribute, and respects prefers-reduced-motion.' },
      { name: 'the test battery', how: 'the repo', blurb: 'Three hundred unit tests and nearly two hundred end-to-end tests boot this museum nightly, so the exhibits stay dusted.' },
      { name: 'privacy', how: 'check /stats', blurb: 'No cookies, no fingerprints; the visitor counters are public and the analytics are optional at build time.' },
      { name: 'this very floor', how: '[walk the floor], above', blurb: 'The museum you are standing in: rooms generated from this catalog, plaques mounted by code, one @ to walk them. The exhibit is the building.' },
      { name: 'the pixel world', how: 'world open, in the terminal', blurb: 'A hidden shared canvas: place one pixel at a time on a 128×128 board, see who placed what, watch strangers build a landscape together. The server keeps the peace; the visitors keep the paint.' }
    ]
  }
]

export const exhibitCount = museum.reduce((sum, wing) => sum + wing.exhibits.length, 0)
