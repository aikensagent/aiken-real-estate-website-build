import { useState } from "react";
import heroImage from "@/assets/hero-farmhouse.jpg";
import { SiteAccountLink } from "./SiteAccountLink";

type SearchFilters = {
  beds?: string
  baths?: string
  sqft?: string
  price?: string
}

type HeroProps = {
  onSearch: (filters: SearchFilters) => void
}

export function Hero({ onSearch }: HeroProps) {
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqft, setSqft] = useState("");
  const [price, setPrice] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    const filters: SearchFilters = {
      beds: beds || undefined,
      baths: baths || undefined,
      sqft: sqft || undefined,
      price: price || undefined,
    };

    onSearch(filters);
  }

  return (
    <section className="relative w-full h-[75vh] min-h-[560px] max-h-[820px] overflow-hidden">
      <img
        src={heroImage}
        alt="Modern home with pool in Aiken"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />

      <div className="absolute inset-0 bg-black/10" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/20 to-black/65" />

      <div className="relative z-10 flex h-full flex-col items-center px-4">
        <div className="flex w-full max-w-6xl justify-end pt-4">
          <SiteAccountLink />
        </div>
        <h1 className="mt-[12%] text-center text-4xl font-semibold tracking-tight text-white drop-shadow-sm sm:text-5xl md:text-6xl">
          Find your place in Aiken.
        </h1>

        <form
          onSubmit={handleSearch}
          className="mt-10 w-full max-w-md rounded-xl bg-white/95 p-3 shadow-xl backdrop-blur-sm sm:w-auto sm:max-w-none sm:p-3"
        >
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
            <select
              value={beds}
              onChange={(e) => setBeds(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy sm:w-[5.5rem]"
            >
              <option value="">Beds</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="5">5+</option>
            </select>
            <select
              value={baths}
              onChange={(e) => setBaths(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy sm:w-[5.5rem]"
            >
              <option value="">Baths</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
            </select>
            <select
              value={sqft}
              onChange={(e) => setSqft(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy sm:w-28"
            >
              <option value="">Sq Ft</option>
              <option value="1500">1,500+</option>
              <option value="2000">2,000+</option>
              <option value="2500">2,500+</option>
              <option value="3000">3,000+</option>
            </select>
            <select
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy sm:w-28"
            >
              <option value="">Price</option>
              <option value="300000">$300k+</option>
              <option value="400000">$400k+</option>
              <option value="500000">$500k+</option>
              <option value="750000">$750k+</option>
              <option value="1000000">$1M+</option>
            </select>
            <button
              type="submit"
              className="col-span-2 rounded-lg bg-brand-navy px-5 py-2 text-sm font-medium text-white transition hover:bg-brand-navy/90 sm:col-span-1 sm:px-5"
            >
              Search
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}