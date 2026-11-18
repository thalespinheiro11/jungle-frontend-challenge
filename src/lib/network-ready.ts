/**
 * Readiness gate for the network layer. The UI renders immediately, while requests (Axios)
 * and the realtime socket wait for this promise. In the demo build it resolves when the
 * mock layer (MSW) is intercepting; with a real backend it is already resolved.
 *
 * It is infrastructure only — no responses, no business branches — so the app code stays
 * identical with or without mocks.
 */
let ready: Promise<void> = Promise.resolve()

export const networkReady = {
  set(promise: Promise<void>) {
    ready = promise
  },
  wait: () => ready,
}
