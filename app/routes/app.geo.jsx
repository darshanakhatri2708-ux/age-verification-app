import { useState, useEffect } from "react";
import { useLoaderData, useFetcher } from "react-router";
import {
  Page,
  Card,
  Text,
  TextField,
  Button,
  BlockStack,
  InlineStack,
  RadioButton,
  Banner,
  Box,
  Divider,
  Grid,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

const POPULAR_COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IN", name: "India" },
  { code: "JP", name: "Japan" },
  { code: "BR", name: "Brazil" },
];

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

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
      overlayColor: "rgba(0, 0, 0, 0.75)",
      buttonBgColor: "#000000",
      buttonTextColor: "#ffffff",
      popupWidth: 480,
      borderRadius: 12,
      blurBackground: true,
    };
  }

  return { settings, shop };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();

  const geoMode = formData.get("geoMode") || "disabled";
  const geoCountries = formData.get("geoCountries") || "";
  const geoMessage = formData.get("geoMessage") || "Access Restricted: Store is not available in your country/region.";

  const existingSettings = await prisma.settings.findUnique({ where: { shop } });

  const settingsPayload = {
    enabled: existingSettings ? existingSettings.enabled : true,
    minAge: existingSettings ? existingSettings.minAge : 18,
    method: existingSettings ? existingSettings.method : "buttons",
    rememberDays: existingSettings ? existingSettings.rememberDays : 30,
    targetPages: existingSettings ? existingSettings.targetPages : "all",
    geoMode,
    geoCountries,
    geoMessage,
    logoUrl: existingSettings ? existingSettings.logoUrl : "",
    heading: existingSettings ? existingSettings.heading : "Age Verification Required",
    description: existingSettings ? existingSettings.description : "You must be of legal age to view this site.",
    yesButtonText: existingSettings ? existingSettings.yesButtonText : "Yes, I am 18 or older",
    noButtonText: existingSettings ? existingSettings.noButtonText : "No, I am under 18",
    redirectUrl: existingSettings ? existingSettings.redirectUrl : "https://google.com",
    bgColor: existingSettings ? existingSettings.bgColor : "#ffffff",
    textColor: existingSettings ? existingSettings.textColor : "#111111",
    overlayColor: existingSettings ? existingSettings.overlayColor : "rgba(0,0,0,0.75)",
    buttonBgColor: existingSettings ? existingSettings.buttonBgColor : "#000000",
    buttonTextColor: existingSettings ? existingSettings.buttonTextColor : "#ffffff",
    popupWidth: existingSettings ? existingSettings.popupWidth : 480,
    borderRadius: existingSettings ? existingSettings.borderRadius : 12,
    blurBackground: existingSettings ? existingSettings.blurBackground : true,
  };

  const updatedSettings = await prisma.settings.upsert({
    where: { shop },
    update: {
      geoMode,
      geoCountries,
      geoMessage,
    },
    create: {
      shop,
      ...settingsPayload,
    },
  });

  // Sync settings directly to Shop Metafields for instant Liquid access
  try {
    const shopRes = await admin.graphql(`#graphql
      query getShop {
        shop {
          id
        }
      }
    `);
    const shopJson = await shopRes.json();
    const shopId = shopJson?.data?.shop?.id;

    if (shopId) {
      await admin.graphql(
        `#graphql
        mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
            }
            userErrors {
              field
              message
            }
          }
        }`,
        {
          variables: {
            metafields: [
              {
                ownerId: shopId,
                namespace: "age_verification",
                key: "settings",
                type: "json",
                value: JSON.stringify(settingsPayload),
              },
            ],
          },
        }
      );
    }
  } catch (err) {
    console.error("Failed to sync geo settings to shop metafields:", err);
  }

  return { success: true, settings: updatedSettings };
};

