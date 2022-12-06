
export function assertNonNull<T>(value: T, msg = `Expected non null value`): asserts value is NonNull<T> {
  if (value === null) {
    throw new Error(msg)
  }
}

export type NonNull<T> = T extends null ? never : T;
export type UnwrapPromise<T> = T extends Promise<(infer R)> ? R : never
