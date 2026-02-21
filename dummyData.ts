import { Board } from "./src/types/map";

const BASE_COORDINATE = {
  latitude: 37.5463937599992,
  longitude: 127.065889477465,
};

type BoardSeed = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  latitudeOffset: number;
  longitudeOffset: number;
  quietTimeLabel: string;
  stayMinutes: number;
  visitReward: number;
  stayReward: number;
};

const parseKoreanTimeTokenToHour = (token: string): number => {
  const meridiem = token.includes("오후") ? "pm" : "am";
  const hourMatch = token.match(/(\d+)\s*시/);
  const minuteMatch = token.match(/(\d+)\s*분/);
  const hour12 = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;

  if (meridiem === "am") {
    const normalizedHour = hour12 === 12 ? 0 : hour12;
    return normalizedHour + minutes / 60;
  }

  const normalizedHour = hour12 === 12 ? 12 : hour12 + 12;
  return normalizedHour + minutes / 60;
};

const parseQuietTimeRange = (label: string): { startHour: number; endHour: number } => {
  const normalized = label.replace(/\s+/g, "");
  const tokens = normalized
    .split("~")
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length !== 2) {
    return { startHour: 13, endHour: 15 };
  }

  const startToken = tokens[0];
  const endToken = /오전|오후/.test(tokens[1]) ? tokens[1] : `${startToken.includes("오후") ? "오후" : "오전"}${tokens[1]}`;

  return {
    startHour: parseKoreanTimeTokenToHour(startToken),
    endHour: parseKoreanTimeTokenToHour(endToken),
  };
};

