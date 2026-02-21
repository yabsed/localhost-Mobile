import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewToken,
  ViewabilityConfig,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { styles } from "../../styles/globalStyles";
import { useMapStore } from "../../store/useMapStore";
import { ActivityStatus, Board, Coordinate, Mission, MissionType } from "../../types/map";

const screenWidth = Dimensions.get("window").width;
const MISSION_PROXIMITY_METERS = 60;
const EARTH_RADIUS_METERS = 6371000;

type Props = {
  viewableBoards: Board[];
  safeInitialIndex: number;
  onViewableItemsChanged: (info: { viewableItems: Array<ViewToken<Board>> }) => void;
  viewabilityConfig: ViewabilityConfig;
  currentCoordinate: Coordinate | null;
};

type BoardTab = "missions" | "guestbook";

const missionPriorityByType: Record<MissionType, number> = {
  quiet_time_visit: 0,
  stay_duration: 1,
  receipt_purchase: 2,
  camera_treasure_hunt: 3,
  repeat_visit_stamp: 4,
};

const formatWon = (amount: number): string => `${amount.toLocaleString("ko-KR")}원`;

const getMissionTypeText = (missionType: MissionType): string => {
  if (missionType === "quiet_time_visit") return "한산 시간 방문 인증";
  if (missionType === "receipt_purchase") return "영수증 구매 인증";
  if (missionType === "camera_treasure_hunt") return "카메라 보물찾기";
  if (missionType === "repeat_visit_stamp") return "반복 방문 스탬프";
  return "체류 시간 인증";
};

const getMissionTypeEmoji = (missionType: MissionType): string => {
  if (missionType === "quiet_time_visit") return "🕒";
  if (missionType === "receipt_purchase") return "🧾";
  if (missionType === "camera_treasure_hunt") return "📸";
  if (missionType === "repeat_visit_stamp") return "🎟️";
  return "⏱️";
};

