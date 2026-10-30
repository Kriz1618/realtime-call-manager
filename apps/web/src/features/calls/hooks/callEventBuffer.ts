import type { CallDto } from '@rcm/contracts';

const PROCESS_INTERVAL_MS = 500;

export type BufferedCallEvent =
  | { kind: 'created'; call: CallDto }
  | { kind: 'updated'; call: CallDto };

export class CallEventBuffer {
  private readonly queue: BufferedCallEvent[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;
  private disposed = false;
  private readonly process: (event: BufferedCallEvent) => void;

  constructor(process: (event: BufferedCallEvent) => void) {
    this.process = process;
  }

  enqueue(event: BufferedCallEvent): void {
    if (this.disposed) return;

    if (event.kind === 'updated') {
      const previousUpdate = this.queue.findIndex(
        (queued) => queued.kind === 'updated' && queued.call.id === event.call.id,
      );
      if (previousUpdate !== -1) this.queue.splice(previousUpdate, 1);
    }

    this.queue.push(event);
    if (this.timer === undefined) this.processNext();
  }

  clear(): void {
    this.queue.length = 0;
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
  }

  dispose(): void {
    this.clear();
    this.disposed = true;
  }

  private processNext(): void {
    const event = this.queue.shift();
    if (!event || this.disposed) return;

    this.process(event);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.processNext();
    }, PROCESS_INTERVAL_MS);
  }
}
