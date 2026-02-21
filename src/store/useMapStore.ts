import { Alert } from "react-native";
import { create } from "zustand";
import { initialBoards } from "../../dummyData";
import { Board, Coordinate, Mission, ParticipatedActivity } from "../types/map";

type MapState = {
  boards: Board[];
  selectedBoard: Board | null;
  viewModalVisible: boolean;
  searchQuery: string;
  participatedActivities: ParticipatedActivity[];
  myActivitiesModalVisible: boolean;
  setSelectedBoard: (selectedBoard: Board | null) => void;
  setViewModalVisible: (viewModalVisible: boolean) => void;
  setSearchQuery: (searchQuery: string) => void;
  setMyActivitiesModalVisible: (myActivitiesModalVisible: boolean) => void;
  certifyQuietTimeMission: (board: Board, mission: Mission, currentCoordinate: Coordinate | null) => void;
  startStayMission: (board: Board, mission: Mission, currentCoordinate: Coordinate | null) => void;
  completeStayMission: (activityId: string, currentCoordinate: Coordinate | null) => void;
  handleBackNavigation: () => boolean;
};

const getCoordinateOrAlert = (coordinate: Coordinate | null): Coordinate | null => {
  if (coordinate) return coordinate;
  Alert.alert("위치 필요", "GPS 위치를 확인할 수 없어요. 잠시 후 다시 시도해주세요.");
  return null;
};

export const useMapStore = create<MapState>((set, get) => ({
  boards: initialBoards,
  selectedBoard: null,
  viewModalVisible: false,
  searchQuery: "",
  participatedActivities: [],
  myActivitiesModalVisible: false,

  setSelectedBoard: (selectedBoard) => set({ selectedBoard }),
  setViewModalVisible: (viewModalVisible) => set({ viewModalVisible }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setMyActivitiesModalVisible: (myActivitiesModalVisible) => set({ myActivitiesModalVisible }),

  certifyQuietTimeMission: (board, mission, currentCoordinate) => {
    const coordinate = getCoordinateOrAlert(currentCoordinate);
    if (!coordinate) return;

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

  startStayMission: (board, mission, currentCoordinate) => {
    const coordinate = getCoordinateOrAlert(currentCoordinate);
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
    const coordinate = getCoordinateOrAlert(currentCoordinate);
    if (!coordinate) return;

    const { participatedActivities } = get();
    const target = participatedActivities.find((activity) => activity.id === activityId);
    if (!target) {
      Alert.alert("오류", "진행 중인 체류 미션을 찾지 못했습니다.");
      return;
    }

    if (target.status === "completed") {
      Alert.alert("이미 완료됨", "이미 보상을 받은 활동입니다.");
      return;
    }

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
