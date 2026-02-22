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
  TouchableOpacity,
  View,
  ViewToken,
  ViewabilityConfig,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { styles } from "../../styles/globalStyles";
import { useMapStore } from "../../store/useMapStore";
import { ActivityStatus, Board, Coordinate, Mission, MissionType, QuietTimeDay } from "../../types/map";
import {
  buildCompressionSummary,
  compressImageForUpload,
  getFileSizeBytes,
  getMissionCameraOptions,
} from "../../utils/imageCompression";

const screenWidth = Dimensions.get("window").width;
const MISSION_PROXIMITY_METERS = 200;
const EARTH_RADIUS_METERS = 6371000;

type Props = {
  viewableBoards: Board[];
  safeInitialIndex: number;
  onViewableItemsChanged: (info: { viewableItems: Array<ViewToken<Board>> }) => void;
  viewabilityConfig: ViewabilityConfig;
  currentCoordinate: Coordinate | null;
};

const missionPriorityByType: Record<MissionType, number> = {
  quiet_time_visit: 0,
  stay_duration: 1,
  receipt_purchase: 2,
  camera_treasure_hunt: 3,
  repeat_visit_stamp: 4,
};

const formatWon = (amount: number): string => `${amount.toLocaleString("ko-KR")}원`;
const toKoreanDay = (day: QuietTimeDay): string => {
  if (day === "MON") return "월";
  if (day === "TUE") return "화";
  if (day === "WED") return "수";
  if (day === "THU") return "목";
  if (day === "FRI") return "금";
  if (day === "SAT") return "토";
  return "일";
};
const toHourLabel = (hourValue: number): string => {
  const normalized = ((hourValue % 24) + 24) % 24;
  const hour = Math.floor(normalized);
  const minute = Math.round((normalized - hour) * 60);
  const minuteText = minute > 0 ? ` ${minute}분` : "";
  const period = hour < 12 ? "오전" : "오후";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${hour12}시${minuteText}`;
};
const formatQuietTimeRule = (mission: Mission): string | null => {
  if (mission.type !== "quiet_time_visit") return null;
  if (mission.quietTimeStartHour === undefined || mission.quietTimeEndHour === undefined) return null;

  const dayText = mission.quietTimeDays && mission.quietTimeDays.length > 0
    ? `${mission.quietTimeDays.map(toKoreanDay).join("/")}`
    : "매일";
  return `인증 가능: ${dayText} ${toHourLabel(mission.quietTimeStartHour)} ~ ${toHourLabel(mission.quietTimeEndHour)}`;
};

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

const formatRemainingDuration = (remainingMillis: number): string => {
  const remainingSeconds = Math.max(Math.ceil(remainingMillis / 1000), 0);
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  if (minutes <= 0) return `${seconds}초`;
  if (seconds <= 0) return `${minutes}분`;
  return `${minutes}분 ${seconds}초`;
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
    certifyQuietTimeMission,
    certifyReceiptPurchaseMission,
    certifyTreasureHuntMission,
    certifyRepeatVisitMission,
    startStayMission,
    completeStayMission,
    handleBackNavigation,
  } = useMapStore();
  const [submittingReceiptMissionId, setSubmittingReceiptMissionId] = useState<string | null>(null);
  const [submittingTreasureMissionId, setSubmittingTreasureMissionId] = useState<string | null>(null);
  const [missionImageSummaryByMissionId, setMissionImageSummaryByMissionId] = useState<Record<string, string>>({});
  const [hiddenTreasureGuideImageByMissionId, setHiddenTreasureGuideImageByMissionId] = useState<
    Record<string, boolean>
  >({});

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

    const capturedImage = await captureMissionImage("영수증 촬영을 위해 카메라 권한을 허용해주세요.");
    if (!capturedImage) return;

    setMissionImageSummaryByMissionId((current) => ({
      ...current,
      [mission.id]: capturedImage.summary,
    }));

    setSubmittingReceiptMissionId(mission.id);
    try {
      await certifyReceiptPurchaseMission(board, mission, currentCoordinate, capturedImage.uri);
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
            onPress={() => {
              void certifyRepeatVisitMission(board, mission, currentCoordinate);
            }}
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
          onPress={() => {
            void certifyQuietTimeMission(board, mission, currentCoordinate);
          }}
        >
          <Text style={styles.buttonText}>GPS 인증하고 보상받기</Text>
        </TouchableOpacity>
      );
    }

    if (mission.type === "receipt_purchase") {
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

    if (completedActivity) {
      return <Text style={styles.missionCompletedText}>참여 완료 +{completedActivity.rewardCoins} 코인</Text>;
    }

    if (inProgressActivity) {
      const elapsedMillis = Math.max(Date.now() - inProgressActivity.startedAt, 0);
      const elapsedMinutes = Math.floor(elapsedMillis / 60000);
      const requiredMinutes = inProgressActivity.requiredMinutes ?? mission.minDurationMinutes ?? 0;
      const remainingMillis = Math.max(requiredMinutes * 60 * 1000 - elapsedMillis, 0);

      return (
        <View style={styles.missionProgressContainer}>
          <Text style={styles.missionProgressText}>
            진행 중 {elapsedMinutes}분 / {requiredMinutes}분
          </Text>
          {requiredMinutes > 0 ? (
            <Text style={styles.missionRuleText}>
              {remainingMillis > 0 ? `남은 시간 약 ${formatRemainingDuration(remainingMillis)}` : "최소 체류 시간 충족"}
            </Text>
          ) : null}
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={() => {
              void completeStayMission(inProgressActivity.id, currentCoordinate);
            }}
          >
            <Text style={styles.buttonText}>체류 종료하고 검증</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.button, styles.saveButton]}
        onPress={() => {
          void startStayMission(board, mission, currentCoordinate);
        }}
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

            {mission.type === "quiet_time_visit" && formatQuietTimeRule(mission) ? (
              <Text style={styles.missionRuleText}>{formatQuietTimeRule(mission)}</Text>
            ) : null}
            {mission.type === "stay_duration" && mission.minDurationMinutes ? (
              <Text style={styles.missionRuleText}>필수 체류 시간: {mission.minDurationMinutes}분</Text>
            ) : null}
            {mission.type === "repeat_visit_stamp" && mission.stampGoalCount ? (
              <Text style={styles.missionRuleText}>
                목표 스탬프: {mission.stampGoalCount}개 (하루 1회 인증)
              </Text>
            ) : null}
            {mission.type === "receipt_purchase" && mission.receiptItemName ? (
              <Text style={styles.missionRuleText}>
                구매 대상: {mission.receiptItemName}
                {mission.receiptItemPrice !== undefined ? ` (${formatWon(mission.receiptItemPrice)})` : ""}
              </Text>
            ) : null}
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
            }}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={safeInitialIndex}
            getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            renderItem={({ item }) => (
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

                  {renderMissionTab(item)}
                </View>
              </View>
            )}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};
