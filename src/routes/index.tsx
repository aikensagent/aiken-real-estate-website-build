import { createFileRoute } from '@tanstack/react-router'
import Map from '../components/Map'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <img 
        src="/nick-williams-logo.jpg" 
        alt="Nick Williams - Coldwell Banker Best Life Realty" 
        className="h-24 w-auto mb-8"
      />
      <h1 className="text-5xl font-display text-brand-navy text-center">
        Welcome to Aiken Real Estate Portal
      </h1>
      <p className="text-brand-gold mt-4 text-xl">Powered by Coldwell Banker Best Life Realty</p>
      <div className="w-full max-w-5xl mt-12">
        <Map />
      </div>
    </div>
  )
}