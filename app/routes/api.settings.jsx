import prisma from "../db.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=60",
};

const AUTO_TRANSLATIONS = {
  es: {
    heading: "Verificación de Edad Requerida",
    description: "Debes tener la edad legal para ver este sitio. Por favor verifica tu edad.",
    yesButtonText: "Sí, tengo 18 años o más",
    noButtonText: "No, soy menor de 18",
    termsText: "Acepto los Términos y Condiciones",
    geoMessage: "Acceso restringido: Tienda no disponible en tu región.",
  },
  fr: {
    heading: "Vérification de l'Âge Requise",
    description: "Vous devez avoir l'âge légal pour afficher ce site. Veuillez vérifier votre âge.",
    yesButtonText: "Oui, j'ai 18 ans ou plus",
    noButtonText: "Non, j'ai moins de 18 ans",
    termsText: "J'accepte les Conditions Générales",
    geoMessage: "Accès restreint : Boutique non disponible dans votre région.",
  },
  de: {
    heading: "Altersverifikation Erforderlich",
    description: "Sie müssen das gesetzliche Mindestalter erreicht haben, um diese Seite zu sehen.",
    yesButtonText: "Ja, ich bin 18 oder älter",
    noButtonText: "Nein, unter 18 Jahren",
    termsText: "Ich stimme den AGB zu",
    geoMessage: "Zugriff eingeschränkt: Shop in Ihrer Region nicht verfügbar.",
  },
  it: {
    heading: "Verifica dell'Età Richiesta",
    description: "Devi essere maggiorenne per visualizzare questo sito. Per favore verifica la tua età.",
    yesButtonText: "Sì, ho 18 anni o più",
    noButtonText: "No, ho meno di 18 anni",
    termsText: "Accetto i Termini e Condizioni",
    geoMessage: "Accesso limitato: Negozio non disponibile nella tua regione.",
  },
  pt: {
    heading: "Verificação de Idade Necessária",
    description: "Você deve ter a idade legal para visualizar este site. Por favor verifique sua idade.",
    yesButtonText: "Sim, tenho 18 anos ou mais",
    noButtonText: "Não, sou menor de 18",
    termsText: "Concordo com os Termos e Condições",
    geoMessage: "Acesso restrito: Loja não disponível na sua região.",
  },
  ja: {
    heading: "年齢確認が必要です",
    description: "このサイトを閲覧するには法的年齢を満たしている必要があります。年齢を確認してください。",
    yesButtonText: "はい、18歳以上です",
    noButtonText: "いいえ、18歳未満です",
    termsText: "利用規約に同意します",
    geoMessage: "アクセス制限：お住まいの地域ではご利用いただけません。",
  },
  nl: {
    heading: "Leeftijdsverificatie Vereist",
    description: "Je moet de wettelijke leeftijd hebben om deze site te bekijken.",
    yesButtonText: "Ja, ik ben 18 jaar of ouder",
    noButtonText: "Nee, ik ben jonger dan 18",
    termsText: "Ik ga akkoord met de Algemene Voorwaarden",
    geoMessage: "Toegang beperkt: Winkel niet beschikbaar in uw regio.",
  },
  hi: {
    heading: "आयु सत्यापन आवश्यक है",
    description: "इस साइट को देखने के लिए आपकी कानूनी आयु होनी चाहिए। कृपया अपनी आयु सत्यापित करें।",
    yesButtonText: "हाँ, मेरी आयु 18 वर्ष या अधिक है",
    noButtonText: "नहीं, मेरी आयु 18 वर्ष से कम है",
    termsText: "मैं नियमों और शर्तों से सहमत हूँ",
    geoMessage: "पहुँच प्रतिबंधित: दुकान आपके क्षेत्र में उपलब्ध नहीं है।",
  },
  ar: {
    heading: "التحقق من العمر مطلوب",
    description: "يجب أن تكون في السن القانونية لعرض هذا الموقع. يرجى تأكيد عمرك.",
    yesButtonText: "نعم، عمري 18 عامًا أو أكثر",
    noButtonText: "لا، عمري أقل من 18 عامًا",
    termsText: "أوافق على الشروط والأحكام",
    geoMessage: "الوصول محظور: المتجر غير متوفر في منطقتك.",
  },
  zh: {
    heading: "需要年龄验证",
    description: "您必须达到法定年龄才能查看此网站。请验证您的年龄。",
    yesButtonText: "是的，我已年满18岁",
    noButtonText: "不，我未满18岁",
    termsText: "我同意条款与条件",
    geoMessage: "访问受限：您所在的地区无法使用此商店。",
  },
};

const COUNTRY_TO_LANG = {
  es: ["es", "mx", "co", "ar", "cl", "pe", "ve", "gt", "ec", "cu", "bo", "do", "hn", "py", "sv", "ni", "cr", "pr"],
  fr: ["fr", "be", "ca", "ch", "lu", "mc"],
  de: ["de", "at", "ch", "li"],
  it: ["it", "sm", "va"],
  pt: ["pt", "br", "ao", "mz"],
  ja: ["jp"],
  nl: ["nl", "be", "sr"],
  hi: ["in"],
  ar: ["sa", "ae", "eg", "qa", "kw", "om", "bh", "jo", "lb", "iq", "ma", "dz", "tn"],
  zh: ["cn", "tw", "hk", "sg"],
};

export async function loader({ request }) {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const country = (url.searchParams.get("country") || "").toLowerCase();
  const locale = (url.searchParams.get("locale") || "").toLowerCase();

  const cfCountry = (
    request.headers.get("CF-IPCountry") ||
    request.headers.get("x-country-code") ||
    request.headers.get("cloudfront-viewer-country") ||
    ""
  ).toLowerCase();

  const effectiveCountry = country || (cfCountry !== "xx" ? cfCountry : "");

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
        enableTerms: false,
        termsPlacement: "both",
        termsText: "I agree to the Terms & Conditions",
        termsLink: "/policies/terms-of-service",
        termsRequired: true,
        autoTranslate: true,
        translations: "{}",
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

    let payload = { ...settings };

    if (payload.autoTranslate !== false) {
      let matchedLang = null;

      if (effectiveCountry) {
        for (const [lang, countries] of Object.entries(COUNTRY_TO_LANG)) {
          if (countries.includes(effectiveCountry)) {
            matchedLang = lang;
            break;
          }
        }
      }

      if (!matchedLang && locale) {
        const shortLocale = locale.split("-")[0];
        if (AUTO_TRANSLATIONS[shortLocale]) {
          matchedLang = shortLocale;
        }
      }

      if (matchedLang && AUTO_TRANSLATIONS[matchedLang]) {
        const tr = AUTO_TRANSLATIONS[matchedLang];
        payload.heading = tr.heading;
        payload.description = tr.description;
        payload.yesButtonText = tr.yesButtonText;
        payload.noButtonText = tr.noButtonText;
        payload.termsText = tr.termsText;
        payload.geoMessage = tr.geoMessage;
      }
    }

    return Response.json(payload, { headers: corsHeaders });
  } catch (error) {
    console.error("Error fetching age verification settings:", error);
    return Response.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}
