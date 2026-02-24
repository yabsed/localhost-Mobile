# `mapAttemptToParticipatedActivity` 완전 해설

이 문서는 `src/store/useMapStore.ts`의 `mapAttemptToParticipatedActivity`가 **무엇을 하는 함수인지**, 그리고 **우리 앱 전체 플로우에서 어디를 연결하는 핵심 함수인지**를 코드 인용 중심으로 설명한다.

---

## 1) 이 함수의 한 줄 정의

`mapAttemptToParticipatedActivity`는 서버 `MissionAttemptResponse`를 UI/스토어에서 쓰는 `ParticipatedActivity`로 변환하는 함수다.

```ts
// src/store/useMapStore.ts
const mapAttemptToParticipatedActivity = (
  board: Board,
  mission: Mission,
  attempt: MissionAttemptResponse,
  options?: { coordinate?: Coordinate; receiptImageUri?: string },
): ParticipatedActivity | null => { ... }
```

즉, 이 함수는 다음을 담당한다.

1. 어떤 attempt를 활동 내역에 보여줄지 필터링한다.
2. 보여줄 attempt라면 UI가 바로 쓸 수 있는 형태로 필드를 조립한다.
3. 리워드 지급 여부(특히 스탬프 미션)를 반영해 코인 값을 결정한다.

---

## 2) 함수 원문 (핵심 로직)

아래가 실제 핵심 코드다.

```ts
// src/store/useMapStore.ts:166-199
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

---

## 3) 입력/출력 타입이 의미하는 것

### 입력 attempt 타입

```ts
// src/api/missionAttemptApi.ts:14-22
export type MissionAttemptResponse = {
  attemptId: number;
  missionId: number;
  status: MissionAttemptStatus; // "PENDING" | "SUCCESS" | "FAILED" | "RETRY"
  retryHint?: string | null;
  rewardId?: number | null;
  checkinAt?: string | null;
  checkoutAt?: string | null;
};
```

### 출력 activity 타입

```ts
// src/types/map.ts:45-60
export type ParticipatedActivity = {
  id: string;
  boardId: string;
  boardTitle: string;
  missionId: string;
  missionType: MissionType;
  missionTitle: string;
  rewardCoins: number;
  status: "started" | "completed";
  startedAt: number;
  completedAt?: number;
  requiredMinutes?: number;
  receiptImageUri?: string;
  startCoordinate: Coordinate;
  endCoordinate?: Coordinate;
};
```

핵심은 서버 attempt가 `status/checkinAt/checkoutAt/rewardId` 위주라면, UI는 `missionTitle/rewardCoins/start/endCoordinate` 같은 렌더링 친화 필드가 필요하다는 점이다. 이 간극을 이 함수가 메운다.

---

## 4) 변환 규칙 상세

## 4-1. 어떤 attempt를 버리는가

```ts
if (!isPending && !isSuccess) return null;
if (isPending && mission.type !== "stay_duration") return null;
```

규칙은 두 줄로 끝난다.

1. `FAILED`, `RETRY`는 활동 내역으로 만들지 않는다.
2. `PENDING`은 `stay_duration`(체류 미션)만 허용한다.

이유는 코드 전반과 일치한다.

1. 일반 미션은 성공/실패만 UI 완료상태로 의미가 있다.
2. 체류 미션은 "시작(PENDING) -> 종료(SUCCESS)" 2단계라서 진행중 상태가 필요하다.

---

## 4-2. 리워드 지급 판단

```ts
const rewardGranted = isSuccess && (mission.type !== "repeat_visit_stamp" || hasReward(attempt.rewardId));
rewardCoins: rewardGranted ? mission.rewardCoins : 0,
```

`repeat_visit_stamp`만 예외 처리하는 이유:

1. 스탬프 미션은 매 시도마다 `SUCCESS`일 수 있지만,
2. 카드 완성 시점이 아니면 `rewardId`가 없을 수 있다.

그래서 스탬프 미션은 `SUCCESS`여도 `rewardId`가 없으면 `rewardCoins = 0`으로 내려간다.

`hasReward` 자체는 아래처럼 단순하다.

```ts
// src/store/useMapStore.ts:87-88
const hasReward = (rewardId: number | null | undefined): boolean =>
  typeof rewardId === "number" && Number.isFinite(rewardId);
