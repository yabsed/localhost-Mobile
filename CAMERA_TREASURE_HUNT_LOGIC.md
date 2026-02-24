# 카메라 보물찾기 로직 완전 해설 (코드 직접 인용)

이 문서는 `camera_treasure_hunt` 미션이 앱에서 어떻게 정의되고, 화면에서 어떻게 보이고, 사용자가 촬영한 이미지가 어떤 경로로 서버 검증을 거쳐 성공/실패로 처리되는지를 **코드 직접 인용**으로 설명합니다.

핵심 목표는 하나입니다.

- 이 문서를 읽으면 실제 코드 파일을 열어보지 않아도 로직 전체를 머릿속에서 재구성할 수 있게 한다.

---

## 1) 이 기능의 정체: 미션 타입 정의

보물찾기는 프론트 도메인 모델에서 독립된 미션 타입입니다.

```ts
// src/types/map.ts
export type MissionType =
  | "quiet_time_visit"
  | "stay_duration"
  | "receipt_purchase"
  | "camera_treasure_hunt"
  | "repeat_visit_stamp";

export type Mission = {
  id: string;
  type: MissionType;
  title: string;
  description: string;
  rewardCoins: number;
  minDurationMinutes?: number;
  quietTimeStartHour?: number;
  quietTimeEndHour?: number;
  quietTimeDays?: QuietTimeDay[];
  receiptItemName?: string;
  receiptItemPrice?: number;
  treasureGuideText?: string;
  treasureGuideImageUri?: string;
  stampGoalCount?: number;
};
```

여기서 보물찾기 전용 필드는 두 개입니다.

- `treasureGuideText`: 사용자에게 보여줄 텍스트 힌트
- `treasureGuideImageUri`: 정답 가이드 이미지 URL

즉, 보물찾기는 "카메라를 켜서 아무거나 찍는 기능"이 아니라, **힌트(문구 + 이미지)를 참고해 특정 장면을 촬영하고 검증받는 미션 타입**입니다.

---

## 2) 서버 미션이 보물찾기로 변환되는 시점

백엔드 미션 타입 `INVENTORY`가 프론트에서 `camera_treasure_hunt`로 매핑됩니다.

```ts
// src/api/missionDefinitionApi.ts
if (missionDefinition.type === "INVENTORY") {
  const config = toInventoryConfig(parsedConfig);
  return {
    id: missionDefinition.id.toString(),
    type: "camera_treasure_hunt",
    title: "카메라 보물찾기",
    description: "정답 이미지와 같은 장면을 촬영해 인증하세요.",
    rewardCoins: missionDefinition.rewardAmount,
    treasureGuideText: DEFAULT_TREASURE_GUIDE_TEXT,
    treasureGuideImageUri: config.answerImageUrl || undefined,
  };
}
```

이 코드에서 중요한 점:

- 미션 제목/설명은 프론트에서 사람이 읽기 좋은 형태로 고정 생성됩니다.
- 실제 정답 이미지 URL은 `config.answerImageUrl`에서 가져옵니다.
- 텍스트 힌트는 `DEFAULT_TREASURE_GUIDE_TEXT`로 기본 보장됩니다.

즉, 관리자/서버가 `INVENTORY` 미션을 등록하면 앱 사용자 입장에서는 자동으로 "카메라 보물찾기" 카드가 보이게 됩니다.

---

## 3) 화면에서 보물찾기 카드가 어떻게 렌더링되는가

### 3-1. 미션 목록에서 보물 힌트 표시

```ts
// src/components/modals/ViewPostModal.tsx
{mission.type === "camera_treasure_hunt" && mission.treasureGuideText ? (
  <View style={styles.missionTreasureGuideContainer}>
    <Text style={styles.missionRuleText}>보물 힌트: {mission.treasureGuideText}</Text>
    {mission.treasureGuideImageUri && !hiddenTreasureGuideImageByMissionId[mission.id] ? (
      <Image
        source={{ uri: mission.treasureGuideImageUri }}
        style={styles.missionTreasureGuideImage}
        resizeMode="cover"
        onError={() => {
          setHiddenTreasureGuideImageByMissionId((current) => ({
            ...current,
            [mission.id]: true,
          }));
        }}
      />
    ) : null}
  </View>
) : null}
```