export default function GeoRestrictionsSettings() {
  const { settings } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const [formState, setFormState] = useState(settings);

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Geographic restriction settings saved!");
    }
  }, [fetcher.data, shopify]);

  const handleChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const toggleCountry = (code) => {
    const currentCodes = formState.geoCountries
      ? formState.geoCountries.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean)
      : [];
    let updated;
    if (currentCodes.includes(code)) {
      updated = currentCodes.filter((c) => c !== code);
    } else {
      updated = [...currentCodes, code];
    }
    handleChange("geoCountries", updated.join(", "));
  };

  const handleSave = () => {
    const formData = new FormData();
    formData.append("geoMode", formState.geoMode);
    formData.append("geoCountries", formState.geoCountries);
    formData.append("geoMessage", formState.geoMessage);
    fetcher.submit(formData, { method: "POST" });
  };

  const isSaving = fetcher.state === "submitting" || fetcher.state === "loading";
  const selectedCountryList = formState.geoCountries
    ? formState.geoCountries.split(",").map((c) => c.trim().toUpperCase())
    : [];

  return (
    <Page
      title="Geographic Restrictions"
      subtitle="Control access to your store based on visitor country location"
      primaryAction={{
        content: "Save Geo Settings",
        onAction: handleSave,
        loading: isSaving,
      }}
    >
      <BlockStack gap="500">
        <Banner title="Location Access Control" status="info">
          <p>
            Geographic restrictions run on your storefront automatically using Shopify&apos;s country localization detection.
          </p>
        </Banner>

        <Grid>
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 7, lg: 7, xl: 7 }}>
            <BlockStack gap="500">
              {/* Geographic Restrictions Rule Card */}
              <Card padding="500">
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Restriction Mode</Text>

                  <BlockStack gap="200">
                    <RadioButton
                      label="All Countries (No geographic restriction)"
                      checked={formState.geoMode === "disabled"}
                      id="geomode-disabled"
                      name="geoMode"
                      onChange={() => handleChange("geoMode", "disabled")}
                    />
                    <RadioButton
                      label="Allow Only Selected Countries (Block everywhere else)"
                      checked={formState.geoMode === "allow"}
                      id="geomode-allow"
                      name="geoMode"
                      onChange={() => handleChange("geoMode", "allow")}
                    />
                    <RadioButton
                      label="Block Selected Countries (Allow everywhere else)"
                      checked={formState.geoMode === "block"}
                      id="geomode-block"
                      name="geoMode"
                      onChange={() => handleChange("geoMode", "block")}
                    />
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* Country Selection & Notice Card */}
              {formState.geoMode !== "disabled" && (
                <Card padding="500">
                  <BlockStack gap="400">
                    <Text variant="headingMd" as="h2">Target Countries</Text>
                    <Text variant="bodySm" tone="subdued" as="p">
                      Click popular countries or type 2-letter ISO country codes below.
                    </Text>

                    <InlineStack gap="200" wrap>
                      {POPULAR_COUNTRIES.map((c) => {
                        const isSelected = selectedCountryList.includes(c.code);
                        return (
                          <Button
                            key={c.code}
                            size="slim"
                            variant={isSelected ? "primary" : "secondary"}
                            onClick={() => toggleCountry(c.code)}
                          >
                            {c.name} ({c.code})
                          </Button>
                        );
                      })}
                    </InlineStack>

                    <TextField
                      label="Country ISO Codes (Comma separated)"
                      value={formState.geoCountries}
                      onChange={(val) => handleChange("geoCountries", val)}
                      placeholder="US, CA, GB, AU, DE, FR"
                      helpText="Enter 2-letter ISO codes (e.g. US, CA, GB, AU)"
                      autoComplete="off"
                    />

                    <Divider />

                    <TextField
                      label="Geo-Blocked Notice Message"
                      value={formState.geoMessage}
                      onChange={(val) => handleChange("geoMessage", val)}
                      multiline={3}
                      helpText="Notice text shown to visitors who try to access your store from a restricted location."
                      autoComplete="off"
                    />
                  </BlockStack>
                </Card>
              )}

              <Box paddingBlockEnd="500">
                <Button variant="primary" size="large" onClick={handleSave} loading={isSaving}>
                  Save Geo Settings
                </Button>
              </Box>
            </BlockStack>
          </Grid.Cell>

          {/* Live Preview Panel */}
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 5, lg: 5, xl: 5 }}>
            <Box position="sticky" top="100px">
              <Card padding="500">
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text variant="headingMd" as="h2">Geo-Blocked Preview</Text>
                    <Text variant="bodySm" tone="subdued" as="span">Restricted Visitor Mockup</Text>
                  </InlineStack>
                  <Divider />

                  <Box
                    style={{
                      background: formState.overlayColor || "rgba(0,0,0,0.75)",
                      backdropFilter: formState.blurBackground ? "blur(8px)" : "none",
                      padding: "30px 15px",
                      borderRadius: "8px",
                      minHeight: "380px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid #e1e3e5",
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: formState.bgColor || "#ffffff",
                        color: formState.textColor || "#111111",
                        width: "100%",
                        maxWidth: `${formState.popupWidth || 480}px`,
                        borderRadius: `${formState.borderRadius || 12}px`,
                        padding: "28px",
                        textAlign: "center",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                        boxSizing: "border-box",
                      }}
                    >
                      {formState.logoUrl ? (
                        <img
                          src={formState.logoUrl}
                          alt="Logo Preview"
                          style={{ maxHeight: "60px", marginBottom: "16px", objectFit: "contain" }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : null}

                      <h3 style={{ margin: "0 0 10px 0", fontSize: "20px", fontWeight: "bold", color: formState.textColor || "#111111" }}>
                        Access Restricted
                      </h3>
                      <p style={{ margin: "0", fontSize: "14px", lineHeight: "1.5", opacity: 0.85, color: formState.textColor || "#111111" }}>
                        {formState.geoMessage || "Access Restricted: Store is not available in your region."}
                      </p>
                    </div>
                  </Box>
                </BlockStack>
              </Card>
            </Box>
          </Grid.Cell>
        </Grid>
      </BlockStack>
    </Page>
  );
}
