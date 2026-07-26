import { createFileRoute } from '@tanstack/react-router'
import Map from '../components/Map'
import { LeadCaptureForm } from '../components/LeadCaptureForm'
import { ChatWidget } from '../components/ChatWidget'


export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-8">
      <img
        src="/nick-williams-logo.jpg"
        alt="Nick Williams - Coldwell Banker Best Life Realty"
        className="h-24 w-auto mb-8"
      />
      <h1 className="text-5xl font-display text-brand-navy text-center">
        Welcome to Aiken Real Estate Portal
      </h1>
      <p className="text-brand-gold mt-4 text-xl">
        Powered by Coldwell Banker Best Life Realty
      </p>

      {/* Map */}
      <div className="w-full max-w-5xl mt-12">
        <Map />
      </div>

       {/* Lead Capture Form */}
       <div className="w-full max-w-xl mt-12 mb-16">
        <LeadCaptureForm source="homepage" />
      </div>

      <ChatWidget />
    </div>
  )
}