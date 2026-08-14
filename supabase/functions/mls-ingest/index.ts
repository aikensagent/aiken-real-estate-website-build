import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const RESO_BASE = 'https://replication.sparkapi.com/Version/3/Reso/OData/Property'
function shouldRecordPriceSnapshot(
  lastPrice: number | null | undefined,
  nextPrice: number | null | undefined,
): boolean {
  if (nextPrice == null || !Number.isFinite(Number(nextPrice))) return false
  if (lastPrice == null || !Number.isFinite(Number(lastPrice))) return true
  return Number(lastPrice) !== Number(nextPrice)
}

async function recordPriceSnapshot(
  supabase: ReturnType<typeof createClient>,
  saved: { id?: string; price?: number | null } | null,
) {
  const listingId = saved?.id
  const nextPrice = saved?.price
  if (!listingId || nextPrice == null) return
  const { data: last } = await supabase
    .from('listing_price_snapshots')
    .select('list_price')
    .eq('listing_id', listingId)
    .order('observed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const lastPrice =
    last?.list_price == null ? null : Number(last.list_price)
  if (!shouldRecordPriceSnapshot(lastPrice, Number(nextPrice))) return
  const written = await supabase.from('listing_price_snapshots').insert({
    listing_id: listingId,
    list_price: nextPrice,
  })
  if (written.error) {
    console.error('Price snapshot error', listingId, written.error.message)
  }
}

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
      'ListingKey,ListingId,UnparsedAddress,StreetNumber,StreetName,StreetSuffix,City,StateOrProvince,PostalCode,ListPrice,BedroomsTotal,BathroomsTotalInteger,BathroomsFull,BathroomsHalf,Latitude,Longitude,StandardStatus,PropertyType,PropertySubType,BuildingAreaTotal,YearBuilt,LotSizeAcres,PublicRemarks,GarageSpaces,SubdivisionName,AssociationFee,AssociationFeeFrequency,Heating,Cooling,ArchitecturalStyle,ListOfficeName,PoolFeatures,FireplaceYN,FireplacesTotal,FireplaceFeatures,Roof,Flooring,Basement,ParkingFeatures,PatioAndPorchFeatures,InteriorFeatures,ExteriorFeatures,NewConstructionYN,WaterFrontYN,GarageYN,ListingContractDate,OnMarketDate'
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
          .select('id, price')
          .maybeSingle()
        if (result.error) {
          console.error('Upsert error', mlsId, result.error.message)
          errorCount++
          continue
        }
        await recordPriceSnapshot(supabase, result.data)

        const { data: existing } = await supabase
          .from('listings')
          .select('mls_data')
          .eq('mls_id', String(mlsId))
          .maybeSingle()
        const prev =
          existing?.mls_data &&
          typeof existing.mls_data === 'object' &&
          !Array.isArray(existing.mls_data)
            ? existing.mls_data
            : {}
        const facts = {
          BuildingAreaTotal: item.BuildingAreaTotal ?? item.LivingArea ?? null,
          LivingArea: item.LivingArea ?? item.BuildingAreaTotal ?? null,
          YearBuilt: item.YearBuilt ?? null,
          LotSizeAcres: item.LotSizeAcres ?? null,
          PropertySubType: item.PropertySubType ?? null,
          PublicRemarks: item.PublicRemarks ?? null,
          StoriesTotal: item.StoriesTotal ?? null,
          GarageSpaces: item.GarageSpaces ?? null,
          SubdivisionName: item.SubdivisionName ?? null,
          AssociationFee: item.AssociationFee ?? null,
          AssociationFeeFrequency: item.AssociationFeeFrequency ?? null,
          PoolPrivateYN: item.PoolPrivateYN ?? null,
          PoolFeatures: item.PoolFeatures ?? null,
          Heating: item.Heating ?? null,
          Cooling: item.Cooling ?? null,
          ArchitecturalStyle: item.ArchitecturalStyle ?? null,
          ListingId: item.ListingId ?? null,
          ListOfficeName: item.ListOfficeName ?? null,
          FireplaceYN: item.FireplaceYN ?? null,
          FireplacesTotal: item.FireplacesTotal ?? null,
          FireplaceFeatures: item.FireplaceFeatures ?? null,
          Roof: item.Roof ?? null,
          Flooring: item.Flooring ?? null,
          Basement: item.Basement ?? null,
          ParkingFeatures: item.ParkingFeatures ?? null,
          PatioAndPorchFeatures: item.PatioAndPorchFeatures ?? null,
          InteriorFeatures: item.InteriorFeatures ?? null,
          ExteriorFeatures: item.ExteriorFeatures ?? null,
          NewConstructionYN: item.NewConstructionYN ?? null,
          WaterFrontYN: item.WaterFrontYN ?? null,
          GarageYN: item.GarageYN ?? null,
          ListingContractDate: item.ListingContractDate ?? null,
          OnMarketDate: item.OnMarketDate ?? null,
        }
        const merge = await supabase
          .from('listings')
          .update({ mls_data: { ...prev, ...facts } })
          .eq('mls_id', String(mlsId))
        if (merge.error) {
          console.error('Facts merge error', mlsId, merge.error.message)
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