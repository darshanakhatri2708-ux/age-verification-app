import prisma from "../db.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=60",
};

export async function loader({ request }) {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return Response.json({ error: "Missing shop parameter" }, { status: 400, headers: corsHeaders });
  }

  try {
    let settings = await prisma.settings.findUnique({
      where: { shop },
    });

    if (!settings) {
      settings = {
        enabled: true,
        minAge: 18,
        method: "buttons",
        rememberDays: 30,
        targetPages: "all",
        geoMode: "disabled",
        geoCountries: "",
        geoMessage: "Access Restricted: Store is not available in your country/region.",
        logoUrl: "",
        heading: "Age Verification Required",
        description: "You must be of legal age to view this site. Please verify your age.",
        yesButtonText: "Yes, I am 18 or older",
        noButtonText: "No, I am under 18",
        redirectUrl: "https://google.com",
        bgColor: "#ffffff",
        textColor: "#111111",
        overlayColor: "rgba(0,0,0,0.75)",
        buttonBgColor: "#000000",
        buttonTextColor: "#ffffff",
        popupWidth: 480,
        borderRadius: 12,
        blurBackground: true,
      };
    }

    return Response.json(settings, { headers: corsHeaders });
  } catch (error) {
    console.error("Error fetching age verification settings:", error);
    return Response.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}
