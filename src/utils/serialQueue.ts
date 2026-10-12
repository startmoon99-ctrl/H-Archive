/** 작업을 한 번에 하나씩 차례로 처리한다. 실패한 작업은 건너뛰고 다음으로 넘어간다. */
export function createSerialQueue<T>(worker: (job: T) => Promise<void>): (job: T) => void {
  const jobs: T[] = []
  let running = false

  async function run(): Promise<void> {
    if (running) return
    running = true
    for (let job = jobs.shift(); job !== undefined; job = jobs.shift()) {
      try {
        await worker(job)
      } catch (error) {
        console.warn('[queue] 작업 실패', error)
      }
    }
    running = false
  }

  return (job) => {
    jobs.push(job)
    void run()
  }
}
