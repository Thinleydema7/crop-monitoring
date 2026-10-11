import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
export function Button({
  title,
  onPress,
  disabled = false,
  busy = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={onPress}
      accessibilityState={{ disabled: disabled || busy, busy }}
      style={({ pressed }) => [
        s.button,
        pressed && { opacity: 0.75 },
        secondary && s.secondary,
        (disabled || busy) && { opacity: 0.5 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? "#1f513e" : "white"} />
      ) : (
        <Text style={[s.buttonText, secondary && { color: "#1f513e" }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
export function Card({ children }: { children: ReactNode }) {
  return <View style={s.card}>{children}</View>;
}
export const s = StyleSheet.create({
  navigation: { flexDirection: "row", backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e5ebe7", paddingTop: 8, paddingBottom: 8, paddingHorizontal: 18 },
  navItem: { flex: 1, alignItems: "center", paddingVertical: 10, gap: 4, borderRadius: 10 },
  navText: { fontSize: 11, fontWeight: "700", color: "#66736d" },
  chip: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 24, borderWidth: 1, borderColor: "#dce5df", backgroundColor: "#fff" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#dde3de", backgroundColor: "#fffefa" },
  logoMark: { width: 36, height: 36, borderRadius: 11, backgroundColor: "#173d30", alignItems: "center", justifyContent: "center" },
  actionCard: { flex: 1, minHeight: 158, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#dde3de", backgroundColor: "white", justifyContent: "space-between" },
  actionTitle: { fontSize: 16, fontWeight: "700", color: "#102b23", marginTop: 16 },
  actionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#eff6f1" },
  reportRow: { flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: "white", padding: 12, borderWidth: 1, borderColor: "#dde3de", borderRadius: 14, marginTop: 10 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 26, marginBottom: 8 },
  page: { flex: 1, backgroundColor: "#fffefa" },
  content: { padding: 20, paddingTop: 22, paddingBottom: 28 },
  brand: { fontSize: 24, fontWeight: "800", color: "#1f513e" },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#708b76",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#102b23",
    marginTop: 22, marginBottom: 8,
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
    color: "#102b23",
    marginBottom: 10,
  },
  text: { fontSize: 15, lineHeight: 23, color: "#66736d" },
  small: { fontSize: 12, lineHeight: 19, color: "#66736d" },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#254b35",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    padding: 15,
    borderWidth: 1,
    borderColor: "#d5dfd3",
    borderRadius: 12,
    backgroundColor: "#fff",
    fontSize: 16,
    color: "#102b23",
  },
  button: {
    backgroundColor: "#1f513e",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  secondary: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#dde3de" },
  buttonText: { color: "white", fontSize: 15, fontWeight: "700" },
  card: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#fff",
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#e5ebe7",
  },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  error: { color: "#a13927", fontSize: 14, lineHeight: 21, marginTop: 12 },
  notice: {
    backgroundColor: "#fff0d4",
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  noticeText: { color: "#7f5617", fontSize: 13, lineHeight: 20 },
  success: { color: "#1f513e", lineHeight: 22, marginTop: 12 },
  badge: {
    fontSize: 12,
    color: "#1f513e",
    backgroundColor: "#e9f3e6",
    padding: 7,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 8,
  },
});
