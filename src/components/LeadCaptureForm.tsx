import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { trackEvent, submitLead, type LeadFormData } from '@/lib/leadTracking'

interface LeadCaptureFormProps {
  source?: string
  className?: string
  defaultMessage?: string
  heading?: string
  description?: string
  onSuccess?: (leadId: string) => void
}

export function LeadCaptureForm({
  source = 'website_form',
  className = '',
  defaultMessage = '',
  heading = 'Get in Touch',
  description = 'Tell us a little about yourself and we will follow up.',
  onSuccess,
}: LeadCaptureFormProps) {
  const fieldId = `lead-${source.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}`
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    message: defaultMessage,
    consentGiven: false,
    consentEmail: false,
    consentSms: false,
  })

  const [status, setStatus] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    trackEvent('form_start', {
      eventData: { source },
    })
  }, [source])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setErrorMessage(null)

    if (!form.consentGiven) {
      setStatus('error')
      setErrorMessage('Please provide consent to continue.')
      return
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
    }

    const result = await submitLead(payload)

    if (result.success && result.leadId) {
      setStatus('success')
      onSuccess?.(result.leadId)
    } else {
      setStatus('error')
      setErrorMessage(result.error ?? 'Something went wrong. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <div
        className={`rounded-lg border border-brand-gold bg-brand-cream p-6 text-center ${className}`}
        role="status"
      >
        <h3 className="text-lg font-semibold text-brand-navy">Thank you</h3>
        <p className="mt-2 text-sm text-brand-slate">
          We have received your information and will be in touch shortly.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-4 rounded-lg border border-brand-navy/10 bg-white p-6 shadow-sm ${className}`}
      noValidate
    >
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-brand-navy">{heading}</h3>
        <p className="text-sm text-brand-slate">{description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor={`${fieldId}-firstName`}
            className="text-sm font-medium text-brand-navy"
          >
            First Name
          </label>
          <input
            id={`${fieldId}-firstName`}
            name="firstName"
            type="text"
            value={form.firstName}
            onChange={handleChange}
            className="w-full rounded-md border border-brand-navy/20 bg-white px-3 py-2 text-sm text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            autoComplete="given-name"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={`${fieldId}-lastName`}
            className="text-sm font-medium text-brand-navy"
          >
            Last Name
          </label>
          <input
            id={`${fieldId}-lastName`}
            name="lastName"
            type="text"
            value={form.lastName}
            onChange={handleChange}
            className="w-full rounded-md border border-brand-navy/20 bg-white px-3 py-2 text-sm text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            autoComplete="family-name"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor={`${fieldId}-email`}
          className="text-sm font-medium text-brand-navy"
        >
          Email
        </label>
        <input
          id={`${fieldId}-email`}
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          className="w-full rounded-md border border-brand-navy/20 bg-white px-3 py-2 text-sm text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor={`${fieldId}-phone`}
          className="text-sm font-medium text-brand-navy"
        >
          Phone
        </label>
        <input
          id={`${fieldId}-phone`}
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          className="w-full rounded-md border border-brand-navy/20 bg-white px-3 py-2 text-sm text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          autoComplete="tel"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor={`${fieldId}-message`}
          className="text-sm font-medium text-brand-navy"
        >
          Message (optional)
        </label>
        <textarea
          id={`${fieldId}-message`}
          name="message"
          rows={7}
          value={form.message}
          onChange={handleChange}
          className="min-h-[160px] w-full resize-y rounded-md border border-brand-navy/20 bg-white px-3 py-2.5 text-sm text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
        />
      </div>

      <div className="space-y-3 rounded-md border border-brand-navy/10 bg-brand-cream p-4">
        <label className="flex items-start gap-3 text-sm text-brand-navy">
          <input
            type="checkbox"
            name="consentGiven"
            checked={form.consentGiven}
            onChange={handleChange}
            className="mt-1 h-4 w-4 rounded border-brand-navy/30"
            required
          />
          <span>
            I consent to being contacted by Nick Williams / Coldwell Banker Best
            Life Realty regarding real estate services.{' '}
            <span className="text-brand-navy">*</span>
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm text-brand-slate">
          <input
            type="checkbox"
            name="consentEmail"
            checked={form.consentEmail}
            onChange={handleChange}
            className="mt-1 h-4 w-4 rounded border-brand-navy/30"
          />
          <span>
            I agree to receive email updates about listings and market
            information.
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm text-brand-slate">
          <input
            type="checkbox"
            name="consentSms"
            checked={form.consentSms}
            onChange={handleChange}
            className="mt-1 h-4 w-4 rounded border-brand-navy/30"
          />
          <span>
            I agree to receive SMS messages (message & data rates may apply).
          </span>
        </label>
      </div>

      {status === 'error' && errorMessage && (
        <p className="text-sm text-brand-navy" role="alert">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting' || !form.consentGiven}
        className="w-full rounded-md bg-brand-navy px-4 py-2.5 text-sm font-medium text-brand-cream transition hover:bg-brand-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === 'submitting' ? 'Sending…' : 'Submit'}
      </button>

      <p className="text-xs text-brand-slate">
        We respect your privacy. Your information will never be sold.
      </p>
    </form>
  )
}
