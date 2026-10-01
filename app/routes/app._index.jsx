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
  Checkbox,
  Select,
  Banner,
  Box,
  Divider,
  Grid,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

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
      rememberOption: "30",
      reverifyOnClose: false,
      targetPages: "all",
      geoMode: "disabled",
      geoCountries: "",
      geoMessage: "Access Restricted: Store is not available in your country/region.",
      enableTerms: false,
      termsPlacement: "both",
      termsText: "I agree to the Terms & Conditions",
      termsLink: "/policies/terms-of-service",
      termsRequired: true,
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

  const enabled = formData.get("enabled") === "true";
  const minAge = parseInt(formData.get("minAge") || "18", 10);
  const method = formData.get("method") || "buttons";
  const rememberOption = formData.get("rememberOption") || "30";
  const reverifyOnClose = formData.get("reverifyOnClose") === "true";
  let rememberDays = parseInt(formData.get("rememberDays") || "30", 10);

  if (rememberOption === "session") rememberDays = 0;
  else if (rememberOption === "1") rememberDays = 1;
  else if (rememberOption === "7") rememberDays = 7;
  else if (rememberOption === "30") rememberDays = 30;
  else if (rememberOption === "90") rememberDays = 90;
  else if (rememberOption === "365") rememberDays = 365;
  else if (rememberOption === "forever") rememberDays = 3650;

  const targetPages = formData.get("targetPages") || "all";
  const enableTerms = formData.get("enableTerms") === "true";
  const termsPlacement = formData.get("termsPlacement") || "both";
  const termsText = formData.get("termsText") || "I agree to the Terms & Conditions";
  const termsLink = formData.get("termsLink") || "/policies/terms-of-service";
  const termsRequired = formData.get("termsRequired") === "true";

  const logoUrl = formData.get("logoUrl") || "";
  const heading = formData.get("heading") || "Age Verification Required";
  const description = formData.get("description") || "";
  const yesButtonText = formData.get("yesButtonText") || "Yes, I am 18 or older";
  const noButtonText = formData.get("noButtonText") || "No, I am under 18";
  const redirectUrl = formData.get("redirectUrl") || "https://google.com";
  const bgColor = formData.get("bgColor") || "#ffffff";
  const textColor = formData.get("textColor") || "#111111";
  const overlayColor = formData.get("overlayColor") || "rgba(0,0,0,0.75)";
  const buttonBgColor = formData.get("buttonBgColor") || "#000000";
  const buttonTextColor = formData.get("buttonTextColor") || "#ffffff";
  const popupWidth = parseInt(formData.get("popupWidth") || "480", 10);
  const borderRadius = parseInt(formData.get("borderRadius") || "12", 10);
  const blurBackground = formData.get("blurBackground") === "true";

  const existingSettings = await prisma.settings.findUnique({ where: { shop } });

  let currentTranslations = {};
  try {
    currentTranslations = JSON.parse((existingSettings && existingSettings.translations) || "{}");
  } catch (e) {
    currentTranslations = {};
  }

  const autoTranslate = formData.get("autoTranslate") === "true";

  const settingsPayload = {
    enabled,
    minAge,
    method,
    rememberDays,
    rememberOption,
    reverifyOnClose,
    targetPages,
    geoMode: existingSettings ? existingSettings.geoMode : "disabled",
    geoCountries: existingSettings ? existingSettings.geoCountries : "",
    geoMessage: existingSettings ? existingSettings.geoMessage : "Access Restricted: Store is not available in your country/region.",
    enableTerms,
    termsPlacement,
    termsText,
    termsLink,
    termsRequired,
    autoTranslate,
    logoUrl,
    heading,
    description,
    yesButtonText,
    noButtonText,
    redirectUrl,
    bgColor,
    textColor,
    overlayColor,
    buttonBgColor,
    buttonTextColor,
    popupWidth,
    borderRadius,
    blurBackground,
    translations: currentTranslations,
  };

  const updatedSettings = await prisma.settings.upsert({
    where: { shop },
    update: {
      enabled,
      minAge,
      method,
      rememberDays,
      rememberOption,
      reverifyOnClose,
      targetPages,
      enableTerms,
      termsPlacement,
      termsText,
      termsLink,
      termsRequired,
      logoUrl,
      heading,
      description,
      yesButtonText,
      noButtonText,
      redirectUrl,
      bgColor,
      textColor,
      overlayColor,
      buttonBgColor,
      buttonTextColor,
      popupWidth,
      borderRadius,
      blurBackground,
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
    console.error("Failed to sync settings to shop metafields:", err);
  }

  return { success: true, settings: updatedSettings };
};

export default function AgeVerificationSettings() {
  const { settings } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const [formState, setFormState] = useState(settings);

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Age verification settings saved!");
    }
  }, [fetcher.data, shopify]);

  const handleChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleRememberOptionChange = (value) => {
    let days = 30;
    if (value === "session") days = 0;
    else if (value === "1") days = 1;
    else if (value === "7") days = 7;
    else if (value === "30") days = 30;
    else if (value === "90") days = 90;
    else if (value === "365") days = 365;
    else if (value === "forever") days = 3650;

    setFormState((prev) => ({
      ...prev,
      rememberOption: value,
      rememberDays: days,
      reverifyOnClose: value === "session" ? true : prev.reverifyOnClose,
    }));
  };

  const handleSave = () => {
    const formData = new FormData();
    Object.keys(formState).forEach((key) => {
      formData.append(key, formState[key]);
    });
    fetcher.submit(formData, { method: "POST" });
  };

  const isSaving = fetcher.state === "submitting" || fetcher.state === "loading";

  return (
    <Page
      title="Age Verification Settings"
      subtitle="Configure storefront age gate popup for compliance and customer verification"
      primaryAction={{
        content: "Save Settings",
        onAction: handleSave,
        loading: isSaving,
      }}
    >
      <BlockStack gap="500">
        <Banner title="Embed Extension Required" status="info">
          <p>
            Make sure the <strong>Age Verification Gate</strong> App Embed is enabled in your Shopify Theme Editor to display the popup and Terms &amp; Conditions checkbox on your storefront.
          </p>
        </Banner>

        <Grid>
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 7, lg: 7, xl: 7 }}>
            <BlockStack gap="500">
              {/* Status Card */}
              <Card padding="500">
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Status</Text>
                  <Checkbox
                    label="Enable Age Verification Gate on Storefront"
                    checked={formState.enabled}
                    onChange={(checked) => handleChange("enabled", checked)}
                    helpText="When enabled, unverified visitors will see the age popup before accessing your store."
                  />
                </BlockStack>
              </Card>

              {/* Terms & Conditions Checkbox Card */}
              <Card padding="500">
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Terms &amp; Conditions Checkbox</Text>
                  <Checkbox
                    label="Enable Terms & Conditions Checkbox on Storefront"
                    checked={formState.enableTerms}
                    onChange={(checked) => handleChange("enableTerms", checked)}
                    helpText="Displays an agreement checkbox on Product & Cart pages before customers can add items or checkout."
                  />

                  {formState.enableTerms && (
                    <BlockStack gap="400">
                      <Select
                        label="Show Checkbox On"
                        options={[
                          { label: "Both Product & Cart pages", value: "both" },
                          { label: "Product page only", value: "product" },
                          { label: "Cart page only", value: "cart" },
                        ]}
                        value={formState.termsPlacement || "both"}
                        onChange={(val) => handleChange("termsPlacement", val)}
                      />

                      <TextField
                        label="Checkbox Label Text"
                        value={formState.termsText}
                        onChange={(val) => handleChange("termsText", val)}
                        helpText="Text displayed next to the checkbox."
                        autoComplete="off"
                      />

                      <TextField
                        label="Terms & Conditions Link URL"
                        value={formState.termsLink}
                        onChange={(val) => handleChange("termsLink", val)}
                        helpText="e.g. /policies/terms-of-service"
                        autoComplete="off"
                      />

                      <Checkbox
                        label="Require agreement before Add to Cart / Checkout"
                        checked={formState.termsRequired}
                        onChange={(checked) => handleChange("termsRequired", checked)}
                        helpText="Prevents customers from adding products or proceeding to checkout until checked."
                      />
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>

              {/* Verification Logic Card */}
              <Card padding="500">
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Verification Rules</Text>
                  
                  <Select
                    label="Show Popup On"
                    options={[
                      { label: "All Pages", value: "all" },
                      { label: "Homepage Only", value: "index" },
                      { label: "Collection Pages Only", value: "collection" },
                      { label: "Product Pages Only", value: "product" },
                    ]}
                    value={formState.targetPages || "all"}
                    onChange={(val) => handleChange("targetPages", val)}
                    helpText="Select which storefront pages trigger the age verification popup."
                  />

                  <TextField
                    label="Minimum Age Required"
                    type="number"
                    value={String(formState.minAge)}
                    onChange={(val) => handleChange("minAge", parseInt(val, 10) || 18)}
                    helpText="e.g. 18, 21"
                    autoComplete="off"
                  />

                  <Text variant="bodyMd" fontWeight="semibold" as="p">Verification Method</Text>
                  <BlockStack gap="200">
                    <RadioButton
                      label="Yes / No Buttons (Simple confirmation)"
                      checked={formState.method === "buttons"}
                      id="method-buttons"
                      name="method"
                      onChange={() => handleChange("method", "buttons")}
                    />
                    <RadioButton
                      label="Date of Birth Selector (Exact age calculation)"
                      checked={formState.method === "dob"}
                      id="method-dob"
                      name="method"
                      onChange={() => handleChange("method", "dob")}
                    />
                  </BlockStack>

                  <Divider />

                  <Text variant="bodyMd" fontWeight="semibold" as="p">Remember Verification</Text>
                  <Select
                    label="Remember Verification Duration"
                    options={[
                      { label: "Session only (until browser closes)", value: "session" },
                      { label: "1 day", value: "1" },
                      { label: "7 days", value: "7" },
                      { label: "30 days", value: "30" },
                      { label: "90 days", value: "90" },
                      { label: "1 year (365 days)", value: "365" },
                      { label: "Forever (10 years)", value: "forever" },
                    ]}
                    value={formState.rememberOption || "30"}
                    onChange={handleRememberOptionChange}
                    helpText="How long before a verified visitor is prompted to verify their age again."
                  />

                  <BlockStack gap="200">
                    <Checkbox
                      label="Reverify after browser closes"
                      checked={formState.reverifyOnClose || formState.rememberOption === "session"}
                      onChange={(checked) => handleChange("reverifyOnClose", checked)}
                      helpText="If checked, verification expires immediately when the customer closes their browser window."
                    />
                  </BlockStack>

                  <TextField
                    label="Underage Redirect URL"
                    value={formState.redirectUrl}
                    onChange={(val) => handleChange("redirectUrl", val)}
                    helpText="URL to send visitors who fail verification (e.g. https://google.com)"
                    autoComplete="off"
                  />
                </BlockStack>
              </Card>

              {/* Content Customization Card */}
              <Card padding="500">
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Popup Content</Text>
                  <TextField
                    label="Logo URL (Optional)"
                    value={formState.logoUrl}
                    onChange={(val) => handleChange("logoUrl", val)}
                    placeholder="https://example.com/logo.png"
                    helpText="Leave empty to hide logo."
                    autoComplete="off"
                  />
                  <TextField
                    label="Heading Text"
                    value={formState.heading}
                    onChange={(val) => handleChange("heading", val)}
                    autoComplete="off"
                  />
                  <TextField
                    label="Description Text"
                    value={formState.description}
                    onChange={(val) => handleChange("description", val)}
                    multiline={3}
                    autoComplete="off"
                  />
                  {formState.method === "buttons" && (
                    <InlineStack gap="400" wrap={false}>
                      <Box width="100%">
                        <TextField
                          label="Yes Button Text"
                          value={formState.yesButtonText}
                          onChange={(val) => handleChange("yesButtonText", val)}
                          autoComplete="off"
                        />
                      </Box>
                      <Box width="100%">
                        <TextField
                          label="No Button Text"
                          value={formState.noButtonText}
                          onChange={(val) => handleChange("noButtonText", val)}
                          autoComplete="off"
                        />
                      </Box>
                    </InlineStack>
                  )}
                </BlockStack>
              </Card>

              {/* Styling Card */}
              <Card padding="500">
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Styling & Customization</Text>
                  
                  <InlineStack gap="400" wrap>
                    <Box width="45%">
                      <TextField
                        label="Popup Background Color"
                        value={formState.bgColor}
                        onChange={(val) => handleChange("bgColor", val)}
                        autoComplete="off"
                      />
                    </Box>
                    <Box width="45%">
                      <TextField
                        label="Text Color"
                        value={formState.textColor}
                        onChange={(val) => handleChange("textColor", val)}
                        autoComplete="off"
                      />
                    </Box>
                    <Box width="45%">
                      <TextField
                        label="Button Background Color"
                        value={formState.buttonBgColor}
                        onChange={(val) => handleChange("buttonBgColor", val)}
                        autoComplete="off"
                      />
                    </Box>
                    <Box width="45%">
                      <TextField
                        label="Button Text Color"
                        value={formState.buttonTextColor}
                        onChange={(val) => handleChange("buttonTextColor", val)}
                        autoComplete="off"
                      />
                    </Box>
                    <Box width="45%">
                      <TextField
                        label="Overlay Color"
                        value={formState.overlayColor}
                        onChange={(val) => handleChange("overlayColor", val)}
                        helpText="e.g. rgba(0,0,0,0.75)"
                        autoComplete="off"
                      />
                    </Box>
                    <Box width="45%">
                      <TextField
                        label="Popup Max Width (px)"
                        type="number"
                        value={String(formState.popupWidth)}
                        onChange={(val) => handleChange("popupWidth", parseInt(val, 10) || 480)}
                        autoComplete="off"
                      />
                    </Box>
                    <Box width="45%">
                      <TextField
                        label="Border Radius (px)"
                        type="number"
                        value={String(formState.borderRadius)}
                        onChange={(val) => handleChange("borderRadius", parseInt(val, 10) || 12)}
                        autoComplete="off"
                      />
                    </Box>
                  </InlineStack>

                  <Checkbox
                    label="Enable Background Blur Effect"
                    checked={formState.blurBackground}
                    onChange={(checked) => handleChange("blurBackground", checked)}
                  />
                </BlockStack>
              </Card>

              <Box paddingBlockEnd="500">
                <Button variant="primary" size="large" onClick={handleSave} loading={isSaving}>
                  Save Settings
                </Button>
              </Box>
            </BlockStack>
          </Grid.Cell>

          {/* Live Preview Panel */}
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 5, lg: 5, xl: 5 }}>
            <Box position="sticky" top="100px">
              <BlockStack gap="500">
                {/* Terms Preview Card */}
                {formState.enableTerms && (
                  <Card padding="500">
                    <BlockStack gap="300">
                      <Text variant="headingMd" as="h2">Terms Checkbox Preview</Text>
                      <Divider />
                      <Box padding="300" style={{ border: "1px solid #e1e3e5", borderRadius: "6px", backgroundColor: "#fafbfb" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
                          <input type="checkbox" id="preview-terms" defaultChecked={false} />
                          <label htmlFor="preview-terms">
                            {formState.termsText || "I agree to the Terms & Conditions"}{" "}
                            <a href={formState.termsLink || "#"} target="_blank" rel="noreferrer" style={{ textDecoration: "underline", color: "#005bd3" }}>
                              (Read)
                            </a>
                          </label>
                        </div>
                      </Box>
                    </BlockStack>
                  </Card>
                )}

                {/* Age Popup Live Preview Card */}
                <Card padding="500">
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text variant="headingMd" as="h2">Live Preview</Text>
                      <Text variant="bodySm" tone="subdued" as="span">Real-time Popup Mockup</Text>
                    </InlineStack>
                    <Divider />

                    <Box
                      style={{
                        background: formState.overlayColor,
                        backdropFilter: formState.blurBackground ? "blur(8px)" : "none",
                        padding: "30px 15px",
                        borderRadius: "8px",
                        minHeight: "420px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid #e1e3e5",
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: formState.bgColor,
                          color: formState.textColor,
                          width: "100%",
                          maxWidth: `${formState.popupWidth}px`,
                          borderRadius: `${formState.borderRadius}px`,
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

                        <h3 style={{ margin: "0 0 10px 0", fontSize: "20px", fontWeight: "bold", color: formState.textColor }}>
                          {formState.heading}
                        </h3>
                        <p style={{ margin: "0 0 20px 0", fontSize: "14px", lineHeight: "1.5", opacity: 0.85, color: formState.textColor }}>
                          {formState.description}
                        </p>

                        {formState.method === "buttons" ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            <button
                              type="button"
                              style={{
                                backgroundColor: formState.buttonBgColor,
                                color: formState.buttonTextColor,
                                border: "none",
                                padding: "12px 20px",
                                borderRadius: "6px",
                                fontWeight: "bold",
                                fontSize: "15px",
                                cursor: "pointer",
                              }}
                            >
                              {formState.yesButtonText}
                            </button>
                            <button
                              type="button"
                              style={{
                                backgroundColor: "transparent",
                                color: formState.textColor,
                                border: `1px solid ${formState.textColor}`,
                                padding: "10px 20px",
                                borderRadius: "6px",
                                fontSize: "14px",
                                cursor: "pointer",
                                opacity: 0.8,
                              }}
                            >
                              {formState.noButtonText}
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                              <select style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }} defaultValue="01">
                                {Array.from({ length: 12 }, (_, i) => (
                                  <option key={i + 1} value={String(i + 1).padStart(2, "0")}>
                                    {new Date(0, i).toLocaleString("en", { month: "short" })}
                                  </option>
                                ))}
                              </select>
                              <select style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }} defaultValue="15">
                                {Array.from({ length: 31 }, (_, i) => (
                                  <option key={i + 1} value={String(i + 1).padStart(2, "0")}>
                                    {i + 1}
                                  </option>
                                ))}
                              </select>
                              <select style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }} defaultValue="2000">
                                {Array.from({ length: 70 }, (_, i) => (
                                  <option key={i} value={2010 - i}>
                                    {2010 - i}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button
                              type="button"
                              style={{
                                backgroundColor: formState.buttonBgColor,
                                color: formState.buttonTextColor,
                                border: "none",
                                padding: "12px 20px",
                                borderRadius: "6px",
                                fontWeight: "bold",
                                fontSize: "15px",
                                cursor: "pointer",
                              }}
                            >
                              Verify Age
                            </button>
                          </div>
                        )}
                      </div>
                    </Box>
                  </BlockStack>
                </Card>
              </BlockStack>
            </Box>
          </Grid.Cell>
        </Grid>
      </BlockStack>
    </Page>
  );
}
