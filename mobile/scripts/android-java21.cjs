const { execFileSync, spawnSync } = require("node:child_process");
const path = require("node:path");
require("./java21-toolchain.cjs");
const root = path.resolve(__dirname, "..");
let javaHome = process.env.JAVA_HOME;
if (process.platform === "darwin") {
  javaHome = execFileSync("/usr/libexec/java_home", ["-v", "21"], {
    encoding: "utf8",
  }).trim();
}
if (!javaHome) throw new Error("Set JAVA_HOME to your installed JDK 21.");
const info = spawnSync(path.join(javaHome, "bin", "java"), ["-version"], {
  encoding: "utf8",
});
if (info.status !== 0 || !/version "21[."]/.test(info.stderr + info.stdout)) {
  throw new Error("This Android command requires JDK 21.");
}
const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  PATH: path.join(javaHome, "bin") + path.delimiter + process.env.PATH,
};
const result = spawnSync(
  process.execPath,
  [require.resolve("expo/bin/cli"), "run:android", ...process.argv.slice(2)],
  { cwd: root, env, stdio: "inherit" },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
