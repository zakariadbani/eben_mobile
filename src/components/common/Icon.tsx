import React from "react";
import {
  MaterialCommunityIcons,
  AntDesign,
  FontAwesome5,
  Feather,
  FontAwesome,
  Ionicons,
  EvilIcons,
} from "@expo/vector-icons";
import Colors from "@/constants/Colors";

// Define a union type for the available icon sets
type IconType =
  | "MaterialCommunityIcons"
  | "AntDesign"
  | "FontAwesome5"
  | "Feather"
  | "FontAwesome"
  | "Ionicons"
  | "EvilIcons"
  | string;

// Define the props with TypeScript
interface IconProps {
  name: string;
  size?: number;
  iconColor?: string;
  type?: IconType;
}

// Map the icon types to the corresponding components
const iconMap: Record<IconType, React.ComponentType<any>> = {
  MaterialCommunityIcons,
  AntDesign,
  FontAwesome5,
  Feather,
  FontAwesome,
  Ionicons,
  EvilIcons,
};

const Icon: React.FC<IconProps> = ({
  name,
  size = 40,
  iconColor = Colors.primary,
  type = "FontAwesome5", // Default type
}) => {
  const IconComponent = iconMap[type]; // Get the corresponding icon component

  return <IconComponent name={name} color={iconColor} size={size} />;
};

export default Icon;
