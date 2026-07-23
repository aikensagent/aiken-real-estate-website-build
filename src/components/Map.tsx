import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import { supabase } from '../lib/supabase'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

export default function Map() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const draw = useRef<MapboxDraw | null>(null)
  const [showDrawHelp, setShowDrawHelp] = useState(false)

  useEffect(() => {
    if (map.current || !mapContainer.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-81.7196, 33.5604], // Aiken, SC
      zoom: 12,
      // Prevent the map from stealing drag events while drawing
      dragPan: true,
    })

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    map.current.on('load', () => {
      if (!map.current) return

      draw.current = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          trash: true,
        },
        defaultMode: 'simple_select',
        // Better touch / pointer behavior
        touchEnabled: true,
        boxSelect: false,
      })

      map.current.addControl(draw.current, 'top-left')
      map.current.resize()

      // Disable map drag while actively drawing so the hand does not take over
      map.current.on('draw.modechange', (e: any) => {
        if (e.mode === 'draw_polygon') {
          setShowDrawHelp(true)
          map.current!.dragPan.disable()
        } else {
          setShowDrawHelp(false)
          map.current!.dragPan.enable()
        }
      })

      map.current.on('draw.create', () => {
        setShowDrawHelp(false)
        map.current!.dragPan.enable()
        if (!draw.current) return
        const data = draw.current.getAll()
        if (data.features.length > 0) {
          console.log('Current drawn polygon:', data.features[0].geometry)
        }
      })

      map.current.on('draw.update', () => {
        if (!draw.current) return
        const data = draw.current.getAll()
        if (data.features.length > 0) {
          console.log('Current drawn polygon:', data.features[0].geometry)
        }
      })

      map.current.on('draw.delete', () => {
        console.log('Polygon deleted')
        setShowDrawHelp(false)
        map.current!.dragPan.enable()
      })
    })

    // Viewport tracking
    map.current.on('moveend', () => {
      if (!map.current) return
      const bounds = map.current.getBounds()
      console.log('Current viewport bounds:', {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      })
    })

    const addMarkers = (listings: any[]) => {
      listings.forEach((listing) => {
        if (listing.lng == null || listing.lat == null) return

        new mapboxgl.Marker({ color: '#0F2B5B' })
          .setLngLat([listing.lng, listing.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(`
              <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 180px;">
                <div style="font-size: 15px; font-weight: 700; color: #0F2B5B; margin-bottom: 4px;">
                  ${listing.address || 'Aiken Listing'}
                </div>
                <div style="font-size: 14px; font-weight: 600; color: #C9A84C; margin-bottom: 6px;">
                  $${Number(listing.price || 0).toLocaleString()}
                </div>
                <div style="font-size: 13px; color: #1E1E2E;">
                  ${listing.beds || 0} bed · ${listing.baths || 0} bath
                </div>
              </div>
            `)
          )
          .addTo(map.current!)
      })
    }

    const loadListings = async () => {
      try {
        const { data, error } = await supabase.rpc('get_listings_with_coords')

        if (error) {
          console.warn('Supabase RPC error:', error.message)
          return
        }

        if (!data || data.length === 0) {
          console.log('No listings found')
          return
        }

        console.log(`Loaded ${data.length} real listings with clean coordinates`)
        addMarkers(data)
      } catch (err) {
        console.warn('Error loading listings', err)
      }
    }

    loadListings()

    return () => {
      map.current?.remove()
    }
  }, [])

  return (
    <div className="relative w-full h-full min-h-[500px]">
      <div
        ref={mapContainer}
        className="w-full h-full min-h-[500px] rounded-lg"
      />

      {showDrawHelp && (
        <div className="absolute top-14 left-3 z-10 bg-brand-navy text-white text-sm px-4 py-2 rounded-md shadow-lg max-w-xs">
          <strong>Draw a search area</strong>
          <br />
          Click to add points · Double-click to finish · Trash to delete
        </div>
      )}
    </div>
  )
}
