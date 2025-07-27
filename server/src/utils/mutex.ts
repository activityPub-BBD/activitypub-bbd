import { Mutex as AsyncMutex } from 'async-mutex';

export class Mutex<T> {
  private mutex = new AsyncMutex();
  private value: T;

  constructor(initial: T) {
    this.value = initial;
  }

  async with<R>(fn: (val: T) => Promise<R> | R): Promise<R> {
    return this.mutex.runExclusive(() => fn(this.value));
  }
}
