import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";
import { AppState, Linking, Modal, ScrollView, Text, View } from "react-native";
import { File } from "expo-file-system";
import { CameraView, useCameraPermissions } from "expo-camera";
import { analyzePhoto, type AnalyzedPhoto } from "../lib/detector";
import { preparePhoto } from "../lib/photos";
import PhotoPreview from "./PhotoPreview";
import { Button, s } from "./ui";
export default function LiveCamera({
  onCapture,
  onClose,
}: {
  onCapture: (photo: AnalyzedPhoto) => void;
  onClose: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [running, setRunning] = useState(false),
    [ready, setReady] = useState(false),
    [frame, setFrame] = useState<AnalyzedPhoto | null>(null),
    [error, setError] = useState(""),
    [foreground, setForeground] = useState(AppState.currentState === "active");
  const [threshold, setThreshold] = useState(0.6);
  const active = useRef(false);
  const latest = useRef<AnalyzedPhoto | null>(null),
    retained = useRef(false);
  const dispose = (uri: string) => {
    try {
      const f = new File(uri);
      if (f.exists) f.delete();
    } catch {}
  };
  useEffect(
    () => () => {
      if (latest.current && !retained.current) dispose(latest.current.uri);
    },
    [],
  );
  useEffect(() => {
    const sub = AppState.addEventListener("change", (v) => {
      setForeground(v === "active");
      if (v !== "active") setRunning(false);
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!running || !ready || !foreground) return;
    active.current = true;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function sample() {
      try {
        const capturedAt = new Date().toISOString();
        const picture = await camera.current?.takePictureAsync({
          quality: 0.7,
          shutterSound: false,
        });
        if (!picture) return;
        if (cancelled) {
          dispose(picture.uri);
          return;
        }
        const prepared = await preparePhoto(
          picture.uri,
          picture.width,
          picture.height,
          "camera",
          capturedAt,
        );
        dispose(picture.uri);
        if (cancelled) {
          dispose(prepared.uri);
          return;
        }
        const analyzed = await analyzePhoto(prepared, threshold);
        if (cancelled) {
          dispose(prepared.uri);
          return;
        }
        const old = latest.current;
        latest.current = analyzed;
        setFrame(analyzed);
        if (old) dispose(old.uri);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Camera capture failed.");
          setRunning(false);
        }
      } finally {
        if (!cancelled) timer = setTimeout(() => void sample(), 1600);
      }
    }
    void sample();
    return () => {
      cancelled = true;
      active.current = false;
      clearTimeout(timer);
    };
  }, [running, ready, foreground, threshold]);
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.page} edges={["top","bottom"]}>
      <ScrollView style={s.page} contentContainerStyle={s.content}>
        <Text style={s.eyebrow}>CAMERA / ON-DEVICE MODEL</Text>
        <Text style={s.heading}>Look closer at your crop</Text>
        <Text style={s.text}>
          This screen samples camera images and runs the crop disease model on
          the exact displayed frame. Results are screening aids, not a diagnosis.
        </Text>
        {!permission ? (
          <Text style={s.text}>Checking camera permission…</Text>
        ) : !permission.granted ? (
          <>
            <Text style={s.error}>
              Camera permission is needed to capture your crop.
            </Text>
            <Button
              title={
                permission.canAskAgain ? "Allow camera" : "Open app settings"
              }
              onPress={() => {
                if (permission.canAskAgain) void requestPermission();
                else void Linking.openSettings();
              }}
            />
          </>
        ) : foreground ? (
          <View
            style={{
              height: 260,
              marginTop: 16,
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <CameraView
              ref={camera}
              style={{ flex: 1 }}
              facing="back"
              onCameraReady={() => setReady(true)}
              onMountError={(e) => {
                setError(e.message);
                setReady(false);
              }}
            />
          </View>
        ) : (
          <Text style={s.text}>
            Camera paused while the app is in the background.
          </Text>
        )}
        <Button
          title={running ? "Stop sampling" : "Start on-device detection"}
          disabled={!permission?.granted || !ready || !foreground}
          onPress={() => {
            setError("");
            setRunning((v) => !v);
          }}
        />
        <Text style={s.label}>Confidence filter</Text>
        <View style={s.row}>
          {[0.25, 0.5, 0.6, 0.9].map((v) => (
            <Button
              key={v}
              secondary={threshold !== v}
              title={`${Math.round(v * 100)}%`}
              onPress={() => {
                setFrame(null);
                setThreshold(v);
              }}
            />
          ))}
        </View>
        {frame && (
          <>
            <Text style={s.label}>Last analyzed frame</Text>
            <PhotoPreview photo={frame} />
            <Button
              title={running ? "Stop sampling to use this frame" : "Use this analyzed frame"}
              disabled={running || !frame.detections.length}
              onPress={() => {
                retained.current = true;
                setRunning(false);
                onCapture(frame);
              }}
            />
          </>
        )}
        {!!error && <Text style={s.error}>{error}</Text>}
        <Button
          title="Close camera"
          secondary
          onPress={() => {
            setRunning(false);
            onClose();
          }}
        />
        <Text style={s.small}>
          Closing this screen releases the camera. A capture reuses the shown
          frame rather than taking a different photo.
        </Text>
      </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
