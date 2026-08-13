/**
 * TEMPORARY: mock data source until Supabase pivot execution.
 * See plans/pivot-cleanup.md.
 *
 * Serves synthetic demo data for the map. Replaces the former
 * /api/sheets/demo endpoint. Will be replaced by real Supabase reads
 * (via Drizzle) during pivot execution.
 *
 * LGPD: All data is 100% synthetic.
 */

import { NextResponse } from "next/server";
import { DEMO_DATA } from "@/lib/demo-data";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ layers: DEMO_DATA });
}
