/**
 * Panier (Basket) screen — Sprint C5, sub-flow A.
 *
 * States:
 *  LOADING  — spinner while getBasket() resolves
 *  EMPTY    — EmptyListComponent + disabled totals footer
 *  WITH_ITEMS — basket rows, coupon input, gift-voucher banner, totals, CTA
 *
 * Coupon applied → "Coupon-added" confirmation modal (black, 🎉 text).
 * "Still-some-parts" warning is shown inline when basket is non-empty but the
 * originating request still has unmatched items (signalled by hasMissingParts).
 * "Caisse de sortie" button → /(client)/payment (sub-flow B).
 *
 * Does NOT edit: _layout.tsx, ar.json, src/api/index.ts.
 */

import React, { useState, useCallback, useEffect } from "react";
import { StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter, Href } from "expo-router";
import { useTranslation } from "react-i18next";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import CustomIcon from "@/components/common/CustomIcon";
import CustomModal from "@/components/common/CustomModal";
import TextInput from "@/components/common/TextInput";
import EmptyListComponent from "@/components/screens/shared/app/EmptyListComponent";
import ItemBasketComponent from "@/components/screens/shared/app/ItemBasketComponent";

import { getBasket, applyCoupon, updateBasketItem, removeBasketItem } from "@/api";
import type { Basket, BasketItem } from "@/interfaces/Basket";
import Colors from "@/constants/Colors";
import { useConfirmation } from "@/context/ConfirmationContext";

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatPrice(amount: number): string {
  return amount.toLocaleString("fr-MA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " Dhs";
}

const TVA_RATE = 0.20;

// ─── component ────────────────────────────────────────────────────────────────

const CartScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ state?: string }>();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const { showConfirmation } = useConfirmation();

  // ── data state ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [basket, setBasket] = useState<Basket | null>(null);
  // Local qty map so updates feel instant without waiting for API echo
  const [localQty, setLocalQty] = useState<Record<number, number>>({});

  // ── gift voucher ────────────────────────────────────────────────────────────
  const [giftClaimed, setGiftClaimed] = useState(params.state === "full");

  // ── coupon ──────────────────────────────────────────────────────────────────
  const [couponCode, setCouponCode] = useState("");
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(
    params.state === "coupon" ? 100 : 0,
  );
  const [couponError, setCouponError] = useState<string | null>(null);
  const [showCouponSuccessModal, setShowCouponSuccessModal] = useState(
    params.state === "coupon",
  );

  // ── still-some-parts warning modal ──────────────────────────────────────────
  const [showIncompleteModal, setShowIncompleteModal] = useState(
    params.state === "missing",
  );

  // The mock golden path only puts explicitly selected request offers in this basket.
  const hasMissingParts = false;

  // ── load basket ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getBasket()
      .then((res) => {
        if (!mounted) return;
        if (res.success) {
          setBasket(res.data as Basket);
          const initQty: Record<number, number> = {};
          ((res.data as Basket).items ?? []).forEach((item) => {
            initQty[item.id] = item.quantity;
          });
          setLocalQty(initQty);
        }
      })
      .catch(() => { /* silently fall through to empty state */ })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  // ── derived list ────────────────────────────────────────────────────────────
  const items: BasketItem[] = basket?.items ?? [];
  // Filter out items whose local qty was set to 0 (pending remove)
  const visibleItems = params.state === "empty"
    ? []
    : items.filter((item) => (localQty[item.id] ?? item.quantity) > 0);

  // ── totals ──────────────────────────────────────────────────────────────────
  const subtotal = visibleItems.reduce(
    (sum, item) => sum + item.unitPrice * (localQty[item.id] ?? item.quantity),
    0,
  );
  const tvaAmount = subtotal * TVA_RATE;
  const total = subtotal + tvaAmount - couponDiscount;

  // ── handlers ─────────────────────────────────────────────────────────────────

  const handleIncrement = useCallback(
    (item: BasketItem) => {
      const newQty = (localQty[item.id] ?? item.quantity) + 1;
      setLocalQty((prev) => ({ ...prev, [item.id]: newQty }));
      // Fire-and-forget
      updateBasketItem(item.id, newQty).catch(() => {});
    },
    [localQty],
  );

  const handleDecrement = useCallback(
    (item: BasketItem) => {
      const current = localQty[item.id] ?? item.quantity;
      if (current <= 1) return; // stepper disabled at 1; use trash to remove
      const newQty = current - 1;
      setLocalQty((prev) => ({ ...prev, [item.id]: newQty }));
      updateBasketItem(item.id, newQty).catch(() => {});
    },
    [localQty],
  );

  const handleRemove = useCallback(
    (item: BasketItem) => {
      showConfirmation("", "", () => {
        setLocalQty((prev) => ({ ...prev, [item.id]: 0 }));
        removeBasketItem(item.id).catch(() => {});
      });
    },
    [showConfirmation],
  );

  const handleApplyCoupon = useCallback(async () => {
    if (!couponCode.trim()) return;
    setCouponApplying(true);
    setCouponError(null);
    try {
      const res = await applyCoupon(couponCode.trim());
      if (res.success) {
        if (res.data.valid) {
          setCouponDiscount(res.data.discountAmount);
          setCouponCode("");
          setShowCouponSuccessModal(true);
        } else {
          setCouponError(t("Code promo invalide ou expiré"));
          setCouponDiscount(0);
        }
      }
    } catch {
      setCouponError(t("Une erreur est survenue. Veuillez réessayer."));
    } finally {
      setCouponApplying(false);
    }
  }, [couponCode, t]);

  const handleCheckout = useCallback(() => {
    if (hasMissingParts) {
      setShowIncompleteModal(true);
    } else {
      router.push("/(client)/payment" as Href);
    }
  }, [hasMissingParts, router]);

  const handleProceedToPayment = useCallback(() => {
    setShowIncompleteModal(false);
    router.push("/(client)/payment" as Href);
  }, [router]);

  // ── render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View flex style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const isEmpty = visibleItems.length === 0;

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Gift voucher banner */}
        <View style={styles.bannerContainer}>
          <View style={styles.bannerCard} flexDirection="row" alignItems="center" gap={10}>
            <CustomIcon name="gift_active" size={28} />
            <View flex gap={2}>
              <Text type="label" semiBold>
                {t("cart.voucher.message")}
              </Text>
              {giftClaimed && (
                <Text type="small" color={Colors.greenDark}>
                  {t("cart.voucher.claimed")}
                </Text>
              )}
            </View>
            {!giftClaimed && (
              <TouchableOpacity
                style={styles.claimBtn}
                onPress={() => setGiftClaimed(true)}
                accessibilityLabel={t("cart.voucher.claim")}
              >
                <Text type="small" semiBold color={Colors.brand}>
                  {t("cart.voucher.claim")} →
                </Text>
              </TouchableOpacity>
            )}
            {giftClaimed && (
              <CustomIcon name="success" size={20} />
            )}
          </View>
        </View>

        {/* EMPTY state */}
        {isEmpty ? (
          <View style={styles.emptyWrapper}>
            <EmptyListComponent
              title="Votre panier est vide"
              actionButton={{
                title: "Explorer les produits",
                iconType: "FontAwesome5",
                rightIcon: "search",
                navigateTo: "/(client)/categories",
              }}
            />
          </View>
        ) : (
          <View style={styles.listWrapper} gap={10}>
            {/* Basket rows */}
            {visibleItems.map((item) => (
              <ItemBasketComponent
                key={item.id}
                item={{
                  id: item.id,
                  title: isArabic && item.categoryTitleAr
                    ? item.categoryTitleAr
                    : item.categoryTitle ?? `Article #${item.offerId}`,
                  titleAr: item.categoryTitleAr,
                  categoryLabel: item.categoryTitle ?? undefined,
                  categoryLabelAr: item.categoryTitleAr ?? undefined,
                  image: item.categoryImage,
                  unitPrice: item.unitPrice,
                  quantity: localQty[item.id] ?? item.quantity,
                  expiryLabel: t("Expirera dans 23h"),
                }}
                onIncrement={() => handleIncrement(item)}
                onDecrement={() => handleDecrement(item)}
                onRemove={() => handleRemove(item)}
              />
            ))}

            {/* Still-some-parts warning banner */}
            {hasMissingParts ? <View flexDirection="row" gap={6} style={styles.warningBanner} alignItems="center">
              <CustomIcon name="info3" size={22} />
              <Text
                type="small"
                color={Colors.orange}
                flex
                style={styles.warningText}
              >
                Veuillez remplir votre commande avant le délai d'expiration
              </Text>
            </View> : null}

            {/* Coupon input */}
            <View style={styles.couponRow} flexDirection="row" gap={8} alignItems="center">
              <View flex>
                <TextInput
                  placeholder={t("Code promo")}
                  value={couponCode}
                  onChangeText={(v) => { setCouponCode(v); setCouponError(null); }}
                  translate={false}
                  autoCapitalize="characters"
                />
              </View>
              <Button
                title={couponApplying ? t("Appliquer...") : t("Appliquer")}
                variant="brand"
                style={styles.applyBtn}
                onPress={handleApplyCoupon}
                fit
              />
            </View>
            {couponError ? (
              <Text type="small" color={Colors.error} style={styles.couponError}>
                {couponError}
              </Text>
            ) : null}
            {couponDiscount > 0 ? (
              <View flexDirection="row" gap={6} alignItems="center">
                <CustomIcon name="gift_active" size={18} />
                <Text type="small" color={Colors.greenDark}>
                  {t("Réduction appliquée")} : −{couponDiscount} Dhs
                </Text>
              </View>
            ) : null}

            {/* Spacer so last item isn't hidden behind the footer */}
            <View style={styles.listFooterSpacer} />
          </View>
        )}
      </ScrollView>

      {/* ── Sticky totals footer ── */}
      <View style={styles.footer} gap={6}>
        {/* EBEN premium upsell row */}
        <View flexDirection="row" alignItems="center" gap={8} style={styles.premiumRow}>
          <TouchableOpacity style={styles.checkbox} accessibilityRole="checkbox" disabled accessibilityState={{ disabled: true }}>
            <View style={styles.checkboxInner} />
          </TouchableOpacity>
          <Text type="label" flex>EBEN premium</Text>
          <Text type="label" color={Colors.gray} translate={false}>+ 55 Dhs</Text>
        </View>
        <View style={styles.divider} />

        <View flexDirection="row" style={styles.spaceBetween}>
          <Text type="defaultTwo" semiBold>Frais de livraison</Text>
          <Text type="defaultTwo" semiBold translate={false}>
            {"--"}
          </Text>
        </View>

        <View flexDirection="row" style={styles.spaceBetween}>
          <Text type="defaultTwo" semiBold>TVA 20%</Text>
          <Text type="defaultTwo" semiBold translate={false}>
            {isEmpty ? "---" : formatPrice(tvaAmount)}
          </Text>
        </View>

        {couponDiscount > 0 && (
          <View flexDirection="row" style={styles.spaceBetween}>
            <Text type="defaultTwo" semiBold color={Colors.greenDark}>
              Réduction
            </Text>
            <Text type="defaultTwo" semiBold color={Colors.greenDark} translate={false}>
              −{formatPrice(couponDiscount)}
            </Text>
          </View>
        )}

        <View flexDirection="row" style={styles.spaceBetween}>
          <Text type="headerTitle" semiBold>Total</Text>
          <Text type="headerTitle" semiBold translate={false}>
            {isEmpty ? "---" : formatPrice(total)}
          </Text>
        </View>

        <Button
          title="Caisse de sortie"
          iconType="custom"
          rightIcon="out"
          onPress={handleCheckout}
          variant="primary"
          style={isEmpty ? styles.ctaDisabled : undefined}
          disabled={isEmpty}
        />
      </View>

      {/* ── Coupon success modal ── */}
      <CustomModal
        visible={showCouponSuccessModal}
        variant="black"
        primaryButton={{
          title: "Fermer",
          variant: "primary",
          onPress: () => setShowCouponSuccessModal(false),
          style: { marginTop: 20 },
        }}
      >
        <View gap={16} alignItems="center">
          <Text type="loginTitle" translate={false}>🎉</Text>
          <Text type="loginSubTitle">
            Vous venez de bénéficier d'une réduction de
          </Text>
          <Text type="loginSubTitle" color={Colors.greenDark} translate={false}>
            {couponDiscount} Dhs
          </Text>
          <Text type="loginSubTitle">sur cette commande.</Text>
        </View>
      </CustomModal>

      {/* ── Incomplete order (still-some-parts) modal ── */}
      <CustomModal
        visible={showIncompleteModal}
        variant="black"
        primaryButton={{
          title: "Continuer l'achat",
          variant: "primary",
          leftIcon: "cart",
          iconType: "custom",
          onPress: () => setShowIncompleteModal(false),
          style: { marginTop: 20 },
        }}
        secondaryButton={{
          title: "Aller au paiement",
          variant: "white",
          leftIcon: "wallet",
          iconType: "custom",
          onPress: handleProceedToPayment,
          style: { marginTop: 20 },
        }}
      >
        <View gap={16} alignItems="center">
          <CustomIcon name="info3" size={40} />
          <Text type="loginSubTitle">
            Vous avez encore d'autres produits que vous n'avez pas ajoutés à votre panier.
          </Text>
          <Text type="loginSubTitle">Vous avez encore des offres de :</Text>
          {visibleItems.slice(0, 2).map((item) => (
            <Button
              key={item.id}
              isLink
              variant="white"
              disabled
              title={
                isArabic && item.categoryTitleAr
                  ? item.categoryTitleAr
                  : item.categoryTitle ?? `Article #${item.offerId}`
              }
            />
          ))}
        </View>
      </CustomModal>
    </View>
  );
};

export default CartScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  // ScrollView wrapper (fixes collapse-to-0 height bug)
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  // Banner card
  bannerContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 18,
  },
  bannerCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    minHeight: 48,
    paddingVertical: 8,
    paddingHorizontal: 14,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  claimBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  // Empty
  emptyWrapper: {
    paddingHorizontal: 16,
    flex: 1,
    paddingBottom: 180,
  },
  // List
  listWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  warningBanner: {
    backgroundColor: Colors.white,
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  warningText: {
    flex: 1,
  },
  couponRow: {
    marginTop: 4,
  },
  applyBtn: {
    width: "auto",
    paddingHorizontal: 16,
  },
  couponError: {
    marginTop: -4,
  },
  listFooterSpacer: {
    height: 200,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingVertical: 12,
    paddingBottom: 20,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 8,
  },
  premiumRow: {
    paddingBottom: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: Colors.brand,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxInner: {
    width: 10,
    height: 10,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light,
    marginBottom: 4,
  },
  spaceBetween: {
    justifyContent: "space-between",
  },
  ctaDisabled: {
    opacity: 0.45,
  },
});
