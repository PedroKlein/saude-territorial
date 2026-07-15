/**
 * DEV-ONLY: Returns synthetic demo data for visual testing.
 *
 * Use when no Google Sheet is connected. Access via:
 *   /api/sheets?demo=true
 * or set NEXT_PUBLIC_DEMO_MODE=true in .env.local
 *
 * LGPD: All data is 100% synthetic.
 */

import { NextRequest, NextResponse } from "next/server";
import { DEMO_DATA } from "@/lib/demo-data";

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Demo data only available in development" },
      { status: 403 }
    );
  }

  return NextResponse.json({ layers: DEMO_DATA });
}
