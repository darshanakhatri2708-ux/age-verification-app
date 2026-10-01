import { useState, useEffect } from "react";
import { useLoaderData, useFetcher } from "react-router";
import {
  Page,
  Card,
  Text,
  Button,
  BlockStack,
  InlineStack,
  Checkbox,
  Banner,
  Box,
  Divider,
  Badge,
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
      autoTranslate: true,
    };
  }

  return { settings, shop };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();

  const autoTranslate = formData.get("autoTranslate") === "true";

  // Update Prisma database
  const updatedSettings = await prisma.settings.upsert({
    where: { shop },
    update: { autoTranslate },
    create: { shop, autoTranslate },
  });

  // Sync with shop metafield for instant storefront liquid availability
  try {
    const metafieldsPayload = {
      enabled: updatedSettings.enabled,
      minAge: updatedSettings.minAge,
      method: updatedSettings.method,
      rememberDays: updatedSettings.rememberDays,
      rememberOption: updatedSettings.rememberOption,
      reverifyOnClose: updatedSettings.reverifyOnClose,
      targetPages: updatedSettings.targetPages,
      geoMode: updatedSettings.geoMode,
      geoCountries: updatedSettings.geoCountries,
      geoMessage: updatedSettings.geoMessage,
      enableTerms: updatedSettings.enableTerms,
      termsPlacement: updatedSettings.termsPlacement,
      termsText: updatedSettings.termsText,
      termsLink: updatedSettings.termsLink,
      termsRequired: updatedSettings.termsRequired,
      autoTranslate: updatedSettings.autoTranslate,
      logoUrl: updatedSettings.logoUrl,
      heading: updatedSettings.heading,
      description: updatedSettings.description,
      yesButtonText: updatedSettings.yesButtonText,
      noButtonText: updatedSettings.noButtonText,
      redirectUrl: updatedSettings.redirectUrl,
      bgColor: updatedSettings.bgColor,
      textColor: updatedSettings.textColor,
      overlayColor: updatedSettings.overlayColor,
      buttonBgColor: updatedSettings.buttonBgColor,
      buttonTextColor: updatedSettings.buttonTextColor,
      popupWidth: updatedSettings.popupWidth,
      borderRadius: updatedSettings.borderRadius,
      blurBackground: updatedSettings.blurBackground,
    };

    const shopResponse = await admin.graphql(`
      query getShopId {
        shop {
          id
        }
      }
    `);
    const shopData = await shopResponse.json();
    const shopId = shopData?.data?.shop?.id;

    if (shopId) {
      await admin.graphql(
        `
        mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              namespace
              key
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
        {
          variables: {
            metafields: [
              {
                ownerId: shopId,
                namespace: "age_verification",
                key: "settings",
                type: "json",
                value: JSON.stringify(metafieldsPayload),
              },
            ],
          },
        }
      );
    }
  } catch (err) {
    console.error("Metafield sync error:", err);
  }

  return { success: true };
};

export default function PopupTranslations() {
  const { settings } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const [autoTranslate, setAutoTranslate] = useState(
    settings.autoTranslate !== undefined ? settings.autoTranslate : true
  );

  const isSaving = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Translation settings saved successfully!");
    }
  }, [fetcher.data, shopify]);

  const handleSave = () => {
    fetcher.submit(
      { autoTranslate: autoTranslate ? "true" : "false" },
      { method: "POST" }
    );
  };

  return (
    <Page
      title="Automatic Popup Translation"
      subtitle="Identify customer location and translate the Age Verification popup automatically"
      primaryAction={{
        content: isSaving ? "Saving..." : "Save Settings",
        onAction: handleSave,
        loading: isSaving,
      }}
    >
      <BlockStack gap="500">
        <Banner title="Location-Based Auto Translation" status="info">
          <p>
            When enabled, our app automatically identifies your visitor's country location and browser language to display the Age Verification popup and Terms checkbox in their local language.
          </p>
        </Banner>

        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <div>
                <Text variant="headingMd" as="h2">
                  Auto-Translation Activation
                </Text>
                <Text variant="bodySm" tone="subdued">
                  Enable or disable automatic country location translation.
                </Text>
              </div>
              <Badge tone={autoTranslate ? "success" : "attention"}>
                {autoTranslate ? "Auto-Translation Active" : "Disabled"}
              </Badge>
            </InlineStack>

            <Divider />

            <Checkbox
              label="Enable Automatic Translation by Visitor Location & Country"
              checked={autoTranslate}
              onChange={(val) => setAutoTranslate(val)}
              helpText="Automatically translates popup heading, description, yes/no buttons, and terms checkbox based on visitor's geolocation & language."
            />

            <Divider />

            <Box padding="200">
              <BlockStack gap="200">
                <Text weight="bold">Supported Global Languages (Auto-Detected):</Text>
                <InlineStack gap="200" wrap>
                  <Badge>Spanish (ES, MX, AR)</Badge>
                  <Badge>French (FR, BE, CA)</Badge>
                  <Badge>German (DE, AT, CH)</Badge>
                  <Badge>Italian (IT)</Badge>
                  <Badge>Portuguese (BR, PT)</Badge>
                  <Badge>Japanese (JP)</Badge>
                  <Badge>Dutch (NL)</Badge>
                  <Badge>Hindi (IN)</Badge>
                  <Badge>Arabic (SA, AE, EG)</Badge>
                  <Badge>Chinese (CN, TW)</Badge>
                </InlineStack>
              </BlockStack>
            </Box>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
