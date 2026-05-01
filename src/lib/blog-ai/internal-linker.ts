import type { DualBlogPost } from '@/types'
import { getBlogPosts } from '@/lib/blog-api'

interface LinkTarget {
  url: string
  term: string
  priority: number
}

const PROTECTED_TAGS = ['a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code', 'pre', 'script', 'style']
const MAX_INTERNAL_LINKS = 5

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Build a list of link targets from published posts.
 * Priority: car review brand+model > category > title > slug words
 */
function buildLinkIndex(posts: DualBlogPost[], excludeSlug: string): LinkTarget[] {
  const targets: LinkTarget[] = []
  const seen = new Set<string>()

  for (const post of posts) {
    if (post.slug === excludeSlug) continue
    const url = `/blog/${post.slug}`

    if (post.post_type === 'car_review' && post.car_review) {
      const cr = post.car_review
      const brandModel = `${cr.brand} ${cr.model}`.trim()
      if (brandModel.length > 3 && !seen.has(brandModel.toLowerCase())) {
        targets.push({ term: brandModel, url, priority: 10 })
        seen.add(brandModel.toLowerCase())
      }
      if (cr.version) {
        const full = `${brandModel} ${cr.version}`.trim()
        if (!seen.has(full.toLowerCase())) {
          targets.push({ term: full, url, priority: 11 })
          seen.add(full.toLowerCase())
        }
      }
    }

    if (post.educativo?.seo_keyword) {
      const kw = post.educativo.seo_keyword.trim()
      if (kw.length > 4 && !seen.has(kw.toLowerCase())) {
        targets.push({ term: kw, url, priority: 7 })
        seen.add(kw.toLowerCase())
      }
    }
  }

  // Sort: longest term first (greedy match), then priority
  targets.sort((a, b) => b.term.length - a.term.length || b.priority - a.priority)
  return targets
}

/**
 * Replace first occurrence of each term in HTML with an internal link,
 * skipping content inside protected tags (existing links, headings, code).
 */
function linkifyHtml(html: string, targets: LinkTarget[]): { html: string; linksAdded: number } {
  if (targets.length === 0) return { html, linksAdded: 0 }

  // Build a list of [start, end] ranges for protected regions
  const protectedRanges: Array<[number, number]> = []
  for (const tag of PROTECTED_TAGS) {
    const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, 'gi')
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) !== null) {
      protectedRanges.push([m.index, m.index + m[0].length])
    }
  }

  const isProtected = (idx: number) =>
    protectedRanges.some(([s, e]) => idx >= s && idx < e)

  let result = html
  let linksAdded = 0
  const usedTerms = new Set<string>()

  for (const t of targets) {
    if (linksAdded >= MAX_INTERNAL_LINKS) break
    if (usedTerms.has(t.term.toLowerCase())) continue

    // Match whole-word, case-insensitive, with word boundaries
    const re = new RegExp(`\\b${escapeRegex(t.term)}\\b`, 'i')
    const match = re.exec(result)
    if (!match) continue
    if (isProtected(match.index)) continue

    const before = result.slice(0, match.index)
    const after = result.slice(match.index + match[0].length)
    const replacement = `<a href="${t.url}" class="blog-internal-link">${match[0]}</a>`
    result = before + replacement + after

    // Shift any protected ranges that come after this insertion
    const delta = replacement.length - match[0].length
    for (const range of protectedRanges) {
      if (range[0] > match.index) {
        range[0] += delta
        range[1] += delta
      }
    }

    linksAdded++
    usedTerms.add(t.term.toLowerCase())
  }

  return { html: result, linksAdded }
}

/**
 * Add automatic internal links to a generated post's content.
 * Returns the post (mutated copy) and a small report. Best-effort: failures
 * are swallowed and the original content is returned untouched.
 */
export async function addInternalLinks<T extends { slug: string; content: string }>(
  post: T
): Promise<{ post: T; linksAdded: number }> {
  try {
    const allPosts = await getBlogPosts({ type: 'all', limit: 200 })
    const targets = buildLinkIndex(allPosts, post.slug)
    const { html, linksAdded } = linkifyHtml(post.content, targets)
    return { post: { ...post, content: html }, linksAdded }
  } catch (err) {
    console.warn('[internal-linker] failed, returning post as-is:', err instanceof Error ? err.message : String(err))
    return { post, linksAdded: 0 }
  }
}