로직 요약:

- 보물찾기 타입일 때만 힌트 영역을 보여줍니다.
- 텍스트 힌트는 항상 우선 노출됩니다.
- 이미지 로딩이 실패하면 `hiddenTreasureGuideImageByMissionId[mission.id] = true`로 바꿔서 같은 이미지 에러를 반복적으로 보여주지 않습니다.

즉, 네트워크 환경이 불안정해도 UX가 망가지지 않게 최소한의 방어가 들어가 있습니다.

### 3-2. 보물찾기 액션 버튼/완료 UI

```ts
// src/components/modals/ViewPostModal.tsx
if (mission.type === "camera_treasure_hunt") {
  if (completedActivity) {
    const compressionSummary = missionImageSummaryByMissionId[mission.id];
    return (
      <View style={styles.missionCompletedContainer}>
        <Text style={styles.missionCompletedText}>참여 완료 +{completedActivity.rewardCoins} 코인</Text>
        {completedActivity.receiptImageUri ? (
          <Image source={{ uri: completedActivity.receiptImageUri }} style={styles.missionReceiptPreviewImage} />
        ) : null}
        {compressionSummary ? <Text style={styles.missionReceiptMetaText}>{compressionSummary}</Text> : null}
      </View>
    );
  }

  const isSubmitting = submittingTreasureMissionId === mission.id;
  return (
    <TouchableOpacity
      style={[styles.button, styles.saveButton, isSubmitting ? { opacity: 0.65 } : null]}
      disabled={isSubmitting}
      onPress={() => {
        void handleTreasureMission(board, mission);
      }}
    >
      <Text style={styles.buttonText}>{isSubmitting ? "보물 사진 검증 중..." : "카메라로 보물 촬영"}</Text>
    </TouchableOpacity>
  );
}
```

로직 요약:

- 이미 완료된 미션이면 버튼 대신 완료 상태/보상/촬영 이미지 미리보기를 보여줍니다.
- 진행 중이면 버튼을 비활성화하고 텍스트를 `"보물 사진 검증 중..."`으로 바꿉니다.
- 실제 클릭은 `handleTreasureMission`이 담당합니다.

---

## 4) 사용자가 버튼을 눌렀을 때: `handleTreasureMission`

```ts
// src/components/modals/ViewPostModal.tsx
const handleTreasureMission = async (board: Board, mission: Mission) => {
  if (mission.type !== "camera_treasure_hunt") return;
  if (!currentCoordinate) {
    Alert.alert("위치 필요", "GPS 위치를 확인할 수 없어요. 잠시 후 다시 시도해주세요.");
    return;
  }

  const distance = getDistanceMeters(currentCoordinate, board.coordinate);
  if (distance > MISSION_PROXIMITY_METERS) {
    Alert.alert(
      "거리 확인 필요",
      `${board.title}에서 약 ${Math.round(distance)}m 떨어져 있어요. ${MISSION_PROXIMITY_METERS}m 이내에서 다시 시도해주세요.`,
    );
    return;
  }

  const capturedImage = await captureMissionImage("보물찾기 촬영을 위해 카메라 권한을 허용해주세요.");
  if (!capturedImage) return;

  setMissionImageSummaryByMissionId((current) => ({
    ...current,
    [mission.id]: capturedImage.summary,
  }));

  setSubmittingTreasureMissionId(mission.id);
  try {
    await certifyTreasureHuntMission(board, mission, currentCoordinate, capturedImage.uri);
  } finally {
    setSubmittingTreasureMissionId(null);
  }
};
```

이 함수가 하는 일은 명확히 5단계입니다.

1. 타입 가드: 진짜 보물찾기 미션인지 확인.
2. GPS 존재 검사: 위치가 없으면 즉시 중단.
3. 거리 검사: 매장 기준 200m 밖이면 중단.
4. 촬영/압축: `captureMissionImage` 호출.
5. 서버 인증 요청: `certifyTreasureHuntMission` 호출.

중요 포인트:

- UI 계층에서 이미 거리 검사를 한 번 수행합니다.
- 그리고 아래 Store 계층에서도 같은 검사를 다시 합니다(이중 방어).

