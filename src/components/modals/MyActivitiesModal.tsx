import React from "react";
import { FlatList, Modal, Text, TouchableOpacity, View } from "react-native";
import { styles } from "../../styles/globalStyles";
import { useMapStore } from "../../store/useMapStore";
import { ParticipatedActivity } from "../../types/map";

type Props = {
  onSelectStore: (boardId: string) => void;
};

type ParticipatedStoreSummary = {
  boardId: string;
  boardTitle: string;
  boardDescription: string;
  boardEmoji: string;
  activityCount: number;
  lastActivityAt: number;
  totalEarnedCoins: number;
  recentActivities: ParticipatedActivity[];
  stampCurrentCount: number;
  stampGoalCount: number;
  stampCompletedRounds: number;
};

const formatActivityMeta = (activity: ParticipatedActivity): string => {
  const timeText = new Date(activity.startedAt).toLocaleString("ko-KR");
  const rewardText = activity.rewardCoins > 0 ? `+${activity.rewardCoins} 코인` : "스탬프 적립";
  return `${timeText} | ${rewardText}`;
};

const getActivityStatusText = (activity: ParticipatedActivity): string =>
  activity.status === "completed" ? "완료" : "진행중";

export const MyActivitiesModal = ({ onSelectStore }: Props) => {
  const {
    boards,
    myActivitiesModalVisible,
    setMyActivitiesModalVisible,
    participatedActivities,
    repeatVisitProgressByMissionId,
  } = useMapStore();

  const activities = [...participatedActivities].sort((a, b) => b.startedAt - a.startedAt);
  const participatedStores = activities.reduce<ParticipatedStoreSummary[]>((acc, activity) => {
    const existing = acc.find((item) => item.boardId === activity.boardId);
    const board = boards.find((item) => item.id === activity.boardId);
    const repeatVisitMission = board?.missions.find((mission) => mission.type === "repeat_visit_stamp");
    const repeatVisitProgress = repeatVisitMission ? repeatVisitProgressByMissionId[repeatVisitMission.id] : undefined;
    const stampGoalCount = repeatVisitMission?.stampGoalCount ?? 0;
    const stampCurrentCount = repeatVisitProgress?.currentStampCount ?? 0;
    const stampCompletedRounds = repeatVisitProgress?.completedRounds ?? 0;

    if (existing) {
      existing.activityCount += 1;
      if (activity.startedAt > existing.lastActivityAt) {
        existing.lastActivityAt = activity.startedAt;
      }
      existing.totalEarnedCoins += activity.rewardCoins;
      if (existing.recentActivities.length < 3) {
        existing.recentActivities.push(activity);
      }
      return acc;
    }

    acc.push({
      boardId: activity.boardId,
      boardTitle: activity.boardTitle,
      boardDescription: board?.description ?? "가게 설명이 아직 등록되지 않았습니다.",
      boardEmoji: board?.emoji ?? "📍",
      activityCount: 1,
      lastActivityAt: activity.startedAt,
      totalEarnedCoins: activity.rewardCoins,
      recentActivities: [activity],
      stampCurrentCount,
      stampGoalCount,
      stampCompletedRounds,
    });
    return acc;
  }, []);
  participatedStores.sort((a, b) => b.lastActivityAt - a.lastActivityAt);

  return (
    <Modal
      animationType="slide"
      transparent
      visible={myActivitiesModalVisible}
      onRequestClose={() => setMyActivitiesModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.activitiesModalView}>
          <Text style={styles.modalTitle}>내가 참여한 가게</Text>

          {participatedStores.length === 0 ? (
            <Text style={styles.noCommentsText}>아직 활동에 참여한 가게가 없습니다.</Text>
          ) : (
            <FlatList
              data={participatedStores}
              keyExtractor={(item) => item.boardId}
              style={styles.activitiesList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.82}
                  style={styles.participatedStoreItem}
                  onPress={() => onSelectStore(item.boardId)}
                >
                  <View style={styles.participatedStoreHeader}>
                    <Text style={styles.participatedStoreEmoji}>{item.boardEmoji}</Text>
                    <Text style={styles.participatedStoreTitle}>{item.boardTitle}</Text>
                  </View>
                  <Text style={styles.participatedStoreDescription}>{item.boardDescription}</Text>
                  <Text style={styles.participatedStoreMeta}>참여 활동 수: {item.activityCount}회</Text>
                  <Text style={styles.participatedStoreMeta}>누적 보상: +{item.totalEarnedCoins} 코인</Text>
                  <Text style={styles.participatedStoreMeta}>
                    최근 참여: {new Date(item.lastActivityAt).toLocaleString("ko-KR")}
                  </Text>
                  {item.stampGoalCount > 0 ? (
                    <View style={styles.participatedStoreStampWrap}>
                      <View style={styles.stampRow}>
                        {Array.from({ length: item.stampGoalCount }).map((_, index) => (
                          <View
                            key={`${item.boardId}-stamp-${index}`}
                            style={[styles.stampDot, index < item.stampCurrentCount ? styles.stampDotFilled : null]}
                          />
                        ))}
                      </View>
                      <Text style={styles.participatedStoreStampMeta}>
                        스탬프 {item.stampCurrentCount}/{item.stampGoalCount} | 도장 완성 {item.stampCompletedRounds}회
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.participatedStoreActivitySection}>
                    <Text style={styles.participatedStoreActivitySectionTitle}>MY 활동 내역</Text>
                    {item.recentActivities.map((activity) => (
                      <View key={activity.id} style={styles.participatedStoreActivityItem}>
                        <View style={styles.participatedStoreActivityHeader}>
                          <Text style={styles.participatedStoreActivityTitle}>{activity.missionTitle}</Text>
                          <Text style={styles.participatedStoreActivityStatus}>{getActivityStatusText(activity)}</Text>
                        </View>
                        <Text style={styles.participatedStoreActivityMeta}>{formatActivityMeta(activity)}</Text>
                      </View>
                    ))}
                    {item.activityCount > item.recentActivities.length ? (
                      <Text style={styles.participatedStoreActivityMore}>
                        외 {item.activityCount - item.recentActivities.length}개 활동 더 있음
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              )}
            />
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setMyActivitiesModalVisible(false)}>
              <Text style={styles.buttonText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
