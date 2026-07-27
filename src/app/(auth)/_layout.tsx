import { Stack } from "expo-router";
import CustomHeader from "@/components/common/CustomHeader";

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        header: (props: { options: { title?: string }; back?: unknown }) => (
          <CustomHeader
            title={props.options.title ?? ""}
            showBackButton={props.back !== undefined}
          />
        ),
      }}
    >
      {/* Language select / splash redirect */}
      <Stack.Screen name="index" options={{ headerShown: false }} />

      {/* Language picker screen */}
      <Stack.Screen name="language" options={{ headerShown: false }} />

      {/* Animated loading / splash screen */}
      <Stack.Screen name="loading" options={{ headerShown: false }} />

      {/* Role selection — full-bleed, no header */}
      <Stack.Screen
        name="WelcomeRoleSelectionScreen"
        options={{ headerShown: false }}
      />

      {/* Client auth options (login / register choice) */}
      <Stack.Screen
        name="ClientAuthenticationOptionsScreen"
        options={{ headerShown: false }}
      />

      {/* Legal terms shared by guest onboarding links */}
      <Stack.Screen
        name="legal"
        options={{ headerShown: true, title: "Termes et conditions" }}
      />

      {/* Registration form */}
      <Stack.Screen
        name="ClientRegisterScreen"
        options={{ headerShown: true, title: "Inscrivez-vous" }}
      />

      {/* Login form */}
      <Stack.Screen
        name="ClientLoginScreen"
        options={{ headerShown: true, title: "Se connecter" }}
      />

      {/* Forgot-password flow */}
      <Stack.Screen
        name="ForgotPasswordScreen"
        options={{ headerShown: true, title: "Réinitialiser le mot de passe" }}
      />
      <Stack.Screen
        name="forgot-password/verification"
        options={{ headerShown: true, title: "Réinitialiser le mot de passe" }}
      />
      <Stack.Screen
        name="forgot-password/new-password"
        options={{ headerShown: true, title: "Réinitialiser le mot de passe" }}
      />
      <Stack.Screen
        name="forgot-password/success"
        options={{ headerShown: true, title: "Réinitialiser le mot de passe" }}
      />

      {/* Registration sub-flow */}
      <Stack.Screen
        name="register/verification"
        options={{ headerShown: true, title: "Inscrivez-vous" }}
      />
      <Stack.Screen
        name="register/car-selection"
        options={{ headerShown: true, title: "Choisissez votre voiture" }}
      />
      <Stack.Screen
        name="register/success"
        options={{ headerShown: true, title: "Choisissez votre voiture" }}
      />

      {/* Partner (Prestataire) onboarding flow */}
      <Stack.Screen
        name="prestataire/loading"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="prestataire/language"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="prestataire/welcome"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="prestataire/waitlist"
        options={{ headerShown: false }}
      />

      {/* Partner (Prestataire) sign-in */}
      <Stack.Screen
        name="prestataire/sign-in"
        options={{ headerShown: true, title: "Se connecter" }}
      />
    </Stack>
  );
}
