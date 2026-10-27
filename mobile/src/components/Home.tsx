import { Image, Pressable, Text, View } from "react-native";
import type { Report } from "../../../shared/report";
import { imageSource, type Session } from "../lib/api";
import Icon from "./Icon";
import { Card, s } from "./ui";

export default function Home({
  session,
  reports,
  queued,
  online,
  onStart,
  onReports,
}: {
  session: Session;
  reports: Report[];
  queued: number;
  online: boolean | null;
  onStart: (source: "camera" | "gallery") => void;
  onReports: () => void;
}) {
  const advice = reports.filter((r) => r.reviews.length > 0).length;

  return (
    <>
      <View
        style={[
          s.row,
          { justifyContent: "space-between", alignItems: "center", marginBottom: 22 },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={s.text}>Hello,</Text>
          <Text style={s.heading}>{session?.user?.name ?? "Farmer"}</Text>
        </View>
        <Text
          style={[
            s.badge,
            { backgroundColor: online === false ? "#fff1d7" : "#eff6f1" },
          ]}
        >
          {online === null ? "Checking connection" : online ? "Online" : "Offline"}
        </Text>
      </View>

      {!!queued && (
        <View style={s.notice}>
          <Text style={s.noticeText}>
            {queued} report{queued === 1 ? "" : "s"} saved on this phone. They’ll
            send when the server is reachable.
          </Text>
        </View>
      )}

      {!!advice && (
        <Pressable
          accessibilityRole="button"
          onPress={onReports}
          style={{
            backgroundColor: "#173d30",
            borderRadius: 14,
            padding: 16,
            flexDirection: "row",
            gap: 12,
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <Icon name="bell" color="#fff1d7" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
              Officer advice is available
            </Text>
            <Text style={{ color: "#c8d8d0", fontSize: 12, marginTop: 4 }}>
              Read responses to {advice} report{advice === 1 ? "" : "s"}
            </Text>
          </View>
          <Icon name="arrow" color="white" />
        </Pressable>
      )}

      <Text style={s.eyebrow}>NEW REPORT</Text>
      <Text style={s.heading}>Check a crop</Text>

      <View style={[s.row, { flexWrap: "nowrap", gap: 12 }]}>
        {(["camera", "gallery"] as const).map((source) => (
          <Pressable
            key={source}
            accessibilityRole="button"
            onPress={() => onStart(source)}
            style={[
              s.actionCard,
              source === "camera" && {
                backgroundColor: "#173d30",
                borderColor: "#173d30",
              },
            ]}
          >
            <View
              style={[
                s.actionIcon,
                source === "camera" && { backgroundColor: "#28674c" },
              ]}
            >
              <Icon
                name={source === "camera" ? "camera" : "upload"}
                size={27}
                color={source === "camera" ? "#fff1d7" : "#28674c"}
              />
            </View>
            <Text
              style={[
                s.actionTitle,
                source === "camera" && { color: "white" },
              ]}
            >
              {source === "camera" ? "Live camera" : "Upload image"}
            </Text>
            <Text
              style={[
                s.small,
                source === "camera" && { color: "#c8d8d0" },
              ]}
            >
              {source === "camera" ? "Select a crop first" : "Choose from photos"}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={s.sectionRow}>
        <Text style={[s.heading, { marginBottom: 0 }]}>Recent reports</Text>
        <Pressable accessibilityRole="button" onPress={onReports} hitSlop={12}>
          <Text style={{ color: "#28674c", fontWeight: "700" }}>View all</Text>
        </Pressable>
      </View>

      {reports.length ? (
        reports.slice(0, 3).map((r) => (
          <Pressable
            key={r.id}
            onPress={onReports}
            accessibilityRole="button"
            style={s.reportRow}
          >
            <Image
              source={imageSource(r.id, session?.token ?? "")}
              style={{ width: 62, height: 62, borderRadius: 9 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#17221d" }}>
                {r.crop}
              </Text>
              <Text
                style={[
                  s.badge,
                  !r.reviews.length && {
                    backgroundColor: "#fff1d7",
                    color: "#8b5214",
                  },
                ]}
              >
                {r.reviews.length ? "Advice available" : "Pending review"}
              </Text>
              <Text style={s.small}>
                {new Date(r.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <Icon name="arrow" />
          </Pressable>
        ))
      ) : (
        <Card>
          <Text style={s.heading}>Your first report starts here</Text>
          <Text style={s.text}>
            Take a photo or choose one from your gallery. An officer will review
            it and send advice.
          </Text>
        </Card>
      )}

      <View style={[s.row, { marginTop: 24, flexWrap: "nowrap" }]}>
        <Icon name="shield" size={18} />
        <Text style={[s.small, { flex: 1 }]}>
          Photos and location are shared with authorized officers. On-device
          model results are screening aids and need officer review.
        </Text>
      </View>
    </>
  );
}