```

---

## 4-3. 시간 필드 계산

```ts
const startedAt = getAttemptTimestamp(attempt) ?? Date.now();
const completedAt = isSuccess ? toEpochMillis(attempt.checkoutAt) ?? startedAt : undefined;
```

보조 함수는 다음과 같다.

```ts
// src/store/useMapStore.ts:115-116
const getAttemptTimestamp = (attempt: MissionAttemptResponse): number | undefined =>
  toEpochMillis(attempt.checkinAt) ?? toEpochMillis(attempt.checkoutAt);
```

정리:

1. `startedAt`: `checkinAt` 우선, 없으면 `checkoutAt`, 둘 다 없으면 `Date.now()`.
2. `completedAt`: `SUCCESS`일 때만 존재, `checkoutAt` 우선, 없으면 `startedAt`.

즉, 최소한 정렬 가능한 타임스탬프를 항상 만들도록 방어 코드가 들어가 있다.

---

## 4-4. 좌표/이미지 부가 정보

```ts
const coordinate = options?.coordinate ?? board.coordinate;
receiptImageUri: options?.receiptImageUri,
startCoordinate: coordinate,
endCoordinate: isSuccess ? coordinate : undefined,
```

1. 호출자가 좌표를 넘기면 그 값을 사용한다.
2. 안 넘기면 보드 좌표를 사용한다.
3. `receiptImageUri`는 이름과 달리 영수증/보물찾기 둘 다에서 재사용된다.

보물찾기 호출부도 같은 필드에 넣는다.

```ts
// src/store/useMapStore.ts:546-549
const activity = mapAttemptToParticipatedActivity(board, mission, attempt, {
  coordinate,
  receiptImageUri: capturedImageUri,
});
```

---

## 4-5. activity ID 생성 전략

```ts
id: `attempt-${attempt.attemptId}`,
```

서버 `attemptId`를 전역 고유 키처럼 쓰고, 프론트는 접두사(`attempt-`)만 붙여서 `ParticipatedActivity.id`로 사용한다.

이 ID는 병합/중복 제거에도 쓰인다.

```ts
// src/store/useMapStore.ts:155
const withoutSameId = activities.filter((activity) => activity.id !== nextActivity.id);
```

---

## 5) 이 함수가 전체 플로우에서 놓인 위치

`mapAttemptToParticipatedActivity`는 "attempt 생성 API"와 "UI 표시 상태" 사이의 중앙 매퍼다.

```text
카메라/GPS/버튼 입력
-> certifyXXX/startStay/completeStay
-> attemptMission/checkin/checkout/getMyMissionAttempts
-> mapAttemptToParticipatedActivity
-> upsertParticipatedActivity + store.participatedActivities 갱신
-> ViewPostModal 렌더링(완료/진행중/활동내역)
```

---

## 6) 전체 코드 흐름에서 실제 호출 지점

## 6-1. 앱 로드 시 서버 이력 재구성

`loadBoards`가 보드 로드 후 attempt 이력을 재구성한다.

```ts
// src/store/useMapStore.ts:336-339
const fetchedBoards = await fetchBoardsFromStoreMissions(coordinate);
const { token } = useAuthStore.getState();
const attemptState = token ? await buildAttemptStateFromBoards(fetchedBoards, token) : ...
```

`buildAttemptStateFromBoards` -> `fetchAttemptRecords` -> `buildAttemptStateFromAttemptRecords` 순서로 들어간다.

```ts
// src/store/useMapStore.ts:263-267
for (const attempt of orderedAttempts) {
  const activity = mapAttemptToParticipatedActivity(record.board, record.mission, attempt);
  if (activity) {
    participatedActivities.push(activity);
  }
}
```

여기서 중요한 점은 `options` 없이 호출되므로 좌표가 `board.coordinate`로 채워진다는 것이다.

---

## 6-2. 모달 진입 시 보드별 이력 재동기화

`MapScreen`에서 모달이 열려 있고 로그인 상태면 보드 attempt를 다시 당겨온다.

```ts
// src/screens/MapScreen.tsx:128-131
if (!viewModalVisible || !selectedBoard || !isAuthenticated) return;
void refreshBoardMissionAttempts(selectedBoard);
```

`refreshBoardMissionAttempts` 내부에서도 결국 같은 매퍼를 통해 상태를 다시 만든다.

```ts
// src/store/useMapStore.ts:387-389
const nextAttemptState = missionRecords.length > 0
  ? buildAttemptStateFromAttemptRecords(await fetchAttemptRecords(missionRecords, token))
  : ...
