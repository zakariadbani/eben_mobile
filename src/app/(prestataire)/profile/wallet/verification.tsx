import React, { useRef, useState } from "react";
import { StyleSheet, View as RNView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { confirmWithdrawal } from "@/api/resources/prestataire";
import { ApiClientError } from "@/api/types";
import CustomHeader from "@/components/common/CustomHeader";
import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import PhoneVerificationComponent from "@/components/screens/shared/PhoneVerificationComponent";
import Colors from "@/constants/Colors";
import { useSession } from "@/context/AuthContext";

function positiveId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export default function PrestataireWalletVerificationScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useSession();
  const { withdrawalId: rawWithdrawalId } = useLocalSearchParams<{ withdrawalId?: string }>();
  const withdrawalId = positiveId(rawWithdrawalId);
  const confirming = useRef(false);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async (valid: boolean, code: string) => {
    if (!valid || withdrawalId === null || confirming.current) return;
    confirming.current = true;
    setError(null);
    try {
      const response = await confirmWithdrawal(withdrawalId, code);
      if (response.data.id !== withdrawalId || response.data.status !== "pending") throw new Error("Invalid withdrawal confirmation");
      setIsValid(true);
      router.replace({
        pathname: "/(prestataire)/profile/wallet/success",
        params: { withdrawalId: String(response.data.id) },
      } as never);
    } catch (caught) {
      const fieldMessage = caught instanceof ApiClientError
        ? Object.values(caught.errors)[0]?.[0]
        : undefined;
      setError(fieldMessage ?? (caught instanceof ApiClientError ? caught.message : t("auth.error.generic")));
    } finally {
      confirming.current = false;
    }
  };

  const phone = session?.user.phone;
  const invalidRoute = withdrawalId === null || !phone;

  return (
    <Screen whatsapp={false} scrollable={false} avoidKeyboard={false}>
      <CustomHeader title={t("partner.verification.screenTitle")} />
      <View flex style={styles.body} alignItems="center" justifyContent="center">
        <RNView style={styles.card} accessibilityLabel={t("partner.verification.screenTitle")}>
          {invalidRoute ? (
            <Text accessibilityRole="alert">requestFlow.invalidRoute</Text>
          ) : (
            <PhoneVerificationComponent
              validate={handleValidate}
              isValid={isValid}
              phoneNumber={phone}
              error={error}
              showResend={false}
            />
          )}
        </RNView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20 },
  card: {
    width: "100%",
    backgroundColor: Colors.brand,
    borderRadius: 16,
    padding: 24,
    shadowColor: Colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
});
