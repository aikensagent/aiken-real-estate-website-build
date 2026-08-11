export type GolfCourse = {
    id: string
    name: string
    lng: number
    lat: number
  }
  
  export const GOLF_COURSES: GolfCourse[] = [
    { id: 'palmetto', name: 'Palmetto Golf Club', lng: -81.7271, lat: 33.5443 },
    { id: 'aiken-golf', name: 'The Aiken Golf Club', lng: -81.7200, lat: 33.5600 },
    { id: 'houndslake', name: 'Houndslake Country Club', lng: -81.7473, lat: 33.5260 },
    { id: 'cedar-creek', name: 'Cedar Creek Golf Club', lng: -81.7800, lat: 33.4800 },
    { id: 'woodside', name: 'Woodside Plantation', lng: -81.7550, lat: 33.5050 },
    { id: 'reserve', name: 'The Reserve Club at Woodside', lng: -81.7600, lat: 33.5100 },
    { id: 'mount-vintage', name: 'Mount Vintage Golf Club', lng: -81.9630, lat: 33.6750 },
    { id: 'river', name: 'The River Golf Club', lng: -81.9622, lat: 33.4836 },
    { id: 'midland-valley', name: 'Midland Valley Country Club', lng: -81.8200, lat: 33.5600 },
  ]