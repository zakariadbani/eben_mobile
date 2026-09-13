/**
 * /(prestataire)/offers/[offerId]/fill.tsx
 *
 * P3 sub-flow A: Prestataire offer fill form.
 *
 * The route param `offerId` is actually the incoming **requestId** for the
 * "fill new offer" path.  The screen:
 *
 *   1. Loads the incoming request (images, items, vehicle note, timer) and
 *      shows the focused item (?itemId, else the first item) in the header.
 *   2. For that ONE item the prestataire enters one or more offers, each with:
 *        - Photos (ImageInputList)
 *        - Condition (en_stock | occasion) picker
 *        - Prix/pièce (priceFerrailleur — their net price; server derives ×1.06 / ×0.94)
 *        - Commentaire (optional free-text)
 *   3. "Envoyer" (enabled once every line has a price and a photo) → submitOffer → success state.
 *   4. "Refuser" → ConfirmModal bottom sheet (reason + comment) → declineRequest.
 *   5. Resend flow (query param ?mode=resend&existingOfferId=NNN):
 *        Figma 356-24597 — a bottom sheet over a dimmed "Offres ouvertes - Détails"
 *        screen showing the previous offer; tick it, then "Ajouter à mes offres" → resendOffer.
 *
 * Rules:
 *   - TypeScript strict — no `any`
 *   - RTL-aware via common/View + common/Text
 *   - All displayable strings are FR keys auto-translated; translate={false} on prices/refs
 *   - priceFerrailleur only — never expose priceClient / priceBc to the partner screen
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Screen } from '@/components/common/Screen';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import Button from '@/components/common/Button';
import ConfirmModal from '@/components/common/ConfirmModal';
import CustomHeader from '@/components/common/CustomHeader';
import ImageInputList from '@/components/common/ImageInputList';
import ImageSlider from '@/components/common/ImageSlider';
import Icon from '@/components/common/Icon';
import AudioPlayer from '@/components/common/AudioPlayer';
import AudioRecorderInput from '@/components/common/AudioRecorderInput';
import PickerInput from '@/components/common/PickerInput';
import Colors from '@/constants/Colors';
import { vehicleSummaryLabel } from '@/helpers/vehicleSummary';

import {
  submitOffer,
  declineRequest,
  resendOffer,
  getPrestataireIncomingRequests,
  getPrestataireOffer,
  type SubmitOfferLinePayload,
} from '@/api/resources/prestataire';
import { uploadLocalAudio, uploadLocalImages } from '@/api/resources/uploads';
import { ApiClientError } from '@/api/types';
import { useCountdown } from '@/helpers/countdown';
import { remainingColor, remainingLabel } from '@/components/screens/prestataire/dashboard/remaining';
import type { Request, RequestItem } from '@/interfaces/Request';
import type { PrestataireOffer } from '@/interfaces/Offer';

// ── Types ──────────────────────────────────────────────────────────────────────

type ConditionOption = 'en_stock' | 'occasion';

interface OfferLine {
  /** Client-side identity — stable across add/remove so collapse state survives renumbering. */
  key: number;
  requestItemId: number;
  priceFerrailleur: string; // raw string while editing; parsed on submit
  condition: ConditionOption;
  description: string;
  images: string[];
  audio: string | null;
}

type OfferLineField = 'priceFerrailleur' | 'condition' | 'description' | 'images' | 'audio';
type OfferLineErrors = Record<number, Partial<Record<OfferLineField, string>>>;

const isLocalImage = (uri: string): boolean => /^(file|content):\/\//i.test(uri);

/** Client-side readiness of one offer line: a positive price and at least one local photo. */
const isLineReady = (line: OfferLine): boolean => {
  const price = Number(line.priceFerrailleur);
  return Number.isFinite(price) && price > 0
    && line.images.length > 0 && line.images.every(isLocalImage);
};

function mapOfferLineErrors(errors: Record<string, string[]>): OfferLineErrors {
  const mapped: OfferLineErrors = {};
  for (const [field, messages] of Object.entries(errors)) {
    const match = field.match(/^lines\.(\d+)\.(priceFerrailleur|condition|description|images|audio)(?:\.\d+)?$/);
    const message = messages[0];
    if (!match || !message) continue;
    const index = Number(match[1]);
    const key = match[2] as OfferLineField;
    mapped[index] = { ...mapped[index], [key]: message };
  }
  return mapped;
}

