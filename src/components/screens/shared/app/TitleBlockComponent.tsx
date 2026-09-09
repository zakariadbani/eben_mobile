import React from "react";
import { StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import CustomIcon from "@/components/common/CustomIcon";
import Colors from "@/constants/Colors";

export interface TitleBlockComponentProps {
  /** The section title (French key — auto-translated via <Text>) */
  titleBlock: string;
  /**
   * Optional navigation path for the "Voir tous" link.
   * When provided, a "Voir tous" link button is rendered on the right.
   * Mutually exclusive with seeAllPress — seeAllNavigate takes priority.
   */
  seeAllNavigate?: string;
  /**
   * Optional press handler for the "Voir tous" link (alternative to seeAllNavigate).
   * Used when callers manage navigation manually.
   */
  seeAllPress?: () => void;
}

/**
 * TitleBlockComponent — section header used in Home and Categories screens.
 *
 * Renders a bold section title on the left and an optional "Voir tous →" link on the right.
 * Uses common/View for RTL-aware row layout and common/Text for i18n + Arabic font.
 */
const TitleBlockComponent: React.FC<TitleBlockComponentProps> = ({
  titleBlock,
  seeAllNavigate,
  seeAllPress,
}) => {
  const { t, i18n } = useTranslation();

  const showSeeAll = Boolean(seeAllNavigate ?? seeAllPress);

  return (
    <View style={styles.container} flexDirection="row" alignItems="center">
      <Text type="titleSection" semiBold style={styles.title} flex>
        {titleBlock}
      </Text>
      {showSeeAll ? (
        <Button
          isLink
          bordless
          fit
          navigateTo={seeAllNavigate}
          onPress={seeAllNavigate ? undefined : seeAllPress}
        >
          <View flexDirection="row" alignItems="center" gap={2}>
            <Text type="small" style={styles.seeAllText}>
              {t("Voir tous")}
            </Text>
            <CustomIcon name={i18n.language === "ar" ? "arrow_left" : "arrow_right"} size={16} tintColor={Colors.grayMidDark} />
          </View>
        </Button>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  title: {
    flexShrink: 1,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.grayMidDark,
  },
});

export default TitleBlockComponent;
