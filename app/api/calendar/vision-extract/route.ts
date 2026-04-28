import { NextRequest, NextResponse } from "next/server";

type VisionPayload = {
  imageDataUrl?: string;
};

function heuristicExtract(text: string) {
  const compact = text.replace(/\s+/g, " ").trim();
  const lines = compact.split(/[\n\r]+/).map((line) => line.trim()).filter(Boolean);
  const title = lines[0]?.slice(0, 80) || "Image event";

  const timeMatch = compact.match(/\b((?:[01]?\d|2[0-3]):[0-5]\d|(?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s?(?:AM|PM))\b/i);
  const dateMatch = compact.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/);
  const addressMatch = compact.match(/\b\d{1,6}\s+[\w\s.-]+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Lane|Ln|Dr|Drive|Way|Ct|Court)\b/i);

  return {
    title,
    notes: compact,
    extractedDate: dateMatch?.[1] || "",
    extractedTime: timeMatch?.[1] || "",
    extractedLocation: addressMatch?.[0] || "",
  };
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as VisionPayload;
  if (!body.imageDataUrl) {
    return NextResponse.json({ message: "Image is required." }, { status: 400 });
  }

  const endpoint = process.env.AZURE_VISION_ENDPOINT;
  const key = process.env.AZURE_VISION_KEY;

  if (!endpoint || !key) {
    return NextResponse.json({
      provider: "mock",
      ...heuristicExtract("Uploaded image receipt/event scan"),
    });
  }

  try {
    const analyzeRes = await fetch(`${endpoint}/computervision/imageanalysis:analyze?api-version=2023-02-01-preview&features=read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": key,
      },
      body: JSON.stringify({ url: body.imageDataUrl }),
    });

    if (!analyzeRes.ok) {
      const fallback = heuristicExtract("Uploaded image receipt/event scan");
      return NextResponse.json({ provider: "fallback", ...fallback });
    }

    const data = (await analyzeRes.json()) as any;
    const lines: string[] =
      data?.readResult?.blocks?.flatMap((block: any) =>
        block?.lines?.map((line: any) => line?.text).filter(Boolean)
      ) || [];

    const extractedText = lines.join("\n");

    return NextResponse.json({
      provider: "azure-ai-vision",
      ...heuristicExtract(extractedText),
    });
  } catch {
    return NextResponse.json({
      provider: "fallback",
      ...heuristicExtract("Uploaded image receipt/event scan"),
    });
  }
}
