import { Alert } from "react-native";
import { create } from "zustand";
import { initialBoards } from "../../dummyData";
import { Board, Coordinate, GuestbookEntry, Mission, ParticipatedActivity, RepeatVisitProgress } from "../types/map";

type MapState = {
  boards: Board[];
  selectedBoard: Board | null;
  viewModalVisible: boolean;
  searchQuery: string;
  participatedActivities: ParticipatedActivity[];
  repeatVisitProgressByMissionId: Record<string, RepeatVisitProgress>;
  guestbookEntriesByBoardId: Record<string, GuestbookEntry[]>;
  myActivitiesModalVisible: boolean;
  setSelectedBoard: (selectedBoard: Board | null) => void;
  setViewModalVisible: (viewModalVisible: boolean) => void;
  setSearchQuery: (searchQuery: string) => void;
  setMyActivitiesModalVisible: (myActivitiesModalVisible: boolean) => void;
  certifyQuietTimeMission: (board: Board, mission: Mission, currentCoordinate: Coordinate | null) => void;
  certifyReceiptPurchaseMission: (
    board: Board,
    mission: Mission,
    currentCoordinate: Coordinate | null,
    receiptImageUri: string,
  ) => Promise<void>;
  certifyRepeatVisitMission: (board: Board, mission: Mission, currentCoordinate: Coordinate | null) => void;
  startStayMission: (board: Board, mission: Mission, currentCoordinate: Coordinate | null) => void;
  completeStayMission: (activityId: string, currentCoordinate: Coordinate | null) => void;
  addGuestbookEntry: (boardId: string, content: string) => boolean;
  handleBackNavigation: () => boolean;
};

const MISSION_PROXIMITY_METERS = 30;
const EARTH_RADIUS_METERS = 6371000;

type ReceiptVerificationPayload = {
  boardId: string;
  missionId: string;
  itemName: string;
  itemPrice: number;
  coordinate: Coordinate;
  receiptImageUri: string;
  clientTimestamp: number;
};

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

const isInQuietTimeRange = (mission: Mission, now: Date): boolean => {
  if (mission.quietTimeStartHour === undefined || mission.quietTimeEndHour === undefined) return true;

  const currentHour = now.getHours() + now.getMinutes() / 60;
  const { quietTimeStartHour, quietTimeEndHour } = mission;

  if (quietTimeStartHour <= quietTimeEndHour) {
    return currentHour >= quietTimeStartHour && currentHour < quietTimeEndHour;
  }

  return currentHour >= quietTimeStartHour || currentHour < quietTimeEndHour;
};

