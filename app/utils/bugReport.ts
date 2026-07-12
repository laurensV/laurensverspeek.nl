// Build a prefilled GitHub "new issue" URL for the bug-report flow (terminal
// `bug` command + footer link). Pure so it's testable and reusable; the caller
// supplies the live page/viewport/version so the report carries real context.

export const BUG_REPO = 'laurensV/laurensverspeek.nl'

export interface BugContext {
  /** current path, e.g. /blog/foo */
  page: string
  /** e.g. "1280×800" */
  viewport: string
  /** the baked build hash */
  version: string
  /** navigator.userAgent */
  userAgent: string
}

/** The issue body, as GitHub-flavored markdown with a prefilled context block. */
export function bugReportBody(ctx: BugContext): string {
  return [
    '## What happened?',
    '',
    '<!-- describe the bug, and what you expected instead -->',
    '',
    '## Steps to reproduce',
    '',
    '1. ',
    '2. ',
    '',
    '---',
    '',
    '<details><summary>context (autofilled)</summary>',
    '',
    `- page: \`${ctx.page}\``,
    `- viewport: \`${ctx.viewport}\``,
    `- version: \`${ctx.version}\``,
    `- user agent: \`${ctx.userAgent}\``,
    '',
    '</details>'
  ].join('\n')
}

/** The full https://github.com/…/issues/new URL, title + body prefilled. */
export function bugReportUrl(ctx: BugContext, repo = BUG_REPO): string {
  const params = new URLSearchParams({
    title: `bug: (on ${ctx.page})`,
    labels: 'bug',
    body: bugReportBody(ctx)
  })
  return `https://github.com/${repo}/issues/new?${params.toString()}`
}
