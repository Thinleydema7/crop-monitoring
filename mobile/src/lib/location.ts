import * as Location from "expo-location";

export type ReportLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recordedAt: string;
};

export async function getReportLocation(): Promise<ReportLocation> {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (!permission.granted) {
    throw new Error(
      "Location permission denied. Enable it in your phone’s app settings.",
    );
  }

  if (!(await Location.hasServicesEnabledAsync())) {
    throw new Error("Turn on your phone’s location and try again.");
  }

  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const position = await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      }),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(
            new Error("Location timed out. Move near a window and retry."),
          );
        }, 20000);
      }),
    ]);

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      recordedAt: new Date(position.timestamp).toISOString(),
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
