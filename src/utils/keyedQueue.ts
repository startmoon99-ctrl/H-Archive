/** 같은 대상의 쓰기만 직렬화한다. 실패한 작업 뒤에도 다음 작업은 실행한다. */
export function createKeyedQueue() {
  const pending = new Map<string, Promise<unknown>>()
  return {
    run<T>(key: string, work: () => Promise<T>): Promise<T> {
      const previous = pending.get(key) ?? Promise.resolve()
      const result = previous.catch(() => undefined).then(work)
      pending.set(key, result)
      void result.finally(() => {
        if (pending.get(key) === result) pending.delete(key)
      }).catch(() => undefined)
      return result
    },
    async drain(): Promise<void> {
      await Promise.allSettled(pending.values())
    },
  }
}