---

## 5) 촬영과 압축 파이프라인

보물찾기와 영수증은 촬영 파이프라인을 공유합니다. 핵심은 `captureMissionImage`입니다.

```ts
// src/components/modals/ViewPostModal.tsx
const captureMissionImage = async (
  permissionDeniedMessage: string,
): Promise<{ uri: string; summary: string } | null> => {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert("카메라 권한 필요", permissionDeniedMessage);
    return null;
  }

  const result = await ImagePicker.launchCameraAsync(getMissionCameraOptions());

  if (result.canceled || !result.assets[0]?.uri) return null;
  const originalSize = typeof result.assets[0].fileSize === "number"
    ? result.assets[0].fileSize
    : await getFileSizeBytes(result.assets[0].uri);

  const compressedUri = await compressImageForUpload({
    uri: result.assets[0].uri,
    width: result.assets[0].width,
    height: result.assets[0].height,
  });
  const compressedSize = await getFileSizeBytes(compressedUri);

  return {
    uri: compressedUri,
    summary: buildCompressionSummary(originalSize, compressedSize),
  };
};
```

동작 해석:

- 권한 미허용 시 바로 종료.
- 카메라 실행 후 취소되면 종료.
- 원본 파일 크기를 구하고,
- 압축된 새 URI를 만들고,
- 압축 전후 요약 문자열(`summary`)까지 생성합니다.

압축 정책은 유틸 파일에 명시되어 있습니다.

```ts
// src/utils/imageCompression.ts
const IMAGE_MAX_EDGE = 1920;

export const IMAGE_COMPRESSION = {
  targetQuality: 0.45,
} as const;

const buildResizeAction = (width?: number, height?: number): Action[] => {
  if (!width || !height) return [];
  const longestEdge = Math.max(width, height);
  if (longestEdge <= IMAGE_MAX_EDGE) return [];

  if (width >= height) {
    return [{ resize: { width: IMAGE_MAX_EDGE } }];
  }
  return [{ resize: { height: IMAGE_MAX_EDGE } }];
};

export const compressImageForUpload = async ({
  uri,
  width,
  height,
}: CompressInput): Promise<string> => {
  const compressedResult = await manipulateAsync(
    uri,
    buildResizeAction(width, height),
    {
      compress: IMAGE_COMPRESSION.targetQuality,
      format: SaveFormat.JPEG,
    },
  );
  return compressedResult.uri;
};
```

즉, 실질 정책은 다음과 같습니다.

- 긴 변이 1920을 넘으면 리사이즈.
- 결과 포맷은 JPEG.
- 압축 품질은 0.45.

카메라 옵션 자체는 아래처럼 단순합니다.

```ts
// src/utils/imageCompression.ts
export const getMissionCameraOptions = (): ImagePicker.ImagePickerOptions => ({
  mediaTypes: ["images"],
  allowsEditing: false,
  quality: 1,
});
```

여기서 `quality: 1`은 카메라 원본 캡처 품질이고, 실제 네트워크 업로드는 이후 압축 단계에서 줄어듭니다.

---

## 6) Store 계층의 핵심: `certifyTreasureHuntMission`

실제 미션 인증 비즈니스 로직은 `useMapStore`에 있습니다.

```ts
// src/store/useMapStore.ts
const getCoordinateNearBoardOrAlert = (coordinate: Coordinate | null, board: Board): Coordinate | null => {
  const currentCoordinate = getCoordinateOrAlert(coordinate);
  if (!currentCoordinate) return null;

  const distance = getDistanceMeters(currentCoordinate, board.coordinate);
  if (distance <= MISSION_PROXIMITY_METERS) return currentCoordinate;

  Alert.alert(
    "거리 확인 필요",
    `${board.title}에서 약 ${Math.round(distance)}m 떨어져 있어요. ${MISSION_PROXIMITY_METERS}m 이내에서 다시 시도해주세요.`,
  );
  return null;
};
```

