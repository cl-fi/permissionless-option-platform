import init from '@mysten/move-bytecode-template'

/** Browser WASM must be initialized once before patching bytecode. */
let ready: Promise<void> | null = null

export function ensureBytecodeTemplateReady(): Promise<void> {
  if (!ready) {
    ready = Promise.resolve(init()).then(() => undefined)
  }
  return ready
}
