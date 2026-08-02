import React, { useEffect, useState } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from "react-native-confirmation-code-field";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import Colors from "@/constants/Colors";
import View from "@/components/common/View";

const CELL_COUNT = 6;
const COUNT_DOWN = 60;

export const isCompleteOtp = (value: string): boolean => /^\d{6}$/.test(value);
export const otpCellWidth = (screenWidth: number): number =>
  Math.min(44, Math.max(30, Math.floor((screenWidth - 104) / CELL_COUNT)));

interface PhoneVerificationComponentProps {
  validate: (isValid: boolean, code: string) => void | Promise<void>;
  isValid: boolean;
  phoneNumber: string;
  onResend?: () => void | Promise<void>;
  error?: string | null;
  startWithCooldown?: boolean;
  showResend?: boolean;
}

const PhoneVerificationComponent: React.FC<PhoneVerificationComponentProps> = ({
  validate,
  phoneNumber,
  onResend,
  error,
  startWithCooldown = true,
  showResend = true,
}) => {
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const [value, setValue] = useState("");
  const [timeLeftCountDown, setTimeLeftCountDown] = useState(
    startWithCooldown ? COUNT_DOWN : 0,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const ref = useBlurOnFulfill({ value, cellCount: CELL_COUNT });
  const [fieldProps, getCellOnLayoutHandler] = useClearByFocusCell({ value, setValue });

  useEffect(() => {
    if (timeLeftCountDown === 0) return;
    const timer = setTimeout(
      () => setTimeLeftCountDown((previous) => previous - 1),
      1000,
    );
    return () => clearTimeout(timer);
  }, [timeLeftCountDown]);

  const validateNumber = async () => {
    const complete = isCompleteOtp(value);
    setActionError(null);
    if (!complete) {
      setActionError(t("auth.otp.incomplete"));
      await validate(false, value);
      return;
    }

    setIsSubmitting(true);
    try {
      await validate(true, value);
    } catch {
      setActionError(t("auth.error.generic"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendVerificationCode = async () => {
    if (timeLeftCountDown > 0 || isResending) return;
    setActionError(null);
    setIsResending(true);
    try {
      await onResend?.();
      setTimeLeftCountDown(COUNT_DOWN);
    } catch {
      setActionError(t("auth.error.generic"));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text type="loginSubTitle">auth.otp.title</Text>
      <View style={styles.messageContainer}>
        <Text type="loginDefault" translate={false}>
          {t("auth.otp.sent", {
            phone: phoneNumber,
          })}
        </Text>
      </View>

      <CodeField
        ref={ref}
        {...fieldProps}
        value={value}
        onChangeText={setValue}
        cellCount={CELL_COUNT}
        rootStyle={styles.codeFieldRoot}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        renderCell={({ index, symbol, isFocused }) => (
          <Text
            key={index}
            style={[
              styles.cell,
              { width: otpCellWidth(screenWidth) },
              isFocused && styles.focusCell,
            ]}
            onLayout={getCellOnLayoutHandler(index)}
          >
            {symbol || (isFocused ? <Cursor /> : null)}
          </Text>
        )}
      />

      {showResend ? <View style={styles.resendLinkContainer}>
        <Text type="loginDefault">auth.otp.notReceived</Text>
        <Button
          outline
          variant="orange"
          title={
            timeLeftCountDown
              ? t("auth.otp.seconds", { count: timeLeftCountDown })
              : isResending
                ? t("auth.otp.resending")
                : t("auth.otp.resend")
          }
          style={styles.resendLink}
          onPress={() => void resendVerificationCode()}
          disabled={timeLeftCountDown > 0 || isResending}
          accessibilityState={{ busy: isResending }}
        />
      </View> : null}

      {error || actionError ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error ?? actionError}
        </Text>
      ) : null}
      <Button
        title={isSubmitting ? t("auth.otp.verifying") : t("auth.otp.verify")}
        onPress={() => void validateNumber()}
        disabled={!isCompleteOtp(value) || isSubmitting}
        accessibilityState={{ busy: isSubmitting }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  messageContainer: {
    marginVertical: 20,
  },
  codeFieldRoot: {
    marginHorizontal: 5,
    justifyContent: "space-between",
  },
  cell: {
    height: 56,
    lineHeight: 48,
    fontSize: 26,
    borderWidth: 2,
    backgroundColor: Colors.backgroundGray,
    color: Colors.grayDark,
    borderRadius: 12,
    textAlign: "center",
    overflow: "hidden",
  },
  focusCell: {
    borderColor: Colors.primary,
  },
  resendLinkContainer: {
    marginTop: 30,
    marginBottom: 20,
  },
  resendLink: {
    borderWidth: 0,
    paddingVertical: 0,
  },
  error: {
    color: Colors.errorInbackgroundBrand,
    marginBottom: 12,
    textAlign: "center",
  },
});

export default PhoneVerificationComponent;
