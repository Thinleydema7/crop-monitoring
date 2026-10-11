import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import type { Report } from "../../../shared/report";
import { imageSource, type Session } from "../lib/api";
import { removeQueued, type QueuedReport } from "../lib/offline";
import { Button, Card, s } from "./ui";
import Icon from "./Icon";
import PhotoPreview from "./PhotoPreview";
export default function ReportHistory({
  session,
  reports,
  queued,
  onRefresh,
  busy,
}: {
  session: Session;
  reports: Report[];
  queued: QueuedReport[];
  onRefresh: () => void;
  busy: boolean;
}) {
  const [filter,setFilter] = useState<"all"|"pending"|"reviewed">("all");
  const [selected, setSelected] = useState<Report | null>(null),
    [original, setOriginal] = useState(false),
    [imageError, setImageError] = useState(false);
  const latest = selected
    ? (reports.find((r) => r.id === selected.id) ?? selected)
    : null;
  return (
    <>
      <Text style={s.title}>Reports & advice</Text>
      <Text style={s.text}>
        Track your reports and read your officer’s advice.
      </Text>
      <Button title="Refresh & sync" busy={busy} onPress={onRefresh} />
      <View style={{flexDirection:"row",backgroundColor:"#ecefea",padding:4,borderRadius:10,marginTop:18}}>{(["all","pending","reviewed"] as const).map(f=><Pressable key={f} accessibilityRole="button" accessibilityState={{selected:filter===f}} onPress={()=>setFilter(f)} style={{flex:1,paddingVertical:12,borderRadius:8,alignItems:"center",backgroundColor:filter===f?"white":"transparent"}}><Text style={{fontWeight:"700",color:filter===f?"#1f513e":"#66736d"}}>{f==="all"?"All":f==="pending"?"Pending":"Advice"}</Text></Pressable>)}</View>
      {filter !== "reviewed" && !!queued.length && (
        <Text style={s.label}>Saved on this phone · {queued.length}</Text>
      )}
      {(filter === "reviewed" ? [] : queued).map((q) => {
        const draft = JSON.parse(q.payload);
        return (
          <Card key={q.id}>
            <Text style={s.heading}>{draft.crop}</Text>
            <Text style={s.badge}>
              {q.blocked ? "Needs attention" : "Waiting to sync"}
            </Text>
            <PhotoPreview photo={draft.photo} />
            <Text style={s.small}>
              {new Date(q.createdAt).toLocaleString()}
            </Text>
            {!!q.lastError && <Text style={s.error}>{q.lastError}</Text>}
            <Button
              title="Delete local draft"
              secondary
              disabled={busy}
              onPress={() =>
                Alert.alert(
                  "Delete this saved report?",
                  "This removes the report and photo from this phone.",
                  [
                    { text: "Keep", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => {
                        void removeQueued(q)
                          .then(onRefresh)
                          .catch(() =>
                            Alert.alert(
                              "Unable to delete",
                              "Please try again.",
                            ),
                          );
                      },
                    },
                  ],
                )
              }
            />
          </Card>
        );
      })}
      {!reports.length && !queued.length && (
        <Card>
          <Text style={s.heading}>No reports yet</Text>
          <Text style={s.text}>
            Tap New report to share a crop photo with an officer.
          </Text>
        </Card>
      )}
      {reports.filter(r=>filter==="all"||r.status===filter).map(r=><Pressable key={r.id} accessibilityRole="button" onPress={()=>{setSelected(r);setOriginal(false);setImageError(false);}} style={s.reportRow}><Image source={imageSource(r.id,session.token)} style={{width:64,height:72,borderRadius:9}}/><View style={{flex:1}}><Text style={{fontSize:16,fontWeight:"700",color:"#17221d"}}>{r.crop}</Text><Text style={[s.badge,r.status==="pending"&&{backgroundColor:"#fff1d7",color:"#8b5214"}]}>{r.status==="reviewed"?"Advice available":"Pending review"}</Text><Text style={s.small}>{new Date(r.createdAt).toLocaleDateString()} · {r.id.slice(0,8)}</Text></View><Icon name="arrow"/></Pressable>)}
      {!!reports.length && !reports.some(r=>filter==="all"||r.status===filter) && <Card><Text style={s.text}>No {filter==="pending"?"pending reports":"officer advice"} yet.</Text></Card>}
      {latest && (
        <Modal
          visible
          animationType="slide"
          onRequestClose={() => setSelected(null)}
        >
          <SafeAreaView style={s.page} edges={["top","bottom"]}>
          <ScrollView style={s.page} contentContainerStyle={s.content}>
            <Button title="‹ Back to reports" secondary onPress={()=>setSelected(null)}/>
            <Text style={[s.eyebrow,{marginTop:20}]}>REPORT DETAILS</Text>
            <Text style={s.title}>{latest.crop} report</Text>
            <Text style={s.badge}>
              {latest.status === "reviewed" ? "Reviewed" : "Pending review"}
            </Text>
            <Image
              source={imageSource(latest.id, session.token, original)}
              style={{
                width: "100%",
                aspectRatio: latest.image.width / latest.image.height,
                marginTop: 20,
              }}
              resizeMode="contain"
              onError={() => setImageError(true)}
            />
            {imageError && (
              <Text style={s.error}>
                Image unavailable offline. Reconnect to load it.
              </Text>
            )}
            <Button
              title={original ? "Show report image" : "Show original image"}
              secondary
              onPress={() => {
                setOriginal((v) => !v);
                setImageError(false);
              }}
            />
            {latest.detectionMode === "simulated" && (
              <View style={s.notice}>
                <Text style={s.noticeText}>
                  SIMULATED DEMO · Boxes are examples, not AI findings.
                </Text>
              </View>
            )}
            <Card>
              <Text style={s.heading}>Location & capture</Text>
              <Text style={s.text}>
                {latest.location.latitude.toFixed(6)},{" "}
                {latest.location.longitude.toFixed(6)}
                {"\n"}Accuracy:{" "}
                {latest.location.accuracy === null
                  ? "unavailable"
                  : Math.round(latest.location.accuracy) + " m"}
                {"\n"}Captured / selected:{" "}
                {new Date(latest.capturedAt).toLocaleString()}
              </Text>
            </Card>
            <Text style={s.label}>Officer review history</Text>
            {latest.reviews.length ? (
              [...latest.reviews].reverse().map((v) => (
                <Card key={v.id}>
                  <Text style={s.small}>
                    {new Date(v.createdAt).toLocaleString()}
                  </Text>
                  <Text style={s.label}>Diagnosis</Text>
                  <Text style={s.text}>{v.diagnosis}</Text>
                  <Text style={s.label}>Recommendation</Text>
                  <Text style={s.text}>{v.recommendation}</Text>
                </Card>
              ))
            ) : (
              <Card>
                <Text style={s.text}>
                  Your report is waiting for an officer. Advice will appear here
                  after review.
                </Text>
              </Card>
            )}
            <Button title="Refresh advice" busy={busy} onPress={onRefresh} />
            <Button
              title="Back to history"
              secondary
              onPress={() => setSelected(null)}
            />
          </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </>
  );
}
