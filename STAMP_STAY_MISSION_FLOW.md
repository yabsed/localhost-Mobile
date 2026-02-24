# 스탬프/체류시간 미션 처리 완전 해설

이 문서는 우리 레포 코드만 기준으로, 아래 두 미션이 실제로 어떻게 동작하는지 끝까지 설명한다.

1. 스탬프 미션: `repeat_visit_stamp`
2. 체류시간 미션: `stay_duration`

핵심은 이 두 미션 모두 최종적으로 `mapAttemptToParticipatedActivity`를 거쳐 UI 상태로 변환된다는 점이다.

---

## 1) 서버 미션 타입이 프론트 타입으로 바뀌는 지점

미션 타입 매핑은 `src/api/missionDefinitionApi.ts`에서 시작한다.

```ts
// src/api/missionDefinitionApi.ts:248-257
if (missionDefinition.type === "DWELL") {
  const config = toDwellConfig(parsedConfig);
  return {
    id: missionDefinition.id.toString(),
    type: "stay_duration",
    title: `${config.durationMinutes}분 이상 체류`,
    description: "체류 시작/종료로 머문 시간을 인증하면 보상을 받습니다.",
    rewardCoins: missionDefinition.rewardAmount,
    minDurationMinutes: config.durationMinutes,
  };
}
```

```ts
// src/api/missionDefinitionApi.ts:289-297
const config = toStampConfig(parsedConfig);
return {
  id: missionDefinition.id.toString(),
  type: "repeat_visit_stamp",
  title: `반복 방문 스탬프 (${config.requiredCount}회)`,
  description: "하루 1회 방문 인증으로 스탬프를 적립하고 목표를 달성하면 보상을 받습니다.",
  rewardCoins: missionDefinition.rewardAmount,
  stampGoalCount: config.requiredCount,
};
```

즉 백엔드 `DWELL`, `STAMP`가 프론트에서는 `stay_duration`, `repeat_visit_stamp`로 확정된다.

---

## 2) 두 미션이 공유하는 기본 검증(위치/로그인/미션ID)

`useMapStore`의 공용 헬퍼가 모든 미션 액션에서 재사용된다.

```ts
// src/store/useMapStore.ts:73-85
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
// src/store/useMapStore.ts:108-113
const getAccessTokenOrAlert = (): string | null => {
  const { token } = useAuthStore.getState();
  if (token) return token;
  Alert.alert("로그인 필요", "미션 참여를 위해 먼저 로그인해주세요.");
  return null;
};
```

```ts
// src/store/useMapStore.ts:101-106
const getMissionIdOrAlert = (missionId: string): number | null => {
  const parsedMissionId = toMissionId(missionId);
  if (parsedMissionId !== null) return parsedMissionId;
  Alert.alert("오류", "미션 ID 형식이 올바르지 않습니다.");
  return null;
};
```

---

## 3) 중앙 매퍼: `mapAttemptToParticipatedActivity`

두 미션 모두 서버 attempt를 이 함수로 변환해야 UI가 동작한다.

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

이 함수가 두 미션에서 중요한 이유:

1. 스탬프 `PENDING`은 버린다: `if (isPending && mission.type !== "stay_duration") return null;`
2. 체류 `PENDING`은 `status: "started"`로 유지해 진행중 UI를 만든다.
3. 스탬프 `SUCCESS`라도 `rewardId` 없으면 `rewardCoins`를 0으로 만든다.

---

## 4) 앱 전체 플로우에서 이 함수가 끼어드는 위치

앱은 초기 로드/모달 리프레시 시 서버 attempt 이력을 다시 가져와 상태를 재구성한다.

```ts
// src/store/useMapStore.ts:336-339
const fetchedBoards = await fetchBoardsFromStoreMissions(coordinate);
const { token } = useAuthStore.getState();
const attemptState = token ? await buildAttemptStateFromBoards(fetchedBoards, token) : ...
```

```ts
// src/store/useMapStore.ts:262-276
for (const record of attemptRecords) {
  const orderedAttempts = sortAttemptsByLatest(record.attempts);
  for (const attempt of orderedAttempts) {
    const activity = mapAttemptToParticipatedActivity(record.board, record.mission, attempt);
    if (activity) {
      participatedActivities.push(activity);
    }
  }

  if (record.mission.type === "repeat_visit_stamp") {
    repeatVisitProgressByMissionId[record.mission.id] = buildRepeatVisitProgress(
      record.board,
      record.mission,
      record.attempts,
    );
  }
}
```

