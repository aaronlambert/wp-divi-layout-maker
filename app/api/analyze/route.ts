import { NextResponse } from "next/server";
import { generateFromImage } from "@/lib/pipeline";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("mockup");

    if (!(file instanceof File)) {
      return new NextResponse("Expected form field 'mockup' with an image file.", { status: 400 });
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      return new NextResponse("Unsupported file type. Use PNG, JPG, or WebP.", { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const imageDataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

    const artifacts = await generateFromImage(imageDataUrl);
    return NextResponse.json(artifacts);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected analysis error.";
    return new NextResponse(message, { status: 500 });
  }
}
