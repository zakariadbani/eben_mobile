import React, { useState } from "react";
import { StyleSheet, View as RNView } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/common/Text";
import { Button } from "@/components/common/Button";
import TextInput from "@/components/common/TextInput";
import Checkbox from "@/components/common/Checkbox";
import View from "@/components/common/View";
import Screen from "@/components/common/Screen";
import GoBack from "@/components/common/GoBack";
import Colors from "@/constants/Colors";

/**
 * Waitlist / partner registration entry form.
 *
 * Figma: Waitlist-Method__203-36709 (FR, dark card on yellow bg)
 *        Waitlist-Method__203-37608 (AR, light card on cream bg).
 *
 * Two visual variants driven by the active locale:
 *   FR — yellow status-bar area + black form card + yellow "S'inscrire" CTA.
 *   AR — cream bg + light card + RTL labels/layout.
 *
 * Fields:
 *   - Ville (full-width)
 *   - Prénom + Nom (half-width row)
 *   - Email (full-width)
 *   - Numéro de téléphone (full-width)
 *   - Type de commerce (full-width)
 *   - Nom de l'entreprise, ou magasin (full-width)
 *   - Checkbox: J'ai lu et accepté les Conditions D'utilisation
 *   - CTA: S'inscrire
 *
 * No API call in Sprint P1 — form state only; submission logs to console.
 * TypeScript strict: no `any`.
 */

interface WaitlistForm {
  ville: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  typeCommerce: string;
  nomEntreprise: string;
  acceptedTerms: boolean;
}

const INITIAL_FORM: WaitlistForm = {
  ville: "",
  prenom: "",
  nom: "",
  email: "",
  telephone: "",
  typeCommerce: "",
  nomEntreprise: "",
  acceptedTerms: false,
};