모달이 열릴 때도 다시 동기화한다.

```ts
// src/screens/MapScreen.tsx:128-131
useEffect(() => {
  if (!viewModalVisible || !selectedBoard || !isAuthenticated) return;
  void refreshBoardMissionAttempts(selectedBoard);
}, [viewModalVisible, selectedBoard, isAuthenticated, refreshBoardMissionAttempts]);
```

---

## 5) 스탬프 미션(`repeat_visit_stamp`) 상세 플로우

## 5-1. UI 진입점

```tsx
// src/components/modals/ViewPostModal.tsx:244-272
if (mission.type === "repeat_visit_stamp") {
  const stampGoalCount = mission.stampGoalCount ?? 5;
  const progress = repeatVisitProgressByMissionId[mission.id];
  const currentStampCount = progress?.currentStampCount ?? 0;
  const completedRounds = progress?.completedRounds ?? 0;

  return (
    <View style={styles.stampMissionContainer}>
      <Text style={styles.missionProgressText}>
        현재 스탬프 {currentStampCount}/{stampGoalCount} | 카드 완성 {completedRounds}회
      </Text>
      ...
      <TouchableOpacity onPress={() => { void certifyRepeatVisitMission(board, mission, currentCoordinate); }}>
        <Text style={styles.buttonText}>오늘 방문 인증하기</Text>
      </TouchableOpacity>
    </View>
  );
}
```

버튼을 누르면 `certifyRepeatVisitMission`이 시작된다.

## 5-2. 스토어 액션

```ts
// src/store/useMapStore.ts:564-583
certifyRepeatVisitMission: async (board, mission, currentCoordinate) => {
  if (mission.type !== "repeat_visit_stamp") return;
  const coordinate = getCoordinateNearBoardOrAlert(currentCoordinate, board);
  if (!coordinate) return;
  const token = getAccessTokenOrAlert();
  if (!token) return;
  const missionId = getMissionIdOrAlert(mission.id);
  if (missionId === null) return;

  const attempt = await attemptMission(missionId, {}, token);
  if (attempt.status !== "PENDING" && attempt.status !== "SUCCESS") {
    Alert.alert("스탬프 적립 실패", ...);
    return;
  }
  ...
}
```

여기서 스탬프는 이미지 없이 `attemptMission(missionId, {}, token)`을 호출한다.

## 5-3. 진행도 계산

성공하면 먼저 서버에서 최신 attempt 전체를 다시 받아 진행도를 계산한다.

```ts
// src/store/useMapStore.ts:593-597
let updatedProgress: RepeatVisitProgress;
try {
  const attempts = await getMyMissionAttempts(missionId, token);
  updatedProgress = buildRepeatVisitProgress(board, mission, attempts);
} catch {
  ...
}
```

계산 로직:

```ts
// src/store/useMapStore.ts:201-210
const stampGoalCount = Math.max(mission.stampGoalCount ?? 1, 1);
const pendingAttempts = attempts.filter((attempt) => attempt.status === "PENDING");
const successfulAttempts = attempts.filter((attempt) => attempt.status === "SUCCESS");
const stampCount = pendingAttempts.length + successfulAttempts.length;
const successCount = successfulAttempts.length;
const rewardedCount = successfulAttempts.filter((attempt) => hasReward(attempt.rewardId)).length;
const fallbackCompletedRounds = Math.floor(successCount / stampGoalCount);
const completedRounds = rewardedCount > 0 ? rewardedCount : fallbackCompletedRounds;
```

핵심:

1. 스탬프 개수(`currentStampCount`)는 `PENDING + SUCCESS` 전부 센다.
2. 카드 완성 횟수(`completedRounds`)는 우선 `rewardId` 기반, 없으면 `성공횟수/목표개수`로 fallback.

## 5-4. attempt -> activity 반영

```ts
// src/store/useMapStore.ts:611-620
const activity = mapAttemptToParticipatedActivity(board, mission, attempt, { coordinate });

set((state) => ({
  repeatVisitProgressByMissionId: {
    ...state.repeatVisitProgressByMissionId,
    [mission.id]: updatedProgress,
  },
  participatedActivities: activity
    ? upsertParticipatedActivity(state.participatedActivities, activity)
    : state.participatedActivities,
}));
```