```ts
// src/store/useMapStore.ts
certifyTreasureHuntMission: async (board, mission, currentCoordinate, capturedImageUri) => {
  if (mission.type !== "camera_treasure_hunt") return;

  const coordinate = getCoordinateNearBoardOrAlert(currentCoordinate, board);
  if (!coordinate) return;

  if (!mission.treasureGuideText) {
    Alert.alert("보물찾기 정보 없음", "가이드 문구가 아직 등록되지 않았어요.");
    return;
  }

  const token = getAccessTokenOrAlert();
  if (!token) return;

  const missionId = getMissionIdOrAlert(mission.id);
  if (missionId === null) return;

  const { participatedActivities } = get();
  const alreadyCompleted = participatedActivities.some(
    (activity) =>
      activity.boardId === board.id && activity.missionId === mission.id && activity.status === "completed",
  );
  if (alreadyCompleted) {
    Alert.alert("이미 완료됨", "이 활동은 이미 인증을 완료했습니다.");
    return;
  }

  try {
    const attempt = await attemptMission(missionId, { imageUri: capturedImageUri }, token);
    if (attempt.status !== "SUCCESS") {
      Alert.alert("보물찾기 인증 실패", getAttemptFailureMessage(attempt, "이미지 유사도 검증에 실패했습니다."));
      return;
    }

    const activity = mapAttemptToParticipatedActivity(board, mission, attempt, {
      coordinate,
      receiptImageUri: capturedImageUri,
    });
    if (!activity) {
      Alert.alert("보물찾기 인증 실패", "보물찾기 인증 응답을 처리하지 못했습니다.");
      return;
    }

    set((state) => ({
      participatedActivities: upsertParticipatedActivity(state.participatedActivities, activity),
    }));
    Alert.alert("보물찾기 인증 완료", `${activity.rewardCoins} 코인을 획득했어요.`);
  } catch (error) {
    Alert.alert("보물찾기 인증 실패", error instanceof Error ? error.message : "보물찾기 인증 요청에 실패했습니다.");
  }
},
```

이 함수의 본질:

- 프론트에서 최종 게이트 역할을 합니다.
- "위치/거리/로그인/미션ID/중복완료"를 모두 통과해야 서버 호출로 넘어갑니다.
- 서버 응답이 `SUCCESS`일 때만 성공 처리합니다.
- 성공 시 `participatedActivities`에 활동을 삽입합니다.

특히 주목할 부분:

- `receiptImageUri: capturedImageUri`로 저장합니다.
- 필드명이 영수증 전용처럼 보이지만 실제로는 보물찾기에서도 재사용하고 있습니다.
- 그래서 완료 카드에서 보물 사진도 동일한 preview 컴포넌트로 표시됩니다.

---

## 7) 실패 메시지 결정 방식 (`retryHint` 우선)

서버가 힌트를 주면 그 문구를 우선 사용합니다.

```ts
// src/store/useMapStore.ts
const getAttemptFailureMessage = (attempt: MissionAttemptResponse, defaultMessage: string): string => {
  const retryHint = attempt.retryHint?.trim();
  if (retryHint) return retryHint;
  if (attempt.status === "RETRY") return "다시 시도해주세요.";
  if (attempt.status === "PENDING") return "아직 미션이 완료되지 않았습니다.";
  return defaultMessage;
};
```

즉, 유사도 부족 같은 케이스에서 백엔드가 `retryHint`를 주면 사용자에게 더 구체적인 재시도 가이드를 전달할 수 있습니다.

---

## 8) 네트워크 계층: 이미지는 어떻게 전송되는가

### 8-1. 미션 시도 API 타입

```ts
// src/api/missionAttemptApi.ts
export type MissionAttemptStatus = "PENDING" | "SUCCESS" | "FAILED" | "RETRY";

export type MissionAttemptRequest = {
  imageUri?: string;
};

export type MissionAttemptResponse = {
  attemptId: number;
  missionId: number;
  status: MissionAttemptStatus;
  retryHint?: string | null;
  rewardId?: number | null;
  checkinAt?: string | null;
  checkoutAt?: string | null;
};
```

보물찾기에서는 이중에서 사실상 `SUCCESS` 외에는 실패로 간주합니다.

### 8-2. 이미지 multipart body 생성

