// Static server for the generated site, used by the E2E suite. All the
// serving logic lives in static-server.mjs (shared with the resume step).

import { fileURLToPath } from 'node:url'
import { createStaticServer } from './static-server.mjs'

const root = fileURLToPath(new URL('../.output/public', import.meta.url))
const port = Number(process.env.PORT ?? 4173)

createStaticServer(root).listen(port, () => console.log(`static server on http://localhost:${port}`))