여기서 `activity`가 `null`일 수 있는 이유는 중앙 매퍼가 스탬프 `PENDING`을 버리기 때문이다.

```ts
// src/store/useMapStore.ts:176
if (isPending && mission.type !== "stay_duration") return null;
```

즉 스탬프는 보통 `repeatVisitProgressByMissionId`로 진행도를 보여주고, activity는 `SUCCESS`일 때만 쌓인다.

## 5-5. 리워드 표시 분기

```ts
// src/store/useMapStore.ts:623-633
const isCardCompleted = updatedProgress.completedRounds > previousProgress.completedRounds;
if (isCardCompleted) {
  const rewardCoins = activity?.rewardCoins ?? mission.rewardCoins;
  Alert.alert("스탬프 카드 완성", rewardCoins > 0 ? `${rewardCoins} 코인을 획득했어요.` : "스탬프 카드를 완성했어요.");
  return;
}

Alert.alert("스탬프 적립 완료", `${updatedProgress.currentStampCount}/${stampGoalCount}개를 적립했어요.`);
```

---

## 6) 체류시간 미션(`stay_duration`) 상세 플로우

체류 미션은 `start`(체크인)과 `complete`(체크아웃) 두 단계다.

## 6-1. UI 진입점

`ViewPostModal`은 `participatedActivities`에서 완료/진행중 여부를 찾고 버튼을 바꾼다.

```tsx
// src/components/modals/ViewPostModal.tsx:277-284
const completedActivity = participatedActivities.find(
  (activity) =>
    activity.boardId === board.id && activity.missionId === mission.id && activity.status === "completed",
);
const inProgressActivity = participatedActivities.find(
  (activity) =>
    activity.boardId === board.id && activity.missionId === mission.id && activity.status === "started",
);
```

진행중이면 경과시간/남은시간을 보여주고 `completeStayMission` 호출:

```tsx
// src/components/modals/ViewPostModal.tsx:363-383
if (inProgressActivity) {
  const elapsedMillis = Math.max(Date.now() - inProgressActivity.startedAt, 0);
  const requiredMinutes = inProgressActivity.requiredMinutes ?? mission.minDurationMinutes ?? 0;
  ...
  <TouchableOpacity onPress={() => { void completeStayMission(inProgressActivity.id, currentCoordinate); }}>
    <Text style={styles.buttonText}>체류 종료하고 검증</Text>
  </TouchableOpacity>
}
```

진행중이 없으면 시작 버튼:

```tsx
// src/components/modals/ViewPostModal.tsx:391-399
return (
  <TouchableOpacity onPress={() => { void startStayMission(board, mission, currentCoordinate); }}>
    <Text style={styles.buttonText}>체류 시작 (GPS 기록)</Text>
  </TouchableOpacity>
);
```

## 6-2. 시작 단계 (`startStayMission`)

```ts
// src/store/useMapStore.ts:639-668
startStayMission: async (board, mission, currentCoordinate) => {
  if (mission.type !== "stay_duration") return;
  const coordinate = getCoordinateNearBoardOrAlert(currentCoordinate, board);
  if (!coordinate) return;
  const token = getAccessTokenOrAlert();
  if (!token) return;
  const missionId = getMissionIdOrAlert(mission.id);
  if (missionId === null) return;

  const alreadyInProgress = participatedActivities.some(...status === "started");
  if (alreadyInProgress) { Alert.alert("이미 진행 중", ...); return; }

  const alreadyCompleted = participatedActivities.some(...status === "completed");
  if (alreadyCompleted) { Alert.alert("이미 완료됨", ...); return; }
  ...
}
```

체크인 API:

```ts
// src/store/useMapStore.ts:671-673
const attempt = await checkinStayMission(missionId, token);
if (attempt.status !== "PENDING" && attempt.status !== "SUCCESS") {
  Alert.alert("체류 시작 실패", ...);
  return;
}
```

activity로 변환 후 반영:

```ts
// src/store/useMapStore.ts:677-685
const activity = mapAttemptToParticipatedActivity(board, mission, attempt, { coordinate });
...
set((state) => ({
  participatedActivities: upsertParticipatedActivity(state.participatedActivities, activity),
}));
```

