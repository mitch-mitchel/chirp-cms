/**
 * Decode HTML entities in text
 *
 * Use this utility to decode HTML entities like &rsquo; &amp; etc.
 * in excerpts and other text content from the API
 *
 * @param text - Text containing HTML entities
 * @returns Decoded text
 *
 * @example
 * ```ts
 * const text = "can&rsquo;t"
 * const decoded = decodeHtmlEntities(text)
 * console.log(decoded) // "can't"
 * ```
 */
export function decodeHtmlEntities(text: string | null | undefined): string {
  if (!text) return ''

  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&rsquo;': '\u2019', // '
    '&lsquo;': '\u2018', // '
    '&rdquo;': '\u201D', // "
    '&ldquo;': '\u201C', // "
    '&nbsp;': ' ',
    '&mdash;': '\u2014', // —
    '&ndash;': '\u2013', // –
    '&hellip;': '\u2026', // …
    '&copy;': '\u00A9', // ©
    '&reg;': '\u00AE', // ®
    '&trade;': '\u2122', // ™
    '&bull;': '\u2022', // •
    '&deg;': '\u00B0', // °
    '&para;': '\u00B6', // ¶
    '&sect;': '\u00A7', // §
    '&euro;': '\u20AC', // €
    '&pound;': '\u00A3', // £
    '&yen;': '\u00A5', // ¥
  }

  let decoded = text

  // Replace known entities
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char)
  }

  // Decode numeric entities (&#123; or &#x7B;)
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) =>
    String.fromCharCode(parseInt(dec, 10))
  )
  decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (match, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  )

  return decoded
}

/**
 * React hook to decode HTML entities
 *
 * @example
 * ```tsx
 * function ArticleCard({ article }) {
 *   const decodedExcerpt = useDecodeHtmlEntities(article.excerpt)
 *   return <p>{decodedExcerpt}</p>
 * }
 * ```
 */
export function useDecodeHtmlEntities(text: string | null | undefined): string {
  return decodeHtmlEntities(text)
}
