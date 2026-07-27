import React from "react";
import { View, Image, StyleSheet, ImageSourcePropType } from "react-native";

interface CustomIconProps {
  name: string;
  size?: number; // Optional size prop
  tintColor?: string; // Optional tint colour applied to the icon image
}

// Define the images object outside the component to avoid re-creation on each render
const images: Record<string, ImageSourcePropType> = {
  hey: require("@/assets/images/icons/hey.png"),
  notif: require("@/assets/images/icons/notif.png"),
  offers: require("@/assets/images/icons/offers.png"),
  newRequest: require("@/assets/images/icons/newRequest.png"),
  info: require("@/assets/images/icons/info.png"),
  info2: require("@/assets/images/icons/info2.png"),
  info3: require("@/assets/images/icons/info3.png"),
  whatsapp: require("@/assets/images/icons/whatsapp.png"),
  home: require("@/assets/images/icons/home.png"),
  home_active: require("@/assets/images/icons/home-active.png"),
  search: require("@/assets/images/icons/search.png"),
  search_active: require("@/assets/images/icons/search-active.png"),
  liste_plus: require("@/assets/images/icons/liste-plus.png"),
  liste: require("@/assets/images/icons/liste.png"),
  liste_active: require("@/assets/images/icons/liste-active.png"),
  profile: require("@/assets/images/icons/profile.png"),
  profile_active: require("@/assets/images/icons/profile-active.png"),
  cart_plus: require("@/assets/images/icons/cart-plus.png"),
  cart: require("@/assets/images/icons/cart.png"),
  cart_active: require("@/assets/images/icons/cart-active.png"),
  orders: require("@/assets/images/icons/orders.png"),
  orders_active: require("@/assets/images/icons/orders-active.png"),
  car: require("@/assets/images/icons/car.png"),
  visa: require("@/assets/images/icons/visa.png"),
  geo: require("@/assets/images/icons/geo.png"),
  language: require("@/assets/images/icons/language.png"),
  eye: require("@/assets/images/icons/eye.png"),
  casque: require("@/assets/images/icons/casque.png"),
  logo: require("@/assets/images/icons/logo.png"),
  protection: require("@/assets/images/icons/protection.png"),
  retour: require("@/assets/images/icons/retour.png"),
  logout: require("@/assets/images/icons/logout.png"),
  arrow_right: require("@/assets/images/icons/arrow-right.png"),
  arrow_left: require("@/assets/images/icons/arrow-left.png"),
  arrow_up: require("@/assets/images/icons/arrow-up.png"),
  arrow_down: require("@/assets/images/icons/arrow-down.png"),
  camera: require("@/assets/images/icons/camera.png"),
  trash: require("@/assets/images/icons/trash.png"),
  clock: require("@/assets/images/icons/clock.png"),
  send: require("@/assets/images/icons/send.png"),
  pen: require("@/assets/images/icons/pen.png"),
  ship: require("@/assets/images/icons/ship.png"),
  out: require("@/assets/images/icons/out.png"),
  wallet: require("@/assets/images/icons/wallet.png"),
  gift_active: require("@/assets/images/icons/gift-active.png"),
  cashplus: require("@/assets/images/icons/cashplus.png"),
  printer: require("@/assets/images/icons/printer.png"),
  mail: require("@/assets/images/icons/mail.png"),
  phone: require("@/assets/images/icons/phone.png"),
  lock: require("@/assets/images/icons/lock.png"),
  gift: require("@/assets/images/icons/gift.png"),
  filter: require("@/assets/images/icons/filter.png"),
  snipe: require("@/assets/images/icons/snipe.png"),
  rocket: require("@/assets/images/icons/rocket.png"),
  star: require("@/assets/images/icons/star.png"),
};

const CustomIcon: React.FC<CustomIconProps> = ({ name, size = 40, tintColor }) => {
  const source =
    images[name] ??
    (name.endsWith("_active")
      ? images[name.slice(0, -"_active".length)]
      : undefined);

  if (!source) return null;

  return (
    <View
      accessible={false}
      style={[
        styles.container,
        {
          width: size,
          height: size,
        },
      ]}
    >
      <Image
        source={source}
        style={[styles.image, tintColor ? { tintColor } : undefined]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    padding: 2,
  },
  image: {
    height: "100%",
    width: "100%",
  },
});

export default CustomIcon;
