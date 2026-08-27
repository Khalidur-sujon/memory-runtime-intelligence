export class InstrumentationScope {
  private internalDepth = 0;

  enterInternal(): void {
    this.internalDepth++;
  }

  exitInternal(): void {
    if (this.internalDepth === 0) {
      return;
    }

    this.internalDepth--;
  }

  isInternal(): boolean {
    return this.internalDepth > 0;
  }
}