즉 체류 시작에서 `attempt.status === "PENDING"`이면 중앙 매퍼가 `status: "started"` activity를 만들어 준다.

## 6-3. 종료 단계 (`completeStayMission`)

종료는 `activityId`를 받아 진행중 activity를 기준으로 처리한다.

```ts
// src/store/useMapStore.ts:698-721
completeStayMission: async (activityId, currentCoordinate) => {
  const target = participatedActivities.find((activity) => activity.id === activityId);
  if (!target) { Alert.alert("오류", "진행 중인 체류 미션을 찾지 못했습니다."); return; }
  if (target.status === "completed") { Alert.alert("이미 완료됨", ...); return; }

  const board = boards.find((item) => item.id === target.boardId);
  if (!board) { Alert.alert("오류", ...); return; }
  const mission = board.missions.find((item) => item.id === target.missionId);
  if (!mission) { Alert.alert("오류", ...); return; }
  ...
}
```

중요한 점은 먼저 서버의 최신 attempt 이력을 조회한다는 것:

```ts
// src/store/useMapStore.ts:733-745
const attempts = await getMyMissionAttempts(missionId, token);
const orderedAttempts = sortAttemptsByLatest(attempts);
const successfulAttempt = orderedAttempts.find((attempt) => attempt.status === "SUCCESS");
if (successfulAttempt) {
  const completedActivity = mapAttemptToParticipatedActivity(board, mission, successfulAttempt, { coordinate });
  ...
  Alert.alert("이미 완료됨", "이미 체류 미션 보상을 받은 상태입니다.");
  return;
}
```

이미 서버에서 성공 처리되었다면 로컬을 completed로 정규화하고 끝낸다.

그다음 최신 `PENDING`을 찾고, 없으면 로컬 진행중 항목을 제거한다.

```ts
// src/store/useMapStore.ts:747-755
const latestPendingAttempt = orderedAttempts.find(
  (attempt) => attempt.status === "PENDING" && toEpochMillis(attempt.checkinAt) !== undefined,
);
if (!latestPendingAttempt) {
  set((state) => ({
    participatedActivities: state.participatedActivities.filter((activity) => activity.id !== target.id),
  }));
  Alert.alert("체류 종료 불가", "진행 중인 체류 미션이 없습니다. 다시 시작해주세요.");
  return;
}
```

체류시간 부족 체크:

```ts
// src/store/useMapStore.ts:773-785
const requiredMinutes = Math.max(target.requiredMinutes ?? mission.minDurationMinutes ?? 0, 0);
if (requiredMinutes > 0) {
  const requiredMillis = requiredMinutes * 60 * 1000;
  const elapsedMillis = Math.max(Date.now() - latestCheckinAt, 0);
  const remainingMillis = requiredMillis - elapsedMillis;

  if (remainingMillis > 0) {
    Alert.alert("체류 시간 부족", ...);
    return;
  }
}
```

충족 시 checkout API 호출:

```ts
// src/store/useMapStore.ts:789-803
const attempt = await checkoutStayMission(missionId, token);
if (attempt.status !== "SUCCESS") { Alert.alert("체류 종료 실패", ...); return; }

const updatedActivity = mapAttemptToParticipatedActivity(board, mission, attempt, { coordinate });
...
set((state) => ({
  participatedActivities: upsertParticipatedActivity(state.participatedActivities, updatedActivity),
}));
```

---

## 7) API 계층에서 실제 endpoint

```ts
// src/api/missionAttemptApi.ts:119-137
export const checkinStayMission = async (missionId: number, token: string): Promise<MissionAttemptResponse> =>
  fetchJson<MissionAttemptResponse>(
    `${API_BASE_URL}/api/missions/${missionId}/attempts/checkin`,
    { method: "POST", headers: createHeaders(token) },
    "체류 체크인에 실패했습니다.",
  );

export const checkoutStayMission = async (missionId: number, token: string): Promise<MissionAttemptResponse> =>
  fetchJson<MissionAttemptResponse>(
    `${API_BASE_URL}/api/missions/${missionId}/attempts/checkout`,
    { method: "POST", headers: createHeaders(token) },
    "체류 체크아웃에 실패했습니다.",
  );
```

