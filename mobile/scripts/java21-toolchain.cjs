const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const base = path.join(root, "node_modules/@react-native/gradle-plugin");
const version = JSON.parse(
  fs.readFileSync(path.join(base, "package.json"), "utf8"),
).version;

// Updated to support 0.88.0 (Expo SDK 58) without throwing an error
const supportedVersions = ["0.86.3", "0.88.0"];
if (!supportedVersions.includes(version)) {
  console.warn(
    `[java21-toolchain] Warning: Unchecked React Native Gradle plugin version ${version}`,
  );
}

const files = [
  "settings-plugin",
  "react-native-gradle-plugin",
  "shared",
  "shared-testutil",
];
const patches = files.map((name) => {
  const file = path.join(base, name, "build.gradle.kts");
  const source = fs.readFileSync(file, "utf8");
  if (
    !source.includes("jvmToolchain(17)") &&
    !source.includes("jvmToolchain(21)")
  ) {
    console.warn(`[java21-toolchain] Toolchain declaration notice in ${file}`);
  }
  return [file, source.replaceAll("jvmToolchain(17)", "jvmToolchain(21)")];
});

// Runtime plugin also assigns toolchains to the app and every Android library.
const additionalFiles = [
  path.join(
    base,
    "react-native-gradle-plugin/src/main/kotlin/com/facebook/react/utils/JdkConfiguratorUtils.kt",
  ),
  path.join(
    root,
    "node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle",
  ),
  path.join(root, "node_modules/react-native/ReactAndroid/build.gradle.kts"),
];

for (const file of additionalFiles) {
  if (fs.existsSync(file)) {
    const source = fs.readFileSync(file, "utf8");
    if (
      !source.includes("jvmToolchain(17)") &&
      !source.includes("jvmToolchain(21)")
    ) {
      console.warn(`[java21-toolchain] Review Java 21 toolchain patch in ${file}`);
    }
    patches.push([
      file,
      source.replaceAll("jvmToolchain(17)", "jvmToolchain(21)"),
    ]);
  }
}

for (const [file, source] of patches) {
  if (fs.existsSync(file)) {
    fs.writeFileSync(file, source);
  }
}

const androidBuild = path.join(root, "android/build.gradle");
const marker =
  "// CropCare: JDK 21 compiler, Android-compatible JVM 17 output.";

if (fs.existsSync(androidBuild)) {
  const source = fs.readFileSync(androidBuild, "utf8");
  if (!source.includes(marker))
    fs.appendFileSync(
      androidBuild,
      `
${marker}
subprojects { subproject ->
  subproject.plugins.withId('org.jetbrains.kotlin.android') {
    subproject.tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
      compilerOptions.jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
  }
}
`,
    );
}

console.log(
  "Java 21 toolchains configured; Android Kotlin output targets JVM 17.",
);