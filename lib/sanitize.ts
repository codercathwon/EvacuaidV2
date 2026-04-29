export function sanitizeText(input: string): string {
  return input
    .slice(0, 1000)
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .trim()
}
