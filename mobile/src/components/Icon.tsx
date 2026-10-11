import Svg, { Path, Circle, Rect } from "react-native-svg";
export type IconName = "leaf" | "home" | "report" | "user" | "camera" | "upload" | "pin" | "arrow" | "check" | "shield" | "bell" | "close";
export default function Icon({name, size=22, color="#28674c"}: {name: IconName; size?:number; color?:string}) {
 const shapes = {
 leaf: <><Path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 2 21 3 21 3s1 5.5-3.1 11.2A7 7 0 0 1 11 20Z"/><Path d="M2 21c0-3 1.85-5.36 5.08-6.94C9.4 12.92 12.3 12 16 12"/></>,
 home:<><Path d="m3 11 9-8 9 8"/><Path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
 report:<><Path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h4"/></>,
 user:<><Circle cx="12" cy="8" r="4"/><Path d="M4 21a8 8 0 0 1 16 0"/></>,
 camera:<><Path d="M14.5 5 13 3h-2L9.5 5H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z"/><Circle cx="12" cy="12.5" r="4"/></>,
 upload:<><Path d="M12 16V4m0 0L7 9m5-5 5 5M4 15v5h16v-5"/></>,
 pin:<><Path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><Circle cx="12" cy="10" r="2.5"/></>,
 arrow:<Path d="m9 18 6-6-6-6"/>, check:<Path d="m5 12 4 4L19 6"/>,
 shield:<><Path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><Path d="m9 12 2 2 4-4"/></>,
 bell:<Path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>, close:<Path d="m6 6 12 12M18 6 6 18"/>
 };
 return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">{shapes[name]}</Svg>;
}
