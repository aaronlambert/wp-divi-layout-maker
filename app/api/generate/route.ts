import { NextResponse } from "next/server";
import { buildExportBundle, normalizePageSpec, validatePageSpec } from "@/lib/pipeline";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const normalized = normalizePageSpec(body.pageSpec);
    const { spec } = validatePageSpec(normalized);
    const artifacts = buildExportBundle(spec);
    return NextResponse.json(artifacts);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected generation error.";
    return new NextResponse(message, { status: 500 });
  }
}
