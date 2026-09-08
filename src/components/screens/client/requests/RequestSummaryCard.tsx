import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import CustomIcon from "@/components/common/CustomIcon";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import type { RequestSummary } from "@/interfaces/Request";

/**
 * isActiveRequest — the "in progress" statuses shown in "Vos demandes
 * actives" / "Vos requêtes actives". Extracted from HomeScreen's inline
 * filter so both Home (capped preview) and the Liste-tab "List / full"
 * layout (uncapped) apply the identical rule.
 */
export function isActiveRequest(request: RequestSummary): boolean {
  return ["pending", "offers_received", "validated"].includes(request.status);
}

interface RequestSummaryCardProps {
  request: RequestSummary;
  onPress: () => void;
}

/**
 * RequestSummaryCard — one row of "Vos demandes actives" / "Vos requêtes
 * actives". Extracted verbatim from HomeScreen's local requestCard()
 * closure (same styles, i18n keys, icons) so the Liste tab's non-empty-draft
 * layout (Figma "List / full") renders an identical card.
 */
const RequestSummaryCard: React.FC<RequestSummaryCardProps> = ({ request, onPress }) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const ready = request.status === "validated";

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.requestCard, isArabic && styles.rowReverse]}
      accessibilityRole="button"
    >
      <CustomIcon name={ready ? "orders" : "clock"} size={50} />
      <View style={styles.requestInfo}>
        <View style={[styles.referenceRow, isArabic && styles.rowReverse]}>
          <Text type="label" style={styles.reference}>
            {t("home.reference", { value: request.reference })}
          </Text>
          {ready ? <Text type="defaultTwo" semiBold style={styles.ready}>home.ready</Text> : null}
        </View>
        <Text type="defaultTwo" semiBold style={styles.requestStatus}>
          {ready ? "home.offersReceived" : "home.priceCountdown"}
        </Text>
        <Text type="defaultTwo" semiBold style={styles.requestExpiry} translate={false}>
          {ready
            ? t("home.expiresIn", { value: request.expiresDisplay ?? "" })
            : request.expiresDisplay ?? ""}
        </Text>
      </View>
      <View style={styles.requestActionWrap}>
        <View style={[styles.requestAction, ready ? styles.readyAction : styles.detailAction, isArabic && styles.rowReverse]}>
          <Text type="defaultTwo" semiBold style={styles.actionText}>
            {ready ? "home.checkPrices" : "home.details"}
          </Text>
          <CustomIcon name={isArabic ? "arrow_left" : "arrow_right"} size={18} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  rowReverse: { flexDirection: "row-reverse" },
  requestCard: { minHeight: 84, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.white, borderRadius: 7, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 10, shadowColor: Colors.gray, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.16, shadowRadius: 8, elevation: 4 },
  requestInfo: { flex: 1, minWidth: 0 },
  referenceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  reference: { color: Colors.greyLight2 },
  ready: { color: Colors.greenDark, fontSize: 13 },
  requestStatus: { marginTop: 3, fontSize: 14, lineHeight: 17 },
  requestExpiry: { marginTop: 11, fontSize: 14, lineHeight: 17 },
  requestActionWrap: { alignSelf: "flex-end" },
  requestAction: { minWidth: 96, minHeight: 26, borderRadius: 3, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  readyAction: { backgroundColor: Colors.green },
  detailAction: { backgroundColor: Colors.primary },
  actionText: { fontSize: 13 },
});

export default RequestSummaryCard;
