import { contextMatrix } from '../context-matrix'
import { createInterfaceRou } from './node-a'
import type { InterfaceRou, RpcCaller } from './node-a'
import { createCompanionRou } from './node-b'
import type { CompanionDeps, CompanionRou } from './node-b'

export type RouPersonaRouter = {
  engine_contract: typeof contextMatrix.engine_contract
  interface: InterfaceRou
  companion: CompanionRou
  /**
   * Run a Companion Rou task. On connection or mutation failure the
   * Interface Rou map utilities stay available and the caller receives
   * the fallback instead of an exception.
   */
  isolateCompanion: <T>(task: () => Promise<T>, fallback: T) => Promise<T>
}

/**
 * Two-tier Rou routing layer.
 * Node A (sessionStorage + public PostGIS) and Node B (SECURITY DEFINER
 * memory RPCs) are instantiated separately so a Companion outage cannot
 * stall the public map.
 */
export function createRouPersonaRouter(opts: {
  interfaceRpc: RpcCaller
  companionDeps: CompanionDeps
}): RouPersonaRouter {
  const interfaceRou = createInterfaceRou(opts.interfaceRpc)
  const companionRou = createCompanionRou(opts.companionDeps)

  return {
    engine_contract: contextMatrix.engine_contract,
    interface: interfaceRou,
    companion: companionRou,
    async isolateCompanion(task, fallback) {
      try {
        return await task()
      } catch {
        companionRou.available = false
        return fallback
      }
    },
  }
}
