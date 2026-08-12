/**
 * FLOATING ORB + GHOLI PERSONA — SANDBOX ONLY
 *
 * Compatibility review (Marcus / Nadia):
 * - This module is the isolated experiment surface for an abstract floating-orb UI
 *   and a private Gholi persona draft.
 * - It must have ZERO import paths into the live homepage layout, ChatWidget,
 *   companion-chat, Node B memory factories, lead-memory, supabase, or -chat.ts.
 * - Production activation is gated by context-matrix
 *   `experiments.floating_orb.enabled` (default false). While disabled, the
 *   platform must keep rendering `src/components/ChatWidget.tsx`.
 *
 * Do not import this file from production UI routes until a dedicated wiring
 * turn flips the kill-switch after private conversion testing.
 */

export const FLOATING_ORB_EXPERIMENT_ID = 'floating_orb_gholi_v0' as const

export const FLOATING_ORB_FORBIDDEN_LIVE_MODULES = [
  'src/routes/index.tsx',
  'src/components/ChatWidget.tsx',
  'src/components/Map.tsx',
  'src/lib/rou/companion-chat.ts',
  'src/lib/rou/live.ts',
  'src/lib/rou/node-a.ts',
  'src/lib/rou/node-b.ts',
  'src/lib/lead-memory.ts',
  'src/lib/supabase.ts',
  'src/routes/api/-chat.ts',
] as const

export type FloatingOrbSandboxSurface = {
  experiment_id: typeof FLOATING_ORB_EXPERIMENT_ID
  ui_metaphor: 'floating_orb'
  spoken_persona: 'Gholi'
  memory_binding: 'none_in_sandbox'
  live_chat_fallback: 'src/components/ChatWidget.tsx'
  requires_kill_switch_off_default: true
}

/**
 * Private experimental spoken profile for sandbox review only.
 * Not injected into CORE_SYSTEM_PROMPT / -chat.ts while the kill-switch is off.
 * Must not call or describe live personal_notes RPC wiring from this file.
 */
export const SANDBOX_GHOLI_ORB_PERSONA_DRAFT = `SANDBOX DRAFT — not live.
You are Gholi in a private floating-orb UI experiment for Best Life Realty.
This draft must never be served to production buyers while
experiments.floating_orb.enabled is false.
Do not read or write personal_notes, conversation_summaries, or any Supabase
memory table from this sandbox surface.
Keep Fair Housing refusal intact. Hand showings, offers, and contracts to Nick.
When the experiment is rejected, operators flip experiments.floating_orb.enabled
to false and the platform returns to ChatWidget with zero orb UI.`

export const floatingOrbSandboxSurface: FloatingOrbSandboxSurface = {
  experiment_id: FLOATING_ORB_EXPERIMENT_ID,
  ui_metaphor: 'floating_orb',
  spoken_persona: 'Gholi',
  memory_binding: 'none_in_sandbox',
  live_chat_fallback: 'src/components/ChatWidget.tsx',
  requires_kill_switch_off_default: true,
}

/**
 * Structural gate used by tests and future private harnesses.
 * Production routes must not call this to choose UI until a wiring turn
 * explicitly opts in after conversion-safe testing.
 * Only import statements are blocked — documenting forbidden RPC names is allowed.
 */
export function assertFloatingOrbSandboxIsolation(source: string): void {
  const banned = [
    /from\s+['"][^'"]*ChatWidget['"]/,
    /from\s+['"][^'"]*companion-chat['"]/,
    /from\s+['"][^'"]*lead-memory['"]/,
    /from\s+['"][^'"]*supabase['"]/,
    /from\s+['"][^'"]*rou\/live['"]/,
    /from\s+['"][^'"]*rou\/node-a['"]/,
    /from\s+['"][^'"]*rou\/node-b['"]/,
    /from\s+['"][^'"]*\/-chat['"]/,
    /from\s+['"][^'"]*gholi-persona['"]/,
    /\.rpc\s*\(\s*['"]get_lead_memory['"]/,
    /\.rpc\s*\(\s*['"]upsert_personal_note['"]/,
    /\.rpc\s*\(\s*['"]save_conversation_summary['"]/,
  ]
  for (const pattern of banned) {
    if (pattern.test(source)) {
      throw new Error(
        `Floating-orb sandbox isolation breach: matched ${pattern}`
      )
    }
  }
}
