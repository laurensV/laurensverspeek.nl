import { buildJsonResume } from '../../app/utils/resume'

// Prerendered JSON Resume (jsonresume.org schema v1). The shape is built in a
// shared util so /resume.json and the terminal `jq` command stay in sync.
export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'application/json; charset=utf-8')
  return buildJsonResume()
})
