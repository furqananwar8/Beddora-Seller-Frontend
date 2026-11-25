/** Runs `worker` over `items`, at most `limit` at a time; a worker's failure is its own to handle. */
export async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let next = 0
  const lane = async () => {
    while (next < items.length) await worker(items[next++])
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane))
}
