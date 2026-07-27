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

const ClientAuthenticationOptionsScreen = () => {
  const { i18n } = useTranslation();

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
                navigateTo={"/(auth)/ClientLoginScreen"}
                title={"Connectez-vous"}
              />
              <View flexDirection="row">
                <Icon
                  name="infocirlceo"
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
                navigateTo={"/(auth)/ClientRegisterScreen"}
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
              title={"Continuer en tant qu'invité"}
            />
          </View>
          <View style={styles.conditionContainer}>
            <Text style={styles.info}>
              Si vous continuez en tant qu'invité, vous acceptez nos
            </Text>
            <Button
              style={styles.conditions}
              styleTitle={{
                textDecorationLine: "underline",
                fontSize: 12,
                padding: 0,
              }}
              outline
              color="white"
              title={"conditions et nos accords."}
              navigateTo="/(auth)/legal"
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
  conditions: {
    borderWidth: 0,
    fontSize: 11,
    color: Colors.light,
    paddingVertical: 0,
    paddingBottom: 20,
  },
  conditionContainer: {
    alignItems: "center",
    marginTop: 42,
  },
});

export default ClientAuthenticationOptionsScreen;
