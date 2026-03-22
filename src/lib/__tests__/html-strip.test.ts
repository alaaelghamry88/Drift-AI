import { describe, it, expect } from 'vitest'
import { stripHtml } from '@/lib/html-strip'

describe('stripHtml', () => {
  it('removes script blocks including their content', () => {
    const html = '<p>Hello</p><script>alert("xss")</script>'
    expect(stripHtml(html)).toBe('Hello')
  })

  it('removes style blocks including their content', () => {
    const html = '<p>Hello</p><style>.foo { color: red }</style>'
    expect(stripHtml(html)).toBe('Hello')
  })

  it('removes remaining HTML tags', () => {
    const html = '<h1>Title</h1><p>Body text here.</p>'
    expect(stripHtml(html)).toBe('Title Body text here.')
  })

  it('collapses multiple whitespace into single spaces', () => {
    const html = '<p>Hello   world</p>\n\n<p>Foo</p>'
    expect(stripHtml(html)).toBe('Hello world Foo')
  })

  it('truncates to 3000 characters', () => {
    const html = '<p>' + 'a'.repeat(4000) + '</p>'
    expect(stripHtml(html).length).toBe(3000)
  })

  it('returns empty string for empty input', () => {
    expect(stripHtml('')).toBe('')
  })
})
