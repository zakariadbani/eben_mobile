/**
 * login-to-send.tsx — Guest prompt to log in before sending a request.
 *
 * Matches Figma "List-Log-in-to-send":
 *   - Shows the request list items in the background (dimmed)
 *   - Dark modal card:
 *       "Connectez-vous" title
 *       body copy
 *       "Créer un compte" (white/secondary) + "Se connecter" (primary/yellow) buttons
 *
 * Triggered by VerificationScreen when the current session role is "guest".
 */

import React, { useCallback } from "react";
import { StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { clientAuthHref } from "@/constants/clientReturnTo";

import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";

import Colors from "@/constants/Colors";
import RequestListScreen from "./index";

export default function LoginToSendScreen() {
  const router = useRouter();

  const handleSignIn = useCallback(() => {
    router.push(clientAuthHref("/(auth)/ClientLoginScreen", "/(client)/requests/CreateRequestScreen"));
  }, [router]);

  const handleRegister = useCallback(() => {
    router.push(clientAuthHref("/(auth)/ClientRegisterScreen", "/(client)/requests/CreateRequestScreen"));
  }, [router]);

  return (
    <View style={styles.root}>
      <RequestListScreen />
      <View style={styles.overlay}>
        {/* Dark card */}
        <View style={styles.card} gap={20}>
          {/* Title */}
          <Text type="loginSubTitle" center>
            Connectez-vous
          </Text>

          {/* Body */}
          <Text type="loginDefault" center>
            Veuillez vous connecter à votre compte EBEN ou créer un nouveau
            compte.
          </Text>

          {/* Action buttons */}
          <View flexDirection="row" gap={12} style={styles.btnRow}>
            <Button
              title="Créer un compte"
              variant="white"
              style={styles.btn}
              onPress={handleRegister}
            />
            <Button
              title="Se connecter"
              variant="primary"
              style={styles.btn}
              onPress={handleSignIn}
            />
          </View>

          {/* Back link removed per Figma — only two side-by-side buttons */}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 24,
    paddingBottom: 0,
  },
  card: {
    width: "100%",
    backgroundColor: Colors.backgroundBrand,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: "center",
  },
  btnRow: {
    width: "100%",
  },
  btn: {
    flex: 1,
  },
});
