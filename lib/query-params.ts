export function parseQueryParams(url: string): Record<string, unknown> {
  const { searchParams } = new URL(url)
  const result: Record<string, unknown> = {}

  searchParams.forEach((value, key) => {
    const parts = key.split(/[\[\]]+/).filter(Boolean)
    let current = result
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (i === parts.length - 1) {
        current[part] = value === 'true' ? true : value === 'false' ? false : value
      } else {
        if (!current[part] || typeof current[part] !== 'object') {
          current[part] = {}
        }
        current = current[part] as Record<string, unknown>
      }
    }
  })

  return result
}
