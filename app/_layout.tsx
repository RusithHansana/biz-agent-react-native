import { useEffect } from "react";

import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import * as SplashScreen from "expo-splash-screen";
import { PaperProvider } from "react-native-paper";

import { AppProvider } from "../state/AppContext";
import { paperDarkTheme } from "../theme/paperTheme";
import { useReducedMotion } from "../utils/useReducedMotion";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "Inter-Regular": require("../assets/fonts/Inter-Regular.ttf"),
    "Inter-Medium": require("../assets/fonts/Inter-Medium.ttf"),
    "Outfit-SemiBold": require("../assets/fonts/Outfit-SemiBold.ttf"),
    "Outfit-Bold": require("../assets/fonts/Outfit-Bold.ttf"),
  });

  useEffect(() => {
    try {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch((error: unknown) => {
        console.error("Orientation lock failed:", error);
      });
    } catch (error) {
      console.error("Orientation lock synchronously failed:", error);
    }
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      if (fontError) {
        console.error("Font loading error:", fontError);
      }
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  const reduceMotion = useReducedMotion();

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <PaperProvider theme={paperDarkTheme}>
      <AppProvider>
        <Stack 
          screenOptions={{ 
            headerShown: false,
            animation: reduceMotion ? "none" : "slide_from_right",
            animationDuration: reduceMotion ? undefined : 300,
          }} 
        />
      </AppProvider>
    </PaperProvider>
  );
}
