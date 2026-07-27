/**
 * /(prestataire)/offers/[offerId]/fill.tsx
 *
 * P3 sub-flow A: Prestataire offer fill form.
 *
 * The route param `offerId` is actually the incoming **requestId** for the
 * "fill new offer" path.  The screen:
 *
 *   1. Loads the incoming request (images, items, vehicle note, timer).
 *   2. For each request item the prestataire enters:
 *        - Photos (ImageInputList)
 *        - Condition (en_stock | occasion) picker
 *        - Prix/pièce (priceFerrailleur — their net price; server derives ×1.06 / ×0.94)
 *        - Commentaire (optional free-text)
 *   3. "Envoyer l'offre" → submitOffer → success state.
 *   4. "Refuser" → ConfirmModal bottom sheet (reason + comment) → declineRequest.
 *   5. Resend flow (query param ?mode=resend&existingOfferId=NNN):
 *        shows previous offer lines pre-filled; "Ajouter à mes offres" → resendOffer.
 *
 * Rules:
 *   - TypeScript strict — no `any`
 *   - RTL-aware via common/View + common/Text
 *   - All displayable strings are FR keys auto-translated; translate={false} on prices/refs
 *   - priceFerrailleur only — never expose priceClient / priceBc to the partner screen
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/common/Screen';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import Button from '@/components/common/Button';
import ConfirmModal from '@/components/common/ConfirmModal';
import CustomHeader from '@/components/common/CustomHeader';
import ImageInputList from '@/components/common/ImageInputList';
import AudioPlayer from '@/components/common/AudioPlayer';
import PickerInput from '@/components/common/PickerInput';
import Colors from '@/constants/Colors';

import {
  submitOffer,
  declineRequest,
  resendOffer,
  getPrestataireIncomingRequests,
  getPrestataireOffer,
  type SubmitOfferLinePayload,
} from '@/api/resources/prestataire';
import type { Request, RequestItem } from '@/interfaces/Request';
import type { Offer } from '@/interfaces/Offer';

// ── Types ──────────────────────────────────────────────────────────────────────

type ConditionOption = 'en_stock' | 'occasion';

interface OfferLine {
  requestItemId: number;
  priceFerrailleur: string; // raw string while editing; parsed on submit
  condition: ConditionOption;
  description: string;
  images: string[];
}

// ── Condition picker items ─────────────────────────────────────────────────────

// ── Countdown helper ──────────────────────────────────────────────────────────

function formatCountdown(expiresAt: string | null): string {
  if (!expiresAt) return '—';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expiré';
  const totalSeconds = Math.floor(diff / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}min`;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PrestataireOfferFillScreen(): React.ReactElement {
  const router = useRouter();
  const { offerId, mode, existingOfferId, state } = useLocalSearchParams<{
    offerId: string;
    mode?: string;
    existingOfferId?: string;
    state?: string;
  }>();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const requestId = Number(offerId);
  const isResendMode = mode === 'resend';
  const existingOfferIdNum = existingOfferId ? Number(existingOfferId) : null;
  const conditionItems: { id: number; title: string; value: ConditionOption }[] = [
    { id: 1, title: t('partner.fill.conditionOccasion'), value: 'occasion' },
    { id: 2, title: t('partner.fill.conditionEnStock'), value: 'en_stock' },
  ];
  const declineReasonItems: { id: number; title: string }[] = [1, 2, 3, 4].map((id) => ({
    id,
    title: t(`partner.decline.reason${id}`),
  }));

  // ── State ──────────────────────────────────────────────────────────────────

  const [request, setRequest] = useState<Request | null>(null);
  const [existingOffer, setExistingOffer] = useState<Offer | null>(null);
  const [loadingRequest, setLoadingRequest] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [offerLines, setOfferLines] = useState<OfferLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);

  // Decline modal state
  const [declineVisible, setDeclineVisible] = useState(false);
  const [declineReason, setDeclineReason] = useState<{ id: number; title: string } | undefined>(
    undefined,
  );
  const [declineComment, setDeclineComment] = useState('');
  const [declining, setDeclining] = useState(false);

  // Resend state
  const [resendingOffer, setResendingOffer] = useState(false);

  // Countdown ticker
  const [countdownLabel, setCountdownLabel] = useState('');

  useEffect(() => {
    if (state === 'decline') setDeclineVisible(true);
  }, [state]);

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoadingRequest(true);
    setLoadError(null);
    try {
      // Fetch the incoming request by id (reuse GET /prestataire/incoming-requests mock)
      // The mock data is keyed by request id; we re-use the mock setup from registry
      // by calling the prestataire incoming requests mock through a simple find approach.
      // In real mode this would be: GET /prestataire/requests/:id
      const res = await getPrestataireIncomingRequests();
      const found = res.data.find((r) => r.id === requestId) ?? null;
      setRequest(found);

      if (found?.items) {
        setOfferLines(
          found.items.map((item) => ({
            requestItemId: item.id,
            priceFerrailleur: '',
            condition: item.condition,
            description: '',
            images: [],
          })),
        );
      }

      // If resend mode, load the existing offer to pre-fill
      if (isResendMode && existingOfferIdNum) {
        const offerRes = await getPrestataireOffer(existingOfferIdNum);
        setExistingOffer(offerRes.data);
      }
    } catch {
      setLoadError('Impossible de charger la demande');
    } finally {
      setLoadingRequest(false);
    }
  }, [requestId, isResendMode, existingOfferIdNum]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Countdown ticker — refresh every second
  useEffect(() => {
    if (!request?.expiresAt) return;
    const tick = () => setCountdownLabel(formatCountdown(request.expiresAt));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [request?.expiresAt]);

  // Pre-fill lines from existing offer when resend data arrives
  useEffect(() => {
    if (!existingOffer || !request?.items) return;
    setOfferLines((prev) =>
      prev.map((line, index) => {
        if (index === 0) {
          return {
            ...line,
            priceFerrailleur: String(existingOffer.priceFerrailleur),
            condition: existingOffer.availability === 'available'
              ? line.condition
              : line.condition,
            description: existingOffer.description ?? '',
            images: existingOffer.images ?? [],
          };
        }
        return line;
      }),
    );
  }, [existingOffer, request]);

  // ── Line helpers ───────────────────────────────────────────────────────────

  const updateLine = (
    index: number,
    patch: Partial<OfferLine>,
  ) => {
    setOfferLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, ...patch };
      return next;
    });
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (submitting) return;
    // Validate: every line must have a price
    const invalid = offerLines.some((l) => {
      const price = parseFloat(l.priceFerrailleur);
      return isNaN(price) || price <= 0;
    });
    if (invalid) {
      Alert.alert(
        t('partner.fill.errorMissingPrice'),
        t('partner.fill.errorMissingPriceBody'),
      );
      return;
    }

    setSubmitting(true);
    try {
      const lines: SubmitOfferLinePayload[] = offerLines.map((l) => ({
        requestItemId: l.requestItemId,
        priceFerrailleur: parseFloat(l.priceFerrailleur),
        condition: l.condition,
        description: l.description.trim() || null,
        images: l.images,
      }));
      await submitOffer(requestId, { lines });
      setSubmitDone(true);
    } catch {
      Alert.alert(
        t('partner.fill.errorTitle'),
        t('partner.fill.errorSubmit'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Decline ────────────────────────────────────────────────────────────────

  const handleDeclineConfirm = async () => {
    setDeclining(true);
    try {
      await declineRequest(requestId, {
        reason: declineReason?.title,
        comment: declineComment.trim() || undefined,
      });
      setDeclineVisible(false);
      router.back();
    } catch {
      Alert.alert(t('partner.fill.errorTitle'), t('partner.fill.errorDecline'));
    } finally {
      setDeclining(false);
    }
  };

  // ── Resend ─────────────────────────────────────────────────────────────────

  const handleResend = async () => {
    if (!existingOfferIdNum) return;
    setResendingOffer(true);
    try {
      await resendOffer(existingOfferIdNum);
      setSubmitDone(true);
    } catch {
      Alert.alert(t('partner.fill.errorTitle'), t('partner.fill.errorResend'));
    } finally {
      setResendingOffer(false);
    }
  };

  // ── Success state ──────────────────────────────────────────────────────────

  if (submitDone) {
    return (
      <Screen whatsapp={false} scrollable={false}>
        <CustomHeader title="partner.fill.openDetailTitle" />
        <View flex justifyContent="center" alignItems="center" p={24} gap={20}>
          <Text type="headerTitle" semiBold color={Colors.brand} center>
            {isResendMode ? 'partner.fill.successTitleResend' : 'partner.fill.successTitle'}
          </Text>
          <Text type="default" color={Colors.grayMidDark} center>
            {isResendMode
              ? 'partner.fill.successBodyResend'
              : 'partner.fill.successBody'}
          </Text>
          <Button
            title="partner.fill.successCta"
            variant="primary"
            onPress={() => router.replace('/(prestataire)/offers')}
          />
        </View>
      </Screen>
    );
  }

  // ── Loading / error ────────────────────────────────────────────────────────

  if (loadingRequest) {
    return (
      <Screen whatsapp={false} scrollable={false}>
        <CustomHeader title="partner.fill.openDetailTitle" />
        <View flex justifyContent="center" alignItems="center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </Screen>
    );
  }

  if (loadError || !request) {
    return (
      <Screen whatsapp={false} scrollable={false}>
        <CustomHeader title="partner.fill.openDetailTitle" />
        <View flex justifyContent="center" alignItems="center" p={24} gap={16}>
          <Text type="default" color={Colors.red} center>
            {loadError ?? 'Demande introuvable'}
          </Text>
          <Button title="partner.fill.retry" variant="primary" onPress={loadData} />
        </View>
      </Screen>
    );
  }

  const items: RequestItem[] = request.items ?? [];

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <Screen whatsapp={false} scrollable={false}>
      <CustomHeader title="partner.fill.openDetailTitle" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          style={isResendMode ? styles.resendScroll : undefined}
          contentContainerStyle={[
            styles.scrollContent,
            isResendMode ? styles.resendScrollContent : undefined,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Request images ── */}
          {!isResendMode && (request.images?.length ?? 0) > 0 && (
            <View style={styles.heroImageRow} flexDirection="row">
              {request.images!.slice(0, 3).map((uri, i) => (
                <Image key={`img-${i}`} source={{ uri }} style={styles.heroImageWrapper} resizeMode="cover" />
              ))}
            </View>
          )}

          {/* ── Vehicle / request info block ── */}
          {!isResendMode && <View style={styles.infoBlock} gap={6}>
            <Text type="small" semiBold color={Colors.brand}>
              {isArabic ? `المرجع: ${request.reference}` : `Réf: ${request.reference}`}
            </Text>
            {items[0] ? (
              <>
                <Text type="textTwo" semiBold translate={false}>
                  {isArabic ? items[0].categoryTitleAr ?? items[0].categoryTitle : items[0].categoryTitle}
                </Text>
                <View flexDirection="row" alignItems="center" gap={14}>
                  <Text type="label" translate={false}>
                    {`${t('partner.offerDetail.condition')} ${t(items[0].condition === 'occasion' ? 'partner.fill.conditionOccasion' : 'partner.fill.conditionEnStock')}`}
                  </Text>
                  <Text type="label" translate={false}>{`${t('partner.offerDetail.qty')} ${items[0].quantity}`}</Text>
                </View>
              </>
            ) : null}
            {request.notes ? (
              <View style={styles.noteBox}>
                <Text type="small" color={Colors.grayMidDark} translate={false}>
                  {request.notes}
                </Text>
              </View>
            ) : null}
          </View>}

          {isResendMode ? <View style={styles.sheetHandle} /> : null}

          {/* ── Section header: fill offer ── */}
          <View style={styles.sectionHeader} flexDirection="row" alignItems="center" gap={12}>
            <Text type="text" semiBold color={Colors.brand}>
              {isResendMode ? 'partner.fill.sectionResend' : 'partner.fill.sectionFill'}
            </Text>
            {!isResendMode && (
              <View style={[
                styles.timerBadge,
                countdownLabel === 'Expiré'
                  ? styles.timerBadgeExpired
                  : styles.timerBadgeActive,
              ]}>
                <Text
                  type="small"
                  semiBold
                  color={countdownLabel === 'Expiré' ? Colors.grayMidDark : Colors.noticeUnread}
                  translate={false}
                >
                  {countdownLabel}
                </Text>
                <Text
                  type="small"
                  color={countdownLabel === 'Expiré' ? Colors.grayMidDark : Colors.noticeUnread}
                >
                  partner.fill.timerRestante
                </Text>
              </View>
            )}
          </View>

          {/* ── Offer lines ── */}
          {offerLines.map((line, index) => {
            const item = items.find((it) => it.id === line.requestItemId);
            const categoryLabel = item
              ? isArabic
                ? item.categoryTitleAr ?? item.categoryTitle ?? '—'
                : item.categoryTitle ?? '—'
              : '—';

            const condItem = conditionItems.find((c) => c.value === line.condition);

            return (
              <View key={line.requestItemId} style={[styles.offerCard, isResendMode ? styles.resendOfferCard : undefined]} gap={12}>
                {/* Card header */}
                <View flexDirection="row" alignItems="center" justifyContent="space-between" gap={8}>
                  <View style={styles.offerIndexBadge}>
                    <Text type="small" semiBold color={Colors.brand} translate={false}>
                      {t('partner.fill.offerNumber', { count: index + 1 })}
                    </Text>
                  </View>
                  {isResendMode && (
                    <View style={styles.checkboxPlaceholder} />
                  )}
                </View>

                {isResendMode && existingOffer && index === 0 && (
                    <View style={styles.resendRecap} gap={10}>
                      {existingOffer.description ? (
                        <View gap={4}>
                          <Text type="textTwo" semiBold color={Colors.brand}>
                            partner.fill.remarksLabel
                          </Text>
                          <Text type="default" color={Colors.grayMidDark} style={styles.resendDescription} translate={false}>
                            {existingOffer.description}
                          </Text>
                        </View>
                      ) : null}
                      <View gap={6}>
                        <Text type="textTwo" semiBold color={Colors.brand}>
                          partner.fill.priceRecapLabel
                        </Text>
                        <View style={styles.resendPriceBadge}>
                          <Text type="textTwo" semiBold color={Colors.brand} translate={false}>
                            {`${existingOffer.priceFerrailleur.toFixed(2)} Dhs TTC`}
                          </Text>
                        </View>
                      </View>
                      <Text type="textTwo" semiBold color={Colors.brand}>
                        partner.fill.priceRecapLabel
                      </Text>
                      {existingOffer.audioUrl ? (
                        <View gap={6}>
                          <Text type="textTwo" semiBold color={Colors.brand}>
                            partner.offerDetail.audioNote
                          </Text>
                          <AudioPlayer uri={existingOffer.audioUrl} />
                        </View>
                      ) : null}
                      <Text type="textTwo" semiBold color={Colors.brand} numberOfLines={1}>
                        {`${t("partner.fill.conditionLabel")}: ${t("partner.fill.conditionOccasion")}`}
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.resendImages}>
                        {(existingOffer.images ?? []).map((uri, imageIndex) => (
                          <Image
                            key={`${uri}-${imageIndex}`}
                            source={{ uri }}
                            style={styles.resendImage}
                            resizeMode="cover"
                          />
                        ))}
                      </ScrollView>
                    </View>
                )}

                {!isResendMode && (
                  <>
                    <View style={styles.partNameRow} flexDirection="row" alignItems="center" gap={6}>
                      <Text type="small" color={Colors.grayMidDark} translate={false}>
                        {categoryLabel}
                      </Text>
                      {item?.quantity ? (
                        <Text type="small" color={Colors.gray} translate={false}>
                          {`� ${item.quantity}`}
                        </Text>
                      ) : null}
                    </View>
                    <View gap={4}>
                      <Text type="small" color={Colors.grayMidDark}>partner.fill.addPhotos</Text>
                      <ImageInputList
                        defaultimageUris={line.images}
                        onAddImage={(uri) => updateLine(index, { images: [...line.images, uri] })}
                        onRemoveImage={(uri) => updateLine(index, { images: line.images.filter((u) => u !== uri) })}
                        canAdd
                        canRemove
                        upload={false}
                      />
                    </View>
                    <View gap={4}>
                      <Text type="small" color={Colors.grayMidDark}>partner.fill.conditionLabel</Text>
                      <PickerInput
                        items={conditionItems}
                        placeholder={t("partner.fill.conditionPlaceholder")}
                        selectedItem={condItem}
                        onSelectItem={(picked) => {
                          const match = conditionItems.find((c) => c.id === picked.id);
                          if (match) updateLine(index, { condition: match.value });
                        }}
                      />
                    </View>
                    <View gap={4}>
                      <Text type="small" color={Colors.grayMidDark}>partner.fill.priceLabel</Text>
                      <View style={styles.priceRow} flexDirection="row" alignItems="center" gap={8}>
                        <View flex>
                          <RNTextInput
                            value={line.priceFerrailleur}
                            onChangeText={(v) => updateLine(index, { priceFerrailleur: v })}
                            placeholder={t("partner.fill.pricePlaceholder")}
                            placeholderTextColor={Colors.gray}
                            keyboardType="numeric"
                            style={[styles.priceInput, { textAlign: isArabic ? "right" : "left" }]}
                          />
                        </View>
                        <View style={styles.currencyBadge}>
                          <Text type="small" semiBold color={Colors.brand} translate={false}>Dhs</Text>
                        </View>
                      </View>
                      {parseFloat(line.priceFerrailleur) > 0 ? (
                        <Text type="small" color={Colors.primary} semiBold translate={false}>
                          {`${parseFloat(line.priceFerrailleur).toFixed(2)} Dhs TTC`}
                        </Text>
                      ) : null}
                    </View>
                    <View gap={4}>
                      <Text type="small" color={Colors.grayMidDark}>partner.fill.commentLabel</Text>
                      <RNTextInput
                        value={line.description}
                        onChangeText={(v) => updateLine(index, { description: v })}
                        placeholder={t("partner.fill.commentPlaceholder")}
                        placeholderTextColor={Colors.gray}
                        multiline
                        numberOfLines={3}
                        style={[styles.commentInput, { textAlign: isArabic ? "right" : "left" }]}
                      />
                    </View>
                  </>
                )}
              </View>

            );
          })}

          {/* Spacer at bottom so content clears fixed action bar */}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* ── Fixed action bar ── */}
        <View style={styles.actionBar} flexDirection="row" gap={12}>
          {/* Decline / Non */}
          <View style={styles.actionBtnWrap}>
            {isResendMode ? (
              <Button
                title="partner.fill.ctaBack"
                variant="secondary"
                onPress={() => router.back()}
              />
            ) : (
              <Button
                title="partner.fill.ctaDecline"
                variant="pink"
                rightIcon="close"
                iconTypeName="AntDesign"
                sizeIcon={14}
                onPress={() => setDeclineVisible(true)}
              />
            )}
          </View>

          {/* Submit / Resend */}
          <View style={styles.actionBtnWrap}>
            {isResendMode ? (
              <Button
                title={resendingOffer ? 'partner.fill.ctaResending' : 'partner.fill.ctaResend'}
                variant="primary"
                onPress={handleResend}
              />
            ) : (
              <Button
                title={submitting ? 'partner.fill.ctaSending' : 'partner.fill.ctaSend'}
                variant="primary"
                rightIcon="send"
                iconTypeName="Feather"
                sizeIcon={16}
                onPress={handleSubmit}
                disabled={submitting}
              />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── Decline bottom sheet ── */}
      <ConfirmModal
        visible={declineVisible}
        onClose={() => setDeclineVisible(false)}
        primaryButton={{
          title: declining ? 'partner.fill.ctaSending' : 'partner.decline.ctaConfirm',
          variant: 'pink',
          onPress: handleDeclineConfirm,
        }}
        secondaryButton={{
          title: 'partner.decline.ctaCancel',
          variant: 'primary',
          onPress: () => setDeclineVisible(false),
        }}
      >
        <View gap={16} pb={8}>
          <Text type="headerTitle" semiBold color={Colors.brand}>
            partner.decline.title
          </Text>

          {/* Reason picker */}
          <View gap={4}>
            <Text type="small" color={Colors.grayMidDark}>
              partner.decline.reasonLabel
            </Text>
            <PickerInput
              items={declineReasonItems}
              placeholder={t('partner.decline.reasonPlaceholder')}
              selectedItem={declineReason}
              onSelectItem={(picked) => {
                const match = declineReasonItems.find((r) => r.id === picked.id);
                setDeclineReason(match);
              }}
            />
          </View>

          {/* Comment */}
          <View gap={4}>
            <Text type="small" color={Colors.grayMidDark}>
              partner.decline.commentLabel
            </Text>
            <RNTextInput
              value={declineComment}
              onChangeText={setDeclineComment}
              placeholder={t('partner.decline.commentPlaceholder')}
              placeholderTextColor={Colors.gray}
              multiline
              numberOfLines={4}
              style={[
                styles.commentInput,
                { textAlign: i18n.language === 'ar' ? 'right' : 'left' },
              ]}
            />
          </View>
        </View>
      </ConfirmModal>
    </Screen>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  resendScroll: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -40,
  },
  resendScrollContent: {
    paddingTop: 28,
  },
  sheetHandle: {
    width: 120,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.grayMidDark,
    alignSelf: 'center',
    marginBottom: 24,
  },
  heroImageRow: {
    height: 180,
    backgroundColor: Colors.backgroundGray,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
  },
  heroImageWrapper: {
    flex: 1,
  },
  infoBlock: {
    marginBottom: 16,
  },
  resendImages: {
    flexDirection: 'row',
    gap: 25,
    paddingHorizontal: 8,
  },
  resendImage: {
    width: 120,
    height: 86,
    borderRadius: 0,
  },
  noteBox: {
    backgroundColor: Colors.backgroundGray,
    borderRadius: 6,
    padding: 10,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  timerBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  timerBadgeActive: {
    backgroundColor: Colors.noticeRead,
  },
  timerBadgeExpired: {
    backgroundColor: Colors.backgroundGray,
  },
  offerCard: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  resendOfferCard: {
    borderRadius: 0,
    padding: 0,
    paddingVertical: 12,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  offerIndexBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  partNameRow: {
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.backgroundGray,
  },
  priceRow: {
    alignItems: 'center',
  },
  priceInput: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'android' ? 8 : 12,
    fontSize: 16,
    color: Colors.brand,
    backgroundColor: Colors.backgroundLight,
  },
  currencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: Colors.backgroundGray,
    borderRadius: 5,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: Colors.brand,
    backgroundColor: Colors.backgroundLight,
    minHeight: 80,
  },
  resendRecap: {
    backgroundColor: Colors.white,
  },
  resendDescription: {
    maxWidth: 310,
  },
  resendPriceBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  bottomSpacer: {
    height: 80,
  },
  actionBar: {
    backgroundColor: Colors.backgroundLight,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 6,
  },
  actionBtnWrap: {
    flex: 1,
  },
});
