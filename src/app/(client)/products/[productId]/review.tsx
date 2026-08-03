/**
 * LeaveReviewScreen — form to post a product review.
 *
 * Route: /(client)/products/[productId]/review
 *
 * Figma ref: *Leave-a-review*
 *
 * Layout (Figma):
 *   - Stars row at top (no heading/subtitle above)
 *   - "Titre *" underline field (required)
 *   - "Commentaire *" underline field (required per Figma)
 *   - "Envoyer" button with paper-plane icon
 *   - Privacy notice row: info icon + text + blue link
 *
 * Validation: rating and title are required; comment required per Figma.
 */

import React, { useRef, useState } from "react";
import {
  StyleSheet,
  TextInput as RNTextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import CustomModal from "@/components/common/CustomModal";
import Icon from "@/components/common/Icon";
import RatingStars from "@/components/screens/shared/app/RatingStars";

import { postReview } from "@/api";
import { ApiClientError } from "@/api/client";
import { Role, useSession } from "@/context/AuthContext";
import { clientAuthHref } from "@/constants/clientReturnTo";
import Colors from "@/constants/Colors";

// ── Types ─────────────────────────────────────────────────────────────────────

type StarValue = 1 | 2 | 3 | 4 | 5;

// ── Screen ────────────────────────────────────────────────────────────────────

const LeaveReviewScreen: React.FC = () => {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { role } = useSession();

  const rawProductId = productId ?? "";
  const numericProductId = /^\d+$/.test(rawProductId) ? Number(rawProductId) : Number.NaN;
  const validProductId = Number.isSafeInteger(numericProductId) && numericProductId > 0;
  const submittingRef = useRef(false);

  const [rating, setRating] = useState<StarValue | 0>(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [comment, setComment] = useState("");
  const [ratingError, setRatingError] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [commentError, setCommentError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleRate = (star: StarValue) => {
    setRating(star);
    setRatingError(false);
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    if (role !== Role.CLIENT) {
      router.push(clientAuthHref(
        "/(auth)/ClientLoginScreen",
        `/(client)/products/${productId}/review`,
      ));
      return;
    }
    let valid = true;
    if (rating === 0) {
      setRatingError(true);
      valid = false;
    }
    if (reviewTitle.trim().length === 0) {
      setTitleError(true);
      valid = false;
    }
    if (comment.trim().length === 0) {
      setCommentError(true);
      valid = false;
    }
    if (!valid || !validProductId) {
      if (!validProductId) setSubmitError(t("review.submitError"));
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);

    try {
      await postReview(numericProductId, {
        rating: rating as StarValue,
        title: reviewTitle.trim(),
        comment: comment.trim(),
      });
      setSuccessVisible(true);
    } catch (error) {
      const fieldMessage = error instanceof ApiClientError
        ? Object.values(error.errors)[0]?.[0]
        : undefined;
      setSubmitError(fieldMessage ?? (error instanceof ApiClientError ? error.message : t("review.submitError")));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setSuccessVisible(false);
    router.back();
  };

  const isRtl = i18n.language === "ar";

  return (
    <Screen avoidKeyboard behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {/* ── Star rating ──────────────────────────────────────────── */}
            <View style={styles.starsWrapper} alignItems="center">
              <RatingStars
                mode="interactive"
                value={rating}
                onRate={handleRate}
                size={36}
              />
              {ratingError && (
                <Text
                  type="small"
                  color={Colors.error}
                  center
                  translate={false}
                  style={styles.fieldError}
                >
                  {t("review.ratingRequired")}
                </Text>
              )}
            </View>

            {/* ── Titre field ──────────────────────────────────────────── */}
            <View style={styles.fieldWrapper}>
              <Text type="label" bold color={Colors.brand} style={styles.fieldLabel}>
                {t("review.titleFieldLabel")}
              </Text>
              <RNTextInput
                value={reviewTitle}
                onChangeText={(v) => { setReviewTitle(v); if (titleError) setTitleError(false); }}
                placeholder={t("review.titleFieldPlaceholder")}
                placeholderTextColor={Colors.gray}
                textAlign={isRtl ? "right" : "left"}
                style={[styles.underlineInput, { textAlign: isRtl ? "right" : "left" }]}
              />
              {titleError && (
                <Text type="small" color={Colors.error} translate={false} style={styles.fieldError}>
                  {t("review.titleRequired")}
                </Text>
              )}
            </View>

            {/* ── Commentaire field ────────────────────────────────────── */}
            <View style={styles.fieldWrapper}>
              <Text type="label" bold color={Colors.brand} style={styles.fieldLabel}>
                {t("review.commentLabelRequired")}
              </Text>
              <RNTextInput
                value={comment}
                onChangeText={(v) => { setComment(v); if (commentError) setCommentError(false); }}
                placeholder={t("review.commentPlaceholderFigma")}
                placeholderTextColor={Colors.gray}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                textAlign={isRtl ? "right" : "left"}
                style={[styles.underlineInput, styles.multilineInput, { textAlign: isRtl ? "right" : "left" }]}
              />
              {commentError && (
                <Text type="small" color={Colors.error} translate={false} style={styles.fieldError}>
                  {t("review.commentRequired")}
                </Text>
              )}
            </View>

            {/* ── Submit error ─────────────────────────────────────────── */}
            {submitError !== null && (
              <Text
                type="small"
                color={Colors.error}
                center
                translate={false}
                style={styles.submitError}
              >
                {submitError}
              </Text>
            )}

            {/* ── Submit button ─────────────────────────────────────────── */}
            <View style={styles.submitWrapper}>
              <Button
                title={submitting ? t("review.submitting") : t("review.submitFigma")}
                variant="primary"
                onPress={() => void handleSubmit()}
                style={submitting ? styles.disabledBtn : undefined}
                disabled={submitting}
                rightIcon="send"
                iconTypeName="Feather"
                sizeIcon={16}
              />
            </View>

            {/* ── Privacy notice ───────────────────────────────────────── */}
            <View flexDirection="row" alignItems="flex-start" gap={8} style={styles.privacyRow}>
              <View style={styles.privacyIcon}>
                <Icon
                  name="info-circle"
                  size={16}
                  iconColor={Colors.grayMidDark}
                  type="FontAwesome5"
                />
              </View>
              <View style={styles.flex1}>
                <Text type="small" color={Colors.grayMidDark} translate={false}>
                  {t("review.privacyNotice")}
                </Text>
                <Text type="small" style={styles.privacyLink} translate={false}>
                  {t("review.privacyLink")}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Success modal ─────────────────────────────────────────────── */}
      <CustomModal
        visible={successVisible}
        title={t("review.successTitle")}
        primaryButton={{
          title: t("review.successClose"),
          onPress: handleSuccessClose,
          variant: "primary",
        }}
      >
        <Text
          type="default"
          color={Colors.brand}
          center
          style={styles.modalBody}
        >
          {t("review.successBody")}
        </Text>
      </CustomModal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  starsWrapper: {
    marginBottom: 32,
  },
  fieldWrapper: {
    marginBottom: 28,
  },
  fieldLabel: {
    marginBottom: 8,
    fontSize: 18,
  },
  underlineInput: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingVertical: 8,
    paddingHorizontal: 0,
    fontSize: 15,
    color: Colors.brand,
    backgroundColor: "transparent",
  },
  multilineInput: {
    minHeight: 60,
  },
  fieldError: {
    marginTop: 4,
  },
  submitError: {
    marginBottom: 12,
  },
  submitWrapper: {
    marginBottom: 16,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  privacyRow: {
    marginTop: 4,
  },
  privacyIcon: {
    marginTop: 1,
  },
  privacyLink: {
    color: Colors.blue,
    marginTop: 2,
  },
  modalBody: {
    marginBottom: 16,
  },
});

export default LeaveReviewScreen;
