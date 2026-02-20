# 로컬 테스트 및 빌드 명령어 모음

## 1. 내 휴대폰에 앱(APK) 바로 설치 및 실행 (개발용)
USB로 폰을 연결한 상태에서 아래 명령어를 실행하면, 앱이 빌드된 후 폰에 자동으로 설치되고 실행됩니다.
```bash
npx react-native run-android
```

## 2. Expo Go 앱으로 테스트하는 명령어
Expo Go 앱을 통해 무선으로 빠르게 테스트할 때 사용합니다.
```bash
npx expo start
```
(터미널에 QR 코드가 나오면 폰의 카메라나 Expo Go 앱으로 스캔하세요)

## 3. 배포용/독립 설치용 APK 파일 생성 방법
PC 연결 없이도 폰에서 단독으로 실행되는 진짜 APK 파일을 만드는 방법입니다.
```bash
cd android
.\gradlew assembleRelease
```
- **결과물 위치:** `android/app/build/outputs/apk/release/app-release.apk`
- 이 파일을 카카오톡, 구글 드라이브, USB 등을 통해 폰으로 전송한 뒤 터치하여 설치하면 됩니다.
