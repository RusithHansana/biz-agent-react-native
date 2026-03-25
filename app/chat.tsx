import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { colors } from "../theme/colors";

export default function ChatScreen() {
  return (
    <View style={styles.container}>
      <Text variant="headlineSmall">Chat screen coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dark.bgPrimary,
  },
});
