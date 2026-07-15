/**
 * Street annotation management.
 *
 * Maps popular/informal street names to official ones.
 * Data stored in Supabase street_annotations table.
 * Currently stubbed — returns empty results until Supabase is connected.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StreetAnnotation {
  id: string;
  officialName: string;
  popularName: string;
  notes: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches all street annotations.
 * TODO: Wire to Supabase when connected.
 */
export async function getAnnotations(): Promise<StreetAnnotation[]> {
  // Stub: return empty array until Supabase client is wired
  return [];
}

/**
 * Adds a street annotation mapping popular → official name.
 * TODO: Wire to Supabase INSERT when connected.
 */
export async function addAnnotation(
  officialName: string,
  popularName: string,
  notes?: string
): Promise<void> {
  // Stub: log until Supabase is connected
  if (process.env.NODE_ENV === "development") {
    console.log(
      `[annotations] Would save: "${popularName}" → "${officialName}" (${notes ?? "sem notas"})`
    );
  }
}

/**
 * Looks up the official name for a popular/informal street name.
 * Returns null if no annotation found.
 */
export async function getOfficialName(
  popularName: string
): Promise<string | null> {
  const annotations = await getAnnotations();
  const match = annotations.find(
    (a) => a.popularName.toLowerCase() === popularName.toLowerCase()
  );
  return match?.officialName ?? null;
}
