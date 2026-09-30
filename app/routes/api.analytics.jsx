import prisma from "../db.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function loader() {
  return Response.json({ status: "Analytics endpoint active" }, { headers: corsHeaders });
}

export async function action({ request }) {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let payload = {};
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      payload = await request.json();
    } else {
      const text = await request.text();
      try {
        payload = JSON.parse(text);
      } catch (e) {
        payload = {};
      }
    }

    const shop = payload.shop || new URL(request.url).searchParams.get("shop");
    const event = payload.event === "rejected" ? "rejected" : "verified";
    const device = payload.device || "desktop";
    const country = (payload.country || "US").toUpperCase();

    if (!shop) {
      return Response.json({ error: "Missing shop parameter" }, { status: 400, headers: corsHeaders });
    }

    await prisma.analyticsEvent.create({
      data: {
        shop,
        event,
        device,
        country,
      },
    });

    return Response.json({ ok: true }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error logging analytics event:", error);
    return Response.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}
