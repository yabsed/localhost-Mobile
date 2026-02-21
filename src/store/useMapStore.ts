import { Alert } from "react-native";
import { create } from "zustand";
import { fetchBoardsFromStoreMissions } from "../api/missionDefinitionApi";
import {
  attemptMission,
  checkinStayMission,
  checkoutStayMission,
  getMyMissionAttempts,
  MissionAttemptResponse,
} from "../api/missionAttemptApi";
import { useAuthStore } from "./useAuthStore";
import { Board, Coordinate, GuestbookEntry, Mission, ParticipatedActivity, RepeatVisitProgress } from "../types/map";

type MapState = {
  boards: Board[];
  isLoadingBoards: boolean;
  boardsLoadError: string | null;
  selectedBoard: Board | null;
  viewModalVisible: boolean;
  searchQuery: string;
  participatedActivities: ParticipatedActivity[];
  repeatVisitProgressByMissionId: Record<string, RepeatVisitProgress>;
  guestbookEntriesByBoardId: Record<string, GuestbookEntry[]>;
  loadBoards: (coordinate?: Coordinate | null) => Promise<void>;
  refreshBoardMissionAttempts: (board: Board) => Promise<void>;
  setSelectedBoard: (selectedBoard: Board | null) => void;
  setViewModalVisible: (viewModalVisible: boolean) => void;
  setSearchQuery: (searchQuery: string) => void;
  certifyQuietTimeMission: (board: Board, mission: Mission, currentCoordinate: Coordinate | null) => Promise<void>;
  certifyReceiptPurchaseMission: (
    board: Board,
    mission: Mission,
    currentCoordinate: Coordinate | null,
    receiptImageUri: string,
  ) => Promise<void>;
  certifyTreasureHuntMission: (
    board: Board,
    mission: Mission,
    currentCoordinate: Coordinate | null,
    capturedImageUri: string,
  ) => Promise<void>;
  certifyRepeatVisitMission: (board: Board, mission: Mission, currentCoordinate: Coordinate | null) => Promise<void>;
  startStayMission: (board: Board, mission: Mission, currentCoordinate: Coordinate | null) => Promise<void>;
  completeStayMission: (activityId: string, currentCoordinate: Coordinate | null) => Promise<void>;
  addGuestbookEntry: (boardId: string, content: string) => boolean;
  handleBackNavigation: () => boolean;
};

const MISSION_PROXIMITY_METERS = 200;
const EARTH_RADIUS_METERS = 6371000;

const toRadians = (degree: number): number => (degree * Math.PI) / 180;

const getDistanceMeters = (from: Coordinate, to: Coordinate): number => {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) * Math.sin(longitudeDelta / 2);

  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getCoordinateOrAlert = (coordinate: Coordinate | null): Coordinate | null => {
  if (coordinate) return coordinate;
  Alert.alert("위치 필요", "GPS 위치를 확인할 수 없어요. 잠시 후 다시 시도해주세요.");
  return null;
};

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

const hasReward = (rewardId: number | null | undefined): boolean =>
  typeof rewardId === "number" && Number.isFinite(rewardId);

