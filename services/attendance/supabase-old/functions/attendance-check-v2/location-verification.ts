// Location Verification Module
export async function verifyLocation(
  supabase: any,
  organizationId: string,
  userLocation: { lat: number; lng: number } | undefined,
  radiusLimit: number
): Promise<{ valid: boolean; message: string; locationId: string | null }> {
  if (!userLocation) {
    return { valid: false, message: 'Location data required', locationId: null }
  }

  // Get organization locations
  const { data: locations, error } = await supabase
    .from('locations')
    .select('id, name, latitude, longitude, radius')
    .eq('organization_id', organizationId)
    .eq('is_active', true)

  if (error || !locations || locations.length === 0) {
    return { valid: false, message: 'No active locations configured', locationId: null }
  }

  // Check each location
  for (const location of locations) {
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      location.latitude,
      location.longitude
    )

    const effectiveRadius = location.radius || radiusLimit

    if (distance <= effectiveRadius) {
      return {
        valid: true,
        message: `Verified at ${location.name} (${Math.round(distance)}m away)`,
        locationId: location.id
      }
    }
  }

  // Not within any location
  const nearestLocation = locations.reduce((nearest: any, location: any) => {
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      location.latitude,
      location.longitude
    )
    
    if (!nearest || distance < nearest.distance) {
      return { ...location, distance }
    }
    return nearest
  }, null)

  return {
    valid: false,
    message: `Too far from work location. Nearest: ${nearestLocation.name} (${Math.round(nearestLocation.distance)}m away)`,
    locationId: null
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}