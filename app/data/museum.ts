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
      { name: 'the process table', how: 'ps, kill, top', blurb: 'Effects, lvOS windows and running games are one process table — right down to the screensaver and the boot-replay takeover. kill 1231 ends the fireworks; kill 7 ends you.' },
      { name: 'jq', how: "jq '.basics.name' resume", blurb: 'A real subset of jq over the site\'s own JSON — resume, profile, projects — field access, array iteration, pipes and keys/length. Pipe curl into it too.' }
    ]
  },
  {
    title: 'the lvOS pavilion',
    intro: 'An operating system hiding behind a terminal command.',
    exhibits: [
      { name: 'lvOS 2.0', how: 'type desktop, or desktop <app>', blurb: 'A BIOS boot, draggable windows, a taskbar, a start menu. The whole desktop metaphor, in a route — and desktop weather (or any app name) boots straight into that window.' },
      { name: 'window management', how: 'drag to edges, ctrl+alt+arrows', blurb: 'Aero snapping with a live preview, quadrants, keyboard snapping, Alt+Tab, tile-all and a genie minimize.' },
      { name: 'the app suite', how: 'the icon grid', blurb: 'Files, Paint (with undo), Notes, a Calculator with scientific and programmer (hex/bin/oct) modes, Minesweeper, Snake, Asteroids, a media player with visualizer modes, a shared whiteboard, a Clipboard, a Pet, a browser browsing this very site.' },
      { name: 'the run dialog', how: 'alt+r', blurb: 'Type an app, Tab completes, Enter launches. The fastest way around the desktop.' },
      { name: 'the recycle bin', how: 'rm anything, then open the bin', blurb: 'Deleted files wait here to be restored or emptied for good. The terminal and the Files app share it.' },
      { name: 'task manager', how: 'the taskmgr icon', blurb: 'Windows, terminal effects and games as killable processes — the same pids ps shows.' },
      { name: 'paint → wallpaper', how: 'lvpaint, then set as wallpaper', blurb: 'Your masterpiece becomes the desktop background. The museum does not judge.' },
      { name: 'about this computer', how: 'the start menu', blurb: 'Real uptime, your real resolution and browser, and exactly how much localStorage this whole circus uses.' },
      { name: 'the lock screen', how: 'start menu → lock', blurb: 'One password opens it: the most famous one on IRC. Guess wrong and it judges you — and points out that everyone can see it is ******* anyway. The security is ceremonial (a reload walks past it); the commitment is real.' },
      { name: 'the boot sequence', how: 'reboot from the start menu', blurb: 'A BIOS POST screen with a memory check that has never once found a problem.' },
      { name: 'mail & the feed reader', how: 'the mail and rss icons', blurb: 'An inbox where real blog posts arrive as newsletters (and the prince remains hopeful), plus an RSS reader subscribed to this very site. The compose button drafts a real reply. Dog food: eaten.' },
      { name: 'system update', how: 'start menu → system update', blurb: 'Ceremonially installs this repo\'s actual recent commits, progress bar and "do not turn off your computer" and all. It remembers what it installed, so the nudge only returns when new work ships.' },
      { name: 'BIOS setup', how: 'press DEL during the POST', blurb: 'Arrow-key menus over the real settings — wallpaper, night light, theme, screensaver. F10 saves and resumes the boot. Nothing here is decorative.' },
      { name: 'the volume tray & jukebox', how: 'the taskbar speaker, or type music', blurb: 'One real volume the chiptune engine obeys, shared by the media app, the terminal music command and the tray. Three tracks, all synthesized, no files.' },
      { name: 'screensavers & night light', how: 'idle, or the settings app', blurb: 'A starfield, flying toasters or mystify drift in after 45 idle seconds; a warm night-light wash eases late-night pixel-pushing. Night light is settable from Settings, Displays, BIOS and the terminal; the screensaver from Settings, BIOS and the terminal — one shared preference each, and both are killable processes.' },
      { name: 'camera, playground & monitors', how: 'the icon grid', blurb: 'A webcam-to-ASCII camera, a sandboxed HTML/CSS/JS code playground, a live system monitor and a GitHub contributions heatmap — the desktop earns its keep.' },
      { name: 'weather & the colour picker', how: 'the weather and colours icons', blurb: 'A five-day Amsterdam forecast over the same source as the tray chip, and an eyedropper colour tool that reads hex/rgb/hsl and pushes any colour to the live site accent.' },
      { name: 'the hall of fame', how: 'the scores icon', blurb: 'Every game\'s persisted best in one board — and those same scores mint the coins your tamagotchi spends. One ledger, no fakes.' },
      { name: 'the clipboard', how: 'the clipboard icon, or type clip', blurb: 'Every copy on the site — a terminal | copy, a blog code block, the vCard email, a picked colour, the palette\'s share link — lands in one rolling history. Click any entry to copy it again, or × to forget just that one; the terminal `clip` command lists and re-copies the same list. One writeClipboard, one history.' },
      { name: 'lvos-2.0.iso', how: 'start menu → download', blurb: 'Actual installation media for an operating system with no hardware. Do not burn to disc; the release notes explain everything.' },
      { name: 'built for a thumb', how: 'open the desktop on a phone', blurb: 'Windows open maximized so the close button is reachable, the taskbar collapses its tray behind a ⋯ and scrolls, a long-press summons the context menu (and a file\'s row menu), Snake grows a d-pad, Minesweeper gets a flag-mode toggle and shrinks its board to fit, and every app\'s buttons grow to thumb size. The terminal stops jumping sideways and its grid games stop wrapping, letter games raise the keyboard, the pixel-world swatches and the status-bar controls grow, and the destroyer flies by a virtual joystick. The whole desktop folds down to 320 pixels.' },
      { name: 'the time machine', how: 'the time machine app, git checkout <hash>, ⌘K → Travel to…, or /?v=<version>', blurb: 'Actual time travel: every deploy of this site since 2020 is a real build sitting in the repo\'s history, and a service worker serves any of them back to you — the genuine old site, links and all, right down to the Vuetify version from before the rebuild. Reach it four ways off one shared history — pick a date in the app, checkout a commit hash in the terminal, jump from the command palette, or open a shareable /?v=v2.0.3 link that lands someone straight in that past build — and a bar at the bottom brings you home. No screenshots, no reconstructions. The past, rehosted on demand.' }
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
      { name: 'minesweeper', how: 'type minesweeper, or mines.exe', blurb: 'Right-click flags. The corner cells are as unfair as you remember. The terminal command opens it like chess and the whiteboard do.' },
      { name: 'chess', how: 'the chess app on the desktop', blurb: 'A full rules engine — castling, en passant, promotion — against a small AI, or against a live visitor over the relay.' },
      { name: 'the asciiquarium', how: 'type asciiquarium', blurb: 'A tiny fish tank swimming in your terminal. It asks nothing of you. It simply swims.' },
      { name: 'asteroids', how: 'the asteroids app on the desktop', blurb: 'Thrust, rotate, fire; the rocks wrap the edges and split when you shoot them. A hit ends the run — and, like every game here, your best mints tamagotchi coins.' }
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
      { name: 'barrel roll', how: 'do a barrel roll', blurb: 'Star Fox taught us well. Reduced motion politely asks you to imagine it.' },
      { name: 'the high-score burst', how: 'beat your best at any game', blurb: 'Confetti erupts the moment you top a personal record — never on the first play, and a single still frame under reduced motion. Top the GLOBAL leaderboard #1 and the burst grows, with a "new world record" banner to match.' }
    ]
  },
  {
    title: 'the hidden collection',
    intro: 'Pieces you have to earn. This label is already too generous.',
    exhibits: [
      { name: 'the console hunt', how: 'open devtools, follow window.lv', blurb: 'Five rounds played from the devtools console — decode base64, inspect a live object, read a function’s own source, turn char codes back into text, then combine your answers. One line each, no trivia, no scripting — all real dev moves. Finishing it unlocks a command that exists nowhere else: an all-access backstage pass with a one-of-one code and a direct line.' },
      { name: 'the tamagotchi', how: 'pet adopt <name>', blurb: 'Lives in the status bar, wanders the lvOS desktop, hatches within the hour, sleeps at night, sulks when unfed. Forgives instantly.' },
      { name: 'the pet economy', how: 'pet coins, pet buy, or the Pet app', blurb: 'Your game high scores mint coins; the shop spends them on snacks and a bowtie, top hat or pixel crown the sprite actually wears — from the terminal `pet` command or the lvOS Pet app, so a keyboard-free player can spend too. No second ledger — the coins come from the hall of fame itself.' },
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
    title: 'the multiplayer wing',
    intro: 'The site is not always empty. Sometimes there are other people in it.',
    exhibits: [
      { name: 'the pixel world', how: 'world open', blurb: 'A shared 128×128 canvas: place one pixel every few seconds, pan and zoom a founding landscape, and watch it change under other visitors\' hands. A minimap, named districts and a time-lapse of recent pixels come standard.' },
      { name: 'live cursors', how: 'when the relay is on', blurb: 'Other visitors\' cursors drift across the same page you are reading, each a colored dot with a name. Toggle them from the status bar.' },
      { name: 'say', how: 'say hello', blurb: 'A speech bubble blooms over your live cursor for everyone browsing right now — the smallest possible chat, and somehow the friendliest.' },
      { name: 'the chat room', how: 'type chat, or open the lvOS app', blurb: 'One #lounge feed shared by the terminal command and the desktop app. Ephemeral by design — the relay keeps only the last fifty lines.' },
      { name: 'chess online', how: 'the ⚔ button in the chess app', blurb: 'Challenge a live visitor. The relay referees with the exact same rules engine the client draws with, so the boards can never diverge.' },
      { name: 'pong & the typing race', how: 'pong online, wpm race', blurb: 'Two visitors, one server-authoritative match. Pong physics and the finish line both live on the relay; without one, you quietly fall back to solo play.' },
      { name: 'the leaderboard', how: 'the hall of fame, or type scores', blurb: 'Local high scores — readable in the terminal with scores or the lvOS hall of fame — plus a global top table over the relay for snake, tetris, 2048, wpm and pong, submitted automatically when a game ends.' },
      { name: 'the visitor globe', how: 'type globe', blurb: 'A spinning ASCII earth plotting everyone online by timezone — ◉ is you. Privacy-safe: only a UTC offset ever crosses the wire, never a location.' },
      { name: 'the whiteboard', how: 'type draw, or open the lvOS app', blurb: 'A shared freehand canvas — everyone here draws on the same board, you see the other visitors’ pens move live as coloured dots, strokes appear as you make them, undo (or Ctrl+Z) takes back your last stroke for everyone, replay time-lapses the board stroke by stroke, save snapshots it to the Gallery, and clear asks once before wiping it for all. Distinct from the pixel world: this is ink, not a grid. Solo when no relay is configured.' },
      { name: 'the relay', how: 'realtime/cursors-server.mjs', blurb: 'One tiny Node websocket server behind all of it: authoritative pixel board, matchmaking, rate limits, provenance, no accounts, no tracking. The whole multiplayer layer is optional and off by default.' },
      { name: 'the status page', how: 'visit /status', blurb: 'An honest health check for the whole multiplayer layer: whether the relay is up, who is online, how full the pixel board is, and which features are available right now.' }
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
      { name: 'the test battery', how: 'the repo', blurb: 'Hundreds of unit tests and a couple hundred end-to-end tests boot this museum before every deploy, so the exhibits stay dusted.' },
      { name: 'lean by default', how: 'load any page, never open the terminal', blurb: 'The whole shell and its command registry only download the first time you press ~, and the project previews are lightweight looping video instead of multi-megabyte GIFs. A visitor who never opens the terminal never pays for it.' },
      { name: 'install it, quiet it', how: 'the install chip; settings → reduce motion', blurb: 'It offers to install as a real app when your browser allows, plays a startup chime you can mute — on the site boot and on entering lvOS — and hides a reduce-motion switch that flattens every animation, canvas ones included, on top of your system setting. Reach it from Settings or the terminal (reducemotion), pick any accent — a preset swatch or a raw colorscheme #hex, which now shows as its own live swatch in Settings — turn keyclick (mechanical-keyboard typing sounds — ticking in the terminal and every lvOS text field, Vim and the Playground included) on or off in the Settings sound section or the terminal, scale the terminal text from a Settings slider as well as the `fontsize` command, and type settings to read every appearance and sound preference in one place.' },
      { name: 'privacy', how: 'check /stats', blurb: 'No cookies, no fingerprints; the visitor counters are public and the analytics are optional at build time.' },
      { name: 'this very floor', how: '[ walk the floor ], above', blurb: 'The museum you are standing in: rooms generated from this catalog, plaques mounted by code, one @ to walk them. The exhibit is the building.' },
      { name: 'the pixel world', how: 'world open, in the terminal', blurb: 'A hidden shared canvas: place one pixel at a time on a 128×128 board, see who placed what, watch strangers build a landscape together. The server keeps the peace; the visitors keep the paint.' }
    ]
  }
]

export const exhibitCount = museum.reduce((sum, wing) => sum + wing.exhibits.length, 0)
