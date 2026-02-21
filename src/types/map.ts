export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type MissionType = "quiet_time_visit" | "stay_duration" | "repeat_visit_stamp";

export type Mission = {
  id: string;
  type: MissionType;
  title: string;
  description: string;
  rewardCoins: number;
  minDurationMinutes?: number;
  quietTimeStartHour?: number;
  quietTimeEndHour?: number;
  stampGoalCount?: number;
};

export type Board = {
  id: string;
  type: "board";
  coordinate: Coordinate;
  emoji: string;
  title: string;
  description: string;
  createdAt: number;
  missions: Mission[];
};

export type ActivityStatus = "started" | "completed";

export type ParticipatedActivity = {
  id: string;
  boardId: string;
  boardTitle: string;
  missionId: string;
  missionType: MissionType;
  missionTitle: string;
  rewardCoins: number;
  status: ActivityStatus;
  startedAt: number;
  completedAt?: number;
  requiredMinutes?: number;
  startCoordinate: Coordinate;
  endCoordinate?: Coordinate;
};

export type RepeatVisitProgress = {
  boardId: string;
  missionId: string;
  currentStampCount: number;
  completedRounds: number;
  lastStampedAt?: number;
};

export type GuestbookEntry = {
  id: string;
  boardId: string;
  content: string;
  createdAt: number;
};

export type Post = Board;