const boardSeeds: BoardSeed[] = [
  {
    id: "b1",
    emoji: "☕",
    title: "성수 브루랩",
    description: "아차산로 골목 유동 인구를 위한 오프피크 인증 미션.",
    latitudeOffset: 0.0001,
    longitudeOffset: -0.0002,
    quietTimeLabel: "오전 10시~12시",
    stayMinutes: 20,
    visitReward: 10,
    stayReward: 24,
  },
  {
    id: "b2",
    emoji: "🥐",
    title: "아차산로 베이커리",
    description: "빵 구매 고객 재방문을 위한 체류 보상형 게시판.",
    latitudeOffset: -0.0004,
    longitudeOffset: 0.0005,
    quietTimeLabel: "오후 2시~4시",
    stayMinutes: 25,
    visitReward: 12,
    stayReward: 28,
  },
  {
    id: "b3",
    emoji: "💻",
    title: "성수 워크라운지",
    description: "코워킹 고객 대상 장기 체류 인증 이벤트.",
    latitudeOffset: 0.0006,
    longitudeOffset: 0.0004,
    quietTimeLabel: "오전 9시~11시",
    stayMinutes: 30,
    visitReward: 11,
    stayReward: 34,
  },
  {
    id: "b4",
    emoji: "🥗",
    title: "서울숲 샐러드바",
    description: "점심 이후 비혼잡 시간대 방문 고객 보상 미션.",
    latitudeOffset: -0.0007,
    longitudeOffset: -0.0005,
    quietTimeLabel: "오후 3시~5시",
    stayMinutes: 20,
    visitReward: 9,
    stayReward: 22,
  },
  {
    id: "b5",
    emoji: "🍔",
    title: "뚝섬 버거스테이션",
    description: "매장 내 좌석 체류를 유도하는 GPS 인증 챌린지.",
    latitudeOffset: 0.0011,
    longitudeOffset: -0.0001,
    quietTimeLabel: "오후 4시~6시",
    stayMinutes: 30,
    visitReward: 13,
    stayReward: 33,
  },
  {
    id: "b6",
    emoji: "📚",
    title: "연무장길 북카페",
    description: "독서 고객 대상 조용한 시간대 방문 보상.",
    latitudeOffset: -0.001,
    longitudeOffset: 0.0002,
    quietTimeLabel: "오전 11시~오후 1시",
    stayMinutes: 35,
    visitReward: 10,
    stayReward: 38,
  },
  {
    id: "b7",
    emoji: "🫘",
    title: "성수 로스터리",
    description: "원두 시음 고객의 재방문을 위한 짧은 체류 미션.",
    latitudeOffset: 0.0003,
    longitudeOffset: 0.001,
    quietTimeLabel: "오후 1시~3시",
    stayMinutes: 15,
    visitReward: 8,
    stayReward: 20,
  },
  {
    id: "b8",
    emoji: "🍩",
    title: "수제도넛 하우스",
    description: "테이크아웃 시간 분산을 위한 오프피크 방문 보상.",
    latitudeOffset: -0.0003,
    longitudeOffset: -0.0011,
    quietTimeLabel: "오후 5시~7시",
    stayMinutes: 20,
    visitReward: 9,
    stayReward: 23,
  },
  {
    id: "b9",
    emoji: "🍱",
    title: "성수 델리키친",
    description: "런치 이후 매장 체류 인증 미션으로 리워드 지급.",
    latitudeOffset: 0.0014,
    longitudeOffset: 0.0006,
    quietTimeLabel: "오후 2시~4시",
    stayMinutes: 25,
    visitReward: 12,
    stayReward: 29,
  },
  {
    id: "b10",
    emoji: "🥤",
    title: "아뜰리에 스무디바",
    description: "피크 시간 외 방문 인증과 체류 인증을 동시 운영.",
    latitudeOffset: -0.0012,
    longitudeOffset: -0.0007,
    quietTimeLabel: "오전 10시~12시",
    stayMinutes: 20,
    visitReward: 11,
    stayReward: 24,
  },
  {
    id: "b11",
    emoji: "🥙",
    title: "성수 포케랩",
    description: "오피스 밀집 시간 이후 방문 고객 대상 미션.",
    latitudeOffset: 0.0009,
    longitudeOffset: -0.001,
    quietTimeLabel: "오후 3시~5시",
    stayMinutes: 25,
    visitReward: 10,
    stayReward: 27,
  },
  {
    id: "b12",
    emoji: "🍵",
    title: "뚝섬 티룸",
    description: "티 코스 체험 고객을 위한 GPS 체류 리워드.",
    latitudeOffset: -0.0014,
    longitudeOffset: 0.0008,
    quietTimeLabel: "오후 1시~3시",
    stayMinutes: 30,
    visitReward: 12,
    stayReward: 32,
  },
  {
    id: "b13",
    emoji: "🌮",
    title: "아차산로 타코바",
    description: "저녁 전 방문 분산을 위한 지역 기반 인증.",
    latitudeOffset: 0.0016,
    longitudeOffset: -0.0005,
    quietTimeLabel: "오후 4시~6시",
    stayMinutes: 20,
    visitReward: 9,
    stayReward: 22,
  },
  {
    id: "b14",
    emoji: "🥖",
    title: "성수 크루아상팩토리",
    description: "브런치 타임 이후 체류 고객 대상 코인 적립.",
    latitudeOffset: -0.0016,
    longitudeOffset: 0.0001,
    quietTimeLabel: "오후 2시~4시",
    stayMinutes: 30,
    visitReward: 11,
    stayReward: 33,
  },
  {
    id: "b15",
    emoji: "🍲",
    title: "서울숲 스프바",
    description: "직장인 저피크 시간 방문 인증 챌린지.",
    latitudeOffset: 0.0005,
    longitudeOffset: 0.0014,
    quietTimeLabel: "오후 3시~5시",
    stayMinutes: 20,
    visitReward: 10,
    stayReward: 25,
  },
  {
    id: "b16",
    emoji: "🍜",
    title: "성수 누들키친",
    description: "매장 체류를 유도하는 식사 후 미션 보드.",
    latitudeOffset: -0.0008,
    longitudeOffset: -0.0015,
    quietTimeLabel: "오후 4시~6시",
    stayMinutes: 25,
    visitReward: 10,
    stayReward: 27,
  },
  {
    id: "b17",
    emoji: "🧁",
    title: "성수 비건베이크",
    description: "디저트 카페 체류 시간을 늘리기 위한 인증 이벤트.",
    latitudeOffset: 0.0018,
    longitudeOffset: 0.0012,
    quietTimeLabel: "오전 11시~오후 1시",
    stayMinutes: 30,
    visitReward: 13,
    stayReward: 35,
  },
  {
    id: "b18",
    emoji: "🍥",
    title: "성수 라멘스팟",
    description: "브레이크 타임 직전 방문 인증 보상 프로그램.",
    latitudeOffset: -0.0019,
    longitudeOffset: -0.0003,
    quietTimeLabel: "오후 2시~3시 30분",
    stayMinutes: 20,
    visitReward: 9,
    stayReward: 23,
  },
  {
    id: "b19",
    emoji: "🧋",
    title: "성수 커피스탠드",
    description: "짧은 체류와 방문 인증을 결합한 빠른 리워드 미션.",
    latitudeOffset: 0.0012,
    longitudeOffset: -0.0016,
    quietTimeLabel: "오후 5시~7시",
    stayMinutes: 15,
    visitReward: 8,
    stayReward: 18,
  },
  {
    id: "b20",
    emoji: "🍳",
    title: "성수 브런치웍스",
    description: "브런치 이후 여유 시간대 방문 고객 집중형 이벤트.",
    latitudeOffset: -0.0011,
    longitudeOffset: 0.0015,
    quietTimeLabel: "오후 1시~3시",
    stayMinutes: 25,
    visitReward: 11,
    stayReward: 28,
  },
  {
    id: "b21",
    emoji: "🍕",
    title: "성수 슬라이스바",
    description: "피자 라운지 좌석 이용 고객 대상 체류 미션.",
    latitudeOffset: 0.0021,
    longitudeOffset: -0.0008,
    quietTimeLabel: "오후 3시~5시",
    stayMinutes: 20,
    visitReward: 10,
    stayReward: 24,
  },
  {
    id: "b22",
    emoji: "🍤",
    title: "성수 덴푸라랩",
    description: "점심 피크 이후 방문 분산을 위한 GPS 인증.",
    latitudeOffset: -0.002,
    longitudeOffset: 0.0009,
    quietTimeLabel: "오후 2시~4시",
    stayMinutes: 20,
    visitReward: 9,
    stayReward: 22,
  },
  {
    id: "b23",
    emoji: "🍙",
    title: "아차산로 온기식당",
    description: "지역 상권 체류 유도형 리워드 캠페인 게시판.",
    latitudeOffset: 0.0002,
    longitudeOffset: 0.002,
    quietTimeLabel: "오후 4시~6시",
    stayMinutes: 30,
    visitReward: 12,
    stayReward: 34,
  },
  {
    id: "b24",
    emoji: "🍰",
    title: "성수 디저트아틀리에",
    description: "저녁 전 방문과 체류 참여를 동시에 장려하는 미션.",
    latitudeOffset: -0.0002,
    longitudeOffset: -0.0021,
    quietTimeLabel: "오후 5시~7시",
    stayMinutes: 25,
    visitReward: 11,
    stayReward: 29,
  },
  {
    id: "b25",
    emoji: "🧭",
    title: "아차산로17길 기준점 라운지",
    description: "요청 좌표 기준 초근접 GPS 테스트용 더미.",
    latitudeOffset: 0.000328,
    longitudeOffset: 0.000138,
    quietTimeLabel: "오후 1시~3시",
    stayMinutes: 1,
    visitReward: 10,
    stayReward: 22,
  },
  {
    id: "b26",
    emoji: "📍",
    title: "기준점 북측 테스트 스팟",
    description: "기준점에서 북동쪽으로 몇 m 떨어진 검증 지점.",
    latitudeOffset: 0.000372,
    longitudeOffset: 0.000162,
    quietTimeLabel: "오후 2시~4시",
    stayMinutes: 1,
    visitReward: 11,
    stayReward: 24,
  },
  {
    id: "b27",
    emoji: "📌",
    title: "기준점 남측 테스트 스팟",
    description: "기준점에서 남서쪽으로 몇 m 떨어진 검증 지점.",
    latitudeOffset: 0.000286,
    longitudeOffset: 0.000094,
    quietTimeLabel: "오후 3시~5시",
    stayMinutes: 1,
    visitReward: 9,
    stayReward: 23,
  },
  {
    id: "b28",
    emoji: "🏁",
    title: "아차산로 GPS 체크포인트 A",
    description: "근접 반경 테스트를 위한 초근거리 체크포인트.",
    latitudeOffset: 0.000341,
    longitudeOffset: 0.000089,
    quietTimeLabel: "오전 11시~오후 1시",
    stayMinutes: 1,
    visitReward: 12,
    stayReward: 27,
  },
  {
    id: "b29",
    emoji: "🛰️",
    title: "아차산로 GPS 체크포인트 B",
    description: "기준 좌표 인접 구간 체류/방문 미션 테스트용.",
    latitudeOffset: 0.000301,
    longitudeOffset: 0.000187,
    quietTimeLabel: "오후 4시~6시",
    stayMinutes: 1,
    visitReward: 13,
    stayReward: 30,
  },
];

