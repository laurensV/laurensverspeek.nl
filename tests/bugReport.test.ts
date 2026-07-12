import { describe, it, expect } from 'vitest'
import { bugReportUrl, bugReportBody, BUG_REPO } from '../app/utils/bugReport'

const ctx = {
  page: '/blog/snake-in-the-terminal',
  viewport: '1280×800',
  version: 'abc1234',
  userAgent: 'Mozilla/5.0 (test)'
}

describe('bugReportBody', () => {
  it('embeds the live context in a details block', () => {
    const body = bugReportBody(ctx)
    expect(body).toContain('- page: `/blog/snake-in-the-terminal`')
    expect(body).toContain('- viewport: `1280×800`')
    expect(body).toContain('- version: `abc1234`')
    expect(body).toContain('- user agent: `Mozilla/5.0 (test)`')
    expect(body).toContain('## Steps to reproduce')
  })
})

describe('bugReportUrl', () => {
  it('targets the repo new-issue endpoint with prefilled query params', () => {
    const url = bugReportUrl(ctx)
    expect(url.startsWith(`https://github.com/${BUG_REPO}/issues/new?`)).toBe(true)
    const params = new URLSearchParams(url.split('?')[1])
    expect(params.get('labels')).toBe('bug')
    expect(params.get('title')).toBe('bug: (on /blog/snake-in-the-terminal)')
    expect(params.get('body')).toContain('1280×800')
  })

  it('accepts a custom repo', () => {
    expect(bugReportUrl(ctx, 'octocat/hello')).toContain('github.com/octocat/hello/issues/new')
  })
})
