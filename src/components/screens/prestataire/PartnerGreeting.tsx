import React from "react";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/common/Text";

/** Placeholder swapped for the name so the translated greeting can be split around it. */
const NAME_SLOT = "\u2063";

export interface PartnerGreetingProps {
  name: string;
  size: number;
  color?: string;
}

/**
 * Header "Hey {{name}} 👋" / "مرحبا {{name}} 👋". The name is its own span, so a
 * Latin name keeps the Latin font inside the Arabic greeting (see common/Text).
 *
 *   <PartnerGreeting name={displayName} size={23} />
 */
export default function PartnerGreeting({ name, size, color }: PartnerGreetingProps): React.ReactElement {
  const { t } = useTranslation();
  const [before = "", after = ""] = t("partner.profile.greeting", { name: NAME_SLOT }).split(NAME_SLOT);

  return (
    <Text type="subTitleTwo" semiBold size={size} color={color} translate={false} numberOfLines={1} flex>
      {before}
      <Text type="subTitleTwo" semiBold size={size} color={color} translate={false}>{name}</Text>
      {after}
    </Text>
  );
}
