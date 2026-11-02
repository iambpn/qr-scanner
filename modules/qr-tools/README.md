# qr-tools

qr-tools is the local Expo module of QR Scanner. A local Expo module is native code that lives inside the app project. This module holds all of the custom Android code of the app.

The app needs this module. Without it, the app has no Quick Settings tiles, no screen scan, and no Wi-Fi, contact, or calendar forms. The app also fails to build, because `src/qr/qrActions.ts` and `src/components/ScanResultOverlay.tsx` import this module.

## What the module does

The Expo packages of this app do not give these features, so the module adds them:

| Feature | Android API |
| ------- | ----------- |
| **Scan with camera** and **Scan screen** tiles | `TileService` |
| Read a QR code from the current screen | `MediaProjection` and Google ML Kit |
| Show the result sheet above the app that you are using | A transparent `ReactActivity` |
| Save a Wi-Fi network | `Settings.ACTION_WIFI_ADD_NETWORKS` |
| Fill the contact form | `ContactsContract.Intents.Insert` |
| Fill the calendar form | `CalendarContract.Events` |

## Files

The Kotlin files are in `android/src/main/java/expo/modules/qrtools/`.

| File | Purpose |
| ---- | ------- |
| `expo-module.config.json` | Tells Expo that this folder is a native module, and names the module class. |
| `index.ts` | Gives the JavaScript code access to the native functions. |
| `QrToolsModule.kt` | Runs the native functions that `index.ts` declares. |
| `ScanTileServices.kt` | Defines the two Quick Settings tiles. |
| `ScanDeepLinks.kt` | Creates the intent that opens the app on the camera. |
| `ScreenCaptureActivity.kt` | Shows the Android capture prompt and starts the capture. |
| `ScreenCaptureService.kt` | Reads the screen and decodes the QR code. |
| `ScanResultActivity.kt` | Shows the React Native result sheet above your current app. |
| `android/src/main/AndroidManifest.xml` | Registers the tiles, the service, the activities, and the permissions. |
| `android/src/main/res/` | Holds the tile icons, the text, and the themes. |
| `android/build.gradle` | Lists the Android libraries, including ML Kit. |

## How the app uses the module

You do not add this module to `package.json`. During a build, Expo autolinking searches the `modules/` folder and finds `expo-module.config.json`. Expo then adds the module to the generated Android project.

The JavaScript code imports the module by path:

```ts
import QrTools from '../../modules/qr-tools';
```

## How the module was created

The first commit of this repository added this folder on October 31, 2026. The repository and the local session records do not show the command that created the folder, so we cannot confirm that command.

The `android/build.gradle` file and the `expo-module.config.json` file have the same structure as the Expo local module template. The rest of the folder is different from the template:

- The module supports Android only, so it has no `ios/` folder.
- The module has no `src/` folder and no native view.
- The tiles, the capture code, and the Wi-Fi and form functions are custom code.

## Create a module like this one

Run these steps from the folder that contains `package.json`.

1. Create the module:

   ```bash
   npx create-expo-module@latest --local
   ```

2. Enter `qr-tools` as the name. Use `expo.modules.qrtools` as the Android package.
3. Delete the `ios/` folder, the `src/` folder, and the native view files.
4. Set `platforms` in `expo-module.config.json` to `["android"]`.
5. Export the native module from `index.ts` with `requireNativeModule`.
6. Add the Android libraries to `android/build.gradle`.
7. Write the Kotlin code, and register each service and activity in `AndroidManifest.xml`.

For more information, read [Get started with Expo modules](https://docs.expo.dev/modules/get-started/).

## Change the module

Each change to this folder needs a new build. A JavaScript reload does not load native code.

- To add a native function, add it to `QrToolsModule.kt` and to the type in `index.ts`.
- To add a service or an activity, also register it in `AndroidManifest.xml`.
- To build the app, use `scripts/build-android.sh` or `npm run android`.
- If a local build creates an `android/` folder in the project root, do not change that folder. Expo generates it, and Git ignores it.
