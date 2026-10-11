import { useEffect, useState } from "react";
import { Linking, Pressable, Switch, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { randomUUID } from "expo-crypto";
import { CROPS, type Crop, type ReportLocation } from "../../../shared/report";
import { getReportLocation } from "../lib/location";
import { preparePhoto } from "../lib/photos";
import {
  analyzePhoto,
  detectorMode,
  type AnalyzedPhoto,
} from "../lib/detector";
import { enqueue } from "../lib/offline";
import type { Session } from "../lib/api";
import { Button, Card, s } from "./ui";
import PhotoPreview from "./PhotoPreview";
import LiveCamera from "./LiveCamera";
export default function NewReport({
  session,
  onSaved,
  initialSource,
  onCancel,
}: {
  session: Session;
  onSaved: () => void;
  initialSource: "camera" | "gallery";
  onCancel: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [crop, setCrop] = useState<Crop | null>(null),
    [photo, setPhoto] = useState<AnalyzedPhoto | null>(null),
    [location, setLocation] = useState<ReportLocation | null>(null);
  const [locating, setLocating] = useState(true),
    [locationError, setLocationError] = useState(""),
    [locationAttempt, setLocationAttempt] = useState(0);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [camera, setCamera] = useState(false),
    [simulation, setSimulation] = useState(false);
  useEffect(() => {
    if (step !== 3) return;
    let active = true;
    setLocating(true);
    setLocationError("");
    setLocation(null);
    void getReportLocation()
      .then((l) => {
        if (active) setLocation(l);
      })
      .catch((e) => {
        if (active) setLocationError(e.message);
      })
      .finally(() => {
        if (active) setLocating(false);
      });
    return () => {
      active = false;
    };
  }, [locationAttempt, step]);
  async function gallery() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        allowsEditing: false,
      });
      if (!result.canceled) {
        const a = result.assets[0];
        const prepared = await preparePhoto(
          a.uri,
          a.width,
          a.height,
          "gallery",
        );
        setPhoto(
          simulation || detectorMode() === "model"
            ? await analyzePhoto(prepared)
            : { ...prepared, detections: [], detectionMode: "none" },
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to open photos.");
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!crop || !photo) {
      setError("Choose your crop and a photo.");
      return;
    }
    if (!location) {
      setError("Get your automatic location before saving this report.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await enqueue(session.user.id, {
        submissionId: randomUUID(),
        crop,
        photo,
        location,
      });
      setPhoto(null);
      setCrop(null);
      setMessage(
        "Report saved on this phone. It will sync when the backend is reachable.",
      );
      setLocationAttempt((v) => v + 1);
      onSaved();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to save report locally.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button title={step === 1 ? "‹ Back to home" : "‹ Back"} secondary disabled={busy} onPress={() => step === 1 ? onCancel() : setStep(step === 3 ? 2 : 1)} />
      <Text style={[s.eyebrow, { marginTop: 24 }]}>STEP {step} OF 3</Text>
      <Text style={s.title}>{step === 1 ? "Which crop are you checking?" : step === 2 ? "Add a clear crop photo" : "Review & send"}</Text>
      <Text style={s.text}>{step === 1 ? "Choose a crop before opening the camera or gallery." : step === 2 ? "Photograph the affected leaves in good light." : "Your photo and automatic location will be shared with an officer."}</Text>
      {step === 1 && <>
        <View style={{marginTop:18,gap:10}}>{CROPS.map(c => <Pressable key={c} accessibilityRole="button" accessibilityState={{selected:crop===c}} onPress={()=>{setCrop(c);setMessage("");}} style={[s.reportRow,{marginTop:0,padding:16,backgroundColor:crop===c?"#eff6f1":"white",borderColor:crop===c?"#28674c":"#dde3de",borderWidth:crop===c?2:1}]}><View style={{width:44,height:44,borderRadius:12,backgroundColor:crop===c?"#28674c":"#eff6f1",alignItems:"center",justifyContent:"center"}}><Text style={{fontWeight:"800",color:crop===c?"white":"#28674c"}}>{c.slice(0,2).toUpperCase()}</Text></View><Text style={[s.text,{flex:1,fontWeight:"700",color:"#17221d"}]}>{c}</Text><Text style={{color:"#28674c",fontSize:22}}>{crop===c?"✓":"○"}</Text></Pressable>)}</View>
        <View style={s.notice}><Text style={s.noticeText}>Only choose your crop. You don’t need to enter a village or symptoms.</Text></View>
        <Button title={initialSource==="camera"?"Continue to camera":"Continue to photo"} disabled={!crop} onPress={()=>{setStep(2);if(initialSource==="camera")setCamera(true);else void gallery();}} />
      </>}
      {step === 2 && <>
        <Text style={s.badge}>{crop}</Text>
        {photo ? <><PhotoPreview photo={photo}/><Text style={s.small}>{photo.source==="camera"?"Exact sampled frame":"Selected image"} · {new Date(photo.capturedAt).toLocaleString()}</Text></> : <View style={{borderWidth:1,borderStyle:"dashed",borderColor:"#a8b8af",backgroundColor:"#eff6f1",borderRadius:18,padding:36,marginTop:20,alignItems:"center"}}><Text style={s.heading}>Your photo goes here</Text><Text style={[s.text,{textAlign:"center"}]}>Choose a photo or open the camera to get started.</Text></View>}
        <Button title={photo?"Choose another photo":"Choose from photos"} secondary busy={busy} onPress={()=>void gallery()}/>
        <Button title="Open camera · simulated detection" secondary disabled={busy} onPress={()=>setCamera(true)}/>
        <View style={[s.row,{alignItems:"center",marginTop:16,flexWrap:"nowrap"}]}><Switch value={simulation} disabled={busy} onValueChange={setSimulation}/><Text style={[s.small,{flex:1}]}>Demo boxes for the next gallery photo. These are simulated, not a diagnosis.</Text></View>
        <Button title="Continue to location" disabled={!photo||busy} onPress={()=>setStep(3)}/>
      </>}
      {step === 3 && <>
        {photo && <PhotoPreview photo={photo}/>}
        <Text style={s.badge}>{crop}</Text>
        <Card><Text style={s.heading}>Automatic location</Text>{locating?<Text style={s.text}>Getting your location…</Text>:location?<><Text style={s.success}>✓ Location added</Text><Text style={s.text}>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</Text><Text style={s.small}>Accuracy: {location.accuracy===null?"unavailable":`about ${Math.round(location.accuracy)} metres`}</Text></>:<Text style={s.error}>{locationError}</Text>}<Button title="Retry location" secondary disabled={locating||busy} onPress={()=>setLocationAttempt(v=>v+1)}/>{!!locationError&&<Button title="Open permission settings" secondary onPress={()=>void Linking.openSettings()}/>}</Card>
        <Button title="Send for officer review" busy={busy} disabled={locating||!location} onPress={()=>void save()}/>
        <Text style={[s.small,{marginTop:12}]}>Offline? This report stays on your phone and sends when the server is reachable.</Text>
      </>}
      {!!error&&<Text style={s.error} accessibilityRole="alert">{error}</Text>}
      {!!message&&<Text style={s.success}>{message}</Text>}
      {camera&&<LiveCamera onClose={()=>setCamera(false)} onCapture={p=>{setPhoto(p);setCamera(false);setMessage("");}}/>}
    </>
  );
}
