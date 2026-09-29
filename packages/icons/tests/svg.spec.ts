// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { processSvg, SvgValidationError } from '../scripts/lib/svg.ts'

const fixture = (path: string) =>
  readFileSync(resolve(import.meta.dirname, 'fixtures', path), 'utf8')
const process = (path: string, preserveColors = false) =>
  processSvg(fixture(path), { idPrefix: 'az-test', preserveColors })
const problemsOf = (path: string): string[] => {
  try {
    process(path)
  } catch (error) {
    if (error instanceof SvgValidationError) return error.problems
    throw error
  }
  return []
}

describe('processSvg', () => {
  it('maps the fill of a single-color icon to currentColor', () => {
    const icon = process('valid/ui_Fill-only_20.svg')

    expect(icon.colorMode).toBe('mono')
    expect(icon.colors).toEqual(['#1d1d1b'])
    expect(icon.body).toContain('fill="currentColor"')
    expect(icon.body).not.toContain('#1d1d1b')
    expect(icon.body).toContain('fill-rule="evenodd"')
  })

  it('keeps stroke icons as strokes and carries the root attributes over', () => {
    const icon = process('valid/ui_stroke-only_20.svg')

    expect(icon.colorMode).toBe('mono')
    expect(icon.body).toMatch(/^<g [^>]*fill="none"/)
    expect(icon.body).toContain('stroke="currentColor"')
    expect(icon.body).toContain('stroke-width="2"')
    expect(icon.body).toContain('stroke-linecap="round"')
    expect(icon.body).toContain('<circle')
  })

  it('leaves every color of a multicolor icon untouched', () => {
    const icon = process('valid/business_multi-color_20.svg')

    expect(icon.colorMode).toBe('multi')
    expect(icon.colors).toEqual(['#000', '#003a5d', '#78be20', '#e30613'])
    expect(icon.body).toContain('fill="#e30613"')
    expect(icon.body).toContain('fill="#78be20"')
    expect(icon.body).toContain('stroke="#003a5d"')
    expect(icon.body).not.toContain('currentColor')
    // The shape without a fill relied on the default black.
    expect(icon.body).toMatch(/^<g fill="#000">/)
  })

  it('keeps the color of a single-color icon when asked to', () => {
    const icon = process('valid/ui_Fill-only_20.svg', true)

    expect(icon.colorMode).toBe('multi')
    expect(icon.body).toContain('fill="#1d1d1b"')
  })

  it('keeps opacity, which two-tone icons depend on', () => {
    expect(process('valid/media_two-tone_20.svg').body).toContain('opacity=".2"')
  })

  it('preserves the viewBox', () => {
    expect(process('valid/ui_Fill-only_24.svg').viewBox).toBe('0 0 24 24')
    expect(process('valid/product_wide_20.svg').viewBox).toBe('0 0 40 20')
  })

  it('removes clip-paths that cover the whole viewBox and prefixes the ids that remain', () => {
    const icon = process('valid/media_clipped_20.svg')

    expect(icon.body.match(/<clipPath/g)).toHaveLength(1)
    expect(icon.body).toContain('<circle')
    expect(icon.body).not.toContain('fill="#fff"')
    expect(icon.body).toMatch(/id="az-test-[^"]+"/)
    expect(icon.body).toMatch(/clip-path="url\(#az-test-[^)]+\)"/)
    expect(icon.colorMode).toBe('mono')
  })

  it('removes the root element, dimensions and namespaces from the body', () => {
    const icon = process('valid/ui_Fill-only_20.svg')

    expect(icon.body).not.toMatch(/<svg|xmlns|width=/)
  })

  it.each([
    ['invalid/ui_no-viewbox_20.svg', 'missing viewBox'],
    ['invalid/ui_scripted_20.svg', '<script> is not allowed in an icon'],
    ['invalid/ui_scripted_20.svg', 'event handler attribute "onclick" is not allowed'],
    ['invalid/ui_empty_20.svg', 'the icon has nothing to draw'],
    [
      'invalid/ui_external_20.svg',
      'external reference href="https://example.com/sprite.svg#icon" is not allowed',
    ],
  ])('rejects %s: %s', (path, problem) => {
    expect(problemsOf(path)).toContain(problem)
  })

  it('rejects a file that is not well-formed', () => {
    expect(problemsOf('invalid/ui_broken_20.svg')[0]).toMatch(/^cannot be parsed/)
  })

  it('processes the same input to the same output', () => {
    expect(process('valid/media_clipped_20.svg')).toEqual(process('valid/media_clipped_20.svg'))
  })
})
