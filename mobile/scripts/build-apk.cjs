const { execFileSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const root = path.resolve(__dirname, "..");
const javaHome = execFileSync("/usr/libexec/java_home", ["-v", "21"], {
  encoding: "utf8",
}).trim();
const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  PATH: path.join(javaHome, "bin") + path.delimiter + process.env.PATH,
  NODE_ENV: "production",
};
execFileSync(
  process.execPath,
  [require.resolve("expo/bin/cli"), "prebuild", "--platform", "android"],
  { cwd: root, env, stdio: "inherit" },
);
require("./java21-toolchain.cjs");
const sdk =
  process.env.ANDROID_HOME ||
  path.join(require("node:os").homedir(), "Library/Android/sdk");
fs.writeFileSync(
  path.join(root, "android/local.properties"),
  "sdk.dir=" + sdk + "\n",
);
execFileSync(
  path.join(root, "android/gradlew"),
  [
    "-p",
    path.join(root, "android"),
    "app:assembleRelease",
    "-x",
    "lint",
    "-x",
    "test",
    "--console=plain",
    "-PreactNativeArchitectures=arm64-v8a",
  ],
  { cwd: root, env, stdio: "inherit" },
);
const output = path.join(root, "../deliverables");
fs.mkdirSync(output, { recursive: true });
fs.copyFileSync(
  path.join(root, "android/app/build/outputs/apk/release/app-release.apk"),
  path.join(output, "Yoesar-preview.apk"),
);
console.log(
  "Standalone preview saved to " + path.join(output, "Yoesar-preview.apk"),
);
