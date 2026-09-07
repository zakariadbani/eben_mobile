import React from "react";
import { StyleSheet, ImageBackground } from "react-native";
import { Text } from "@/components/common/Text";
import { Button } from "@/components/common/Button";
import Icon from "@/components/common/Icon";
import View from "@/components/common/View";
import Screen from "@/components/common/Screen";
import Colors from "@/constants/Colors";
import GoBack from "@/components/common/GoBack";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams, useRouter } from "expo-router";
import { clientAuthHref, getClientReturnTo } from "@/constants/clientReturnTo";

const ClientAuthenticationOptionsScreen = () => {
  const { i18n } = useTranslation();
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const destination = String(getClientReturnTo(returnTo));

  const isArabic = i18n.language === "ar";
  return (
    <Screen
      useSafeArea={false}
      whatsapp={false}
      statusBarColor={Colors.black}
      statusBarStyle="light-content"
    >
      <ImageBackground
        source={require("@/assets/images/backgrounds/auth_options.jpg")}
        style={styles.background}
        resizeMode="cover" // Moved this to the prop
      >
        <View
          style={[
            styles.header,
            { alignItems: isArabic ? "flex-end" : "flex-start" },
          ]}
        >
          <GoBack />
        </View>
        <View style={styles.container}>
          <Text type="loginSubTitle" style={styles.pitch}>
            Commandez n'importe quelle pièce automobile depuis le confort de
            votre domicile.
          </Text>
          <View style={styles.buttonsContainer} flexDirection="row">
            <View style={styles.button}>
              <Button
                color={"white"}
                onPress={() => router.push(clientAuthHref("/(auth)/ClientLoginScreen", destination))}
                title={"Connectez-vous"}
              />
              <View flexDirection="row">
                <Icon
                  name="info-circle"
                  size={10}
                  iconColor={Colors.light}
                  type="AntDesign"
                />
                <Text style={styles.info}>Si vous avez un compte</Text>
              </View>
            </View>
            <View style={styles.button}>
              <Button
                title={"S'inscrire"}
                onPress={() => router.push(clientAuthHref("/(auth)/ClientRegisterScreen", destination))}
              />
            </View>
          </View>
          <View>
            <Button
              style={styles.asGuest}
              styleTitle={{ textDecorationLine: "underline" }}
              outline
              color="white"
              navigateTo={"(client)"}
              title="Explorer les produits"
            />
          </View>
        </View>
      </ImageBackground>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    marginTop: 8,
  },
  container: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 16,
    paddingBottom: 28,
  },
  background: {
    flex: 1,
  },
  pitch: {
    fontSize: 20,
    lineHeight: 24,
    marginBottom: 132,
  },
  buttonsContainer: {
    justifyContent: "space-between", // Space between buttons
  },

  button: {
    flex: 1,
    marginHorizontal: 8,
  },
  info: {
    fontSize: 11,
    color: Colors.light,
    marginHorizontal: 5,
  },
  asGuest: {
    borderWidth: 0,
    marginTop: 56,
  },
});

export default ClientAuthenticationOptionsScreen;
