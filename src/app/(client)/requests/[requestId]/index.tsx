/**
 * RequestDetailScreen — "Votre liste – F#######"
 *
 * Route: /(client)/requests/[requestId]
 *
 * Matches Figma: List-List-details
 *
 * Layout (scrollable):
 *   - ProgressStepperComponent (Envoyé → Commandez → Paiement → Traitement)
 *   - Countdown ring area + expiry label
 *   - "Pièces demandées" section — each RequestItem as a recap row
 *   - "Détails ajoutés" section — comment + attached images (ImageSlider)
 *   - "Vos autres demandes" entry card (shows offersCount + CTA to offers list)
 *
 * If status is 'offers_received', the bottom sticky bar shows "Vérifier les prix"
 * which navigates to the offers list. Otherwise it shows a waiting label.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View as RNView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/core";

import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import ImageSlider from "@/components/common/ImageSlider";
import Icon from "@/components/common/Icon";
import Colors from "@/constants/Colors";
import ProgressStepperComponent from "@/components/screens/shared/app/ProgressStepperComponent";
import ItemRequestComponent from "@/components/screens/shared/app/ItemRequestComponent";

import { getRequest } from "@/api";
import type { Request, RequestItem } from "@/interfaces/Request";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Map Request status to stepper step index (0-based). */
function statusToStep(status: string): number {
  switch (status) {
    case "pending":
      return 0;
    case "offers_received":
      return 1;
    case "validated":
    case "ordered":
      return 2;
    default:
      return 0;
  }
}

type LoadState = "loading" | "success" | "error";

// ── Screen ────────────────────────────────────────────────────────────────────

