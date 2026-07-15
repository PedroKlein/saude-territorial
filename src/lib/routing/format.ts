/**
 * PT-BR distance and duration formatting for route results.
 */

/**
 * Format distance in meters to human-readable PT-BR string.
 * - < 1000m: "350 m"
 * - >= 1000m: "1,2 km" (comma decimal, PT-BR convention)
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  // Show one decimal if not exact
  if (km % 1 === 0) {
    return `${km} km`;
  }
  return `${km.toFixed(1).replace(".", ",")} km`;
}

/**
 * Format duration in seconds to human-readable PT-BR string.
 * - < 60s: "< 1 min"
 * - < 3600s: "45 min"
 * - >= 3600s: "1h 20min" or "2h" if exact
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return "< 1 min";
  }

  const totalMinutes = Math.round(seconds / 60);

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}min`;
}
