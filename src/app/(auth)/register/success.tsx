import React from "react";
import { StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import Colors from "@/constants/Colors";
import CarSelectionScreen from "./car-selection";

export default function RegistrationSuccessScreen() {
  const router = useRouter();
  const { carLabel = "BMW X5 2022 I6" } =
    useLocalSearchParams<{ carLabel?: string }>();

  return (
    <View style={styles.root}>
      <CarSelectionScreen />
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text type="headerTitle" center style={styles.title}>
            Voiture ajoutée à votre garage
          </Text>
          <Text translate={false} center style={styles.body}>
            {`${carLabel} a été ajouté à votre garage`}
          </Text>
          <Button
            title="Aller à la page d'accueil"
            onPress={() => router.replace("/(client)")}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  modal: {
    width: "100%",
    padding: 16,
    borderRadius: 5,
    backgroundColor: Colors.backgroundLight,
    transform: [{ translateY: -40 }],
  },
  title: { marginBottom: 16 },
  body: {
    marginBottom: 20,
    fontFamily: "BarlowCondensedSemiBold",
    fontSize: 15,
  },
});
