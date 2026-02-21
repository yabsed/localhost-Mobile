import React, { useState } from "react";
import {
  Dimensions,
  FlatList,
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
import { styles } from "../../styles/globalStyles";
import { useMapStore } from "../../store/useMapStore";
import { ActivityStatus, Board, Coordinate, Mission, MissionType } from "../../types/map";

const screenWidth = Dimensions.get("window").width;

type Props = {
  viewableBoards: Board[];
  safeInitialIndex: number;
  onViewableItemsChanged: (info: { viewableItems: Array<ViewToken<Board>> }) => void;
  viewabilityConfig: ViewabilityConfig;
  currentCoordinate: Coordinate | null;
};

type BoardTab = "missions" | "guestbook";

const getMissionTypeText = (missionType: MissionType): string => {
  if (missionType === "quiet_time_visit") return "한산 시간 방문 인증";
  if (missionType === "repeat_visit_stamp") return "반복 방문 스탬프";
  return "체류 시간 인증";
};

const getMissionTypeEmoji = (missionType: MissionType): string => {
  if (missionType === "quiet_time_visit") return "🕒";
  if (missionType === "repeat_visit_stamp") return "🎟️";
  return "⏱️";
};

const getActivityStatusLabel = (status: ActivityStatus): string => {
  if (status === "completed") return "완료";
  return "진행중";
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
    certifyRepeatVisitMission,
    startStayMission,
    completeStayMission,
    addGuestbookEntry,
    handleBackNavigation,
  } = useMapStore();
  const [activeTabByBoardId, setActiveTabByBoardId] = useState<Record<string, BoardTab>>({});
  const [guestbookDraftByBoardId, setGuestbookDraftByBoardId] = useState<Record<string, string>>({});

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

    return (
      <ScrollView
        style={styles.missionListContainer}
        contentContainerStyle={styles.missionListContent}
        showsVerticalScrollIndicator={false}
      >
        {board.missions.map((mission) => (
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
