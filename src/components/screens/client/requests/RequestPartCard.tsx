import React from "react";
import { Image, ImageSourcePropType, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import CustomIcon from "@/components/common/CustomIcon";
import Icon from "@/components/common/Icon";
import Colors from "@/constants/Colors";

interface RequestPartCardProps {
  title: string;
  categoryLabel: string | null;
  /** Chosen part brand (D1), rendered as a gray line under the title. */
  brandLabel?: string | null;
  image: ImageSourcePropType | undefined;
  quantity: number;
  conditionLabel: string;
  /** undefined = pending state (no right column). number = validated offers for this part. */
  offersCount?: number;
  onOffers?: () => void;
  onResend?: () => void;
  /** Offers of this part already in the basket: 1 = "Dans le panier", 2+ = "2 dans le panier". */
  basketCount?: number;
}

/**
 * RequestPartCard — one row of "Pièces demandées" on the request detail
 * screen. Flat (no offersCount) in the pending state; adds an offers/resend
 * right column once the request has received offers (Figma "List / Commandez").
 */
const RequestPartCard: React.FC<RequestPartCardProps> = ({
  title,
  categoryLabel,
  brandLabel,
  image,
  quantity,
  conditionLabel,
  offersCount,
  onOffers,
  onResend,
  basketCount = 0,
}) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const [broken, setBroken] = React.useState(false);

  return (
    <View flexDirection="row" gap={12} style={styles.card}>
      {image && !broken ? (
        <Image source={image} style={styles.thumbnail} resizeMode="contain" onError={() => setBroken(true)} />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
      )}
      <View flex gap={4}>
        {categoryLabel ? (
          <Text type="small" color={Colors.gray} translate={false}>
            {t("requestList.category", { value: categoryLabel })}
          </Text>
        ) : null}
        <Text type="defaultTwo" semiBold translate={false}>{title}</Text>
        {brandLabel ? (
          <Text type="small" color={Colors.gray} translate={false}>
            {t("requestList.brand", { value: brandLabel })}
          </Text>
        ) : null}
        <Text type="small" color={Colors.gray} translate={false}>
          {`${t("requestFlow.quantity", { count: quantity })} · ${conditionLabel}`}
        </Text>
        {basketCount > 0 ? (
          <View flexDirection="row" alignItems="center" gap={6} style={styles.inBasket}>
            <CustomIcon name="cart" size={14} tintColor={Colors.greenDark} />
            <Text type="labelTwo" semiBold color={Colors.greenDark} translate={false}>
              {basketCount > 1 ? t("clientOffers.inCartCount", { count: basketCount }) : t("clientOffers.inCart")}
            </Text>
          </View>
        ) : null}
      </View>
      {offersCount !== undefined ? (
        <View alignItems="flex-end" justifyContent="space-between">
          {offersCount > 0 ? (
            <Text type="defaultTwo" semiBold translate={false}>{t("requestFlow.offersCount", { count: offersCount })}</Text>
          ) : (
            <Text type="small" color={Colors.error}>requestFlow.noOffer</Text>
          )}
          {offersCount > 0 ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("Les offres")}
              style={[styles.requestAction, styles.offersAction]}
              onPress={onOffers}
            >
              <Text type="labelTwo" semiBold translate={false}>{t("Les offres")}</Text>
              <CustomIcon name={isArabic ? "arrow_left" : "arrow_right"} size={16} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("requestFlow.resend")}
              style={[styles.requestAction, styles.resendAction]}
              onPress={onResend}
            >
              <Text type="labelTwo" semiBold translate={false}>{t("requestFlow.resend")}</Text>
              <Icon name="rotate-ccw" type="Feather" size={14} iconColor={Colors.brand} />
            </TouchableOpacity>
          )}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: 7, padding: 12, marginBottom: 12, backgroundColor: Colors.white, shadowColor: Colors.gray, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.16, shadowRadius: 8, elevation: 4 },
  thumbnail: { width: 48, height: 48, borderRadius: 6 },
  thumbnailPlaceholder: { backgroundColor: Colors.backgroundGray },
  requestAction: { height: 26, borderRadius: 3, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  inBasket: { marginTop: 2 },
  offersAction: { backgroundColor: Colors.primary },
  resendAction: { backgroundColor: Colors.orange },
});

export default RequestPartCard;