const isSameLocalDay = (timeA: number, timeB: number): boolean => {
  const a = new Date(timeA);
  const b = new Date(timeB);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const verifyReceiptPurchaseWithMockBackend = async (
  payload: ReceiptVerificationPayload,
): Promise<{ verified: boolean; failureReason?: string }> => {
  if (!payload.receiptImageUri) {
    return { verified: false, failureReason: "영수증 이미지가 첨부되지 않았어요." };
  }

  await new Promise((resolve) => setTimeout(resolve, 700));
  return { verified: true };
};

export const useMapStore = create<MapState>((set, get) => ({
  boards: initialBoards,
  selectedBoard: null,
  viewModalVisible: false,
  searchQuery: "",
  participatedActivities: [],
  repeatVisitProgressByMissionId: {},
  guestbookEntriesByBoardId: {},
  myActivitiesModalVisible: false,

  setSelectedBoard: (selectedBoard) => set({ selectedBoard }),
  setViewModalVisible: (viewModalVisible) => set({ viewModalVisible }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setMyActivitiesModalVisible: (myActivitiesModalVisible) => set({ myActivitiesModalVisible }),

  certifyQuietTimeMission: (board, mission, currentCoordinate) => {
    const coordinate = getCoordinateNearBoardOrAlert(currentCoordinate, board);
    if (!coordinate) return;
    if (!isInQuietTimeRange(mission, new Date())) {
      Alert.alert("인증 가능 시간 아님", "지금은 한산 시간대가 아니에요. 미션 시간에 다시 시도해주세요.");
      return;
    }

    const { participatedActivities } = get();
    const alreadyCompleted = participatedActivities.some(
      (activity) =>
        activity.boardId === board.id && activity.missionId === mission.id && activity.status === "completed",
    );
    if (alreadyCompleted) {
      Alert.alert("이미 완료됨", "이 활동은 이미 인증을 완료했습니다.");
      return;
    }

    const now = Date.now();
    const newActivity: ParticipatedActivity = {
      id: `${mission.id}-${now}`,
      boardId: board.id,
      boardTitle: board.title,
      missionId: mission.id,
      missionType: mission.type,
      missionTitle: mission.title,
      rewardCoins: mission.rewardCoins,
      status: "completed",
      startedAt: now,
      completedAt: now,
      startCoordinate: coordinate,
      endCoordinate: coordinate,
    };

    set((state) => ({ participatedActivities: [newActivity, ...state.participatedActivities] }));
    Alert.alert("미션 완료", `${mission.rewardCoins} 코인을 획득했어요.`);
  },

  certifyReceiptPurchaseMission: async (board, mission, currentCoordinate, receiptImageUri) => {
    if (mission.type !== "receipt_purchase") return;

    const coordinate = getCoordinateNearBoardOrAlert(currentCoordinate, board);
    if (!coordinate) return;

    if (!mission.receiptItemName || mission.receiptItemPrice === undefined) {
      Alert.alert("구매 대상 없음", "판매자가 지정한 구매 상품 정보가 아직 등록되지 않았어요.");
      return;
    }

    const { participatedActivities } = get();
    const alreadyCompleted = participatedActivities.some(
      (activity) =>
        activity.boardId === board.id && activity.missionId === mission.id && activity.status === "completed",
    );
    if (alreadyCompleted) {
      Alert.alert("이미 완료됨", "이 활동은 이미 인증을 완료했습니다.");
      return;
    }

    const clientTimestamp = Date.now();
    const verificationResult = await verifyReceiptPurchaseWithMockBackend({
      boardId: board.id,
      missionId: mission.id,
      itemName: mission.receiptItemName,
      itemPrice: mission.receiptItemPrice,
      coordinate,
      receiptImageUri,
      clientTimestamp,
    });

    if (!verificationResult.verified) {
      Alert.alert("구매 인증 실패", verificationResult.failureReason ?? "영수증 검증에 실패했습니다.");
      return;
    }

    const now = Date.now();
    const newActivity: ParticipatedActivity = {
      id: `${mission.id}-receipt-${now}`,
      boardId: board.id,
      boardTitle: board.title,
      missionId: mission.id,
      missionType: mission.type,
      missionTitle: `${mission.title} (${mission.receiptItemName})`,
      rewardCoins: mission.rewardCoins,
      status: "completed",
      startedAt: now,
      completedAt: now,
      startCoordinate: coordinate,
      endCoordinate: coordinate,
    };

    set((state) => ({ participatedActivities: [newActivity, ...state.participatedActivities] }));
    Alert.alert(
      "구매 인증 완료",
      `${mission.receiptItemName} 구매가 확인되어 ${mission.rewardCoins} 코인을 획득했어요.`,
    );
  },

  certifyRepeatVisitMission: (board, mission, currentCoordinate) => {
    if (mission.type !== "repeat_visit_stamp") return;

    const coordinate = getCoordinateNearBoardOrAlert(currentCoordinate, board);
    if (!coordinate) return;

    const now = Date.now();
    const stampGoalCount = mission.stampGoalCount ?? 5;
    const { repeatVisitProgressByMissionId } = get();
    const currentProgress = repeatVisitProgressByMissionId[mission.id] ?? {
      boardId: board.id,
      missionId: mission.id,
      currentStampCount: 0,
      completedRounds: 0,
    };

    if (currentProgress.lastStampedAt && isSameLocalDay(currentProgress.lastStampedAt, now)) {
      Alert.alert("오늘은 이미 인증 완료", "반복 방문 스탬프는 하루에 1번만 적립할 수 있어요.");
      return;
    }

    const nextStampCount = currentProgress.currentStampCount + 1;
    const isCardCompleted = nextStampCount >= stampGoalCount;
    const updatedProgress: RepeatVisitProgress = {
      ...currentProgress,
      currentStampCount: isCardCompleted ? 0 : nextStampCount,
      completedRounds: currentProgress.completedRounds + (isCardCompleted ? 1 : 0),
      lastStampedAt: now,
    };

    const newActivity: ParticipatedActivity = {
      id: `${mission.id}-stamp-${now}`,
      boardId: board.id,
      boardTitle: board.title,
      missionId: mission.id,
      missionType: mission.type,
      missionTitle: isCardCompleted
        ? `${mission.title} 카드 완성`
        : `${mission.title} 스탬프 ${nextStampCount}/${stampGoalCount}`,
      rewardCoins: isCardCompleted ? mission.rewardCoins : 0,
      status: "completed",
      startedAt: now,
      completedAt: now,
      startCoordinate: coordinate,
      endCoordinate: coordinate,
    };

    set((state) => ({
      repeatVisitProgressByMissionId: {
        ...state.repeatVisitProgressByMissionId,
        [mission.id]: updatedProgress,
      },
      participatedActivities: [newActivity, ...state.participatedActivities],
    }));

    if (isCardCompleted) {
      Alert.alert("스탬프 카드 완성", `${mission.rewardCoins} 코인을 획득했어요.`);
      return;
    }

    Alert.alert("스탬프 적립 완료", `${nextStampCount}/${stampGoalCount}개를 적립했어요.`);
  },

  startStayMission: (board, mission, currentCoordinate) => {
    const coordinate = getCoordinateNearBoardOrAlert(currentCoordinate, board);
    if (!coordinate) return;

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

    const now = Date.now();
    const newActivity: ParticipatedActivity = {
      id: `${mission.id}-${now}`,
      boardId: board.id,
      boardTitle: board.title,
      missionId: mission.id,
      missionType: mission.type,
      missionTitle: mission.title,
      rewardCoins: mission.rewardCoins,
      status: "started",
      startedAt: now,
      requiredMinutes: mission.minDurationMinutes,
      startCoordinate: coordinate,
    };

    set((state) => ({ participatedActivities: [newActivity, ...state.participatedActivities] }));
    Alert.alert("체류 시작", "종료 버튼을 눌러 GPS 검증을 완료하면 코인이 지급됩니다.");
  },

  completeStayMission: (activityId, currentCoordinate) => {
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

    const coordinate = getCoordinateNearBoardOrAlert(currentCoordinate, board);
    if (!coordinate) return;

    const requiredMs = (target.requiredMinutes ?? 0) * 60 * 1000;
    const now = Date.now();
    const elapsedMs = now - target.startedAt;
    if (elapsedMs < requiredMs) {
      const remainingMinutes = Math.ceil((requiredMs - elapsedMs) / 60000);
      Alert.alert("체류 시간 부족", `${remainingMinutes}분 더 체류하면 보상을 받을 수 있어요.`);
      return;
    }

    const updatedActivities = participatedActivities.map((activity) => {
      if (activity.id !== activityId) return activity;
      return {
        ...activity,
        status: "completed" as const,
        completedAt: now,
        endCoordinate: coordinate,
      };
    });

    set({ participatedActivities: updatedActivities });
    Alert.alert("미션 완료", `${target.rewardCoins} 코인을 획득했어요.`);
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
    const { myActivitiesModalVisible, viewModalVisible } = get();

    if (myActivitiesModalVisible) {
      set({ myActivitiesModalVisible: false });
      return true;
    }

    if (viewModalVisible) {
      set({ viewModalVisible: false, selectedBoard: null });
      return true;
    }

    return false;
  },
}));