const toEpochMillis = (dateTime: string | null | undefined): number | undefined => {
  if (!dateTime) return undefined;
  const parsed = Date.parse(dateTime);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toMissionId = (missionId: string): number | null => {
  const parsed = Number(missionId);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getMissionIdOrAlert = (missionId: string): number | null => {
  const parsedMissionId = toMissionId(missionId);
  if (parsedMissionId !== null) return parsedMissionId;
  Alert.alert("오류", "미션 ID 형식이 올바르지 않습니다.");
  return null;
};

const getAccessTokenOrAlert = (): string | null => {
  const { token } = useAuthStore.getState();
  if (token) return token;
  Alert.alert("로그인 필요", "미션 참여를 위해 먼저 로그인해주세요.");
  return null;
};

const getAttemptTimestamp = (attempt: MissionAttemptResponse): number | undefined =>
  toEpochMillis(attempt.checkinAt) ?? toEpochMillis(attempt.checkoutAt);

const sortAttemptsByLatest = (attempts: MissionAttemptResponse[]): MissionAttemptResponse[] =>
  [...attempts].sort((a, b) => {
    const timestampGap = (getAttemptTimestamp(b) ?? 0) - (getAttemptTimestamp(a) ?? 0);
    if (timestampGap !== 0) return timestampGap;
    return b.attemptId - a.attemptId;
  });

const formatRemainingDuration = (remainingMillis: number): string => {
  const remainingSeconds = Math.max(Math.ceil(remainingMillis / 1000), 0);
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  if (minutes <= 0) return `${seconds}초`;
  if (seconds <= 0) return `${minutes}분`;
  return `${minutes}분 ${seconds}초`;
};

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

const upsertParticipatedActivity = (
  activities: ParticipatedActivity[],
  nextActivity: ParticipatedActivity,
): ParticipatedActivity[] => {
  const withoutSameId = activities.filter((activity) => activity.id !== nextActivity.id);
  const normalizedActivities = nextActivity.status === "completed"
    ? withoutSameId.filter(
        (activity) =>
          !(activity.boardId === nextActivity.boardId && activity.missionId === nextActivity.missionId && activity.status === "started"),
      )
    : withoutSameId;

  return [nextActivity, ...normalizedActivities].sort((a, b) => b.startedAt - a.startedAt);
};

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

const buildRepeatVisitProgress = (board: Board, mission: Mission, attempts: MissionAttemptResponse[]): RepeatVisitProgress => {
  const stampGoalCount = Math.max(mission.stampGoalCount ?? 1, 1);
  const pendingAttempts = attempts.filter((attempt) => attempt.status === "PENDING");
  const successfulAttempts = attempts.filter((attempt) => attempt.status === "SUCCESS");
  const stampCount = pendingAttempts.length + successfulAttempts.length;
  const successCount = successfulAttempts.length;
  const rewardedCount = successfulAttempts.filter((attempt) => hasReward(attempt.rewardId)).length;
  const fallbackCompletedRounds = Math.floor(successCount / stampGoalCount);
  const completedRounds = rewardedCount > 0 ? rewardedCount : fallbackCompletedRounds;

  const lastStampedAt = [...pendingAttempts, ...successfulAttempts]
    .map((attempt) => toEpochMillis(attempt.checkoutAt) ?? toEpochMillis(attempt.checkinAt))
    .filter((value): value is number => value !== undefined)
    .sort((a, b) => b - a)[0];

  return {
    boardId: board.id,
    missionId: mission.id,
    currentStampCount: stampCount,
    completedRounds,
    lastStampedAt,
  };
};

type MissionRecord = {
  board: Board;
  mission: Mission;
};

type AttemptRecord = {
  board: Board;
  mission: Mission;
  attempts: MissionAttemptResponse[];
};

const fetchAttemptRecords = async (missionRecords: MissionRecord[], token: string): Promise<AttemptRecord[]> =>
  Promise.all(
    missionRecords.map(async ({ board, mission }) => {
      const missionId = toMissionId(mission.id);
      if (missionId === null) {
        return { board, mission, attempts: [] as MissionAttemptResponse[] };
      }

      try {
        const attempts = await getMyMissionAttempts(missionId, token);
        return { board, mission, attempts };
      } catch {
        return { board, mission, attempts: [] as MissionAttemptResponse[] };
      }
    }),
  );

const buildAttemptStateFromAttemptRecords = (
  attemptRecords: AttemptRecord[],
): {
  participatedActivities: ParticipatedActivity[];
  repeatVisitProgressByMissionId: Record<string, RepeatVisitProgress>;
} => {
  const participatedActivities: ParticipatedActivity[] = [];
  const repeatVisitProgressByMissionId: Record<string, RepeatVisitProgress> = {};

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

  const uniqueActivities: ParticipatedActivity[] = [];
  const seenActivityIds = new Set<string>();
  for (const activity of participatedActivities.sort((a, b) => b.startedAt - a.startedAt)) {
    if (seenActivityIds.has(activity.id)) continue;
    seenActivityIds.add(activity.id);
    uniqueActivities.push(activity);
  }

  return {
    participatedActivities: uniqueActivities,
    repeatVisitProgressByMissionId,
  };
};

const buildAttemptStateFromBoards = async (
  boards: Board[],
  token: string,
): Promise<{
  participatedActivities: ParticipatedActivity[];
  repeatVisitProgressByMissionId: Record<string, RepeatVisitProgress>;
}> => {
  const missionRecords = boards.flatMap((board) => board.missions.map((mission) => ({ board, mission })));
  if (missionRecords.length === 0) {
    return {
      participatedActivities: [],
      repeatVisitProgressByMissionId: {},
    };
  }

  const attemptRecords = await fetchAttemptRecords(missionRecords, token);
  return buildAttemptStateFromAttemptRecords(attemptRecords);
};

const getAttemptFailureMessage = (attempt: MissionAttemptResponse, defaultMessage: string): string => {
  const retryHint = attempt.retryHint?.trim();
  if (retryHint) return retryHint;
  if (attempt.status === "RETRY") return "다시 시도해주세요.";
  if (attempt.status === "PENDING") return "아직 미션이 완료되지 않았습니다.";
  return defaultMessage;
};

export const useMapStore = create<MapState>((set, get) => ({
  boards: [],
  isLoadingBoards: false,
  boardsLoadError: null,
  selectedBoard: null,
  viewModalVisible: false,
  searchQuery: "",
  participatedActivities: [],
  repeatVisitProgressByMissionId: {},
  guestbookEntriesByBoardId: {},

  loadBoards: async (coordinate) => {
    set({ isLoadingBoards: true, boardsLoadError: null });

    try {
      const fetchedBoards = await fetchBoardsFromStoreMissions(coordinate);
      const { token } = useAuthStore.getState();
      const attemptState = token ? await buildAttemptStateFromBoards(fetchedBoards, token) : {
        participatedActivities: [] as ParticipatedActivity[],
        repeatVisitProgressByMissionId: {} as Record<string, RepeatVisitProgress>,
      };

      if (fetchedBoards.length === 0) {
        set({
          isLoadingBoards: false,
          boardsLoadError: "등록된 매장 데이터가 없습니다.",
          boards: [],
          selectedBoard: null,
          participatedActivities: attemptState.participatedActivities,
          repeatVisitProgressByMissionId: attemptState.repeatVisitProgressByMissionId,
        });
        return;
      }

      set((state) => {
        const nextSelectedBoard = state.selectedBoard
          ? fetchedBoards.find((board) => board.id === state.selectedBoard?.id) ?? null
          : null;

        return {
          boards: fetchedBoards,
          selectedBoard: nextSelectedBoard,
          isLoadingBoards: false,
          boardsLoadError: null,
          participatedActivities: attemptState.participatedActivities,
          repeatVisitProgressByMissionId: attemptState.repeatVisitProgressByMissionId,
        };
      });
    } catch (error) {
      set({
        isLoadingBoards: false,
        boardsLoadError: error instanceof Error ? error.message : "매장 정보를 불러오지 못했습니다.",
        boards: [],
      });
    }
  },

  refreshBoardMissionAttempts: async (board) => {
    const token = getAccessTokenOrAlert();
    if (!token) return;

    const missionRecords: MissionRecord[] = board.missions.map((mission) => ({ board, mission }));
    const repeatVisitMissionIds = board.missions
      .filter((mission) => mission.type === "repeat_visit_stamp")
      .map((mission) => mission.id);

    const nextAttemptState = missionRecords.length > 0
      ? buildAttemptStateFromAttemptRecords(await fetchAttemptRecords(missionRecords, token))
      : {
          participatedActivities: [] as ParticipatedActivity[],
          repeatVisitProgressByMissionId: {} as Record<string, RepeatVisitProgress>,
        };

    set((state) => {
      const activitiesWithoutBoard = state.participatedActivities.filter((activity) => activity.boardId !== board.id);
      const mergedActivities = [...activitiesWithoutBoard, ...nextAttemptState.participatedActivities]
        .sort((a, b) => b.startedAt - a.startedAt);

      const nextRepeatVisitProgressByMissionId = { ...state.repeatVisitProgressByMissionId };
      for (const missionId of repeatVisitMissionIds) {
        delete nextRepeatVisitProgressByMissionId[missionId];
      }
      for (const [missionId, progress] of Object.entries(nextAttemptState.repeatVisitProgressByMissionId)) {
        nextRepeatVisitProgressByMissionId[missionId] = progress;
      }

      return {
        participatedActivities: mergedActivities,
        repeatVisitProgressByMissionId: nextRepeatVisitProgressByMissionId,
      };
    });
  },

  setSelectedBoard: (selectedBoard) => set({ selectedBoard }),
  setViewModalVisible: (viewModalVisible) => set({ viewModalVisible }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  certifyQuietTimeMission: async (board, mission, currentCoordinate) => {
    const coordinate = getCoordinateNearBoardOrAlert(currentCoordinate, board);
    if (!coordinate) return;

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
      const attempt = await attemptMission(missionId, {}, token);
      if (attempt.status !== "SUCCESS") {
        Alert.alert("미션 인증 실패", getAttemptFailureMessage(attempt, "미션 인증에 실패했습니다."));
        return;
      }

      const activity = mapAttemptToParticipatedActivity(board, mission, attempt, { coordinate });
      if (!activity) {
        Alert.alert("미션 인증 실패", "미션 인증 응답을 처리하지 못했습니다.");
        return;
      }

      set((state) => ({
        participatedActivities: upsertParticipatedActivity(state.participatedActivities, activity),
      }));
      Alert.alert("미션 완료", `${activity.rewardCoins} 코인을 획득했어요.`);
    } catch (error) {
      Alert.alert("미션 인증 실패", error instanceof Error ? error.message : "미션 인증 요청에 실패했습니다.");
    }
  },

  certifyReceiptPurchaseMission: async (board, mission, currentCoordinate, receiptImageUri) => {
    if (mission.type !== "receipt_purchase") return;

    const coordinate = getCoordinateNearBoardOrAlert(currentCoordinate, board);
    if (!coordinate) return;

    if (!mission.receiptItemName) {
      Alert.alert("구매 대상 없음", "판매자가 지정한 구매 상품 정보가 아직 등록되지 않았어요.");
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
      const attempt = await attemptMission(missionId, { imageUri: receiptImageUri }, token);
      if (attempt.status !== "SUCCESS") {
        Alert.alert("구매 인증 실패", getAttemptFailureMessage(attempt, "영수증 검증에 실패했습니다."));
        return;
      }

      const activity = mapAttemptToParticipatedActivity(board, mission, attempt, {
        coordinate,
        receiptImageUri,
      });
      if (!activity) {
        Alert.alert("구매 인증 실패", "구매 인증 응답을 처리하지 못했습니다.");
        return;
      }

      set((state) => ({
        participatedActivities: upsertParticipatedActivity(state.participatedActivities, activity),
      }));
      Alert.alert("구매 인증 완료", `${mission.receiptItemName} 구매가 확인되어 ${activity.rewardCoins} 코인을 획득했어요.`);
    } catch (error) {
      Alert.alert("구매 인증 실패", error instanceof Error ? error.message : "영수증 검증 요청에 실패했습니다.");
    }
  },

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

  certifyRepeatVisitMission: async (board, mission, currentCoordinate) => {
    if (mission.type !== "repeat_visit_stamp") return;

    const coordinate = getCoordinateNearBoardOrAlert(currentCoordinate, board);
    if (!coordinate) return;

    const token = getAccessTokenOrAlert();
    if (!token) return;

    const missionId = getMissionIdOrAlert(mission.id);
    if (missionId === null) return;

    const stampGoalCount = Math.max(mission.stampGoalCount ?? 5, 1);

    try {
      const attempt = await attemptMission(missionId, {}, token);
      if (attempt.status !== "PENDING" && attempt.status !== "SUCCESS") {
        Alert.alert("스탬프 적립 실패", getAttemptFailureMessage(attempt, "반복 방문 스탬프 적립에 실패했습니다."));
        return;
      }

      const { repeatVisitProgressByMissionId } = get();
      const previousProgress = repeatVisitProgressByMissionId[mission.id] ?? {
        boardId: board.id,
        missionId: mission.id,
        currentStampCount: 0,
        completedRounds: 0,
      };

      let updatedProgress: RepeatVisitProgress;
      try {
        const attempts = await getMyMissionAttempts(missionId, token);
        updatedProgress = buildRepeatVisitProgress(board, mission, attempts);
      } catch {
        updatedProgress = {
          ...previousProgress,
          currentStampCount:
            attempt.status === "PENDING" || attempt.status === "SUCCESS"
              ? previousProgress.currentStampCount + 1
              : previousProgress.currentStampCount,
          completedRounds:
            previousProgress.completedRounds +
            (attempt.status === "SUCCESS" && hasReward(attempt.rewardId) ? 1 : 0),
          lastStampedAt: Date.now(),
        };
      }

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

      const isCardCompleted = updatedProgress.completedRounds > previousProgress.completedRounds;
      if (isCardCompleted) {
        const rewardCoins = activity?.rewardCoins ?? mission.rewardCoins;
        Alert.alert(
          "스탬프 카드 완성",
          rewardCoins > 0 ? `${rewardCoins} 코인을 획득했어요.` : "스탬프 카드를 완성했어요.",
        );
        return;
      }

      Alert.alert("스탬프 적립 완료", `${updatedProgress.currentStampCount}/${stampGoalCount}개를 적립했어요.`);
    } catch (error) {
      Alert.alert("스탬프 적립 실패", error instanceof Error ? error.message : "스탬프 적립 요청에 실패했습니다.");
    }
  },

  startStayMission: async (board, mission, currentCoordinate) => {
    if (mission.type !== "stay_duration") return;

    const coordinate = getCoordinateNearBoardOrAlert(currentCoordinate, board);
    if (!coordinate) return;

    const token = getAccessTokenOrAlert();
    if (!token) return;

    const missionId = getMissionIdOrAlert(mission.id);
    if (missionId === null) return;

    const { participatedActivities } = get();
    const alreadyInProgress = participatedActivities.some(
      (activity) =>
        activity.boardId === board.id && activity.missionId === mission.id && activity.status === "started",
    );
    if (alreadyInProgress) {
      Alert.alert("이미 진행 중", "체류 미션이 이미 시작되어 있어요. 종료로 완료해주세요.");
      return;
    }

    const alreadyCompleted = participatedActivities.some(
      (activity) =>
        activity.boardId === board.id && activity.missionId === mission.id && activity.status === "completed",
    );
    if (alreadyCompleted) {
      Alert.alert("이미 완료됨", "이 활동은 이미 보상을 받았습니다.");
      return;
    }

    try {
      const attempt = await checkinStayMission(missionId, token);
      if (attempt.status !== "PENDING" && attempt.status !== "SUCCESS") {
        Alert.alert("체류 시작 실패", getAttemptFailureMessage(attempt, "체류 체크인에 실패했습니다."));
        return;
      }

      const activity = mapAttemptToParticipatedActivity(board, mission, attempt, { coordinate });
      if (!activity) {
        Alert.alert("체류 시작 실패", "체류 체크인 응답을 처리하지 못했습니다.");
        return;
      }

      set((state) => ({
        participatedActivities: upsertParticipatedActivity(state.participatedActivities, activity),
      }));

      if (activity.status === "completed") {
        Alert.alert("미션 완료", `${activity.rewardCoins} 코인을 획득했어요.`);
        return;
      }

      Alert.alert("체류 시작", "종료 버튼을 눌러 GPS 검증을 완료하면 코인이 지급됩니다.");
    } catch (error) {
      Alert.alert("체류 시작 실패", error instanceof Error ? error.message : "체류 체크인 요청에 실패했습니다.");
    }
  },

  completeStayMission: async (activityId, currentCoordinate) => {
    const { boards, participatedActivities } = get();
    const target = participatedActivities.find((activity) => activity.id === activityId);
    if (!target) {
      Alert.alert("오류", "진행 중인 체류 미션을 찾지 못했습니다.");
      return;
    }

    if (target.status === "completed") {
      Alert.alert("이미 완료됨", "이미 보상을 받은 활동입니다.");
      return;
    }

    const board = boards.find((item) => item.id === target.boardId);
    if (!board) {
      Alert.alert("오류", "활동에 연결된 게시판 정보를 찾지 못했습니다.");
      return;
    }

    const mission = board.missions.find((item) => item.id === target.missionId);
    if (!mission) {
      Alert.alert("오류", "체류 미션 정보를 찾지 못했습니다.");
      return;
    }

    const coordinate = getCoordinateNearBoardOrAlert(currentCoordinate, board);
    if (!coordinate) return;

    const token = getAccessTokenOrAlert();
    if (!token) return;

    const missionId = getMissionIdOrAlert(target.missionId);
    if (missionId === null) return;

    try {
      const attempts = await getMyMissionAttempts(missionId, token);
      const orderedAttempts = sortAttemptsByLatest(attempts);
      const successfulAttempt = orderedAttempts.find((attempt) => attempt.status === "SUCCESS");
      if (successfulAttempt) {
        const completedActivity = mapAttemptToParticipatedActivity(board, mission, successfulAttempt, { coordinate });
        if (completedActivity) {
          set((state) => ({
            participatedActivities: upsertParticipatedActivity(state.participatedActivities, completedActivity),
          }));
        }
        Alert.alert("이미 완료됨", "이미 체류 미션 보상을 받은 상태입니다.");
        return;
      }

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

      const latestCheckinAt = toEpochMillis(latestPendingAttempt.checkinAt);
      if (latestCheckinAt === undefined) {
        Alert.alert("체류 종료 실패", "체류 시작 시간을 확인할 수 없어 종료를 진행할 수 없습니다.");
        return;
      }

      const inProgressActivity = mapAttemptToParticipatedActivity(board, mission, latestPendingAttempt, {
        coordinate: target.startCoordinate,
      });
      if (inProgressActivity) {
        set((state) => ({
          participatedActivities: upsertParticipatedActivity(state.participatedActivities, inProgressActivity),
        }));
      }

      const requiredMinutes = Math.max(target.requiredMinutes ?? mission.minDurationMinutes ?? 0, 0);
      if (requiredMinutes > 0) {
        const requiredMillis = requiredMinutes * 60 * 1000;
        const elapsedMillis = Math.max(Date.now() - latestCheckinAt, 0);
        const remainingMillis = requiredMillis - elapsedMillis;

        if (remainingMillis > 0) {
          const elapsedMinutes = Math.floor(elapsedMillis / 60000);
          Alert.alert(
            "체류 시간 부족",
            `현재 ${elapsedMinutes}분 체류했어요. 최소 ${requiredMinutes}분이 필요합니다.\n약 ${formatRemainingDuration(remainingMillis)} 후에 다시 시도해주세요.`,
          );
          return;
        }
      }

      const attempt = await checkoutStayMission(missionId, token);
      if (attempt.status !== "SUCCESS") {
        Alert.alert("체류 종료 실패", getAttemptFailureMessage(attempt, "체류 체크아웃에 실패했습니다."));
        return;
      }

      const updatedActivity = mapAttemptToParticipatedActivity(board, mission, attempt, { coordinate });
      if (!updatedActivity) {
        Alert.alert("체류 종료 실패", "체류 체크아웃 응답을 처리하지 못했습니다.");
        return;
      }

      set((state) => ({
        participatedActivities: upsertParticipatedActivity(state.participatedActivities, updatedActivity),
      }));
      Alert.alert("미션 완료", `${updatedActivity.rewardCoins} 코인을 획득했어요.`);
    } catch (error) {
      Alert.alert("체류 종료 실패", error instanceof Error ? error.message : "체류 체크아웃 요청에 실패했습니다.");
    }
  },

  addGuestbookEntry: (boardId, content) => {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      Alert.alert("방명록 입력", "내용을 입력해 주세요.");
      return false;
    }

    if (trimmedContent.length > 20) {
      Alert.alert("글자 수 초과", "방명록은 20자까지 입력할 수 있어요.");
      return false;
    }

    const now = Date.now();
    const newEntry: GuestbookEntry = {
      id: `guestbook-${boardId}-${now}`,
      boardId,
      content: trimmedContent,
      createdAt: now,
    };

    set((state) => ({
      guestbookEntriesByBoardId: {
        ...state.guestbookEntriesByBoardId,
        [boardId]: [newEntry, ...(state.guestbookEntriesByBoardId[boardId] ?? [])],
      },
    }));
    return true;
  },

  handleBackNavigation: () => {
    const { viewModalVisible } = get();

    if (viewModalVisible) {
      set({ viewModalVisible: false, selectedBoard: null });
      return true;
    }

    return false;
  },
}));
