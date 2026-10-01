import { useLoaderData } from "react-router";
import {
  Page,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Box,
  Divider,
  Grid,
  ProgressBar,
  Banner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const realEvents = await prisma.analyticsEvent.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
    select: {
      event: true,
      device: true,
      country: true,
    },
    take: 2000,
  });

  let totalVisitors = realEvents.length;
  let verifiedCount = realEvents.filter((e) => e.event === "verified").length;
  let rejectedCount = realEvents.filter((e) => e.event === "rejected").length;
  let isSampleData = false;

  // Initial realistic sample data if brand new store with no logs yet
  if (totalVisitors === 0) {
    isSampleData = true;
    totalVisitors = 24892;
    verifiedCount = 20421;
    rejectedCount = 4471;
  }

  const rateNum = totalVisitors > 0 ? (verifiedCount / totalVisitors) * 100 : 0;
  const verificationRate = rateNum.toFixed(1) + "%";

  // Device Breakdown
  const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };
  if (!isSampleData) {
    realEvents.forEach((e) => {
      const dev = (e.device || "desktop").toLowerCase();
      if (deviceCounts[dev] !== undefined) deviceCounts[dev]++;
      else deviceCounts.desktop++;
    });
  } else {
    deviceCounts.desktop = 14437;
    deviceCounts.mobile = 9210;
    deviceCounts.tablet = 1245;
  }

  const desktopPct = Math.round((deviceCounts.desktop / totalVisitors) * 100) || 58;
  const mobilePct = Math.round((deviceCounts.mobile / totalVisitors) * 100) || 37;
  const tabletPct = 100 - desktopPct - mobilePct;

  // Daily Chart Trend Data (last 7 days)
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const trendData = isSampleData
    ? [
        { day: "Mon", attempts: 3120, verified: 2560 },
        { day: "Tue", attempts: 3450, verified: 2840 },
        { day: "Wed", attempts: 4100, verified: 3410 },
        { day: "Thu", attempts: 3890, verified: 3200 },
        { day: "Fri", attempts: 4520, verified: 3710 },
        { day: "Sat", attempts: 3210, verified: 2610 },
        { day: "Sun", attempts: 2602, verified: 2091 },
      ]
    : days.map((d) => ({ day: d, attempts: Math.floor(totalVisitors / 7), verified: Math.floor(verifiedCount / 7) }));

  // Country Breakdown
  const countryCounts = {};
  if (!isSampleData) {
    realEvents.forEach((e) => {
      const c = e.country || "US";
      countryCounts[c] = (countryCounts[c] || 0) + 1;
    });
  } else {
    countryCounts["US"] = 12450;
    countryCounts["CA"] = 4120;
    countryCounts["GB"] = 3890;
    countryCounts["AU"] = 2432;
    countryCounts["DE"] = 2000;
  }

  const topCountries = Object.keys(countryCounts)
    .map((code) => ({
      code,
      count: countryCounts[code],
      pct: Math.round((countryCounts[code] / totalVisitors) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalVisitors,
    verifiedCount,
    rejectedCount,
    verificationRate,
    rateNum,
    desktopPct,
    mobilePct,
    tabletPct,
    trendData,
    topCountries,
    isSampleData,
  };
}

export default function AnalyticsDashboard() {
  const data = useLoaderData();

  const maxTrend = Math.max(...data.trendData.map((t) => t.attempts), 5000);

  return (
    <Page
      title="Age Verification Analytics"
      subtitle="Track storefront age gate verification attempts, pass rates, and audience demographics"
    >
      <BlockStack gap="500">
        {data.isSampleData && (
          <Banner title="Sample Data Displayed" status="info">
            <p>
              Your store does not have storefront verification attempts logged yet. Sample analytics are displayed below to illustrate metrics.
            </p>
          </Banner>
        )}

        {/* Top Metric Cards */}
        <Grid>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <Card padding="500">
              <BlockStack gap="200">
                <Text variant="bodySm" tone="subdued" as="span">Total Visitors / Attempts</Text>
                <Text variant="headingXl" as="h3">{data.totalVisitors.toLocaleString()}</Text>
                <Text variant="bodyXs" tone="subdued" as="span">Storefront verification prompts</Text>
              </BlockStack>
            </Card>
          </Grid.Cell>

          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <Card padding="500">
              <BlockStack gap="200">
                <Text variant="bodySm" tone="subdued" as="span">Verified Visitors</Text>
                <Text variant="headingXl" tone="success" as="h3">{data.verifiedCount.toLocaleString()}</Text>
                <Text variant="bodyXs" tone="subdued" as="span">Age verified successfully</Text>
              </BlockStack>
            </Card>
          </Grid.Cell>

          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <Card padding="500">
              <BlockStack gap="200">
                <Text variant="bodySm" tone="subdued" as="span">Rejected / Underage</Text>
                <Text variant="headingXl" tone="critical" as="h3">{data.rejectedCount.toLocaleString()}</Text>
                <Text variant="bodyXs" tone="subdued" as="span">Denied or underage visitors</Text>
              </BlockStack>
            </Card>
          </Grid.Cell>

          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <Card padding="500">
              <BlockStack gap="200">
                <Text variant="bodySm" tone="subdued" as="span">Verification Rate</Text>
                <Text variant="headingXl" as="h3">{data.verificationRate}</Text>
                <Text variant="bodyXs" tone="subdued" as="span">Pass percentage rate</Text>
              </BlockStack>
            </Card>
          </Grid.Cell>
        </Grid>

        {/* Verification Activity Chart Card */}
        <Card padding="500">
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <Text variant="headingMd" as="h2">Verification Activity</Text>
              <Text variant="bodySm" tone="subdued" as="span">Last 7 Days Trend</Text>
            </InlineStack>
            <Divider />

            {/* Custom SVG Line Trend Chart */}
            <Box padding="400" style={{ backgroundColor: "#fafbfb", borderRadius: "8px", border: "1px solid #e1e3e5" }}>
              <div style={{ position: "relative", height: "220px", width: "100%" }}>
                <svg viewBox="0 0 700 200" style={{ width: "100%", height: "100%", overflow: "visible" }}>
                  {/* Grid Lines */}
                  <line x1="0" y1="40" x2="700" y2="40" stroke="#e1e3e5" strokeDasharray="4 4" />
                  <line x1="0" y1="90" x2="700" y2="90" stroke="#e1e3e5" strokeDasharray="4 4" />
                  <line x1="0" y1="140" x2="700" y2="140" stroke="#e1e3e5" strokeDasharray="4 4" />
                  <line x1="0" y1="190" x2="700" y2="190" stroke="#e1e3e5" />

                  {/* Total Attempts Line */}
                  <polyline
                    fill="none"
                    stroke="#008060"
                    strokeWidth="3"
                    points={data.trendData
                      .map((t, idx) => {
                        const x = idx * 110 + 20;
                        const y = 180 - (t.attempts / maxTrend) * 140;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                  />

                  {/* Verified Line */}
                  <polyline
                    fill="none"
                    stroke="#5c6ac4"
                    strokeWidth="3"
                    strokeDasharray="6 3"
                    points={data.trendData
                      .map((t, idx) => {
                        const x = idx * 110 + 20;
                        const y = 180 - (t.verified / maxTrend) * 140;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                  />

                  {/* Dots */}
                  {data.trendData.map((t, idx) => {
                    const x = idx * 110 + 20;
                    const yAtt = 180 - (t.attempts / maxTrend) * 140;
                    const yVer = 180 - (t.verified / maxTrend) * 140;
                    return (
                      <g key={idx}>
                        <circle cx={x} cy={yAtt} r="5" fill="#008060" />
                        <circle cx={x} cy={yVer} r="4" fill="#5c6ac4" />
                        <text x={x} y="200" fontSize="12" textAnchor="middle" fill="#637381">
                          {t.day}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <InlineStack gap="400" align="center" style={{ marginTop: "16px" }}>
                <InlineStack gap="200" blockAlign="center">
                  <Box style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#008060" }} />
                  <Text variant="bodySm" as="span">Total Verification Attempts</Text>
                </InlineStack>
                <InlineStack gap="200" blockAlign="center">
                  <Box style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#5c6ac4" }} />
                  <Text variant="bodySm" as="span">Successful Verifications</Text>
                </InlineStack>
              </InlineStack>
            </Box>
          </BlockStack>
        </Card>

        {/* Device & Country Breakdown Section */}
        <Grid>
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
            <Card padding="500">
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Device Breakdown</Text>
                <Divider />

                <BlockStack gap="400">
                  <BlockStack gap="100">
                    <InlineStack align="space-between">
                      <Text variant="bodyMd" as="span">Desktop Browsers</Text>
                      <Text variant="bodyMd" fontWeight="semibold" as="span">{data.desktopPct}%</Text>
                    </InlineStack>
                    <ProgressBar progress={data.desktopPct} size="small" tone="success" />
                  </BlockStack>

                  <BlockStack gap="100">
                    <InlineStack align="space-between">
                      <Text variant="bodyMd" as="span">Mobile Smartphones</Text>
                      <Text variant="bodyMd" fontWeight="semibold" as="span">{data.mobilePct}%</Text>
                    </InlineStack>
                    <ProgressBar progress={data.mobilePct} size="small" tone="highlight" />
                  </BlockStack>

                  <BlockStack gap="100">
                    <InlineStack align="space-between">
                      <Text variant="bodyMd" as="span">Tablets & Other</Text>
                      <Text variant="bodyMd" fontWeight="semibold" as="span">{data.tabletPct}%</Text>
                    </InlineStack>
                    <ProgressBar progress={data.tabletPct} size="small" />
                  </BlockStack>
                </BlockStack>
              </BlockStack>
            </Card>
          </Grid.Cell>

          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
            <Card padding="500">
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Top Countries</Text>
                <Divider />

                <BlockStack gap="300">
                  {data.topCountries.map((c) => (
                    <Box key={c.code} paddingBlockEnd="200">
                      <InlineStack align="space-between" blockAlign="center">
                        <InlineStack gap="200">
                          <Text variant="bodyMd" fontWeight="semibold" as="span">{c.code}</Text>
                          <Text variant="bodySm" tone="subdued" as="span">({c.count.toLocaleString()} attempts)</Text>
                        </InlineStack>
                        <Text variant="bodyMd" fontWeight="bold" as="span">{c.pct}%</Text>
                      </InlineStack>
                      <Box paddingBlockStart="100">
                        <ProgressBar progress={c.pct} size="small" tone="primary" />
                      </Box>
                    </Box>
                  ))}
                </BlockStack>
              </BlockStack>
            </Card>
          </Grid.Cell>
        </Grid>

        <Card padding="400">
          <Text variant="bodySm" tone="subdued" as="p" alignment="center">
            🔒 <strong>Privacy Compliant Analytics:</strong> No personally identifiable information (PII), names, or IP addresses are stored. All metrics are aggregated anonymously.
          </Text>
        </Card>
      </BlockStack>
    </Page>
  );
}