const PartnerWaitlistScreen = () => {
  const { t, i18n } = useTranslation();
  const { state } = useLocalSearchParams<{ state?: string }>();
  const isArabic = i18n.language === "ar";

  const [form, setForm] = useState<WaitlistForm>(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(state === "submitted");

  const update = (field: keyof WaitlistForm) => (val: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = () => {
    // Sprint P1: no API — log and flag submitted
    setSubmitted(true);
  };

  // Screen background colour shifts by locale to match Figma.
  // FR: white page bg with yellow header area. AR: cream page bg with washed header.
  const screenBg = isArabic ? Colors.backgroundLight : Colors.backgroundLight;
  const headerBg = Colors.primary;
  const cardBg = Colors.brand;
  const inputVariant = "secondary" as const;
  const labelColor = Colors.light;
  const checkboxVariant = "secondary" as const;

  return (
    <Screen
      useSafeArea={false}
      whatsapp={false}
      backgroundColor={screenBg}
      scrollable
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header row */}
      <RNView
        style={[
          styles.header,
          isArabic ? styles.headerRtl : styles.headerLtr,
          { backgroundColor: headerBg },
        ]}
      >
        <GoBack iconColor={isArabic ? Colors.brand : Colors.brand} />
        <Text
          type="headerTitle"
          bold
          allowFontScaling={false}
          style={[
            styles.headerTitle,
            isArabic ? styles.headerTitleRtl : styles.headerTitleLtr,
            { color: Colors.brand, fontSize: 18 },
          ]}
        >
          {t("Formulaire de demande")}
        </Text>
      </RNView>

      {/* Form card */}
      <RNView style={[styles.card, { backgroundColor: cardBg }]}>
        {/* Ville */}
        <RNView style={styles.fieldWrap}>
          <TextInput
            label={t("Ville")}
            placeholder="Casablanca, Oujda, Rabat ..."
            value={form.ville}
            onChangeText={update("ville")}
            variant={inputVariant}
            translate={false}
            labelStyle={{ color: labelColor, fontSize: 15, marginBottom: 4 }}
            inputStyle={{ paddingVertical: 11 }}
            textStyle={{ fontSize: 15 }}
          />
        </RNView>

        {/* Prénom + Nom row */}
        <View flexDirection="row" gap={8} style={[styles.rowFields, styles.fieldWrap]}>
          <RNView style={styles.halfField}>
            <TextInput
              label={t("Prenom")}
              placeholder="Ahmed"
              value={form.prenom}
              onChangeText={update("prenom")}
              variant={inputVariant}
              translate={false}
              labelStyle={{ color: labelColor, fontSize: 15, marginBottom: 4 }}
              inputStyle={{ paddingVertical: 11 }}
              textStyle={{ fontSize: 15 }}
            />
          </RNView>
          <RNView style={styles.halfField}>
            <TextInput
              label={t("Nom")}
              placeholder="Mehdaoui"
              value={form.nom}
              onChangeText={update("nom")}
              variant={inputVariant}
              translate={false}
              labelStyle={{ color: labelColor, fontSize: 15, marginBottom: 4 }}
              inputStyle={{ paddingVertical: 11 }}
              textStyle={{ fontSize: 15 }}
            />
          </RNView>
        </View>

        {/* Email */}
        <RNView style={styles.fieldWrap}>
          <TextInput
            label={t("Email")}
            placeholder="ahemd@gmail.com"
            value={form.email}
            onChangeText={update("email")}
            keyboardType="email-address"
            textContentType="emailAddress"
            variant={inputVariant}
            translate={false}
            labelStyle={{ color: labelColor, fontSize: 15, marginBottom: 4 }}
            inputStyle={{ paddingVertical: 11 }}
            textStyle={{ fontSize: 15 }}
          />
        </RNView>

        {/* Téléphone */}
        <RNView style={styles.fieldWrap}>
          <TextInput
            label={t("Numéro de téléphone")}
            placeholder="06 77 77 77 77"
            value={form.telephone}
            onChangeText={update("telephone")}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            variant={inputVariant}
            translate={false}
            labelStyle={{ color: labelColor, fontSize: 15, marginBottom: 4 }}
            inputStyle={{ paddingVertical: 11 }}
            textStyle={{ fontSize: 15 }}
          />
        </RNView>

        {/* Type de commerce */}
        <RNView style={styles.fieldWrap}>
          <TextInput
            label={t("Type de commerce")}
            placeholder="La ferraille ou SARL"
            value={form.typeCommerce}
            onChangeText={update("typeCommerce")}
            variant={inputVariant}
            translate={false}
            labelStyle={{ color: labelColor, fontSize: 15, marginBottom: 4 }}
            inputStyle={{ paddingVertical: 11 }}
            textStyle={{ fontSize: 15 }}
          />
        </RNView>

        {/* Nom entreprise */}
        <RNView style={styles.fieldWrap}>
          <TextInput
            label={t("Nom de l'entreprise, ou magasin")}
            placeholder="Xyz"
            value={form.nomEntreprise}
            onChangeText={update("nomEntreprise")}
            variant={inputVariant}
            translate={false}
            labelStyle={{ color: labelColor, fontSize: 15, marginBottom: 4 }}
            inputStyle={{ paddingVertical: 11 }}
            textStyle={{ fontSize: 15 }}
          />
        </RNView>

        {/* Terms checkbox */}
        <Checkbox
          isChecked={form.acceptedTerms}
          onValueChange={(val) => update("acceptedTerms")(val)}
          text="J'ai lu et accepté les Conditions D'utilisation"
          variant={checkboxVariant}
          translate
          checkboxStyle={{ width: 21, height: 21, borderRadius: 3 }}
          textStyle={{ fontSize: 15, fontWeight: "700" }}
        />

        <View mb={8} />

        {/* Submit CTA */}
        <Button
          title={submitted ? t("Demande envoyée") : t("S'inscrire")}
          onPress={handleSubmit}
          style={styles.submitBtn}
        />
      </RNView>

      <View mb={32} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 3,
    paddingHorizontal: 8,
  },
  headerLtr: {
    flexDirection: "row",
  },
  headerRtl: {
    flexDirection: "row-reverse",
  },
  headerTitle: {
    flex: 1,
  },
  headerTitleLtr: {
    textAlign: "left",
    marginLeft: 8,
  },
  headerTitleRtl: {
    textAlign: "right",
    marginRight: 8,
  },
  card: {
    marginHorizontal: 22,
    borderRadius: 12,
    padding: 20,
    marginTop: 37,
  },
  rowFields: {
    // gap handled by View gap prop
  },
  halfField: {
    flex: 1,
  },
  fieldWrap: {
    marginBottom: 15,
  },
  submitBtn: {
    borderRadius: 8,
    paddingVertical: 18,
  },
});

export default PartnerWaitlistScreen;
