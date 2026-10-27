/** A multi-value filter as one `?key=a,b` query param; left out when nothing is picked. */
export const csv = (values?: ReadonlyArray<string | number>): string | undefined => (values && values.length ? values.join(',') : undefined)