```ts
// src/api/missionAttemptApi.ts:102-117
export const attemptMission = async (...) => {
  ...
  return fetchJson<MissionAttemptResponse>(
    `${API_BASE_URL}/api/missions/${missionId}/attempts`,
    { method: "POST", headers: createHeaders(token, contentType), body },
    "미션 인증 요청에 실패했습니다.",
  );
};
```

스탬프는 `attemptMission(..., {})`, 체류는 `checkin/checkout`를 사용한다.

---

## 8) `upsertParticipatedActivity`가 상태를 정리하는 방식

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

효과:

1. 동일 attempt ID는 교체.
2. 완료 상태가 들어오면 같은 미션의 진행중 항목 제거.
3. 활동 내역은 최신순 유지.

---

## 9) 두 미션에서 `mapAttemptToParticipatedActivity`가 실제로 만들어내는 결과

## 9-1. 스탬프 미션

1. `attempt.status = PENDING`이면 `null` (활동 항목 미생성)
2. `attempt.status = SUCCESS`면 `completed` activity 생성
3. 단, `rewardId`가 없으면 `rewardCoins = 0`
4. `missionTitle`은 `buildMissionTitle`에 따라 `"... 스탬프 적립"` 또는 `"... 카드 완성"`

```ts
// src/store/useMapStore.ts:144-146
if (mission.type === "repeat_visit_stamp") {
  return isRewardGranted ? `${mission.title} 카드 완성` : `${mission.title} 스탬프 적립`;
}
```

## 9-2. 체류 미션

1. `PENDING`을 받아 `status: "started"` activity 생성
2. `requiredMinutes`에 `mission.minDurationMinutes`를 채움
3. `SUCCESS` 오면 같은 attempt 기반으로 `status: "completed"`로 전환
4. `upsertParticipatedActivity`가 이전 started 항목 제거

---

## 10) 최종 UI 소비 포인트

스탬프 진행도는 `repeatVisitProgressByMissionId`:

```tsx
// src/components/modals/ViewPostModal.tsx:246-248
const progress = repeatVisitProgressByMissionId[mission.id];
const currentStampCount = progress?.currentStampCount ?? 0;
const completedRounds = progress?.completedRounds ?? 0;
```

체류 진행중/완료는 `participatedActivities`:

```tsx
// src/components/modals/ViewPostModal.tsx:281-284
const inProgressActivity = participatedActivities.find(
  (activity) =>
    activity.boardId === board.id && activity.missionId === mission.id && activity.status === "started",
);
```

활동 내역 표시:

```tsx
// src/components/modals/ViewPostModal.tsx:480-482
{new Date(activity.startedAt).toLocaleString()} |{" "}
{activity.rewardCoins > 0 ? `+${activity.rewardCoins} 코인` : "스탬프 적립"}
```

즉, 스탬프/체류 모두 결국 `mapAttemptToParticipatedActivity` + `upsertParticipatedActivity`를 통해 화면 상태가 결정된다.

---

## 11) 한눈에 보는 시퀀스

### 스탬프

1. UI 버튼 `오늘 방문 인증하기` 클릭
2. `certifyRepeatVisitMission`
3. 위치/로그인/미션ID 검증
4. `attemptMission(missionId, {}, token)`
5. `getMyMissionAttempts`로 최신 이력 조회
6. `buildRepeatVisitProgress`로 스탬프/완성횟수 계산
7. `mapAttemptToParticipatedActivity`로 activity 생성(가능한 경우)
8. progress + activity를 store에 반영
9. 카드 완성/적립 완료 Alert 표시

### 체류시간

1. UI 버튼 `체류 시작 (GPS 기록)` 클릭
2. `startStayMission`
3. 위치/로그인/미션ID + 중복 started/completed 검증
4. `checkinStayMission`
5. `mapAttemptToParticipatedActivity` -> started activity 저장
6. UI에서 `진행 중 ... / 체류 종료하고 검증` 상태 표시
7. 종료 버튼 클릭 -> `completeStayMission(activityId, currentCoordinate)`
8. 서버 이력 재조회(`getMyMissionAttempts`)로 성공/진행중 상태 정합성 확인
9. 최소 체류시간 검증 후 `checkoutStayMission`
10. `mapAttemptToParticipatedActivity` -> completed activity 저장
11. 완료 Alert 표시

