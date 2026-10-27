import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Linking,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Home from "./src/components/Home";
import Icon from "./src/components/Icon";
import { StatusBar } from "expo-status-bar";
import * as Network from "expo-network";
import type { Report } from "../shared/report";
import {
  apiBase,
  APIError,
  getCurrentUser,
  getReports,
  loadAPIAddress,
  login,
  register,
  request,
  setAPIAddress,
  type Session,
} from "./src/lib/api";
import { clearSession, loadSession, saveSession } from "./src/lib/session";
import {
  cachedReports,
  cacheReports,
  getQueued,
  retryQueued,
  synchronize,
  type QueuedReport,
} from "./src/lib/offline";
import NewReport from "./src/components/NewReport";
import ReportHistory from "./src/components/ReportHistory";
import { Button, Card, s } from "./src/components/ui";

export default function App() { 
  return <SafeAreaProvider><AppContent /></SafeAreaProvider>; 
}

function AppContent() {
  const [session, setSession] = useState<Session | null>(null),
    [restoring, setRestoring] = useState(true),
    [busy, setBusy] = useState(false),
    [syncing, setSyncing] = useState(false);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [online, setOnline] = useState<boolean | null>(null);
  const [entry, setEntry] = useState<"camera" | "gallery">("camera");
  const [showConnection, setShowConnection] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  const [name, setName] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [tab, setTab] = useState<"home" | "report" | "history" | "settings">("home"),
    [address, setAddress] = useState(""),
    [reports, setReports] = useState<Report[]>([]),
    [queued, setQueued] = useState<QueuedReport[]>([]);
  const currentSession = useRef<Session | null>(null),
    refreshing = useRef(false);
  currentSession.current = session;

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await loadAPIAddress();
        if (active) setAddress(apiBase());
        const saved = await loadSession();
        if (saved) {
          try {
            const user = await getCurrentUser(saved.token);
            if (active) setSession({ ...saved, user });
          } catch (e) {
            if (e instanceof APIError && e.status === 401) {
              await clearSession();
              if (active) setError("Session expired. Please sign in again.");
            } else if (active) {
              setSession(saved);
              setNotice(
                "Backend unavailable. You can save reports offline and view cached advice.",
              );
            }
          }
        }
      } catch {
        if (active) setError("Unable to restore session. Please sign in.");
      } finally {
        if (active) setRestoring(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function refresh(manual = false) {
    const activeSession = currentSession.current;
    if (
      !activeSession ||
      activeSession?.user?.role !== "farmer" ||
      refreshing.current
    )
      return;
    refreshing.current = true;
    setSyncing(true);
    if (manual) setError("");
    try {
      if (manual && activeSession?.user?.id) await retryQueued(activeSession.user.id);
      await synchronize(activeSession);
      const fresh = await getReports(activeSession.token);
      if (activeSession?.user?.id) await cacheReports(activeSession.user.id, fresh);
      if (currentSession.current?.token === activeSession.token) {
        setReports(fresh);
        setNotice("Reports are up to date.");
      }
    } catch (e) {
      if (currentSession.current?.token === activeSession.token) {
        if (e instanceof APIError && e.status === 401) {
          await clearSession();
          setSession(null);
          setError("Session expired. Please sign in again.");
        } else
          setNotice(
            "Backend unavailable. Saved reports remain on this phone and will retry.",
          );
      }
    } finally {
      try {
        if (activeSession?.user?.id) {
          const drafts = await getQueued(activeSession.user.id);
          if (currentSession.current?.token === activeSession.token)
            setQueued(drafts);
        }
      } finally {
        refreshing.current = false;
        setSyncing(false);
      }
    }
  }

  useEffect(() => {
    if (!session || session?.user?.role !== "farmer" || !session?.user?.id) {
      setReports([]);
      setQueued([]);
      return;
    }
    let active = true;
    void cachedReports(session.user.id).then((r) => {
      if (active) setReports(r);
    });
    void getQueued(session.user.id).then((q) => {
      if (active) setQueued(q);
    });
    void refresh();
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void refresh();
    }, 30000);
    void Network.getNetworkStateAsync().then(n => setOnline(n.isInternetReachable ?? n.isConnected ?? false));
    const network = Network.addNetworkStateListener((n) => {
      setOnline(n.isInternetReachable ?? n.isConnected ?? false);
      if (n.isConnected && AppState.currentState === "active") void refresh();
    });
    const appState = AppState.addEventListener("change", (v) => {
      if (v === "active") void refresh();
    });
    return () => {
      active = false;
      clearInterval(timer);
      network.remove();
      appState.remove();
    };
  }, [session?.token]);

  useEffect(() => { 
    const listener = BackHandler.addEventListener("hardwareBackPress", () => { 
      if (session && tab !== "home") { 
        setTab("home"); 
        return true; 
      } 
      return false; 
    }); 
    return () => listener.remove(); 
  }, [session, tab]);

  async function signIn() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (!email.trim() || !password)
        throw new Error("Enter your email and password.");
      if (signingUp && (!name.trim() || password !== passwordConfirmation))
        throw new Error(
          !name.trim() ? "Enter your name." : "Passwords do not match.",
        );
      const result = signingUp
        ? await register(name, email, password, passwordConfirmation)
        : await login(email, password);
      await saveSession(result);
      setSession(result);
      setPassword("");
      setPasswordConfirmation("");
      setSigningUp(false);
      setTab("home");
      setNotice("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (syncing) {
      setError("Wait for synchronization to finish before signing out.");
      return;
    }
    try {
      await clearSession();
      setSession(null);
      setReports([]);
      setQueued([]);
      setNotice("");
      setError("");
    } catch {
      setError("Unable to sign out. Please retry.");
    }
  }

  async function connection() {
    setBusy(true);
    setError("");
    try {
      await setAPIAddress(address);
      await request("/api/health");
      setNotice("Backend connection successful.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed.");
    } finally {
      setBusy(false);
    }
  }

  if (restoring)
    return (
      <View style={[s.page, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#245d44" />
      </View>
    );

  const settings = (
    <Card>
      <Text style={s.heading}>Connection settings</Text>
      <Text style={s.text}>
        Enter the CropCare server address provided for your demonstration.
      </Text>
      <TextInput
        style={[s.input, { marginTop: 14 }]}
        value={address}
        onChangeText={setAddress}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder="http://10.73.176.163:4000"
      />
      <Button
        title="Check connection"
        busy={busy}
        disabled={syncing}
        onPress={() => void connection()}
      />
      <Text style={s.small}>
        Keep the demonstration server running to send reports and retrieve advice.
      </Text>
    </Card>
  );

  return (
    <SafeAreaView style={s.page} edges={["top", "bottom", "left", "right"]}>
    <KeyboardAvoidingView
      style={s.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="dark" />
      {!!session && <View style={s.header}><View style={[s.row,{alignItems:"center"}]}><View style={s.logoMark}><Icon name="leaf" color="white"/></View><Text style={s.brand}>Yoesar</Text></View><Text style={s.small}>A new way to grow</Text></View>}
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        {!session && <View style={{backgroundColor:"#173d30",marginHorizontal:-20,marginTop:-22,padding:32,alignItems:"center",borderBottomLeftRadius:28,borderBottomRightRadius:28}}><View style={{backgroundColor:"#fffefa",padding:24,borderRadius:28,marginBottom:16}}><Icon name="leaf" size={56}/></View><Text style={{color:"white",fontSize:30,fontWeight:"800"}}>Yoesar</Text><Text style={{color:"#c8d8d0",marginTop:6}}>A new way to grow</Text></View>}
        {!session ? (
          <>
            <Text style={s.title}>Check your crops.
              Get expert advice.</Text>
            <Text style={s.text}>
              Share a photo. Get advice from an agricultural officer.
            </Text>
            <Card>
              <Text style={s.heading}>
                {signingUp ? "Create your farmer account" : "Farmer sign in"}
              </Text>
              {signingUp && (
                <>
                  <Text style={s.label}>Your name</Text>
                  <TextInput
                    style={s.input}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    maxLength={80}
                    editable={!busy}
                  />
                </>
              )}
              <Text style={s.label}>Email</Text>
              <TextInput
                style={s.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
              />
              <Text style={s.label}>Password</Text>
              <TextInput
                style={s.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                editable={!busy}
                onSubmitEditing={() => void signIn()}
              />
              {signingUp && (
                <>
                  <Text style={s.small}>
                    Use at least 8 characters for your password.
                  </Text>
                  <Text style={s.label}>Confirm password</Text>
                  <TextInput
                    style={s.input}
                    value={passwordConfirmation}
                    onChangeText={setPasswordConfirmation}
                    secureTextEntry
                    autoCapitalize="none"
                    editable={!busy}
                    onSubmitEditing={() => void signIn()}
                  />
                </>
              )}
              {!!error && (
                <Text style={s.error} accessibilityRole="alert">
                  {error}
                </Text>
              )}
              <Button
                title={signingUp ? "Create account" : "Sign in"}
                busy={busy}
                onPress={() => void signIn()}
              />
              <Button
                title={
                  signingUp
                    ? "Already have an account? Sign in"
                    : "New farmer? Sign up"
                }
                secondary
                disabled={busy}
                onPress={() => {
                  setSigningUp((v) => !v);
                  setPassword("");
                  setPasswordConfirmation("");
                  setError("");
                }}
              />
              <Text style={s.small}>
                Demo: farmer@cropcare.test / Farmer123!
              </Text>
            </Card>
            <Button title={showConnection ? "Hide connection settings" : "Connection settings"} secondary onPress={() => setShowConnection(v => !v)} />
            {showConnection && settings}
          </>
        ) : (
          <>
            {session?.user?.role === "officer" ? (
              <Card>
                <Text style={s.heading}>Your officer workspace</Text>
                <Text style={s.text}>
                  Open the backend address in your laptop browser to review
                  reports and send advice. This phone app is for farmers.
                </Text>
              </Card>
            ) : (
              <>
                {tab === "home" && <Home session={session} reports={reports} queued={queued.length} online={online} onStart={source=>{setEntry(source);setTab("report");}} onReports={()=>setTab("history")} />}
                {tab === "settings" && <><Text style={s.title}>Your profile</Text><Card><View style={[s.row,{alignItems:"center",gap:14}]}><View style={{width:56,height:56,borderRadius:28,backgroundColor:"#1f513e",alignItems:"center",justifyContent:"center"}}><Icon name="user" color="white" size={28}/></View><View style={{flex:1}}><Text style={s.heading}>{session?.user?.name}</Text><Text style={s.small}>{session?.user?.email}</Text></View></View></Card><Button title="Camera & location permissions" secondary onPress={()=>void Linking.openSettings()} /><Text style={[s.small,{marginTop:12}]}>Manage permission access in your phone settings.</Text></>}
                {tab === "report" && (
                  <NewReport
                    session={session}
                    initialSource={entry}
                    onCancel={()=>setTab("home")}
                    onSaved={() => {
                      setTab("history");
                      setNotice("Report saved on your phone. Sending when connected…");
                      void refresh();
                    }}
                  />
                )}
                {tab === "history" && (
                  <ReportHistory
                    session={session}
                    reports={reports}
                    queued={queued}
                    onRefresh={() => void refresh(true)}
                    busy={syncing}
                  />
                )}
                {tab === "settings" && settings}
              </>
            )}
            {(tab === "settings" || session?.user?.role === "officer") && <Button
              title="Sign out"
              secondary
              disabled={syncing}
              onPress={() => void signOut()}
            />}
          </>
        )}
        {!!error && session && (
          <Text style={s.error} accessibilityRole="alert">
            {error}
          </Text>
        )}
        {!!notice && <Text style={s.small}>{notice}</Text>}
      </ScrollView>
      {session?.user?.role === "farmer" && tab !== "report" && <View style={s.navigation}>
        {(["home", "history", "settings"] as const).map(t => <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: tab === t }} onPress={() => setTab(t)} style={[s.navItem, tab === t && { backgroundColor: "#eff6f1" }]}><Icon name={t === "home" ? "home" : t === "history" ? "report" : "user"} color={tab===t?"#28674c":"#7f8984"}/><Text style={[s.navText, tab === t && { color: "#28674c" }]}>{t === "home" ? "Home" : t === "history" ? "Reports" : "Profile"}</Text></Pressable>)}
      </View>}
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}