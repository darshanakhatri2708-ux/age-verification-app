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
  Badge,
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
      autoTranslate: true,
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
  const geoMode = formData.get("geoMode") || "disabled";
  const geoCountries = formData.get("geoCountries") || "";
  const geoMessage = formData.get("geoMessage") || "Access Restricted: Store is not available in your country/region.";

  const enableTerms = formData.get("enableTerms") === "true";
  const termsPlacement = formData.get("termsPlacement") || "both";
  const termsText = formData.get("termsText") || "I agree to the Terms & Conditions";
  const termsLink = formData.get("termsLink") || "/policies/terms-of-service";
  const termsRequired = formData.get("termsRequired") === "true";
  const autoTranslate = formData.get("autoTranslate") === "true";

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

  const settingsPayload = {
    enabled,
    minAge,
    method,
    rememberDays,
    rememberOption,
    reverifyOnClose,
    targetPages,
    geoMode,
    geoCountries,
    geoMessage,
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
      geoMode,
      geoCountries,
      geoMessage,
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

  const [activeTab, setActiveTab] = useState("general"); // "general" | "design" | "terms" | "geo" | "all"
  const [previewDevice, setPreviewDevice] = useState("desktop"); // "desktop" | "mobile"
  const [formState, setFormState] = useState(settings);

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Settings saved successfully!");
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
    Object.keys(formState).forEach((key) => {
      formData.append(key, formState[key]);
    });
    fetcher.submit(formData, { method: "POST" });
  };

  const isSaving = fetcher.state === "submitting" || fetcher.state === "loading";
  const selectedCountryList = formState.geoCountries
    ? formState.geoCountries.split(",").map((c) => c.trim().toUpperCase())
    : [];

  // Card Components for clear modular rendering
  const renderGeneralRulesCard = () => (
    <BlockStack gap="500" key="section-general">
      <Card padding="500">
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <Text variant="headingMd" as="h2">Age Gate Status</Text>
            <Badge tone={formState.enabled ? "success" : "attention"}>
              {formState.enabled ? "Active" : "Disabled"}
            </Badge>
          </InlineStack>
          <Checkbox
            label="Enable Age Verification Gate on Storefront"
            checked={formState.enabled}
            onChange={(checked) => handleChange("enabled", checked)}
            helpText="When enabled, unverified store visitors will be prompted to verify their age."
          />
        </BlockStack>
      </Card>

      <Card padding="500">
        <BlockStack gap="400">
          <Text variant="headingMd" as="h2">Verification Rules</Text>

          <Select
            label="Show Popup On"
            options={[
              { label: "All Store Pages", value: "all" },
              { label: "Homepage Only", value: "index" },
              { label: "Collection Pages Only", value: "collection" },
              { label: "Product Pages Only", value: "product" },
            ]}
            value={formState.targetPages || "all"}
            onChange={(val) => handleChange("targetPages", val)}
            helpText="Choose which pages trigger the age verification modal."
          />

          <TextField
            label="Minimum Required Age"
            type="number"
            value={String(formState.minAge)}
            onChange={(val) => handleChange("minAge", parseInt(val, 10) || 18)}
            helpText="Minimum age required for access (e.g. 18, 21)."
            autoComplete="off"
          />

          <Text variant="bodyMd" fontWeight="semibold" as="p">Verification Method</Text>
          <BlockStack gap="200">
            <RadioButton
              label="Yes / No Buttons (Quick confirmation)"
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

          <Text variant="bodyMd" fontWeight="semibold" as="p">Cookie Memory & Persistence</Text>
          <Select
            label="Remember Verification For"
            options={[
              { label: "Session only (Until browser closes)", value: "session" },
              { label: "1 day", value: "1" },
              { label: "7 days", value: "7" },
              { label: "30 days (Recommended)", value: "30" },
              { label: "90 days", value: "90" },
              { label: "1 year (365 days)", value: "365" },
              { label: "Forever (10 years)", value: "forever" },
            ]}
            value={formState.rememberOption || "30"}
            onChange={handleRememberOptionChange}
            helpText="Duration before a verified customer needs to verify again."
          />

          <Checkbox
            label="Re-verify every time browser closes"
            checked={formState.reverifyOnClose || formState.rememberOption === "session"}
            onChange={(checked) => handleChange("reverifyOnClose", checked)}
            helpText="Forces re-verification whenever a user closes their browser window."
          />

          <TextField
            label="Underage Redirect URL"
            value={formState.redirectUrl}
            onChange={(val) => handleChange("redirectUrl", val)}
            helpText="Visitors who fail age verification will be redirected to this URL."
            autoComplete="off"
          />
        </BlockStack>
      </Card>
    </BlockStack>
  );

  const renderDesignCard = () => (
    <BlockStack gap="500" key="section-design">
      <Card padding="500">
        <BlockStack gap="400">
          <Text variant="headingMd" as="h2">Popup Content</Text>
          <TextField
            label="Brand Logo Image URL (Optional)"
            value={formState.logoUrl}
            onChange={(val) => handleChange("logoUrl", val)}
            placeholder="https://yourstore.com/logo.png"
            helpText="Leave blank if you don't wish to display a logo."
            autoComplete="off"
          />
          <TextField
            label="Popup Title / Heading"
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
                  label="Yes Button Label"
                  value={formState.yesButtonText}
                  onChange={(val) => handleChange("yesButtonText", val)}
                  autoComplete="off"
                />
              </Box>
              <Box width="100%">
                <TextField
                  label="No Button Label"
                  value={formState.noButtonText}
                  onChange={(val) => handleChange("noButtonText", val)}
                  autoComplete="off"
                />
              </Box>
            </InlineStack>
          )}
        </BlockStack>
      </Card>

      <Card padding="500">
        <BlockStack gap="400">
          <Text variant="headingMd" as="h2">Styling & Custom Colors</Text>

          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
              <TextField
                label="Background Color"
                value={formState.bgColor}
                onChange={(val) => handleChange("bgColor", val)}
                autoComplete="off"
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
              <TextField
                label="Text Color"
                value={formState.textColor}
                onChange={(val) => handleChange("textColor", val)}
                autoComplete="off"
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
              <TextField
                label="Button Color"
                value={formState.buttonBgColor}
                onChange={(val) => handleChange("buttonBgColor", val)}
                autoComplete="off"
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
              <TextField
                label="Button Text Color"
                value={formState.buttonTextColor}
                onChange={(val) => handleChange("buttonTextColor", val)}
                autoComplete="off"
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
              <TextField
                label="Overlay Color"
                value={formState.overlayColor}
                onChange={(val) => handleChange("overlayColor", val)}
                helpText="e.g. rgba(0,0,0,0.75)"
                autoComplete="off"
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
              <TextField
                label="Popup Max Width (px)"
                type="number"
                value={String(formState.popupWidth)}
                onChange={(val) => handleChange("popupWidth", parseInt(val, 10) || 480)}
                autoComplete="off"
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
              <TextField
                label="Corner Radius (px)"
                type="number"
                value={String(formState.borderRadius)}
                onChange={(val) => handleChange("borderRadius", parseInt(val, 10) || 12)}
                autoComplete="off"
              />
            </Grid.Cell>
          </Grid>

          <Checkbox
            label="Enable Blur Backdrop Effect"
            checked={formState.blurBackground}
            onChange={(checked) => handleChange("blurBackground", checked)}
            helpText="Blurs the storefront page content behind the modal overlay."
          />
        </BlockStack>
      </Card>
    </BlockStack>
  );

  const renderTermsCard = () => (
    <Card padding="500" key="section-terms">
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text variant="headingMd" as="h2">Terms & Conditions Checkbox</Text>
          <Badge tone={formState.enableTerms ? "success" : "subdued"}>
            {formState.enableTerms ? "Enabled" : "Off"}
          </Badge>
        </InlineStack>

        <Checkbox
          label="Enable Terms & Conditions Agreement Checkbox on Storefront"
          checked={formState.enableTerms}
          onChange={(checked) => handleChange("enableTerms", checked)}
          helpText="Displays a required terms checkbox on Product & Cart pages before adding to cart or checking out."
        />

        {formState.enableTerms && (
          <BlockStack gap="400">
            <Select
              label="Target Storefront Pages"
              options={[
                { label: "Both Product & Cart pages", value: "both" },
                { label: "Product page only (above Add to Cart)", value: "product" },
                { label: "Cart page only (above Checkout button)", value: "cart" },
              ]}
              value={formState.termsPlacement || "both"}
              onChange={(val) => handleChange("termsPlacement", val)}
            />

            <TextField
              label="Checkbox Label Text"
              value={formState.termsText}
              onChange={(val) => handleChange("termsText", val)}
              helpText="Text displayed right next to the checkbox."
              autoComplete="off"
            />

            <TextField
              label="Terms & Conditions Policy Page URL"
              value={formState.termsLink}
              onChange={(val) => handleChange("termsLink", val)}
              helpText="Link URL customers can click to read terms (e.g. /policies/terms-of-service)."
              autoComplete="off"
            />

            <Checkbox
              label="Mandatory Agreement (Block Add-to-Cart / Checkout if unchecked)"
              checked={formState.termsRequired}
              onChange={(checked) => handleChange("termsRequired", checked)}
              helpText="Prevents customers from proceeding until they check the agreement box."
            />
          </BlockStack>
        )}
      </BlockStack>
    </Card>
  );

  const renderGeoTranslationCard = () => (
    <BlockStack gap="500" key="section-geo">
      <Card padding="500">
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <Text variant="headingMd" as="h2">Automatic Country Translation</Text>
            <Badge tone={formState.autoTranslate ? "success" : "subdued"}>
              {formState.autoTranslate ? "Auto-Detecting" : "Off"}
            </Badge>
          </InlineStack>

          <Checkbox
            label="Enable Automatic Location-based Translation"
            checked={formState.autoTranslate}
            onChange={(checked) => handleChange("autoTranslate", checked)}
            helpText="Automatically detects visitor IP location and translates the popup into 15+ global languages."
          />

          <Divider />

          <Box padding="200">
            <BlockStack gap="200">
              <Text weight="bold" as="p">Supported Global Languages (Auto-Translated):</Text>
              <InlineStack gap="200" wrap>
                <Badge>Spanish (ES, MX)</Badge>
                <Badge>French (FR, CA)</Badge>
                <Badge>German (DE, AT)</Badge>
                <Badge>Italian (IT)</Badge>
                <Badge>Portuguese (BR, PT)</Badge>
                <Badge>Japanese (JP)</Badge>
                <Badge>Dutch (NL)</Badge>
                <Badge>Hindi (IN)</Badge>
                <Badge>Arabic (SA, AE)</Badge>
                <Badge>Chinese (CN, TW)</Badge>
              </InlineStack>
            </BlockStack>
          </Box>
        </BlockStack>
      </Card>

      <Card padding="500">
        <BlockStack gap="400">
          <Text variant="headingMd" as="h2">Country Geo-Restrictions</Text>

          <Select
            label="Geo-Restriction Mode"
            options={[
              { label: "Disabled (Show popup to all global visitors)", value: "disabled" },
              { label: "Allow Only Selected Countries (Hide popup for others)", value: "allow" },
              { label: "Block Selected Countries (Show restriction message)", value: "block" },
            ]}
            value={formState.geoMode || "disabled"}
            onChange={(val) => handleChange("geoMode", val)}
          />

          {formState.geoMode !== "disabled" && (
            <BlockStack gap="400">
              <Text variant="bodySm" tone="subdued" as="p">
                Click popular countries to toggle or enter 2-letter ISO country codes below:
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
                label="Target Country Codes (ISO 2-letter codes, comma separated)"
                value={formState.geoCountries}
                onChange={(val) => handleChange("geoCountries", val)}
                placeholder="US, CA, GB, AU, DE"
                helpText="Enter uppercase 2-letter country codes separated by commas."
                autoComplete="off"
              />

              <TextField
                label="Geo Access Restriction Message"
                value={formState.geoMessage}
                onChange={(val) => handleChange("geoMessage", val)}
                multiline={2}
                helpText="Message shown to visitors from restricted countries."
                autoComplete="off"
              />
            </BlockStack>
          )}
        </BlockStack>
      </Card>
    </BlockStack>
  );

  return (
    <Page
      title="Age Verification Dashboard"
      subtitle="Manage your storefront age verification popup, design, terms checkbox, geo-restrictions & auto-translation"
      primaryAction={{
        content: "Save All Settings",
        onAction: handleSave,
        loading: isSaving,
      }}
    >
      <BlockStack gap="500">
        <Banner title="App Embed Activation Required" status="info">
          <p>
            Make sure the <strong>Age Verification Gate</strong> App Embed is turned ON in your Shopify Theme Editor to activate the popup and terms agreement on your store.
          </p>
        </Banner>

        {/* Clear Navigation Pills (Always visible, NEVER collapses into a hidden dropdown menu) */}
        <Card padding="300">
          <InlineStack gap="200" wrap align="start">
            <Button
              size="medium"
              variant={activeTab === "general" ? "primary" : "secondary"}
              onClick={() => setActiveTab("general")}
            >
              ⚙️ General & Rules
            </Button>
            <Button
              size="medium"
              variant={activeTab === "design" ? "primary" : "secondary"}
              onClick={() => setActiveTab("design")}
            >
              🎨 Design & Content
            </Button>
            <Button
              size="medium"
              variant={activeTab === "terms" ? "primary" : "secondary"}
              onClick={() => setActiveTab("terms")}
            >
              📜 Terms & Conditions
            </Button>
            <Button
              size="medium"
              variant={activeTab === "geo" ? "primary" : "secondary"}
              onClick={() => setActiveTab("geo")}
            >
              🌍 Geo & Translation
            </Button>
            <Button
              size="medium"
              variant={activeTab === "all" ? "primary" : "tertiary"}
              onClick={() => setActiveTab("all")}
            >
              📋 View All Settings on 1 Page
            </Button>
          </InlineStack>
        </Card>

        <Grid>
          {/* Main Settings Form Column */}
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 7, lg: 7, xl: 7 }}>
            <BlockStack gap="500">
              {activeTab === "general" && renderGeneralRulesCard()}
              {activeTab === "design" && renderDesignCard()}
              {activeTab === "terms" && renderTermsCard()}
              {activeTab === "geo" && renderGeoTranslationCard()}
              {activeTab === "all" && (
                <>
                  {renderGeneralRulesCard()}
                  {renderDesignCard()}
                  {renderTermsCard()}
                  {renderGeoTranslationCard()}
                </>
              )}

              <Box paddingBlockEnd="500">
                <Button variant="primary" size="large" onClick={handleSave} loading={isSaving}>
                  Save All Settings
                </Button>
              </Box>
            </BlockStack>
          </Grid.Cell>

          {/* Sticky Interactive Live Preview Column */}
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 5, lg: 5, xl: 5 }}>
            <Box position="sticky" top="100px">
              <BlockStack gap="500">
                {/* Terms Checkbox Preview Card */}
                {formState.enableTerms && (
                  <Card padding="500">
                    <BlockStack gap="300">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text variant="headingMd" as="h2">Terms Checkbox Preview</Text>
                        <Badge tone="info">Storefront Preview</Badge>
                      </InlineStack>
                      <Divider />
                      <Box padding="300" style={{ border: "1px dashed #c9cccf", borderRadius: "6px", backgroundColor: "#f6f6f7" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px" }}>
                          <input type="checkbox" id="preview-terms" defaultChecked={false} style={{ cursor: "pointer" }} />
                          <label htmlFor="preview-terms" style={{ cursor: "pointer", fontWeight: 500 }}>
                            {formState.termsText || "I agree to the Terms & Conditions"}{" "}
                            <a
                              href={formState.termsLink || "#"}
                              target="_blank"
                              rel="noreferrer"
                              style={{ textDecoration: "underline", color: "#005bd3", marginLeft: "4px" }}
                            >
                              (Read Terms)
                            </a>
                          </label>
                        </div>
                      </Box>
                    </BlockStack>
                  </Card>
                )}

                {/* Age Verification Live Preview Card */}
                <Card padding="500">
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text variant="headingMd" as="h2">Live Preview</Text>
                      <InlineStack gap="200">
                        <Button
                          size="micro"
                          variant={previewDevice === "desktop" ? "primary" : "secondary"}
                          onClick={() => setPreviewDevice("desktop")}
                        >
                          🖥️ Desktop
                        </Button>
                        <Button
                          size="micro"
                          variant={previewDevice === "mobile" ? "primary" : "secondary"}
                          onClick={() => setPreviewDevice("mobile")}
                        >
                          📱 Mobile
                        </Button>
                      </InlineStack>
                    </InlineStack>

                    <Divider />

                    <Box
                      style={{
                        background: formState.overlayColor,
                        backdropFilter: formState.blurBackground ? "blur(8px)" : "none",
                        padding: previewDevice === "mobile" ? "20px 10px" : "30px 15px",
                        borderRadius: "8px",
                        minHeight: "420px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid #e1e3e5",
                        transition: "all 0.3s ease",
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: formState.bgColor,
                          color: formState.textColor,
                          width: "100%",
                          maxWidth: previewDevice === "mobile" ? "320px" : `${formState.popupWidth}px`,
                          borderRadius: `${formState.borderRadius}px`,
                          padding: previewDevice === "mobile" ? "20px 16px" : "28px",
                          textAlign: "center",
                          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                          boxSizing: "border-box",
                          transition: "all 0.3s ease",
                        }}
                      >
                        {formState.logoUrl ? (
                          <img
                            src={formState.logoUrl}
                            alt="Logo Preview"
                            style={{ maxHeight: "55px", marginBottom: "14px", objectFit: "contain", maxWidth: "100%" }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : null}

                        <h3 style={{ margin: "0 0 10px 0", fontSize: previewDevice === "mobile" ? "18px" : "20px", fontWeight: "bold", color: formState.textColor }}>
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
                            <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                              <select style={{ padding: "8px 4px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "13px" }} defaultValue="01">
                                {Array.from({ length: 12 }, (_, i) => (
                                  <option key={i + 1} value={String(i + 1).padStart(2, "0")}>
                                    {new Date(0, i).toLocaleString("en", { month: "short" })}
                                  </option>
                                ))}
                              </select>
                              <select style={{ padding: "8px 4px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "13px" }} defaultValue="15">
                                {Array.from({ length: 31 }, (_, i) => (
                                  <option key={i + 1} value={String(i + 1).padStart(2, "0")}>
                                    {i + 1}
                                  </option>
                                ))}
                              </select>
                              <select style={{ padding: "8px 4px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "13px" }} defaultValue="2000">
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

                        {formState.autoTranslate && (
                          <div style={{ marginTop: "16px", fontSize: "11px", opacity: 0.65, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                            <span>🌐 Auto-Translating by Visitor Location</span>
                          </div>
                        )}
                      </div>
                    </Box>
                  </BlockStack>
                </Card>

                {/* Geo Restriction Restricted Visitor Preview Card */}
                {formState.geoMode !== "disabled" && (
                  <Card padding="500">
                    <BlockStack gap="400">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text variant="headingMd" as="h2">Geo-Blocked Visitor Preview</Text>
                        <Badge tone="attention">Restricted View</Badge>
                      </InlineStack>
                      <Divider />

                      <Box
                        style={{
                          background: formState.overlayColor || "rgba(0,0,0,0.75)",
                          backdropFilter: formState.blurBackground ? "blur(8px)" : "none",
                          padding: "24px 15px",
                          borderRadius: "8px",
                          textAlign: "center",
                          border: "1px solid #e1e3e5",
                        }}
                      >
                        <div
                          style={{
                            backgroundColor: formState.bgColor,
                            color: formState.textColor,
                            width: "100%",
                            borderRadius: `${formState.borderRadius}px`,
                            padding: "20px",
                            boxSizing: "border-box",
                          }}
                        >
                          <h4 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "bold", color: formState.textColor }}>
                            Access Restricted
                          </h4>
                          <p style={{ margin: 0, fontSize: "13px", opacity: 0.85, color: formState.textColor }}>
                            {formState.geoMessage || "Access Restricted: Store is not available in your country/region."}
                          </p>
                        </div>
                      </Box>
                    </BlockStack>
                  </Card>
                )}
              </BlockStack>
            </Box>
          </Grid.Cell>
        </Grid>
      </BlockStack>
    </Page>
  );
}
