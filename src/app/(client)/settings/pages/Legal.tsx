/**
 * Legal screen — "Termes et conditions / Mentions légales".
 *
 * Displays scrollable legal content: table of contents + article body.
 * Matches the Figma design Profile-Legal showing "Termes et conditions"
 * with a numbered ToC and full article text.
 */

import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useNavigation } from "@react-navigation/core";
import { useTranslation } from "react-i18next";

import Screen from "@/components/common/Screen";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import Colors from "@/constants/Colors";
import LegalUnavailableScreen from "@/components/screens/shared/LegalUnavailableScreen";

// ─── Static legal content ────────────────────────────────────────────────────

const tocItems = [
  "1.Introduction",
  "2.Inscription et compte",
  "3.Conditions générales de vente",
  "4.Retours et remboursements",
  "5.Paiements",
  "6.Crédits magasin (store credits)",
  "7.Promotions",
  "8.Règles concernant votre contenu",
  "9.Nos droits d'utilisation de votre contenu",
  "10.Utilisation du site Web et des applications mobiles",
  "11.Propriété intellectuelle (Copyright) et marques déposées",
  "12.Confidentialité des données",
  "13.Diligence raisonnable et droit d'audit du rôle de EBEN en tant que place de marché (Marketplace)",
  "14.Limitations et exclusions de responsabilité",
  "15.Indemnisation",
  "16.Violation des présentes conditions générales",
  "17.Généralités",
  "18.Intégrité de l'accord",
  "19.Hiérarchie",
  "20.Modification",
  "21.Renonciation",
  "22.Divisibilité",
  "23.Cession",
  "24.Droits des tiers",
  "25.Loi applicable et juridiction",
  "26.Coordonnées de notre société et notifications",
];

const intro = `1.1. "EBEN" est le nom commercial des sociétés du groupe EBEN énumérées à l'annexe 1. Chaque société du groupe EBEN ("EBEN" ou "nous") exploite une plateforme de commerce électronique composée d'un site web et d'une application mobile ("marketplace"), ainsi qu'une infrastructure de logistique, de traitement et de paiement, pour la vente et l'achat de produits de consommation et de services ("produits") sur le territoire qui lui est attribué, tel que défini à l'annexe 1 ("Territoire").

1.2. Ces Conditions Générales s'appliquent aux acheteurs et aux vendeurs sur la Marketplace et régissent leur utilisation de la Marketplace et de tous les services associés.

1.3. En utilisant notre Marketplace, vous acceptez ces Conditions Générales dans leur intégralité. Si vous n'êtes pas d'accord avec ces Conditions Générales ou avec tout autre document auquel il est fait référence dans ces Conditions Générales, vous devez immédiatement cesser d'utiliser notre Marketplace.`;

type LegalSection = "terms" | "privacy" | "returns";

const SECTION_TITLE_KEYS: Record<LegalSection, string> = {
  terms: "settings.terms",
  privacy: "settings.privacy",
  returns: "settings.returns",
};

// ─── Screen ──────────────────────────────────────────────────────────────────

const LegalScreen: React.FC = () => {
  const { section: rawSection } = useLocalSearchParams<{ section?: string }>();
  const section: LegalSection = rawSection === "privacy" || rawSection === "returns" ? rawSection : "terms";
  const navigation = useNavigation();
  const { t } = useTranslation();

  useEffect(() => {
    navigation.setOptions({ title: t(SECTION_TITLE_KEYS[section]) });
  }, [navigation, section, t]);

  if (section !== "terms") {
    return <LegalUnavailableScreen />;
  }

  return (
    <Screen scrollable>
      <View style={styles.content}>
        {/* Title */}
        <Text type="subTitle" semiBold color={Colors.brand} style={styles.pageTitle}>
          {"Contenu"}
        </Text>

        {/* Table of contents */}
        <View style={styles.tocBlock}>
          {tocItems.map((item) => (
            <Text key={item} type="small" color={Colors.grayMidDark} translate={false} style={styles.tocItem}>
              {item}
            </Text>
          ))}
        </View>

        {/* Article 1 */}
        <Text type="label" semiBold color={Colors.brand} style={styles.articleTitle}>
          {"1.Introduction"}
        </Text>
        <Text type="default" color={Colors.grayMidDark} translate={false} style={styles.articleBody}>
          {intro}
        </Text>
      </View>
    </Screen>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  pageTitle: {
    marginBottom: 10,
  },
  tocBlock: {
    marginBottom: 20,
    gap: 4,
  },
  tocItem: {
    fontSize: 15,
    lineHeight: 22,
  },
  articleTitle: {
    marginBottom: 8,
    marginTop: 8,
  },
  articleBody: {
    lineHeight: 22,
  },
});

export default LegalScreen;