```

즉, 로컬 상태만 믿지 않고 서버 attempt 이력 기준으로 재구성한다.

---

## 6-3. 실시간 인증 액션들에서 즉시 매핑

미션 성공 직후에도 같은 매퍼를 호출해 즉시 UI 반영한다.

```ts
// quiet time
// src/store/useMapStore.ts:445
const activity = mapAttemptToParticipatedActivity(board, mission, attempt, { coordinate });

// receipt
// src/store/useMapStore.ts:494-497
const activity = mapAttemptToParticipatedActivity(board, mission, attempt, {
  coordinate,
  receiptImageUri,
});

// treasure hunt
// src/store/useMapStore.ts:546-549
const activity = mapAttemptToParticipatedActivity(board, mission, attempt, {
  coordinate,
  receiptImageUri: capturedImageUri,
});

// repeat stamp
// src/store/useMapStore.ts:611
const activity = mapAttemptToParticipatedActivity(board, mission, attempt, { coordinate });

// stay checkin
// src/store/useMapStore.ts:677
const activity = mapAttemptToParticipatedActivity(board, mission, attempt, { coordinate });

// stay checkout
// src/store/useMapStore.ts:795
const updatedActivity = mapAttemptToParticipatedActivity(board, mission, attempt, { coordinate });
```

결론: attempt를 activity로 만드는 관문이 사실상 이 함수 하나다.

---

## 7) 보물찾기(certificateTreasureHuntMission)와의 연결 상세

질문 맥락(압축 URI, multipart 업로드, 함수 연결)에 맞춰 보물찾기 플로우를 end-to-end로 적는다.

## 7-1. 카메라 촬영 후 압축 URI 획득

```ts
// src/components/modals/ViewPostModal.tsx:166-175
const compressedUri = await compressImageForUpload({
  uri: result.assets[0].uri,
  width: result.assets[0].width,
  height: result.assets[0].height,
});
...
return {
  uri: compressedUri,
  summary: buildCompressionSummary(originalSize, compressedSize),
};
```

압축 함수는 JPEG로 저장하며 품질 0.45를 사용한다.

```ts
// src/utils/imageCompression.ts:32-38
const compressedResult = await manipulateAsync(
  uri,
  buildResizeAction(width, height),
  {
    compress: IMAGE_COMPRESSION.targetQuality, // 0.45
    format: SaveFormat.JPEG,
  },
);
```

---

## 7-2. 압축 URI를 store 액션으로 전달

```ts
// src/components/modals/ViewPostModal.tsx:237
await certifyTreasureHuntMission(board, mission, currentCoordinate, capturedImage.uri);
```

즉, 여기서 `capturedImage.uri`가 이미 압축된 URI다.

---

## 7-3. store에서 2차 검증 후 attempt API 호출

`certifyTreasureHuntMission`에서 위치/로그인/미션ID/중복완료를 재검증한다.

```ts
// src/store/useMapStore.ts:515-517
const coordinate = getCoordinateNearBoardOrAlert(currentCoordinate, board);
if (!coordinate) return;

// src/store/useMapStore.ts:523-524
const token = getAccessTokenOrAlert();
if (!token) return;

// src/store/useMapStore.ts:526-527
const missionId = getMissionIdOrAlert(mission.id);
if (missionId === null) return;

