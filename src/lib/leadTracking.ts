// src/lib/leadTracking.ts
// Phase 2 – Lead Capture & Behavioral Scoring

import { getRouVisitorKey } from "./rou/rou-session";
import { supabase } from "./supabase";

export type LeadEventType =
  | "page_view"
  | "listing_view"
  | "map_interaction"
  | "polygon_draw"
  | "form_start"
  | "form_submit"
  | "chat_open"
  | "chat_message"
  | "search"
  | "human_handoff_requested";

export interface TrackEventOptions {
  leadId?: string | null;
  sessionId?: string | null;
  pageUrl?: string;
  referrer?: string;
  eventData?: Record<string, unknown>;
}

/** Same visitor key as Rou chat and listing thumbs. */
export function getSessionId(): string {
  return getRouVisitorKey();
}

/** Track a behavioral event (anonymous or linked to a lead) */
export async function trackEvent(
  eventType: LeadEventType,
  options: TrackEventOptions = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const sessionId = options.sessionId ?? getSessionId();

    const { error } = await supabase.from("lead_events").insert({
      lead_id: options.leadId ?? null,
      session_id: sessionId,
      event_type: eventType,
      event_data: options.eventData ?? {},
      page_url:
        options.pageUrl ??
        (typeof window !== "undefined" ? window.location.href : null),
      referrer:
        options.referrer ??
        (typeof document !== "undefined" ? document.referrer : null),
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });

    if (error) {
      console.error("[leadTracking] trackEvent error:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[leadTracking] trackEvent exception:", message);
    return { success: false, error: message };
  }
}

export interface LeadFormData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  consentGiven: boolean;
  consentSms?: boolean;
  consentEmail?: boolean;
  message?: string;
}

/** Create a lead from a form submission via the secure RPC */
export async function submitLead(
  form: LeadFormData
): Promise<{ success: boolean; leadId?: string; error?: string }> {
  try {
    if (!form.consentGiven) {
      return { success: false, error: "Consent is required" };
    }

    const { data, error } = await supabase.rpc("capture_lead", {
      p_first_name: form.firstName ?? null,
      p_last_name: form.lastName ?? null,
      p_email: form.email ?? null,
      p_phone: form.phone ?? null,
      p_source: form.source ?? "website_form",
      p_utm_source: form.utmSource ?? null,
      p_utm_medium: form.utmMedium ?? null,
      p_utm_campaign: form.utmCampaign ?? null,
      p_consent_given: form.consentGiven,
      p_consent_sms: form.consentSms ?? false,
      p_consent_email: form.consentEmail ?? false,
      p_message: form.message ?? null,
      p_session_id: getSessionId(),
    });

    if (error) {
      console.error("[leadTracking] capture_lead error:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, leadId: data as string };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[leadTracking] submitLead exception:", message);
    return { success: false, error: message };
  }
}