const seongsuBoards: Board[] = boardSeeds.map((seed, index): Board => {
  const latitude = BASE_COORDINATE.latitude + seed.latitudeOffset;
  const longitude = BASE_COORDINATE.longitude + seed.longitudeOffset;
  const quietTimeRange = parseQuietTimeRange(seed.quietTimeLabel);

  return {
    id: seed.id,
    type: "board",
    coordinate: { latitude, longitude },
    emoji: seed.emoji,
    title: seed.title,
    description: seed.description,
    createdAt: Date.now() - (index + 1) * 100000,
    missions: [
      {
        id: `${seed.id}-m1`,
        type: "quiet_time_visit",
        title: "한산 시간대 방문 인증",
        description: `${seed.quietTimeLabel} 방문 후 GPS 인증 시 코인 적립.`,
        rewardCoins: seed.visitReward,
        quietTimeStartHour: quietTimeRange.startHour,
        quietTimeEndHour: quietTimeRange.endHour,
      },
      {
        id: `${seed.id}-m2`,
        type: "stay_duration",
        title: `${seed.stayMinutes}분 이상 체류`,
        description: `체류 시작/종료 시 GPS를 기록해 ${seed.stayMinutes}분 이상 체류를 검증합니다.`,
        rewardCoins: seed.stayReward,
        minDurationMinutes: seed.stayMinutes,
      },
    ],
  };
});