const RequestDetailScreen: React.FC = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const rawParams = useLocalSearchParams();
  const requestId = Number(
    typeof rawParams.requestId === "string" ? rawParams.requestId : 0
  );

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [request, setRequest] = useState<Request | null>(null);

  useEffect(() => {
    if (!requestId) {
      setLoadState("error");
      return;
    }
    setLoadState("loading");
    getRequest(requestId)
      .then((res) => {
        if (res.success && res.data) {
          setRequest(res.data as Request);
          setLoadState("success");
        } else {
          setLoadState("error");
        }
      })
      .catch(() => setLoadState("error"));
  }, [requestId]);

  useEffect(() => {
    if (request) {
      navigation.setOptions({
        title: `${t("Votre liste")} - F${request.reference}`,
      });
    }
  }, [navigation, request, t]);

  const handleViewOffers = useCallback(() => {
    router.push({
      pathname: "/(client)/requests/[requestId]/offers",
      params: { requestId: String(requestId) },
    } as Href);
  }, [router, requestId]);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loadState === "loading") {
    return (
      <Screen>
        <View flex style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </Screen>
    );
  }

  if (loadState === "error" || !request) {
    return (
      <Screen padding>
        <View flex style={styles.centered}>
          <Text type="default" color={Colors.gray}>
            Demande introuvable
          </Text>
          <Button
            title="Retour"
            variant="primary"
            onPress={() => router.back()}
            style={styles.errorBackBtn}
            fit
          />
        </View>
      </Screen>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const hasOffers =
    request.status === "offers_received" && request.offersCount > 0;
  const currentStep = statusToStep(request.status);
  const stepLabels = ["Envoyé", "Commandé", "Paiement", "Traitement"];

  const images =
    request.images && request.images.length > 0 ? request.images : null;

  const items: RequestItem[] = request.items ?? [];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Screen>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header card ─────────────────────────────────────── */}
        <ProgressStepperComponent
          steps={stepLabels}
          currentStep={currentStep}
          styleContainer={styles.stepper}
        />

        {/* ── Countdown / status block ─────────────────────────── */}
        {request.expiresAt && request.status === "pending" && (
          <View style={styles.countdownBlock} alignItems="center">
            <View style={styles.countdownRing} alignItems="center">
              <Text type="title" bold translate={false}>
                1h 30min
              </Text>
              <Text type="label" semiBold>
                Restant
              </Text>
            </View>
            <View flexDirection="row" gap={10} style={styles.expiryWarning}>
              <Icon
                name="exclamation-triangle"
                size={18}
                iconColor={Colors.redLight}
                type="FontAwesome5"
              />
              <Text type="label" color={Colors.redLight} flex>
                Veuillez remplir votre commande avant le délai d'expiration
              </Text>
            </View>
          </View>
        )}

        {hasOffers && (
          <View style={styles.offersReceivedBanner}>
            <Icon
              name="check-circle"
              size={20}
              iconColor={Colors.greenDark}
              type="FontAwesome5"
            />
            <Text type="label" semiBold color={Colors.greenDark} flex>
              Vous avez reçu vos offres
            </Text>
          </View>
        )}

        {/* ── Pièces demandées ─────────────────────────────────── */}
        <View style={styles.section}>
          <Text type="subTitle" semiBold color={Colors.brand} style={styles.sectionTitle}>
            Pièces demandées
          </Text>
          {items.length === 0 ? (
            <Text type="label" color={Colors.gray}>
              Aucune pièce
            </Text>
          ) : (
            items.map((item) => {
              const categoryLabel = isArabic
                ? item.categoryTitleAr ?? item.categoryTitle ?? "—"
                : item.categoryTitle ?? "—";
              return (
                <View key={item.id} style={styles.partRow}>
                  {/* Thumbnail placeholder */}
                  <View style={styles.partThumb}>
                    <Icon
                      name="cog"
                      size={22}
                      iconColor={Colors.gray}
                      type="FontAwesome5"
                    />
                  </View>

                  {/* Info */}
                  <View flex gap={2}>
                    <Text type="label" semiBold color={Colors.brand} translate={false}>
                      {categoryLabel}
                    </Text>
                    <View flexDirection="row" alignItems="center" gap={8}>
                      <Text type="small" color={Colors.gray}>
                        Qté:
                      </Text>
                      <Text type="small" color={Colors.brand} translate={false}>
                        {String(item.quantity)}
                      </Text>
                      <View style={styles.conditionBadge}>
                        <Text type="small" color={Colors.grayMidDark} translate={false}>
                          {isArabic
                            ? item.condition === "occasion"
                              ? "مستعمل"
                              : "جديد"
                            : item.condition === "occasion"
                            ? "Occasion"
                            : "En stock"}
                        </Text>
                      </View>
                    </View>
                    {item.notes ? (
                      <Text type="small" color={Colors.gray} translate={false}>
                        {item.notes}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ── Détails ajoutés ──────────────────────────────────── */}
        {(request.notes || images) && (
          <View style={styles.section}>
            <Text type="subTitle" semiBold color={Colors.brand} style={styles.sectionTitle}>
              Détails ajoutés
            </Text>

            {request.notes ? (
              <>
                <Text type="label" semiBold color={Colors.brand} style={styles.subLabel}>
                  Votre commentaire
                </Text>
                <Text type="default" color={Colors.grayMidDark} style={styles.commentText} translate={false}>
                  {request.notes}
                </Text>
              </>
            ) : null}

            {images ? (
              <>
                <Text type="label" semiBold color={Colors.brand} style={styles.subLabel}>
                  Vos images jointes
                </Text>
                <View style={styles.sliderWrapper}>
                  <ImageSlider images={images} />
                </View>
              </>
            ) : null}
          </View>
        )}

        {/* ── Other requests / offers entry ────────────────────── */}
        {hasOffers && (
          <View style={styles.section}>
            <Text type="subTitle" semiBold color={Colors.brand} style={styles.sectionTitle}>
              Vos autres demandes
            </Text>
            <ItemRequestComponent
              item={{
                id: request.id,
                ref: request.reference,
                status: "received",
                exp: "",
              }}
              onPress={handleViewOffers}
            />
          </View>
        )}

        <RNView style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── Sticky bottom bar ───────────────────────────────────── */}
      <View style={styles.stickyBar}>
        {hasOffers ? (
          <Button
            title="Vérifier les prix"
            variant="primary"
            rightIcon="arrow-right"
            iconType="standard"
            iconTypeName="FontAwesome5"
            sizeIcon={14}
            onPress={handleViewOffers}
            style={styles.stickyBtn}
          />
        ) : (
          <View flex alignItems="center">
            <Text type="label" color={Colors.grayMidDark} center>
              Vous obtiendrez un prix dans quelques heures
            </Text>
          </View>
        )}
      </View>
    </Screen>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 0 },
  centered: { justifyContent: "center", alignItems: "center" },
  errorBackBtn: { marginTop: 16, width: 160 },

  stepper: {
    marginHorizontal: 8,
    marginTop: 16,
  },

  countdownBlock: {
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  countdownRing: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 8,
    borderColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  expiryWarning: {
    alignItems: "flex-start",
    marginBottom: 16,
  },

  offersReceivedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.green,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },

  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  subLabel: {
    marginBottom: 4,
    marginTop: 8,
  },

  partRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  partThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.backgroundGray,
    justifyContent: "center",
    alignItems: "center",
  },
  conditionBadge: {
    backgroundColor: Colors.backgroundGray,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },

  commentText: {
    lineHeight: 22,
    marginBottom: 8,
  },

  sliderWrapper: {
    marginTop: 8,
    borderRadius: 8,
    overflow: "hidden",
  },

  bottomSpacer: { height: 90 },

  stickyBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.backgroundGray,
  },
  stickyBtn: {
    flex: 1,
    paddingVertical: 12,
  },
});

export default RequestDetailScreen;