// src/store/useMapStore.ts:529-536
const alreadyCompleted = participatedActivities.some(...status === "completed");
if (alreadyCompleted) {
  Alert.alert("이미 완료됨", "이 활동은 이미 인증을 완료했습니다.");
  return;
}
```

그 다음 attempt API 호출:

```ts
// src/store/useMapStore.ts:540
const attempt = await attemptMission(missionId, { imageUri: capturedImageUri }, token);
```

---

## 7-4. multipart/form-data 업로드가 실제로 만들어지는 지점

```ts
// src/api/missionAttemptApi.ts:83-90
const formData = new FormData();
const imageFile = {
  uri: imageUri,
  name: getImageFileName(imageUri),
  type: getImageMimeType(imageUri),
} as unknown as Blob;
formData.append("image", imageFile);
```

그리고 endpoint는 정확히:

```ts
// src/api/missionAttemptApi.ts:109
`${API_BASE_URL}/api/missions/${missionId}/attempts`
```

즉 질문에서 말한 `POST /api/missions/{missionId}/attempts` multipart 업로드가 여기다.

---

## 7-5. attempt -> activity 매핑 후 상태 반영

성공이면 바로 매핑:

```ts
// src/store/useMapStore.ts:546-549
const activity = mapAttemptToParticipatedActivity(board, mission, attempt, {
  coordinate,
  receiptImageUri: capturedImageUri,
});
```

스토어 반영은 `upsertParticipatedActivity`가 처리:

```ts
// src/store/useMapStore.ts:151-164
const withoutSameId = activities.filter((activity) => activity.id !== nextActivity.id);
const normalizedActivities = nextActivity.status === "completed"
  ? withoutSameId.filter(
      (activity) =>
        !(activity.boardId === nextActivity.boardId && activity.missionId === nextActivity.missionId && activity.status === "started"),
    )
  : withoutSameId;

return [nextActivity, ...normalizedActivities].sort((a, b) => b.startedAt - a.startedAt);
```

의미:

1. 같은 attempt ID는 교체한다.
2. 완료가 들어오면 같은 미션의 진행중(`started`) 카드를 제거한다.
3. 최신 순 정렬한다.

---

## 8) 최종적으로 UI에서 어떻게 쓰이는가

미션 카드 완료 판정:

```ts
// src/components/modals/ViewPostModal.tsx:277-280
const completedActivity = participatedActivities.find(
  (activity) =>
    activity.boardId === board.id && activity.missionId === mission.id && activity.status === "completed",
);
```

체류 진행중 판정:

```ts
// src/components/modals/ViewPostModal.tsx:281-284
const inProgressActivity = participatedActivities.find(
  (activity) =>
    activity.boardId === board.id && activity.missionId === mission.id && activity.status === "started",
);
```

활동 내역 목록도 같은 배열을 렌더링:

```ts
// src/components/modals/ViewPostModal.tsx:404-406
const boardActivities = [...participatedActivities]
  .filter((activity) => activity.boardId === board.id)
  .sort((a, b) => b.startedAt - a.startedAt);
```

그래서 `mapAttemptToParticipatedActivity`가 잘못 매핑하면, 버튼 상태/진행중 UI/완료 표시/활동 내역이 전부 틀어진다.

---

## 9) 함수의 사실상 “계약(Contract)”

이 함수를 한 문장으로 계약화하면 다음이다.

1. 입력이 `PENDING/SUCCESS`이고 정책상 표시 대상이면 `ParticipatedActivity`를 반환한다.
2. 그렇지 않으면 `null`을 반환해 상위 로직이 무시하게 한다.
3. 반환된 객체는 UI와 상태머신이 바로 쓸 수 있게 최소 필수 정보(상태, 시간, 보상, 좌표)를 포함한다.

---

## 10) 실무에서 꼭 기억할 포인트

1. `receiptImageUri` 필드는 현재 영수증/보물찾기 공용으로 쓰인다(이름만 receipt).
2. `repeat_visit_stamp`는 `SUCCESS`여도 `rewardId` 없으면 코인이 0이다.
3. `PENDING` activity는 오직 `stay_duration`에서만 만들어진다.
4. 앱은 로컬 상태만 보지 않고 `getMyMissionAttempts` 기반으로 재구성한다.
5. 결국 attempt 계층과 UI 계층의 경계(어댑터)가 `mapAttemptToParticipatedActivity`다.

