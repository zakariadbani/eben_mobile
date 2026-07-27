import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
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

const CELL_COUNT = 4;
export const isCompleteOtp = (value: string): boolean => /^\d{4}$/.test(value);
const COUNT_DOWN = 10;

interface PhoneVerificationComponentProps {
  validate: (isValid: boolean) => void; // Callback function to handle validation
  isValid: boolean; // Validation state
  phoneNumber: string; // User's phone number
}

const PhoneVerificationComponent: React.FC<PhoneVerificationComponentProps> = ({
  validate,
  isValid,
  phoneNumber,
}) => {
  const { t } = useTranslation();

  const [value, setValue] = useState("");
  const [timeLeftCountDown, setTimeLeftCountDown] = useState(0);

  const ref = useBlurOnFulfill({ value, cellCount: CELL_COUNT });
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value,
    setValue,
  });

  const validateNumber = async () => {
    validate(isCompleteOtp(value));
  };

  const resendVerificationCode = async () => {
    if (timeLeftCountDown === 0) {
      startCountDown();
      // Logic to send a verification code
    }
  };

  const startCountDown = () => {
    setTimeLeftCountDown(COUNT_DOWN);
  };
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined; // Declare timer as NodeJS.Timeout or undefined

    if (timeLeftCountDown > 0) {
      timer = setInterval(() => setTimeLeftCountDown((prev) => prev - 1), 1000);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [timeLeftCountDown]);

  useEffect(() => {
    setTimeLeftCountDown(COUNT_DOWN);
  }, []);

  return (
    <View style={styles.container}>
      <Text type="loginSubTitle">Vérification SMS</Text>
      <View style={styles.messageContainer}>
        <Text type="loginDefault" translate={false}>
          {t("Un message d'identification a été envoyé au {{phone}}", {
            phone: phoneNumber,
          })}
        </Text>
      </View>

      <CodeField
        ref={ref}
        {...props}
        value={value}
        onChangeText={setValue}
        cellCount={CELL_COUNT}
        rootStyle={styles.codeFieldRoot}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        renderCell={({ index, symbol, isFocused }) => (
          <Text
            key={index}
            style={[styles.cell, isFocused && styles.focusCell]}
            onLayout={getCellOnLayoutHandler(index)}
          >
            {symbol || (isFocused ? <Cursor /> : null)}
          </Text>
        )}
      />
      <View style={styles.resendLinkContainer}>
        <Text type="loginDefault">Vous n'avez pas reçu le code ?</Text>

        <Button
          outline
          variant="orange"
          title={
            timeLeftCountDown
              ? `${timeLeftCountDown} ${t("sec")}`
              : "Renvoyez-le maintenant"
          }
          style={styles.resendLink}
          onPress={resendVerificationCode}
        />
      </View>

      <Button title="Vérifier" onPress={validateNumber} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // marginTop: 40,
  },
  messageContainer: {
    marginVertical: 20,
  },
  codeFieldRoot: {
    // marginTop: 20,
    marginHorizontal: 5,
  },
  cell: {
    width: 66,
    height: 66,
    lineHeight: 56,
    fontSize: 32,
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
    // flexDirection: "row",
    // justifyContent: "center",
    // alignItems: "center",
    // marginBottom: 40,
    marginTop: 30,
    marginBottom: 20,
  },
  resendLink: {
    borderWidth: 0,
    paddingVertical: 0,
  },
});

export default PhoneVerificationComponent;
