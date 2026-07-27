/**
 * PartnerSentStatusBreakdown
 *
 * View-based (NO react-native-svg-charts / NO SVG) visual breakdown of sent-offer
 * statuses. Figma ref: docs/figma-export/partner/Home__221-36140.png
 * ("Le statut de vos offres envoyées" section)
 *
 * Renders a proportional horizontal bar composed of coloured View segments,
 * followed by a legend row per status.
 *
 * Props receive raw counts; the component computes proportions internally.
 */

import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";

interface StatusSegment {
  /** i18n key for the status label */
  labelKey: string;
  labelKeyAr: string;
  count: number;
  color: string;
}

interface PartnerSentStatusBreakdownProps {
  /** offers this prestataire's submitted that are currently active/validated */
  activeCount: number;
  /** offers awaiting admin validation (status: pending) */
  pendingCount: number;
  /** offers accepted by a client */
  acceptedCount: number;
  /** total sent — used for the "missed" bucket (total - active - pending - accepted) */
  totalSent: number;
}

const PartnerSentStatusBreakdown: React.FC<PartnerSentStatusBreakdownProps> = ({
  activeCount,
  pendingCount,
  acceptedCount,
  totalSent,
}) => {
  const missedCount = Math.max(0, totalSent - activeCount - pendingCount - acceptedCount);

  const segments: StatusSegment[] = useMemo(
    () => [
      {
        labelKey: "partner.offer.statusAccepted",
        labelKeyAr: "مقبول",
        count: acceptedCount,
        color: Colors.greenDark,
      },
      {
        labelKey: "partner.offer.statusActive",
        labelKeyAr: "نشط",
        count: activeCount,
        color: Colors.primary,
      },
      {
        labelKey: "partner.offer.statusPending",
        labelKeyAr: "قيد الانتظار",
        count: pendingCount,
        // Figma: "Envoyée" legend uses blue #2C64EF = Colors.primary300
        color: Colors.primary300,
      },
      {
        labelKey: "partner.sent.offerManquee",
        labelKeyAr: "فائتة",
        count: missedCount,
        color: Colors.red,
      },
    ],
    [activeCount, pendingCount, acceptedCount, missedCount],
  );

  const total = segments.reduce((acc, s) => acc + s.count, 0);
  const safeTotal = total === 0 ? 1 : total;

  return (
    <View style={styles.container}>
      {/* Proportional bar */}
      <View style={styles.barWrap} flexDirection="row">
        {segments.map((seg) => {
          if (seg.count === 0) return null;
          const widthPct = (seg.count / safeTotal) * 100;
          return (
            <View
              key={seg.labelKey}
              style={[
                styles.barSegment,
                {
                  width: `${widthPct}%` as `${number}%`,
                  backgroundColor: seg.color,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend} flexDirection="row" gap={12}>
        {segments.map((seg) => (
          <View key={seg.labelKey} flexDirection="row" alignItems="center" gap={5}>
            <View style={[styles.dot, { backgroundColor: seg.color }]} />
            <View>
              <Text type="small" color={Colors.grayMidDark}>
                {seg.labelKey}
              </Text>
              <Text type="small" semiBold color={Colors.brand} translate={false}>
                {String(seg.count)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  barWrap: {
    height: 10,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: Colors.backgroundGray,
  },
  barSegment: {
    height: "100%",
  },
  legend: {
    flexWrap: "wrap",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default PartnerSentStatusBreakdown;