```ts
// src/api/missionAttemptApi.ts
const buildAttemptBody = (
  payload: MissionAttemptRequest,
): { body?: BodyInit; contentType?: "application/json" } => {
  const imageUri = payload.imageUri?.trim();
  if (!imageUri) {
    return {};
  }

  const formData = new FormData();
  const imageFile = {
    uri: imageUri,
    name: getImageFileName(imageUri),
    type: getImageMimeType(imageUri),
  } as unknown as Blob;
  formData.append("image", imageFile);

  return { body: formData };
};
```

핵심:

- `imageUri`가 있으면 `FormData`로 `image` 필드에 첨부합니다.
- `contentType`을 직접 강제하지 않습니다. 이 경우 런타임이 multipart boundary를 맞춰 헤더를 구성하게 됩니다.

### 8-3. 실제 호출

```ts
// src/api/missionAttemptApi.ts
export const attemptMission = async (
  missionId: number,
  payload: MissionAttemptRequest,
  token: string,
): Promise<MissionAttemptResponse> => {
  const { body, contentType } = buildAttemptBody(payload);
  return fetchJson<MissionAttemptResponse>(
    `${API_BASE_URL}/api/missions/${missionId}/attempts`,
    {
      method: "POST",
      headers: createHeaders(token, contentType),
      body,
    },
    "미션 인증 요청에 실패했습니다.",
  );
};
```

실제 전송 URL은 `/api/missions/{missionId}/attempts`입니다.

---

## 9) 성공 응답이 오면 활동 이력으로 어떻게 바뀌는가

성공한 서버 응답은 `ParticipatedActivity`로 변환되어 UI의 완료 상태와 히스토리를 만듭니다.

```ts
// src/store/useMapStore.ts
const mapAttemptToParticipatedActivity = (
  board: Board,
  mission: Mission,
  attempt: MissionAttemptResponse,
  options?: { coordinate?: Coordinate; receiptImageUri?: string },
): ParticipatedActivity | null => {
  const isPending = attempt.status === "PENDING";
  const isSuccess = attempt.status === "SUCCESS";

  if (!isPending && !isSuccess) return null;
  if (isPending && mission.type !== "stay_duration") return null;

  const rewardGranted = isSuccess && (mission.type !== "repeat_visit_stamp" || hasReward(attempt.rewardId));
  const startedAt = getAttemptTimestamp(attempt) ?? Date.now();
  const completedAt = isSuccess ? toEpochMillis(attempt.checkoutAt) ?? startedAt : undefined;
  const coordinate = options?.coordinate ?? board.coordinate;

  return {
    id: `attempt-${attempt.attemptId}`,
    boardId: board.id,
    boardTitle: board.title,
    missionId: mission.id,
    missionType: mission.type,
    missionTitle: buildMissionTitle(mission, rewardGranted),
    rewardCoins: rewardGranted ? mission.rewardCoins : 0,
    status: isPending ? "started" : "completed",
    startedAt,
    completedAt,
    requiredMinutes: mission.type === "stay_duration" ? mission.minDurationMinutes : undefined,
    receiptImageUri: options?.receiptImageUri,
    startCoordinate: coordinate,
    endCoordinate: isSuccess ? coordinate : undefined,
  };
};
```

보물찾기에서 중요한 필드:

- `status`: `"completed"`로 저장되어 버튼 대신 완료 UI가 뜸
- `rewardCoins`: 코인 보상 표시값
- `receiptImageUri`: 실제로는 보물 촬영 이미지 preview 용도

`missionTitle`도 보물 힌트를 포함하도록 가공됩니다.

```ts
// src/store/useMapStore.ts
const buildMissionTitle = (mission: Mission, isRewardGranted: boolean): string => {
  if (mission.type === "receipt_purchase" && mission.receiptItemName) {
    return `${mission.title} (${mission.receiptItemName})`;
  }

  if (mission.type === "camera_treasure_hunt" && mission.treasureGuideText) {
    return `${mission.title} (${mission.treasureGuideText})`;
  }

  if (mission.type === "repeat_visit_stamp") {
    return isRewardGranted ? `${mission.title} 카드 완성` : `${mission.title} 스탬프 적립`;
  }

  return mission.title;
};
```

즉 활동 내역에서 같은 "카메라 보물찾기"라도 어떤 힌트였는지를 제목에서 바로 구분할 수 있게 되어 있습니다.

