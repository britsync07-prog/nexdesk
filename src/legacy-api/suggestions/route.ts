import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getHistoricalSuggestions, SuggestionField } from "@/lib/suggestions";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const field = searchParams.get("field") as SuggestionField;
  const query = searchParams.get("query") || searchParams.get("q") || "";

  if (!field || !["supervisedBy", "factoryName", "location", "personName"].includes(field)) {
    return NextResponse.json(
      { error: "Invalid field. Must be supervisedBy, factoryName, location, or personName" },
      { status: 400 }
    );
  }

  const suggestions = await getHistoricalSuggestions(
    session.user.id,
    field,
    query,
    10
  );

  return NextResponse.json({ suggestions });
}