const getActivityStatusLabel = (status: ActivityStatus): string => {
  if (status === "completed") return "완료";
  return "진행중";
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

export const ViewPostModal = ({
  viewableBoards,
  safeInitialIndex,
  onViewableItemsChanged,
  viewabilityConfig,
  currentCoordinate,
}: Props) => {
  const {
    viewModalVisible,
    participatedActivities,
    repeatVisitProgressByMissionId,
    guestbookEntriesByBoardId,
    certifyQuietTimeMission,
    certifyReceiptPurchaseMission,
    certifyTreasureHuntMission,
    certifyRepeatVisitMission,
    startStayMission,
    completeStayMission,
    addGuestbookEntry,
    handleBackNavigation,
  } = useMapStore();
  const [activeTabByBoardId, setActiveTabByBoardId] = useState<Record<string, BoardTab>>({});
  const [guestbookDraftByBoardId, setGuestbookDraftByBoardId] = useState<Record<string, string>>({});
  const [submittingReceiptMissionId, setSubmittingReceiptMissionId] = useState<string | null>(null);
  const [submittingTreasureMissionId, setSubmittingTreasureMissionId] = useState<string | null>(null);

  const getBoardTab = (boardId: string): BoardTab => activeTabByBoardId[boardId] ?? "missions";
  const getGuestbookDraft = (boardId: string): string => guestbookDraftByBoardId[boardId] ?? "";

  const setBoardTab = (boardId: string, tab: BoardTab) => {
    setActiveTabByBoardId((previous) => ({ ...previous, [boardId]: tab }));
  };

  const updateGuestbookDraft = (boardId: string, text: string) => {
    setGuestbookDraftByBoardId((previous) => ({
      ...previous,
      [boardId]: text.slice(0, 20),
    }));
  };

  const submitGuestbook = (boardId: string) => {
    const isAdded = addGuestbookEntry(boardId, getGuestbookDraft(boardId));
    if (!isAdded) return;

    setGuestbookDraftByBoardId((previous) => ({
      ...previous,
      [boardId]: "",
    }));
  };

  const captureMissionImage = async (permissionDeniedMessage: string): Promise<string | null> => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("카메라 권한 필요", permissionDeniedMessage);
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled || !result.assets[0]?.uri) return null;
    return result.assets[0].uri;
  };

  const handleReceiptMission = async (board: Board, mission: Mission) => {
    if (mission.type !== "receipt_purchase") return;
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

    const imageUri = await captureMissionImage("영수증 촬영을 위해 카메라 권한을 허용해주세요.");
    if (!imageUri) return;

    setSubmittingReceiptMissionId(mission.id);
    try {
      await certifyReceiptPurchaseMission(board, mission, currentCoordinate, imageUri);
    } finally {
      setSubmittingReceiptMissionId(null);
    }
  };

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

    const imageUri = await captureMissionImage("보물찾기 촬영을 위해 카메라 권한을 허용해주세요.");
    if (!imageUri) return;

    setSubmittingTreasureMissionId(mission.id);
    try {
      await certifyTreasureHuntMission(board, mission, currentCoordinate, imageUri);
    } finally {
      setSubmittingTreasureMissionId(null);
    }
  };

  const renderMissionAction = (board: Board, mission: Mission) => {
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

          <View style={styles.stampRow}>
            {Array.from({ length: stampGoalCount }).map((_, index) => (
              <View
                key={`${mission.id}-stamp-slot-${index}`}
                style={[styles.stampDot, index < currentStampCount ? styles.stampDotFilled : null]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={() => certifyRepeatVisitMission(board, mission, currentCoordinate)}
          >
            <Text style={styles.buttonText}>오늘 방문 인증하기</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const completedActivity = participatedActivities.find(
      (activity) =>
        activity.boardId === board.id && activity.missionId === mission.id && activity.status === "completed",
    );
    const inProgressActivity = participatedActivities.find(
      (activity) =>
        activity.boardId === board.id && activity.missionId === mission.id && activity.status === "started",
    );

    if (mission.type === "quiet_time_visit") {
      if (completedActivity) {
        return <Text style={styles.missionCompletedText}>참여 완료 +{completedActivity.rewardCoins} 코인</Text>;
      }

      return (
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={() => certifyQuietTimeMission(board, mission, currentCoordinate)}
        >
          <Text style={styles.buttonText}>GPS 인증하고 보상받기</Text>
        </TouchableOpacity>
      );
    }

    if (mission.type === "receipt_purchase") {
      if (completedActivity) {
        return (
          <View style={styles.missionCompletedContainer}>
            <Text style={styles.missionCompletedText}>참여 완료 +{completedActivity.rewardCoins} 코인</Text>
            {completedActivity.receiptImageUri ? (
              <Image source={{ uri: completedActivity.receiptImageUri }} style={styles.missionReceiptPreviewImage} />
            ) : null}
          </View>
        );
      }

      const isSubmitting = submittingReceiptMissionId === mission.id;
      return (
        <TouchableOpacity
          style={[styles.button, styles.saveButton, isSubmitting ? { opacity: 0.65 } : null]}
          disabled={isSubmitting}
          onPress={() => {
            void handleReceiptMission(board, mission);
          }}
        >
          <Text style={styles.buttonText}>{isSubmitting ? "영수증 검증 중..." : "카메라로 영수증 촬영"}</Text>
        </TouchableOpacity>
      );
    }

    if (mission.type === "camera_treasure_hunt") {
      if (completedActivity) {
        return (
          <View style={styles.missionCompletedContainer}>
            <Text style={styles.missionCompletedText}>참여 완료 +{completedActivity.rewardCoins} 코인</Text>
            {completedActivity.receiptImageUri ? (
              <Image source={{ uri: completedActivity.receiptImageUri }} style={styles.missionReceiptPreviewImage} />
            ) : null}
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

    if (completedActivity) {
      return <Text style={styles.missionCompletedText}>참여 완료 +{completedActivity.rewardCoins} 코인</Text>;
    }

    if (inProgressActivity) {
      const elapsedMinutes = Math.floor((Date.now() - inProgressActivity.startedAt) / 60000);
      const requiredMinutes = inProgressActivity.requiredMinutes ?? mission.minDurationMinutes ?? 0;

      return (
        <View style={styles.missionProgressContainer}>
          <Text style={styles.missionProgressText}>
            진행 중 {elapsedMinutes}분 / {requiredMinutes}분
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={() => completeStayMission(inProgressActivity.id, currentCoordinate)}
          >
            <Text style={styles.buttonText}>체류 종료하고 검증</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.button, styles.saveButton]}
        onPress={() => startStayMission(board, mission, currentCoordinate)}
      >
        <Text style={styles.buttonText}>체류 시작 (GPS 기록)</Text>
      </TouchableOpacity>
    );
  };

  const renderMissionTab = (board: Board) => {
    const boardActivities = [...participatedActivities]
      .filter((activity) => activity.boardId === board.id)
      .sort((a, b) => b.startedAt - a.startedAt);
    const orderedMissions = [...board.missions].sort((a, b) => missionPriorityByType[a.type] - missionPriorityByType[b.type]);

    return (
      <ScrollView
        style={styles.missionListContainer}
        contentContainerStyle={styles.missionListContent}
        showsVerticalScrollIndicator={false}
      >
        {orderedMissions.map((mission) => (
          <View key={mission.id} style={styles.missionCard}>
            <View style={styles.missionTitleRow}>
              <Text style={styles.missionEmoji}>{getMissionTypeEmoji(mission.type)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.missionTitle}>{mission.title}</Text>
                <Text style={styles.missionTypeText}>{getMissionTypeText(mission.type)}</Text>
              </View>
              <Text style={styles.missionRewardText}>+{mission.rewardCoins}</Text>
            </View>

            <Text style={styles.missionDescription}>{mission.description}</Text>

            {mission.type === "stay_duration" && mission.minDurationMinutes ? (
              <Text style={styles.missionRuleText}>필수 체류 시간: {mission.minDurationMinutes}분</Text>
            ) : null}
            {mission.type === "repeat_visit_stamp" && mission.stampGoalCount ? (
              <Text style={styles.missionRuleText}>
                목표 스탬프: {mission.stampGoalCount}개 (하루 1회 인증)
              </Text>
            ) : null}
            {mission.type === "receipt_purchase" &&
            mission.receiptItemName &&
            mission.receiptItemPrice !== undefined ? (
              <Text style={styles.missionRuleText}>
                구매 대상: {mission.receiptItemName} ({formatWon(mission.receiptItemPrice)})
              </Text>
            ) : null}
            {mission.type === "camera_treasure_hunt" &&
            mission.treasureGuideText &&
            mission.treasureGuideImageUri ? (
              <View style={styles.missionTreasureGuideContainer}>
                <Text style={styles.missionRuleText}>보물 힌트: {mission.treasureGuideText}</Text>
                <Image source={{ uri: mission.treasureGuideImageUri }} style={styles.missionTreasureGuideImage} />
              </View>
            ) : null}

            <View style={styles.missionActionContainer}>{renderMissionAction(board, mission)}</View>
          </View>
        ))}

        <View style={styles.boardActivitySection}>
          <Text style={styles.boardActivitySectionTitle}>MY 활동 내역</Text>
          {boardActivities.length === 0 ? (
            <Text style={styles.boardActivityEmptyText}>아직 이 가게에서 참여한 활동이 없습니다.</Text>
          ) : (
            boardActivities.map((activity) => (
              <View key={activity.id} style={styles.boardActivityItem}>
                <View style={styles.boardActivityHeaderRow}>
                  <Text style={styles.boardActivityTitle}>{activity.missionTitle}</Text>
                  <Text style={styles.boardActivityStatus}>{getActivityStatusLabel(activity.status)}</Text>
                </View>
                <Text style={styles.boardActivityMeta}>
                  {new Date(activity.startedAt).toLocaleString()} |{" "}
                  {activity.rewardCoins > 0 ? `+${activity.rewardCoins} 코인` : "스탬프 적립"}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    );
  };

  const renderGuestbookTab = (board: Board) => {
    const guestbookEntries = guestbookEntriesByBoardId[board.id] ?? [];
    const draft = getGuestbookDraft(board.id);
    const isSubmitDisabled = draft.trim().length === 0;

    return (
      <View style={styles.guestbookContainer}>
        <ScrollView
          style={styles.guestbookListContainer}
          contentContainerStyle={styles.guestbookListContent}
          showsVerticalScrollIndicator={false}
        >
          {guestbookEntries.length === 0 ? (
            <Text style={styles.guestbookEmptyText}>첫 방명록을 남겨보세요.</Text>
          ) : (
            guestbookEntries.map((entry) => (
              <View key={entry.id} style={styles.guestbookItem}>
                <Text style={styles.guestbookItemText}>{entry.content}</Text>
                <Text style={styles.guestbookItemTime}>{new Date(entry.createdAt).toLocaleString()}</Text>
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.guestbookInputSection}>
          <TextInput
            style={styles.guestbookInput}
            value={draft}
            onChangeText={(text) => updateGuestbookDraft(board.id, text)}
            placeholder="방명록을 남겨주세요 (최대 20자)"
            placeholderTextColor="#8b8b8b"
            maxLength={20}
          />
          <View style={styles.guestbookInputFooter}>
            <Text style={styles.guestbookCounter}>{draft.length}/20</Text>
            <TouchableOpacity
              style={[
                styles.guestbookSubmitButton,
                isSubmitDisabled ? styles.guestbookSubmitButtonDisabled : null,
              ]}
              disabled={isSubmitDisabled}
              onPress={() => submitGuestbook(board.id)}
            >
              <Text style={styles.buttonText}>등록</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal animationType="fade" transparent visible={viewModalVisible} onRequestClose={handleBackNavigation}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
        {viewableBoards.length === 0 ? (
          <View style={styles.viewModalContent}>
            <Text style={styles.noCommentsText}>검색 조건에 맞는 게시글이 없습니다.</Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleBackNavigation}>
                <Text style={styles.buttonText}>닫기</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <FlatList
            data={viewableBoards}
            extraData={{
              participatedActivities,
              repeatVisitProgressByMissionId,
              guestbookEntriesByBoardId,
              activeTabByBoardId,
              guestbookDraftByBoardId,
            }}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={safeInitialIndex}
            getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            renderItem={({ item }) => {
              const activeTab = getBoardTab(item.id);

              return (
                <View style={{ width: screenWidth, justifyContent: "center", alignItems: "center" }}>
                  <View style={[styles.viewModalContent, { maxHeight: "80%", width: "88%" }]}>
                    <View style={styles.modalTopBar}>
                      <TouchableOpacity style={styles.backButtonInline} onPress={handleBackNavigation}>
                        <Ionicons name="arrow-back" size={16} color="#8b8b8b" />
                        <Text style={styles.backButtonInlineText}>뒤로가기</Text>
                      </TouchableOpacity>
                      <View style={styles.topBarCenterHint} pointerEvents="none">
                        <Text style={styles.swipeHintText}>⇄ 스와이프</Text>
                      </View>
                      <View style={styles.topBarSpacer} />
                    </View>

                    <View style={styles.boardHeader}>
                      <Text style={styles.boardEmoji}>{item.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.boardTitle}>{item.title}</Text>
                        <Text style={styles.boardDescription}>{item.description}</Text>
                      </View>
                    </View>

                    <View style={styles.boardTabContainer}>
                      <TouchableOpacity
                        style={[styles.boardTabButton, activeTab === "missions" ? styles.boardTabButtonActive : null]}
                        onPress={() => setBoardTab(item.id, "missions")}
                      >
                        <Text style={[styles.boardTabText, activeTab === "missions" ? styles.boardTabTextActive : null]}>
                          미션
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.boardTabButton, activeTab === "guestbook" ? styles.boardTabButtonActive : null]}
                        onPress={() => setBoardTab(item.id, "guestbook")}
                      >
                        <Text
                          style={[styles.boardTabText, activeTab === "guestbook" ? styles.boardTabTextActive : null]}
                        >
                          방명록
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {activeTab === "missions" ? renderMissionTab(item) : renderGuestbookTab(item)}
                  </View>
                </View>
              );
            }}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};
