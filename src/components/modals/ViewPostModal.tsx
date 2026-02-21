import React from "react";
import {
  Dimensions,
  FlatList,
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
import { styles } from "../../styles/globalStyles";
import { useMapStore } from "../../store/useMapStore";
import { Board, Coordinate, Mission, MissionType } from "../../types/map";

const screenWidth = Dimensions.get("window").width;

type Props = {
  viewableBoards: Board[];
  safeInitialIndex: number;
  onViewableItemsChanged: (info: { viewableItems: Array<ViewToken<Board>> }) => void;
  viewabilityConfig: ViewabilityConfig;
  currentCoordinate: Coordinate | null;
};

const getMissionTypeText = (missionType: MissionType): string => {
  if (missionType === "quiet_time_visit") return "한산 시간 방문 인증";
  return "체류 시간 인증";
};

const getMissionTypeEmoji = (missionType: MissionType): string => {
  if (missionType === "quiet_time_visit") return "🕒";
  return "⏱️";
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
    setMyActivitiesModalVisible,
    certifyQuietTimeMission,
    startStayMission,
    completeStayMission,
    handleBackNavigation,
  } = useMapStore();

  const renderMissionAction = (board: Board, mission: Mission) => {
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
        return (
          <Text style={styles.missionCompletedText}>
            참여 완료 · +{completedActivity.rewardCoins} 코인
          </Text>
        );
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

    if (completedActivity) {
      return (
        <Text style={styles.missionCompletedText}>
          참여 완료 · +{completedActivity.rewardCoins} 코인
        </Text>
      );
    }

    if (inProgressActivity) {
      const elapsedMinutes = Math.floor((Date.now() - inProgressActivity.startedAt) / 60000);
      const requiredMinutes = inProgressActivity.requiredMinutes ?? mission.minDurationMinutes ?? 0;

      return (
        <View style={styles.missionProgressContainer}>
          <Text style={styles.missionProgressText}>
            진행 중: {elapsedMinutes}분 / {requiredMinutes}분
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

  return (
    <Modal animationType="fade" transparent visible={viewModalVisible} onRequestClose={handleBackNavigation}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
        {viewableBoards.length === 0 ? (
          <View style={styles.viewModalContent}>
            <Text style={styles.noCommentsText}>검색 조건에 맞는 게시판이 없습니다.</Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleBackNavigation}>
                <Text style={styles.buttonText}>닫기</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <FlatList
            data={viewableBoards}
            extraData={participatedActivities}
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

                    <TouchableOpacity
                      style={styles.inlineActivitiesButton}
                      onPress={() => setMyActivitiesModalVisible(true)}
                    >
                      <Ionicons name="list" size={14} color="#0d6efd" />
                      <Text style={styles.inlineActivitiesButtonText}>내 활동</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.boardHeader}>
                    <Text style={styles.boardEmoji}>{item.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.boardTitle}>{item.title}</Text>
                      <Text style={styles.boardDescription}>{item.description}</Text>
                    </View>
                  </View>

                  <ScrollView
                    style={styles.missionListContainer}
                    contentContainerStyle={styles.missionListContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {item.missions.map((mission) => (
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

                        <View style={styles.missionActionContainer}>{renderMissionAction(item, mission)}</View>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};