// ── Condition picker items ─────────────────────────────────────────────────────

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PrestataireOfferFillScreen(): React.ReactElement {
  const router = useRouter();
  const { offerId, mode, existingOfferId, state, itemId } = useLocalSearchParams<{
    offerId: string;
    mode?: string;
    existingOfferId?: string;
    state?: string;
    itemId?: string;
  }>();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const requestId = Number(offerId);
  const isResendMode = mode === 'resend';
  const existingOfferIdNum = existingOfferId ? Number(existingOfferId) : null;
  const hasValidRequestId = Number.isSafeInteger(requestId) && requestId > 0;
  const hasValidExistingOfferId = existingOfferIdNum !== null
    && Number.isSafeInteger(existingOfferIdNum)
    && existingOfferIdNum > 0;
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
  const [existingOffer, setExistingOffer] = useState<PrestataireOffer | null>(null);
  const [loadingRequest, setLoadingRequest] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [offerLines, setOfferLines] = useState<OfferLine[]>([]);
  const [collapsedLineKeys, setCollapsedLineKeys] = useState<Record<number, boolean>>({});
  const nextLineKeyRef = useRef(1);
  const [lineErrors, setLineErrors] = useState<OfferLineErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadedPaths, setUploadedPaths] = useState<Record<string, string>>({});
  const [uploadedAudioPaths, setUploadedAudioPaths] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [completedOfferId, setCompletedOfferId] = useState<number | null>(null);
  const mutationLock = useRef(false);

  // Decline modal state
  const [declineVisible, setDeclineVisible] = useState(false);
  const [declineReason, setDeclineReason] = useState<{ id: number; title: string } | undefined>(
    undefined,
  );
  const [declineComment, setDeclineComment] = useState('');
  const [declining, setDeclining] = useState(false);

  // Resend state — the old offer must be ticked before "Ajouter à mes offres" (Figma).
  const [resendingOffer, setResendingOffer] = useState(false);
  const [resendSelected, setResendSelected] = useState(false);
  // Tab screens stay mounted after `router.back()`, so the resend sheet (an RN
  // Modal) is only shown while this route is focused.
  const [isFocused, setIsFocused] = useState(false);
  useFocusEffect(useCallback(() => {
    setIsFocused(true);
    return () => setIsFocused(false);
  }, []));

  // Countdown ticker — refreshed every second via the shared helper.
  const countdownLabel = useCountdown(request?.expiresAt ?? null, t('partner.offer.statusExpired'), 1000);
  // ponytail: formatCountdown's own "—" placeholder is for callers with no
  // guard; this screen always had a blank timer for a missing deadline, so
  // override just the render text instead of changing the shared helper.
  const countdownDisplay = request?.expiresAt ? countdownLabel : '';
  const items: RequestItem[] = request?.items ?? [];
  const focusedItemIdParam = itemId ? Number(itemId) : null;
  const hasValidFocusedItemId = focusedItemIdParam !== null && Number.isSafeInteger(focusedItemIdParam) && focusedItemIdParam > 0;
  const focusedItem = hasValidFocusedItemId ? items.find((it) => it.id === focusedItemIdParam) ?? null : null;
  const headerItem = focusedItem ?? items[0] ?? null;
  const headerBrand = headerItem
    ? (isArabic ? headerItem.brandNameAr ?? headerItem.brandName : headerItem.brandName)
    : null;
  const isExpired = countdownLabel === t('partner.offer.statusExpired');
  // Figma: "0h 30min restante" / "0 س 30 دقيقة متبقية", in days from 24 h ("27j 12h restante")
  // — same label as the list cards (re-rendered every second by useCountdown).
  const timerText = !countdownDisplay || isExpired || !request?.expiresAt
    ? countdownDisplay
    : remainingLabel(request.expiresAt, isArabic);
  // Same thresholds as the list cards: red < 1h, amber ≤ 1h30, green beyond.
  const timerColor = isExpired ? Colors.grayMidDark : remainingColor(request?.expiresAt ?? null);
  const canSubmit = offerLines.length > 0 && offerLines.every(isLineReady);

  useEffect(() => {
    if (state === 'decline') setDeclineVisible(true);
  }, [state]);

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoadingRequest(true);
    setLoadError(null);
    try {
      if (isResendMode) {
        setRequest(null);
        if (!hasValidExistingOfferId) {
          setExistingOffer(null);
          return;
        }
        const offerRes = await getPrestataireOffer(existingOfferIdNum);
        const ownedOffer = offerRes.data;
        setExistingOffer(ownedOffer);
        setOfferLines([{
          key: nextLineKeyRef.current++,
          requestItemId: ownedOffer.requestItemId,
          priceFerrailleur: String(ownedOffer.priceFerrailleur),
          condition: ownedOffer.condition,
          description: ownedOffer.description ?? '',
          images: ownedOffer.images,
          audio: null,
        }]);
        return;
      }

      setExistingOffer(null);
      if (!hasValidRequestId) {
        setRequest(null);
        return;
      }
      const res = await getPrestataireIncomingRequests();
      const found = res.data.find((r) => r.id === requestId) ?? null;
      setRequest(found);

      // The screen is about ONE part: the focused item (from ?itemId) or the
      // first item. The partner may add several offers for that same item.
      const target = (hasValidFocusedItemId
        ? found?.items?.find((it) => it.id === focusedItemIdParam)
        : undefined) ?? found?.items?.[0];
      setCollapsedLineKeys({});
      setOfferLines(target ? [{
        key: nextLineKeyRef.current++,
        requestItemId: target.id,
        priceFerrailleur: '',
        condition: target.condition,
        description: '',
        images: [],
        audio: null,
      }] : []);
    } catch {
      setLoadError(t('partner.fill.loadError'));
    } finally {
      setLoadingRequest(false);
    }
  }, [
    existingOfferIdNum,
    focusedItemIdParam,
    hasValidExistingOfferId,
    hasValidFocusedItemId,
    hasValidRequestId,
    isResendMode,
    requestId,
    t,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    setLineErrors((prev) => {
      const currentErrors = prev[index];
      if (!currentErrors) return prev;
      const nextLineErrors = { ...currentErrors };
      for (const field of Object.keys(patch) as OfferLineField[]) delete nextLineErrors[field];
      const next = { ...prev };
      if (Object.keys(nextLineErrors).length === 0) delete next[index];
      else next[index] = nextLineErrors;
      return next;
    });
  };

  /** Expands the lines that carry errors so every message is visible. */
  const expandLinesWithErrors = (errors: OfferLineErrors) => {
    const keys = Object.keys(errors)
      .map((index) => offerLines[Number(index)]?.key)
      .filter((key): key is number => key !== undefined);
    if (keys.length === 0) return;
    setCollapsedLineKeys((prev) => {
      const next = { ...prev };
      keys.forEach((key) => { delete next[key]; });
      return next;
    });
  };

  const addLine = () => {
    const template = offerLines[0];
    if (!template) return;
    const key = nextLineKeyRef.current++;
    setOfferLines((prev) => [...prev, {
      key,
      requestItemId: template.requestItemId,
      priceFerrailleur: '',
      condition: template.condition,
      description: '',
      images: [],
      audio: null,
    }]);
    // Focus the new offer: previous lines fold, the added one opens.
    setCollapsedLineKeys(Object.fromEntries(offerLines.map((line) => [line.key, true])));
  };

  const removeLine = (index: number) => {
    const removed = offerLines[index];
    if (!removed || offerLines.length <= 1) return;
    const remaining = offerLines.filter((_, i) => i !== index);
    setOfferLines((prev) => prev.filter((_, i) => i !== index));
    setCollapsedLineKeys((prev) => {
      const next = { ...prev };
      delete next[removed.key];
      // Never leave the form with every offer folded: reopen the last one.
      const last = remaining[remaining.length - 1];
      if (last && remaining.every((line) => next[line.key] === true)) delete next[last.key];
      return next;
    });
    // Errors are indexed by position (mirrors the API's lines.<index>.<field>),
    // so drop the removed slot and shift the ones after it down by one.
    setLineErrors((prev) => {
      const next: OfferLineErrors = {};
      for (const [rawIndex, errors] of Object.entries(prev)) {
        const i = Number(rawIndex);
        if (i < index) next[i] = errors;
        else if (i > index) next[i - 1] = errors;
      }
      return next;
    });
  };

  const toggleLineCollapsed = (key: number) => {
    setCollapsedLineKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!hasValidRequestId || mutationLock.current) return;
    const validationErrors: OfferLineErrors = {};
    offerLines.forEach((line, index) => {
      const errors: Partial<Record<OfferLineField, string>> = {};
      const price = Number(line.priceFerrailleur);
      if (!Number.isFinite(price) || price <= 0) {
        errors.priceFerrailleur = t('partner.fill.errorMissingPriceBody');
      }
      if (line.images.length === 0 || line.images.some((uri) => !isLocalImage(uri))) {
        errors.images = t('requestFlow.noPhoto');
      }
      if (Object.keys(errors).length > 0) validationErrors[index] = errors;
    });
    if (Object.keys(validationErrors).length > 0) {
      setLineErrors(validationErrors);
      expandLinesWithErrors(validationErrors);
      return;
    }

    mutationLock.current = true;
    setLineErrors({});
    setSubmitError(null);
    setSubmitting(true);
    try {
      const localUris = offerLines.flatMap((line) => line.images);
      const pendingUris = localUris.filter((uri) => uploadedPaths[uri] === undefined);
      const newPaths = pendingUris.length > 0 ? await uploadLocalImages(pendingUris) : [];
      const nextUploadedPaths = { ...uploadedPaths };
      pendingUris.forEach((uri, index) => {
        const path = newPaths[index];
        if (path) nextUploadedPaths[uri] = path;
      });
      if (localUris.some((uri) => !nextUploadedPaths[uri])) throw new Error('Incomplete image upload');
      setUploadedPaths(nextUploadedPaths);

      const localAudioUris = offerLines
        .map((line) => line.audio)
        .filter((uri): uri is string => uri !== null);
      const pendingAudioUris = localAudioUris.filter((uri) => uploadedAudioPaths[uri] === undefined);
      const newAudioPaths = pendingAudioUris.length > 0 ? await uploadLocalAudio(pendingAudioUris) : [];
      const nextUploadedAudioPaths = { ...uploadedAudioPaths };
      pendingAudioUris.forEach((uri, index) => {
        const path = newAudioPaths[index];
        if (path) nextUploadedAudioPaths[uri] = path;
      });
      if (localAudioUris.some((uri) => !nextUploadedAudioPaths[uri])) throw new Error('Incomplete audio upload');
      setUploadedAudioPaths(nextUploadedAudioPaths);

      const lines: SubmitOfferLinePayload[] = offerLines.map((line) => ({
        requestItemId: line.requestItemId,
        priceFerrailleur: Number(line.priceFerrailleur),
        condition: line.condition,
        description: line.description.trim() || null,
        images: line.images.map((uri) => nextUploadedPaths[uri]!),
        ...(line.audio ? { audio: nextUploadedAudioPaths[line.audio]! } : {}),
      }));
      const result = await submitOffer(requestId, { lines });
      if (!result.data.success || !Number.isSafeInteger(result.data.offerId) || result.data.offerId <= 0) {
        throw new Error('Invalid offer response');
      }
      setCompletedOfferId(result.data.offerId);
      setSubmitDone(true);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 422) {
        const mapped = mapOfferLineErrors(error.errors);
        setLineErrors(mapped);
        expandLinesWithErrors(mapped);
        if (Object.keys(mapped).length === 0) setSubmitError(error.message);
      } else {
        // Surface the backend's own message (e.g. a condition-mismatch rule
        // rejected outside a 422 field-validation shape) — only fall back to
        // the generic copy when the API gave us nothing useful to show.
        const message = error instanceof ApiClientError && error.message
          ? error.message
          : t('partner.fill.errorSubmit');
        setSubmitError(message);
        Alert.alert(t('partner.fill.errorTitle'), message);
      }
    } finally {
      mutationLock.current = false;
      setSubmitting(false);
    }
  };

  // ── Decline ────────────────────────────────────────────────────────────────

  const handleDeclineConfirm = async () => {
    if (!hasValidRequestId || mutationLock.current) return;
    mutationLock.current = true;
    setDeclining(true);
    try {
      const result = await declineRequest(requestId, {
        reason: declineReason?.title,
        comment: declineComment.trim() || undefined,
      });
      if (!result.data.success || result.data.requestId !== requestId) throw new Error('Invalid decline response');
      setDeclineVisible(false);
      router.back();
    } catch {
      Alert.alert(t('partner.fill.errorTitle'), t('partner.fill.errorDecline'));
    } finally {
      mutationLock.current = false;
      setDeclining(false);
    }
  };

  // ── Resend ─────────────────────────────────────────────────────────────────

  const handleResend = async () => {
    if (!hasValidExistingOfferId || !resendSelected || mutationLock.current) return;
    mutationLock.current = true;
    setResendingOffer(true);
    try {
      const result = await resendOffer(existingOfferIdNum);
      if (!result.data.success || !Number.isSafeInteger(result.data.offerId) || result.data.offerId <= 0) {
        throw new Error('Invalid resend response');
      }
      setCompletedOfferId(result.data.offerId);
      setSubmitDone(true);
    } catch {
      Alert.alert(t('partner.fill.errorTitle'), t('partner.fill.errorResend'));
    } finally {
      mutationLock.current = false;
      setResendingOffer(false);
    }
  };

  // ── Success state ──────────────────────────────────────────────────────────

  if (submitDone) {
    return (
      <Screen statusBarStyle="dark-content" whatsapp={false} scrollable={false} edges={['bottom']}>
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
            onPress={() => completedOfferId && router.replace(`/(prestataire)/offers/${completedOfferId}?sent=1` as never)}
          />
        </View>
      </Screen>
    );
  }

  // ── Loading / error ────────────────────────────────────────────────────────

  if (loadingRequest) {
    return (
      <Screen statusBarStyle="dark-content" whatsapp={false} scrollable={false} edges={['bottom']}>
        <CustomHeader title="partner.fill.openDetailTitle" />
        <View flex justifyContent="center" alignItems="center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </Screen>
    );
  }

  if (loadError || (isResendMode ? !existingOffer : !request)) {
    return (
      <Screen statusBarStyle="dark-content" whatsapp={false} scrollable={false} edges={['bottom']}>
        <CustomHeader title="partner.fill.openDetailTitle" />
        <View flex justifyContent="center" alignItems="center" p={24} gap={16}>
          <Text type="default" color={Colors.red} center>
            {loadError ?? t('partner.fill.notFound')}
          </Text>
          <Button title="partner.fill.retry" variant="primary" onPress={loadData} />
        </View>
      </Screen>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  const content = (
    <>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isResendMode ? styles.resendScrollContent : undefined,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero: full-width request image carousel (Figma "1/6" counter) ── */}
          {!isResendMode && (
            (request?.images?.length ?? 0) > 0 ? (
              <View style={styles.heroContainer}>
                <ImageSlider
                  images={request?.images ?? []}
                  height={185}
                  resizeMode="contain"
                  counterPlacement="below"
                />
              </View>
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text color={Colors.grayMidDark}>requestFlow.noPhoto</Text>
              </View>
            )
          )}

          {/* ── Part info block (Figma: name, brand, Condition, Qty, vehicle chip, ref) ── */}
          {!isResendMode && headerItem ? (
            <View style={styles.infoBlock} gap={8}>
              <Text type="textTwo" semiBold color={Colors.brand} translate={false}>
                {isArabic ? headerItem.categoryTitleAr ?? headerItem.categoryTitle : headerItem.categoryTitle}
              </Text>
              {headerBrand ? (
                <Text type="small" color={Colors.grayMidDark} translate={false}>
                  {t('requestList.brand', { value: headerBrand })}
                </Text>
              ) : null}
              <View flexDirection="row" alignItems="center" gap={6}>
                <Icon name="check-circle-outline" type="MaterialCommunityIcons" size={20} iconColor={Colors.brand} />
                <Text type="label" translate={false}>
                  {`${t('partner.offerDetail.condition')} ${t(headerItem.condition === 'occasion' ? 'partner.fill.conditionOccasion' : 'partner.fill.conditionEnStock')}`}
                </Text>
              </View>
              <Text type="label" translate={false}>{`${t('partner.offerDetail.qty')} ${headerItem.quantity}`}</Text>
              <View style={styles.vehicleCard} flexDirection="row" alignItems="center" gap={12}>
                <Icon name="car-outline" type="MaterialCommunityIcons" size={31} iconColor={Colors.black} />
                <Text type="label" flex translate={false}>
                  {vehicleSummaryLabel(request?.vehicle) ?? t('partner.ship.vehicleFallback')}
                </Text>
              </View>
              <Text type="small" color={Colors.grayMidDark} translate={false}>
                {`${t('partner.offerDetail.ref')} ${request?.reference ?? ''}`}
              </Text>
            </View>
          ) : null}

          {/* ── Client note ── */}
          {!isResendMode && request?.notes ? (
            <View style={styles.noteBlock} gap={6}>
              <Text type="defaultTwo" color={Colors.grayMidDark}>
                {t('partner.fill.clientGeneralNote')}
              </Text>
              <View style={styles.noteBox}>
                <Text type="small" color={Colors.grayMidDark} translate={false}>
                  {request.notes}
                </Text>
              </View>
            </View>
          ) : null}

          {/* ── Section header: fill offer + countdown ── */}
          <View
            style={[styles.sectionHeader, isResendMode ? undefined : styles.bodyPadding]}
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            gap={12}
          >
            <Text type={isResendMode ? 'subTitleTwo' : 'titleTwo'} semiBold color={Colors.brand} flex>
              {isResendMode ? 'partner.fill.sectionResend' : 'partner.fill.sectionFill'}
            </Text>
            {!isResendMode && timerText ? (
              <Text type="subTitleTwo" semiBold color={timerColor} translate={false}>
                {timerText}
              </Text>
            ) : null}
          </View>

          {/* ── Offer lines ── */}
          <View style={isResendMode ? undefined : styles.bodyPadding}>
          {offerLines.map((line, index) => {
            const condItem = conditionItems.find((c) => c.value === line.condition);
            const isCollapsed = !isResendMode && collapsedLineKeys[line.key] === true;
            // Figma: the trash icon only sits on added offers, never on Offre 1.
            const canRemove = !isResendMode && index > 0;

            return (
                <View key={line.key} style={styles.offerLine} gap={12}>
                {/* Card header */}
                <View flexDirection="row" alignItems="center" justifyContent="space-between" gap={8}>
                  {isResendMode ? (
                    <View style={styles.offerIndexBadge}>
                      <Text type="text" color={Colors.grayMidDark} translate={false}>
                        {t('partner.fill.offerNumber', { count: index + 1 })}
                      </Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => toggleLineCollapsed(line.key)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: !isCollapsed }}
                      accessibilityLabel={t('partner.fill.offerLabel', { count: index + 1 })}
                      style={styles.offerToggle}
                    >
                      <View flexDirection="row" alignItems="center" gap={12}>
                        <Icon name={isCollapsed ? 'plus' : 'minus'} type="Feather" size={24} iconColor={Colors.brand} />
                        <Text type="subTitleTwo" semiBold color={Colors.brand} translate={false}>
                          {t('partner.fill.offerLabel', { count: index + 1 })}
                        </Text>
                      </View>
                    </Pressable>
                  )}
                  {isResendMode && index === 0 ? (
                    <Pressable
                      onPress={() => setResendSelected((selected) => !selected)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: resendSelected }}
                      accessibilityLabel={t('partner.fill.selectOffer', { count: index + 1 })}
                      hitSlop={12}
                      style={[styles.checkbox, resendSelected && styles.checkboxChecked]}
                    >
                      {resendSelected ? <Icon name="check" type="Feather" size={15} iconColor={Colors.primary} /> : null}
                    </Pressable>
                  ) : null}
                  {canRemove ? (
                    <Pressable
                      onPress={() => removeLine(index)}
                      accessibilityRole="button"
                      accessibilityLabel={t('partner.fill.removeOffer', { count: index + 1 })}
                      hitSlop={8}
                    >
                      <Icon name="trash-2" type="Feather" size={22} iconColor={Colors.brand} />
                    </Pressable>
                  ) : null}
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
                            {`${existingOffer.priceFerrailleur.toFixed(2)} ${t('partner.offerDetail.priceTtc')}`}
                          </Text>
                        </View>
                      </View>
                      {existingOffer.audioUrl ? (
                        <View gap={6}>
                          <Text type="textTwo" semiBold color={Colors.brand}>
                            partner.offerDetail.audioNote
                          </Text>
                          <AudioPlayer uri={existingOffer.audioUrl} />
                        </View>
                      ) : null}
                      <Text type="textTwo" semiBold color={Colors.brand} numberOfLines={1}>
                        {`${t("partner.offerDetail.condition")} ${t(existingOffer.condition === "occasion" ? "partner.fill.conditionOccasion" : "partner.fill.conditionEnStock")}`}
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

                {!isResendMode && !isCollapsed && (
                  <>
                    <View gap={4}>
                      <ImageInputList
                        imageUris={line.images}
                        onAddImage={(uri) => updateLine(index, { images: [...line.images, uri] })}
                        onRemoveImage={(uri) => updateLine(index, { images: line.images.filter((u) => u !== uri) })}
                        canAdd
                        canRemove
                        upload={false}
                        addLabel="partner.fill.addPhotos"
                      />
                      {lineErrors[index]?.images ? (
                        <Text type="small" color={Colors.red} translate={false}>{lineErrors[index].images}</Text>
                      ) : null}
                    </View>
                    <View gap={4}>
                      <Text type="default" color={Colors.brand}>partner.fill.conditionLabel</Text>
                      <PickerInput
                        items={conditionItems}
                        placeholder={t("partner.fill.conditionPlaceholder")}
                        selectedItem={condItem}
                        onSelectItem={(picked) => {
                          const match = conditionItems.find((c) => c.id === picked.id);
                          if (match) updateLine(index, { condition: match.value });
                        }}
                      />
                      {lineErrors[index]?.condition ? (
                        <Text type="small" color={Colors.red} translate={false}>{lineErrors[index].condition}</Text>
                      ) : null}
                    </View>
                    <View gap={4}>
                      <Text type="default" color={Colors.brand}>partner.fill.priceLabel</Text>
                      {/* Figma: "Dhs" suffix inside the field (no separate badge / TTC line). */}
                      <View style={styles.priceField} flexDirection="row" alignItems="center" gap={8}>
                        <RNTextInput
                          value={line.priceFerrailleur}
                          onChangeText={(v) => updateLine(index, { priceFerrailleur: v })}
                          placeholder={t("partner.fill.pricePlaceholder")}
                          placeholderTextColor={Colors.gray}
                          keyboardType="numeric"
                          style={[styles.priceInput, { textAlign: isArabic ? "right" : "left" }]}
                        />
                        <Text type="default" color={Colors.grayMidDark} translate={false}>{t('partner.currency')}</Text>
                      </View>
                      {lineErrors[index]?.priceFerrailleur ? (
                        <Text type="small" color={Colors.red} translate={false}>{lineErrors[index].priceFerrailleur}</Text>
                      ) : null}
                    </View>
                    <View gap={4}>
                      <Text type="default" color={Colors.brand}>partner.fill.commentLabel</Text>
                      <RNTextInput
                        value={line.description}
                        onChangeText={(v) => updateLine(index, { description: v })}
                        placeholder={t("partner.fill.commentPlaceholder")}
                        placeholderTextColor={Colors.gray}
                        multiline
                        numberOfLines={3}
                        style={[styles.commentInput, { textAlign: isArabic ? "right" : "left" }]}
                      />
                      {lineErrors[index]?.description ? (
                        <Text type="small" color={Colors.red} translate={false}>{lineErrors[index].description}</Text>
                      ) : null}
                    </View>
                    <AudioRecorderInput
                      value={line.audio}
                      onChange={(audio) => updateLine(index, { audio })}
                    />
                  </>
                )}
                </View>
            );
          })}

          {!isResendMode && offerLines.length > 0 ? (
            <Pressable
              onPress={addLine}
              accessibilityRole="button"
              accessibilityLabel={t('partner.fill.addAnotherOffer')}
              style={styles.addLineButton}
            >
              <View flexDirection="row" alignItems="center" gap={12}>
                <Icon name="plus" type="Feather" size={20} iconColor={Colors.grayMidDark} />
                <Text type="label" color={Colors.grayMidDark}>partner.fill.addAnotherOffer</Text>
              </View>
            </Pressable>
          ) : null}

          {submitError ? (
            <Text type="small" color={Colors.red} center translate={false}>{submitError}</Text>
          ) : null}
          </View>

          {/* Spacer at bottom so content clears fixed action bar */}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* ── Fixed action bar (sits directly above the tab bar; Figma 229-37335) ── */}
        <View style={styles.actionBar} flexDirection="row" gap={12}>
          {/* Decline / Non */}
          <View style={styles.actionBtnWrap}>
            {isResendMode ? (
              <Button
                title="partner.fill.ctaBack"
                variant="pink"
                onPress={() => router.back()}
              />
            ) : (
              <Button
                title="partner.fill.ctaDecline"
                variant="pink"
                rightIcon="x-circle"
                iconTypeName="Feather"
                sizeIcon={18}
                onPress={() => setDeclineVisible(true)}
              />
            )}
          </View>

          {/* Submit / Resend — disabled until ready; tapping the disabled send still reveals what is missing. */}
          <Pressable
            style={isResendMode ? styles.actionBtnWrap : styles.sendBtnWrap}
            onPress={!isResendMode && !canSubmit && !submitting ? () => void handleSubmit() : undefined}
            accessible={false}
          >
            {isResendMode ? (
              <Button
                title={resendingOffer ? 'partner.fill.ctaResending' : 'partner.fill.ctaResend'}
                variant="primary"
                onPress={handleResend}
                disabled={resendingOffer || !resendSelected}
              />
            ) : (
              <Button
                title={submitting ? 'partner.fill.ctaSending' : 'partner.fill.ctaSend'}
                variant="primary"
                rightIcon="send"
                iconTypeName="Feather"
                sizeIcon={16}
                onPress={handleSubmit}
                disabled={submitting || !canSubmit}
              />
            )}
          </Pressable>
        </View>
    </>
  );

  if (isResendMode) {
    return (
      <Screen statusBarStyle="dark-content" whatsapp={false} scrollable={false} edges={['bottom']}>
        <CustomHeader title="partner.fill.openDetailTitle" />
        <Modal
          transparent
          visible={isFocused}
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => router.back()}
        >
          <View style={styles.resendBackdrop}>
            <SafeAreaView edges={['top']} style={styles.flex}>
              <Pressable
                style={styles.resendBackdropTap}
                onPress={() => router.back()}
                accessible={false}
              />
              <View style={styles.resendSheet}>
                <View style={styles.sheetHandle} />
                {content}
                <SafeAreaView edges={['bottom']} style={styles.resendSafeBottom} />
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      </Screen>
    );
  }

  return (
    <Screen statusBarStyle="dark-content" whatsapp={false} scrollable={false} edges={['bottom']}>
      <CustomHeader title="partner.fill.openDetailTitle" />

      {/* Screen already avoids the keyboard: a second KeyboardAvoidingView here
          (offset 80) left the action bar ~90 dp above the tab bar once the
          keyboard closed. */}
      <View style={styles.flex}>
        {content}
      </View>

      {/* ── Decline bottom sheet ── */}
      <ConfirmModal
        visible={declineVisible}
        onClose={() => setDeclineVisible(false)}
        footerBorder="top"
        minHeightRatio={DECLINE_SHEET_HEIGHT_RATIO}
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
            <Text type="default" color={Colors.brand}>
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
            <Text type="default" color={Colors.brand}>
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

/** Figma 229-38465: the decline sheet top sits at ~25% of the screen. */
const DECLINE_SHEET_HEIGHT_RATIO = 0.75;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  // Hero slider is edge-to-edge, so horizontal padding lives on the inner blocks.
  scrollContent: {
    paddingBottom: 24,
  },
  bodyPadding: {
    paddingHorizontal: 16,
  },
  /** Figma 356-24597: the previous screen is dimmed behind the resend sheet. */
  resendBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  /** Strip of dimmed header left visible above the sheet (tap = close). */
  resendBackdropTap: {
    height: 24,
  },
  resendSheet: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundLight,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  resendSafeBottom: {
    backgroundColor: Colors.backgroundLight,
  },
  resendScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  heroContainer: {
    backgroundColor: Colors.white,
  },
  imagePlaceholder: {
    height: 185,
    backgroundColor: Colors.backgroundGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleCard: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 6,
    backgroundColor: Colors.white,
    shadowColor: Colors.gray,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  noteBlock: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  offerToggle: {
    flex: 1,
    paddingVertical: 4,
  },
  addLineButton: {
    paddingVertical: 12,
    marginBottom: 8,
  },
  sheetHandle: {
    width: 120,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.grayDark,
    alignSelf: 'center',
    marginTop: 10,
  },
  infoBlock: {
    paddingHorizontal: 16,
    paddingTop: 14,
    marginBottom: 20,
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
  /** Figma: offer lines are separated by thin dividers, not white cards. */
  offerLine: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.greyLight2,
  },
  offerIndexBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.brand,
  },
  priceField: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.backgroundLight,
  },
  priceInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'android' ? 8 : 12,
    fontSize: 16,
    color: Colors.brand,
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
  /** Figma: "Refuser" takes 1/3, "Envoyer" 2/3. */
  sendBtnWrap: {
    flex: 2,
  },
});
