export const CROPS = [
  "Rice",
  "Maize",
  "Potato",
  "Tomato",
  "Apple",
  "Chilli",
] as const;

export type Crop = (typeof CROPS)[number];

export type ReportLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recordedAt: string;
};

export type Detection = {
  label: string;
  confidence: number;

  // Coordinates normalized from 0 to 1 relative to the analyzed image.
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export type OfficerReview = {
  id: string;
  officerId: string;
  diagnosis: string;
  recommendation: string;
  createdAt: string;
};

export type Report = {
  id: string;

  // Reuse this ID when retrying a submission to prevent duplicates.
  submissionId: string;

  farmerId: string;
  crop: Crop;
  source: "gallery" | "camera";

  image: {
    filename: string;
    originalFilename?: string;
    mimeType: string;
    width: number;
    height: number;
    annotated: boolean;
  };

  location: ReportLocation;
  detections: Detection[];
  detectionMode: "none" | "simulated" | "model";

  version?: number;
  status: "pending" | "reviewed";
  reviews: OfficerReview[];

  // Phone timestamp for the selected photo or captured frame.
  capturedAt: string;

  // Backend timestamp when the report was saved.
  createdAt: string;
};