---

## 10) 앱 재진입/모달 재오픈 시 완료 상태가 유지되는 이유

`MapScreen`에서 모달을 열면 보드의 미션 시도를 다시 동기화합니다.

```ts
// src/screens/MapScreen.tsx
useEffect(() => {
  if (!viewModalVisible || !selectedBoard || !isAuthenticated) return;
  void refreshBoardMissionAttempts(selectedBoard);
}, [viewModalVisible, selectedBoard, isAuthenticated, refreshBoardMissionAttempts]);
```

스토어의 `loadBoards` 단계에서도 토큰이 있으면 시도 기록을 함께 불러옵니다.

```ts
// src/store/useMapStore.ts
const fetchedBoards = await fetchBoardsFromStoreMissions(coordinate);
const { token } = useAuthStore.getState();
const attemptState = token ? await buildAttemptStateFromBoards(fetchedBoards, token) : {
  participatedActivities: [] as ParticipatedActivity[],
  repeatVisitProgressByMissionId: {} as Record<string, RepeatVisitProgress>,
};
```

결론적으로 보물찾기 완료 여부는 UI 로컬 상태 하나에만 의존하지 않고, 서버 attempt 이력을 기준으로 재구성됩니다.

---

## 11) 엔드투엔드 시나리오를 한 번에 정리

사용자 1회 보물찾기 인증을 순서대로 쓰면 아래와 같습니다.

1. 앱이 서버 `INVENTORY` 미션을 받아 `camera_treasure_hunt`로 매핑한다.
2. 사용자가 매장 카드에서 힌트 텍스트/가이드 이미지를 본다.
3. "카메라로 보물 촬영" 버튼 클릭.
4. 프론트가 GPS 존재 + 200m 이내인지 1차 확인.
5. 카메라 권한 요청 후 촬영.
6. 이미지를 JPEG/품질 0.45/긴 변 1920 기준으로 압축.
7. 압축 결과 URI를 `certifyTreasureHuntMission`에 전달.
8. 스토어에서 위치/로그인/미션ID/중복완료 2차 확인.
9. `POST /api/missions/{missionId}/attempts`로 multipart 이미지 업로드.
10. 응답이 `SUCCESS`면 활동 이력에 완료로 추가하고 코인 안내.
11. 응답이 `FAILED/RETRY`면 `retryHint` 우선으로 실패 안내.
12. 화면은 완료 카드(코인/미리보기)로 바뀐다.

---

## 12) 실패/예외 케이스 매트릭스

코드 기준으로 보물찾기 실패 원인을 분류하면 아래와 같습니다.

- 위치 없음: `"GPS 위치를 확인할 수 없어요."`
- 매장과 거리 초과: `"200m 이내에서 다시 시도해주세요."`
- 카메라 권한 거부: `"카메라 권한 필요"`
- 촬영 취소: 조용히 중단 (`return null`)
- 힌트 문구 누락: `"보물찾기 정보 없음"`
- 로그인 토큰 없음: `"로그인 필요"`
- 미션 ID 파싱 실패: `"미션 ID 형식이 올바르지 않습니다."`
- 이미 완료된 미션 재시도: `"이미 완료됨"`
- 서버 검증 실패: `retryHint` 또는 기본 `"이미지 유사도 검증에 실패했습니다."`
- 네트워크/예외: `"보물찾기 인증 요청에 실패했습니다."` 또는 실제 에러 메시지

즉, 실패 원인이 UX 메시지로 상당히 잘 드러나도록 구성되어 있습니다.

---

## 13) 이 로직의 설계 특징 한 줄 요약

- "보물찾기"는 별도 ML이 앱에 들어있는 구조가 아니라, **카메라 캡처/압축/업로드를 프론트가 담당하고 판정은 서버가 담당하는 구조**입니다.
- 프론트는 판정 이전에 위치/권한/중복/입력 유효성 같은 실패를 최대한 앞단에서 걸러 네트워크 낭비와 사용자 혼란을 줄입니다.
- 영수증 인증과 동일 파이프라인을 재사용해 구현 복잡도를 낮추고, 미션 타입별로 문구/가이드/성공 메시지만 분기합니다.

