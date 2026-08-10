import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const RESO_BASE = 'https://replication.sparkapi.com/Version/3/Reso/OData/Property'
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const accessToken = Deno.env.get('SPARK_ACCESS_TOKEN')
    if (!accessToken) {
      throw new Error('SPARK_ACCESS_TOKEN secret is missing')
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    }
    const filter =
      "StandardStatus eq 'Active' and (PropertyType eq 'Residential' or PropertyType eq 'Land')"
    const select =
      'ListingKey,ListingId,UnparsedAddress,StreetNumber,StreetName,StreetSuffix,City,StateOrProvince,PostalCode,ListPrice,BedroomsTotal,BathroomsTotalInteger,BathroomsFull,BathroomsHalf,Latitude,Longitude,StandardStatus,PropertyType,PropertySubType'
    let nextUrl: string | null =
      `${RESO_BASE}?$filter=${encodeURIComponent(filter)}&$top=100&$select=${select}`
    const allRaw: any[] = []
    let page = 0
    const maxPages = 40
    while (nextUrl && page < maxPages) {
      page++
      console.log(`Fetching page ${page}`)
      const response = await fetch(nextUrl, { headers })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(`RESO API error ${response.status} on page ${page}: ${text}`)
      }
      const payload = await response.json()
      const batch = payload?.value || []
      allRaw.push(...batch)
      nextUrl = payload?.['@odata.nextLink'] || null
    }
    console.log(`Total records fetched: ${allRaw.length}`)
    let okCount = 0
    let skipCount = 0
    let errorCount = 0
    for (const item of allRaw) {
      try {
        const mlsId = item?.ListingKey || item?.ListingId
        if (!mlsId) {
          skipCount++
          continue
        }
        const lng = item?.Longitude
        const lat = item?.Latitude
        if (lng == null || lat == null) {
          skipCount++
          continue
        }
        const address =
          item.UnparsedAddress ||
          [item.StreetNumber, item.StreetName, item.StreetSuffix]
            .filter(Boolean)
            .join(' ')
            .trim() ||
          null
        let baths = item.BathroomsTotalInteger
        if (baths == null) {
          const full = item.BathroomsFull || 0
          const half = item.BathroomsHalf || 0
          baths = full + half * 0.5
        }
        const row = {
          mls_id: String(mlsId),
          address,
          city: item.City || null,
          state: item.StateOrProvince || null,
          zip_code: item.PostalCode || null,
          price: item.ListPrice ?? null,
          beds: item.BedroomsTotal ?? null,
          baths,
          coordinates: `POINT(${lng} ${lat})`,
        }
        // More defensive upsert
        const result = await supabase
          .from('listings')
          .upsert(row, { onConflict: 'mls_id' })
        if (result.error) {
          console.error('Upsert error', mlsId, result.error.message)
          errorCount++
        } else {
          okCount++
        }
      } catch (inner) {
        console.error('Row processing error', inner)
        errorCount++
      }
    }
    return new Response(
      JSON.stringify({
        success: true,
        message: 'MLS ingest completed (Residential + Land, full pagination)',
        fetched: allRaw.length,
        upserted: okCount,
        skipped: skipCount,
        errors: errorCount,
        pages: page,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (err) {
    console.error('MLS ingest failed:', err)
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})