const legacyBoards: Board[] = [
  {
    id: "legacy-b1",
    type: "board",
    coordinate: { latitude: 37.475, longitude: 126.936 },
    emoji: "☕",
    title: "모카하우스 신림점",
    description: "한산 시간 방문/체류 미션으로 코인을 받을 수 있어요.",
    createdAt: Date.now() - 2500000,
    missions: [
      {
        id: "legacy-b1-m1",
        type: "quiet_time_visit",
        title: "한산 시간대 방문 인증",
        description: "오후 2시~4시 사이 방문 후 GPS 인증하면 코인을 드려요.",
        rewardCoins: 12,
        quietTimeStartHour: 14,
        quietTimeEndHour: 16,
      },
      {
        id: "legacy-b1-m2",
        type: "stay_duration",
        title: "30분 이상 체류",
        description: "체류 시작 버튼을 누른 뒤 30분 이상 머물고 종료하면 보상 지급.",
        rewardCoins: 35,
        minDurationMinutes: 30,
      },
    ],
  },
  {
    id: "legacy-b2",
    type: "board",
    coordinate: { latitude: 37.47, longitude: 126.942 },
    emoji: "🍔",
    title: "버거랩 보라매점",
    description: "점심 피크 이후 미션 참여 시 리워드를 받을 수 있어요.",
    createdAt: Date.now() - 2600000,
    missions: [
      {
        id: "legacy-b2-m1",
        type: "quiet_time_visit",
        title: "한산 시간대 방문 인증",
        description: "평일 3시 이후 매장 방문 시 GPS 인증하면 코인 지급.",
        rewardCoins: 10,
        quietTimeStartHour: 15,
        quietTimeEndHour: 18,
      },
      {
        id: "legacy-b2-m2",
        type: "stay_duration",
        title: "20분 이상 체류",
        description: "시작/종료 시점 GPS를 기록해 20분 이상 체류를 검증합니다.",
        rewardCoins: 24,
        minDurationMinutes: 20,
      },
    ],
  },
  {
    id: "legacy-b3",
    type: "board",
    coordinate: { latitude: 37.468, longitude: 126.934 },
    emoji: "📚",
    title: "북스트리트 카페",
    description: "독서 고객 유입을 위한 체류 중심 미션입니다.",
    createdAt: Date.now() - 2700000,
    missions: [
      {
        id: "legacy-b3-m1",
        type: "quiet_time_visit",
        title: "한산 시간대 방문 인증",
        description: "오전 10시~12시 사이 방문 인증 시 코인 보상.",
        rewardCoins: 9,
        quietTimeStartHour: 10,
        quietTimeEndHour: 12,
      },
      {
        id: "legacy-b3-m2",
        type: "stay_duration",
        title: "40분 이상 체류",
        description: "조용한 좌석에서 40분 이상 체류 후 GPS 검증.",
        rewardCoins: 42,
        minDurationMinutes: 40,
      },
    ],
  },
  {
    id: "legacy-b4",
    type: "board",
    coordinate: { latitude: 37.474, longitude: 126.933 },
    emoji: "🥗",
    title: "그린샐러드 스튜디오",
    description: "오프피크 방문과 체류 미션 두 가지가 열려 있어요.",
    createdAt: Date.now() - 2800000,
    missions: [
      {
        id: "legacy-b4-m1",
        type: "quiet_time_visit",
        title: "한산 시간대 방문 인증",
        description: "오후 4시~5시 방문 후 GPS 인증 완료 시 코인 적립.",
        rewardCoins: 11,
        quietTimeStartHour: 16,
        quietTimeEndHour: 17,
      },
      {
        id: "legacy-b4-m2",
        type: "stay_duration",
        title: "25분 이상 체류",
        description: "체류 시작/종료 버튼으로 25분 이상 체류를 인증하세요.",
        rewardCoins: 28,
        minDurationMinutes: 25,
      },
    ],
  },
];

export const initialBoards: Board[] = [...seongsuBoards, ...legacyBoards];
