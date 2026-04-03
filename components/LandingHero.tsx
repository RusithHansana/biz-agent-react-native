import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "../theme/colors";
import { radii, spacing } from "../theme/spacing";
import { typeScale } from "../theme/typography";
import { useResponsiveLayout } from "../utils/useResponsiveLayout";

export interface LandingHeroProps {
  readonly businessName: string;
  readonly tagline: string;
  readonly location: string;
  readonly logoUri?: string;
  readonly onPressChat?: () => void;
}

export function LandingHero({ businessName, tagline, location, logoUri, onPressChat }: LandingHeroProps) {
  const [imgError, setImgError] = useState(false);
  const { isCompact, spacing: responsiveSpacing } = useResponsiveLayout();

  return (
    <SafeAreaView style={styles.container}>
      <Card mode="contained" style={styles.card}>
        <Card.Content
          style={[
            styles.content,
            { gap: spacing[responsiveSpacing.sectionGap] },
          ]}
        >
          {logoUri && !imgError ? (
            <Image
              source={{ uri: logoUri }}
              testID="landing-hero-logo"
              style={styles.logo}
              onError={() => setImgError(true)}
            />
          ) : null}

          <Text
            style={[styles.textBase, styles.businessName, isCompact ? styles.businessNameCompact : null]}
            numberOfLines={2}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={1.5}
          >
            {businessName}
          </Text>
          <Text
            style={[styles.textBase, styles.tagline]}
            numberOfLines={2}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={1.5}
          >
            {tagline}
          </Text>

          <View style={styles.locationRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={18} color={colors.dark.textSecondary} />
            <Text
              style={[styles.textBase, styles.location]}
              numberOfLines={1}
              ellipsizeMode="tail"
              maxFontSizeMultiplier={1.5}
            >
              {location}
            </Text>
          </View>

          <Button
            testID="landing-hero-chat-cta"
            mode="contained"
            buttonColor={colors.dark.accentPrimary}
            textColor={colors.dark.userBubbleText}
            onPress={onPressChat}
            disabled={!onPressChat}
            accessibilityLabel="Chat with Agent"
            accessibilityHint="Opens the chat screen"
            contentStyle={styles.buttonContent}
            style={styles.button}
            labelStyle={styles.buttonLabel}
          >
            Chat with Agent
          </Button>
        </Card.Content>
      </Card>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.bgPrimary,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["space-6"],
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: radii.card as number,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.surface,
  },
  content: {
    alignItems: "center",
    gap: spacing["space-4"],
    paddingHorizontal: spacing["space-6"],
    paddingVertical: spacing["space-8"],
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: spacing["space-2"],
  },
  textBase: {
    color: colors.dark.textPrimary,
  },
  businessName: {
    ...typeScale.display,
    textAlign: "center",
  },
  businessNameCompact: {
    fontSize: 28,
    lineHeight: 36,
  },
  tagline: {
    ...typeScale.bodyLg,
    color: colors.dark.textSecondary,
    textAlign: "center",
    flexShrink: 1,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing["space-2"],
    width: "100%",
    justifyContent: "center",
  },
  location: {
    ...typeScale.body,
    color: colors.dark.textSecondary,
    flexShrink: 1,
  },
  button: {
    width: "100%",
    borderRadius: radii.button as number,
    marginTop: spacing["space-2"],
  },
  buttonContent: {
    minHeight: 44,
  },
  buttonLabel: {
    ...typeScale.bodyLg,
    color: colors.dark.userBubbleText,
  },
});
