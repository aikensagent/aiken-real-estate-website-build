// src/components/LeadCaptureForm.tsx
// Phase 2 – Lead Capture Form
// Master Section 5 + PII / Consent requirements

import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { trackEvent, submitLead, type LeadFormData } from "@/lib/leadTracking";

interface LeadCaptureFormProps {
  source?: string;
  className?: string;
  defaultMessage?: string;
  heading?: string;
  description?: string;
  onSuccess?: (leadId: string) => void;
}

export function LeadCaptureForm({
  source = "website_form",
  className = "",
  defaultMessage = "",
  heading = "Get in Touch",
  description = "Tell us a little about yourself and we will follow up.",
  onSuccess,
}: LeadCaptureFormProps) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message: defaultMessage,
    consentGiven: false,
    consentEmail: false,
    consentSms: false,
  });

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    trackEvent("form_start", {
      eventData: { source },
    });
  }, [source]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);

    if (!form.consentGiven) {
      setStatus("error");
      setErrorMessage("Please provide consent to continue.");
      return;
    }

    const payload: LeadFormData = {
      firstName: form.firstName.trim() || undefined,
      lastName: form.lastName.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      source,
      consentGiven: form.consentGiven,
      consentEmail: form.consentEmail,
      consentSms: form.consentSms,
      message: form.message.trim() || undefined,
    };

    const result = await submitLead(payload);

    if (result.success && result.leadId) {
      setStatus("success");
      onSuccess?.(result.leadId);
    } else {
      setStatus("error");
      setErrorMessage(result.error ?? "Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className={`rounded-lg border border-green-200 bg-green-50 p-6 text-center ${className}`}>
        <h3 className="text-lg font-semibold text-green-800">Thank you</h3>
        <p className="mt-2 text-sm text-green-700">
          We have received your information and will be in touch shortly.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm ${className}`}
      noValidate
    >
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">{heading}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="firstName" className="text-sm font-medium">
            First Name
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            value={form.firstName}
            onChange={handleChange}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            autoComplete="given-name"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="lastName" className="text-sm font-medium">
            Last Name
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            value={form.lastName}
            onChange={handleChange}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            autoComplete="family-name"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="phone" className="text-sm font-medium">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          autoComplete="tel"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="message" className="text-sm font-medium">
          Message (optional)
        </label>
        <textarea
          id="message"
          name="message"
          rows={7}
          value={form.message}
          onChange={handleChange}
          className="w-full min-h-[160px] rounded-md border border-input bg-background px-3 py-2.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
        />
      </div>

      <div className="space-y-3 rounded-md border border-border bg-muted/40 p-4">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="consentGiven"
            checked={form.consentGiven}
            onChange={handleChange}
            className="mt-1 h-4 w-4 rounded border-input"
            required
          />
          <span>
            I consent to being contacted by Nick Williams / Coldwell Banker Best Life Realty
            regarding real estate services. <span className="text-destructive">*</span>
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="consentEmail"
            checked={form.consentEmail}
            onChange={handleChange}
            className="mt-1 h-4 w-4 rounded border-input"
          />
          <span>I agree to receive email updates about listings and market information.</span>
        </label>

        <label className="flex items-start gap-3 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="consentSms"
            checked={form.consentSms}
            onChange={handleChange}
            className="mt-1 h-4 w-4 rounded border-input"
          />
          <span>I agree to receive SMS messages (message & data rates may apply).</span>
        </label>
      </div>

      {status === "error" && errorMessage && (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting" || !form.consentGiven}
        className="w-full rounded-md bg-[var(--brand-navy,#0F2B5B)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "submitting" ? "Sending…" : "Submit"}
      </button>

      <p className="text-xs text-muted-foreground">
        We respect your privacy. Your information will never be sold.
      </p>
    </form>
  );
}