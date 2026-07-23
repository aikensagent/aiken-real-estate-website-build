import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key (for writing)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // -------------------------------------------------
    // MOCK DATA – replace this block later with a real
    // RESO / MLS API call using your board credentials
    // -------------------------------------------------
    const mockListings = [
      {
        mls_id: 'MLS-AIKEN-1001',
        address: '312 Laurens St SW',
        city: 'Aiken',
        state: 'SC',
        zip_code: '29801',
        price: 475000,
        beds: 3,
        baths: 2.5,
        // Downtown Aiken
        lng: -81.7196,
        lat: 33.5604,
      },
      {
        mls_id: 'MLS-AIKEN-1002',
        address: '108 Kalmia Landing Dr',
        city: 'Aiken',
        state: 'SC',
        zip_code: '29801',
        price: 389000,
        beds: 4,
        baths: 3,
        // Kalmia Landing area
        lng: -81.7350,
        lat: 33.5450,
      },
      {
        mls_id: 'MLS-AIKEN-1003',
        address: '221 Crosland Park Rd',
        city: 'Aiken',
        state: 'SC',
        zip_code: '29801',
        price: 525000,
        beds: 3,
        baths: 2,
        // Crosland Park area
        lng: -81.7050,
        lat: 33.5750,
      },
    ]

    // Upsert the listings (insert or update on mls_id conflict)
    const results = []
    for (const listing of mockListings) {
      const { data, error } = await supabase
        .from('listings')
        .upsert(
          {
            mls_id: listing.mls_id,
            address: listing.address,
            city: listing.city,
            state: listing.state,
            zip_code: listing.zip_code,
            price: listing.price,
            beds: listing.beds,
            baths: listing.baths,
            // Convert lng/lat to geography point
            coordinates: `POINT(${listing.lng} ${listing.lat})`,
          },
          { onConflict: 'mls_id' }
        )
        .select()

      if (error) {
        console.error('Upsert error for', listing.mls_id, error.message)
        results.push({ mls_id: listing.mls_id, status: 'error', message: error.message })
      } else {
        results.push({ mls_id: listing.mls_id, status: 'ok' })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'MLS ingest completed (mock data)',
        processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (err) {
    console.error('MLS ingest failed:', err)
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})