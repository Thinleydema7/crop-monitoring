import { Image, Text, View } from "react-native";
import type { AnalyzedPhoto } from "../lib/detector";
import { s } from "./ui";
export default function PhotoPreview({ photo }: { photo: AnalyzedPhoto }) {
  return (
    <>
      <View
        style={{
          width: "100%",
          aspectRatio: photo.width / photo.height,
          backgroundColor: "#edf1e8",
          marginTop: 14,
          overflow: "hidden",
          borderRadius: 12,
        }}
      >
        <Image
          source={{ uri: photo.uri }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="contain"
        />
        {photo.detections.map((d, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              left: `${d.box.x * 100}%`,
              top: `${d.box.y * 100}%`,
              width: `${d.box.width * 100}%`,
              height: `${d.box.height * 100}%`,
              borderWidth: 2,
              borderColor: "#f5ca53",
              backgroundColor: "transparent",
            }}
          >
            <Text
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                alignSelf: "flex-start",
                width: 76,
                height: 18,
                overflow: "hidden",
                backgroundColor: "transparent",
                color: "#fff",
                fontSize: 10,
                fontWeight: "700",
                includeFontPadding: false,
                textShadowColor: "rgba(0, 0, 0, 0.95)",
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 2,
              }}
            >
              {d.label === "diseased" ? "Diseased" : d.label} {Math.round(d.confidence * 100)}%
            </Text>
          </View>
        ))}
      </View>
      {photo.detectionMode === "simulated" && (
        <View style={s.notice}>
          <Text style={s.noticeText}>
            SIMULATED DEMO · These boxes are examples, not AI findings or a
            disease diagnosis.
          </Text>
        </View>
      )}
      {photo.detectionMode === "model" && (
        <View style={s.notice}>
          <Text style={s.noticeText}>
            ON-DEVICE SCREENING · Model boxes are not a confirmed diagnosis. No boxes does not guarantee a healthy crop.
          </Text>
        </View>
      )}
    </>
  );
}
