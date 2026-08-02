/**
 * ReportAbuseScreen — form to report a product review for abuse.
 *
 * Route: /(client)/products/[productId]/report
 *
 * Figma ref: *Report-an-abuse*
 *
 * Layout (Figma):
 *   - 3-paragraph intro with a blue hyperlink in paragraph 2
 *   - "Email *" underline text field
 *   - "Raison*" underline text field
 *   - Consent checkbox + privacy policy blue link
 *   - "Signaler" button (pink background, X/otimes icon)
 *
 * Validation: email, raison, and consent are required.
 */

import React, { useRef, useState } from "react";
import {
  StyleSheet,
  TextInput as RNTextInput,
  ScrollView,
  TouchableOpacity,
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

import { reportAbuse } from "@/api";
import { ApiClientError } from "@/api/client";
import { Role, useSession } from "@/context/AuthContext";
import Colors from "@/constants/Colors";

// ── Screen ────────────────────────────────────────────────────────────────────

const ReportAbuseScreen: React.FC = () => {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { role } = useSession();

  const rawProductId = productId ?? "";
  const numericProductId = /^\d+$/.test(rawProductId) ? Number(rawProductId) : Number.NaN;
  const validProductId = Number.isSafeInteger(numericProductId) && numericProductId > 0;
  const submittingRef = useRef(false);

  const [email, setEmail] = useState("");
  const [raison, setRaison] = useState("");
  const [consent, setConsent] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [raisonError, setRaisonError] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    if (role !== Role.CLIENT) {
      router.push("/(auth)/ClientLoginScreen");
      return;
    }
    let valid = true;
    if (email.trim().length === 0) {
      setEmailError(true);
      valid = false;
    }
    if (raison.trim().length === 0) {
      setRaisonError(true);
      valid = false;
    }
    if (!consent) {
      setConsentError(true);
      valid = false;
    }
    if (!valid || !validProductId) {
      if (!validProductId) setSubmitError(t("report.submitError"));
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await reportAbuse(
        numericProductId,
        "other",
        raison.trim(),
        email.trim(),
        true,
      );
      if (response.data.reported && response.data.productId === numericProductId) setSuccessVisible(true);
    } catch (error) {
      const fieldMessage = error instanceof ApiClientError
        ? Object.values(error.errors)[0]?.[0]
        : undefined;
      setSubmitError(fieldMessage ?? (error instanceof ApiClientError ? error.message : t("report.submitError")));
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
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* ── Intro paragraphs ──────────────────────────────────────── */}
          <Text type="default" color={Colors.brand} style={styles.introPara}>
            {t("report.intro1")}
          </Text>

          {/* Paragraph 2 has an inline blue hyperlink */}
          <View flexDirection="row" style={[styles.introPara, styles.introPara2Wrap]}>
            <Text type="default" color={Colors.brand} style={styles.introInline} translate={false}>
              {t("report.intro2part1")}
            </Text>
            <Text type="default" style={[styles.blueLink, styles.introInline]} translate={false}>
              {t("report.intro2link")}
            </Text>
            <Text type="default" color={Colors.brand} style={styles.introInline} translate={false}>
              {t("report.intro2part2")}
            </Text>
          </View>

          <Text type="default" color={Colors.brand} style={styles.introPara}>
            {t("report.intro3")}
          </Text>

          {/* ── Email field ───────────────────────────────────────────── */}
          <View style={styles.fieldWrapper}>
            <Text type="label" bold color={Colors.brand} style={styles.fieldLabel}>
              {t("report.emailLabel")}
            </Text>
            <RNTextInput
              value={email}
              onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(false); }}
              placeholder={t("report.emailPlaceholder")}
              placeholderTextColor={Colors.gray}
              keyboardType="email-address"
              autoCapitalize="none"
              textAlign={isRtl ? "right" : "left"}
              style={[styles.underlineInput, { textAlign: isRtl ? "right" : "left" }]}
            />
            {emailError && (
              <Text type="small" color={Colors.error} translate={false} style={styles.fieldError}>
                {t("report.emailRequired")}
              </Text>
            )}
          </View>

          {/* ── Raison field ──────────────────────────────────────────── */}
          <View style={styles.fieldWrapper}>
            <Text type="label" bold color={Colors.brand} style={styles.fieldLabel}>
              {t("report.raisonLabel")}
            </Text>
            <RNTextInput
              value={raison}
              onChangeText={(v) => { setRaison(v); if (raisonError) setRaisonError(false); }}
              placeholder={t("report.raisonPlaceholder")}
              placeholderTextColor={Colors.gray}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              textAlign={isRtl ? "right" : "left"}
              style={[styles.underlineInput, styles.multilineInput, { textAlign: isRtl ? "right" : "left" }]}
            />
            {raisonError && (
              <Text type="small" color={Colors.error} translate={false} style={styles.fieldError}>
                {t("report.raisonRequired")}
              </Text>
            )}
          </View>

          {/* ── Consent checkbox ──────────────────────────────────────── */}
          <TouchableOpacity
            style={styles.consentRow}
            activeOpacity={0.7}
            onPress={() => { setConsent((v) => !v); if (consentError) setConsentError(false); }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent }}
          >
            <View
              style={[styles.checkbox, consent && styles.checkboxChecked]}
              justifyContent="center"
              alignItems="center"
            >
              {consent && (
                <Icon name="check" size={12} iconColor={Colors.white} type="FontAwesome5" />
              )}
            </View>
            <View style={styles.consentTextWrap}>
              <Text type="small" color={Colors.brand} translate={false} style={styles.consentText}>
                {t("report.consentText")}
              </Text>
              <Text type="small" style={[styles.blueLink, styles.consentText]} translate={false}>
                {t("report.consentLink")}
              </Text>
            </View>
          </TouchableOpacity>
          {consentError && (
            <Text type="small" color={Colors.error} translate={false} style={styles.fieldError}>
              {t("report.consentRequired")}
            </Text>
          )}

          {/* ── Submit error ──────────────────────────────────────────── */}
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

          {/* ── Submit button — pink bg, X/otimes icon ────────────────── */}
          <Button
            title={submitting ? t("report.submitting") : t("report.submitFigma")}
            color={Colors.pink}
            textColor={Colors.brand}
            onPress={() => void handleSubmit()}
            style={[styles.submitBtn, submitting ? styles.disabledBtn : undefined]}
            disabled={submitting}
            rightIcon="times-circle"
            iconTypeName="FontAwesome5"
            iconColor={Colors.brand}
            sizeIcon={18}
          />
        </View>
      </ScrollView>

      {/* ── Success modal ─────────────────────────────────────────────── */}
      <CustomModal
        visible={successVisible}
        title={t("report.successTitle")}
        primaryButton={{
          title: t("report.successClose"),
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
          {t("report.successBody")}
        </Text>
      </CustomModal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  introPara: {
    marginBottom: 10,
    lineHeight: 17,
    fontSize: 12,
  },
  introPara2Wrap: {
    flexWrap: "wrap",
    alignItems: "flex-end",
  },
  introInline: {
    fontSize: 12,
    lineHeight: 17,
  },
  blueLink: {
    color: Colors.blue,
    textDecorationLine: "underline",
  },
  fieldWrapper: {
    marginBottom: 20,
  },
  fieldLabel: {
    marginBottom: 6,
    fontSize: 15,
  },
  underlineInput: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingVertical: 6,
    paddingHorizontal: 0,
    fontSize: 14,
    color: Colors.brand,
    backgroundColor: "transparent",
  },
  multilineInput: {
    minHeight: 52,
  },
  fieldError: {
    marginTop: 4,
    marginBottom: 4,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.grayMidDark,
    flexShrink: 0,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.greenDark,
    borderColor: Colors.greenDark,
  },
  consentTextWrap: {
    flex: 1,
  },
  consentText: {
    fontSize: 11,
    lineHeight: 16,
  },
  submitError: {
    marginBottom: 10,
  },
  submitBtn: {
    marginTop: 8,
    paddingVertical: 7,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  modalBody: {
    marginBottom: 16,
  },
});

export default ReportAbuseScreen;
