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
    title: title === "Image event" ? "" : title,
    notes: compact,
    extractedDate: dateMatch?.[1] || "",
    extractedTime: timeMatch?.[1] || "",
    extractedLocation: addressMatch?.[0] || "",
    isReliable: Boolean(dateMatch?.[1] && timeMatch?.[1] && addressMatch?.[0]),
  };
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as VisionPayload;
  if (!body.imageDataUrl) {
    return NextResponse.json({ message: "Image is required." }, { status: 400 });
  }

  const endpoint = process.env.AZURE_VISION_ENDPOINT;
  const key = process.env.OPENAI_API_KEY;

  if (!key) {
    return NextResponse.json({
      provider: "mock",
      ...heuristicExtract(""),
    });
  }

  try {
    const analyzeRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: "Extract US flyer event details. Return compact JSON keys: title, extractedDate(YYYY-MM-DD), extractedTime(HH:mm or empty), extractedLocation, notes, durationMinutes(number), isReliable(boolean). If uncertain, leave fields empty and isReliable false."
              },
              {
                type: "input_image",
                image_url: body.imageDataUrl
              }
            ]
          }
        ]
      }),
    });

    if (!analyzeRes.ok) {
      const fallback = heuristicExtract("");
      return NextResponse.json({ provider: "fallback", ...fallback });
    }

    const data = (await analyzeRes.json()) as any;
    const raw = data?.output_text || "";
    const parsed = JSON.parse(raw || "{}");

    return NextResponse.json({
      provider: "openai-vision",
      title: parsed.title || "",
      notes: parsed.notes || "",
      extractedDate: parsed.extractedDate || "",
      extractedTime: parsed.extractedTime || "",
      extractedLocation: parsed.extractedLocation || "",
      durationMinutes: Number(parsed.durationMinutes || 0),
      isReliable: Boolean(parsed.isReliable),
    });
  } catch {
    return NextResponse.json({
      provider: "fallback",
      ...heuristicExtract(""),
    });
  }
}
