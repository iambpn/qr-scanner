# QR Scanner

QR Scanner is an Android app that reads QR codes and shows their content. The app is built with Expo. The app supports Android only.

## Features

- The app opens on the camera and is ready to scan.
- The app shows the content of each QR code.
- The app follows the light or dark theme of the system.
- If the code contains a Wi-Fi network, the app asks you to add the network.
- The app shows an action for each QR type: open a link, call, send an email or SMS, open a map, save a contact, or add a calendar event.
- Two Quick Settings tiles start a scan:
  - **Scan with camera** opens the camera.
  - **Scan screen** reads a QR code from the current screen. The result sheet opens above the app that you are using. When you close the sheet, you stay in that app.

## Build the app on Expo servers

EAS Build makes the app on Expo servers, so you do not need the Android SDK. You need an [Expo account](https://expo.dev/signup) and Node.js.

The `projectId` in `app.json` belongs to the Expo account of the project owner. If you use your own Expo account, remove `extra.eas.projectId` from `app.json` before you build.

1. Install the dependencies:

   ```bash
   npm install
   ```

2. Start the build:

   ```bash
   scripts/build-android.sh
   ```

3. If the script asks you to log in, enter your Expo account details.
4. On the first build, answer **yes** to these two questions:
   - Create the EAS project. This step adds a `projectId` to `app.json`.
   - Generate a new Android Keystore. Expo stores the signing key on its servers and uses the same key for later builds.
5. When the build finishes, open the link that the script shows and download the file.

Free Expo accounts wait in a queue, so a build can take some time to start.

### Use an access token instead of a login

You can build without `eas login`. Set `EXPO_TOKEN`, and EAS uses the token for your account.

1. Create a token at <https://expo.dev/settings/access-tokens>.
2. Enter the token. The screen does not show the token, and the token stays out of your shell history:

   ```bash
   read -rs EXPO_TOKEN && export EXPO_TOKEN
   ```

3. Start the build:

   ```bash
   scripts/build-android.sh
   ```

The token replaces the login only. The first build must still run in a terminal, because EAS asks you to create the project and the Android keystore.

After the first build, you can run builds without prompts, for example in CI. Use this command with `EXPO_TOKEN` set:

```bash
npx eas-cli@latest build --platform android --profile preview --non-interactive --no-wait
```

The `--no-wait` option stops the command after the build starts. The build continues on Expo servers. The script does not use these options, so you must run this command directly.

Keep the token private. Do not add the token to a file in this project.

### Build profiles

The script uses the `preview` profile by default. To select a profile, add its name:

```bash
scripts/build-android.sh production
```

| Profile      | Output | Use                              |
| ------------ | ------ | -------------------------------- |
| `preview`    | APK    | Install the app on a device.     |
| `production` | AAB    | Upload the app to Google Play.   |

### What the script does

1. It checks the profile name.
2. It runs `eas-cli login` if no Expo account is logged in.
3. It runs this command:

   ```bash
   npx eas-cli@latest build --platform android --profile preview
   ```

EAS does not upload the files in `.gitignore`. These files include `node_modules/`, `android/`, and `modules/*/android/build/`.

## Install the APK

1. Download the APK from the build link.
2. Install the APK on a connected device or a running emulator:

   ```bash
   adb install path/to/the/file.apk
   ```

## Add the tiles

Android does not add the tiles automatically.

1. Swipe down twice from the top of the screen.
2. Tap the pencil icon.
3. Drag **Scan screen** and **Scan with camera** into the panel.

## Develop on your computer

A local build needs the Android SDK and Java. Expo Go cannot run this app because the app has custom native code. The custom code is in the [qr-tools module](modules/qr-tools/README.md).

1. Set `ANDROID_HOME` to the Android SDK folder.
2. Start a device or an emulator.
3. Build and run the app:

   ```bash
   npm run android
   ```

## Run the checks

```bash
npm test
npm run typecheck
npm run lint
npx expo-doctor
```

## Limitations

- The **Scan screen** tile shows the Android capture prompt on each tap.
- If QR Scanner is not running, the **Scan screen** result sheet needs a short time to load.
- If the screen shows more than one QR code, the app reads the largest code.
- The app cannot read apps that block screenshots.
- On Android 10 and earlier, and for WEP or enterprise networks, the app copies the password and opens Android Wi-Fi settings.
- The app was tested on an Android 14 emulator only.
