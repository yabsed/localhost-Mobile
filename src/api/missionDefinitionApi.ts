import { Board, Mission, QuietTimeDay } from "../types/map";

const API_BASE_URL = "http://3.107.199.19:8080";
const DEFAULT_TREASURE_GUIDE_TEXT = "정답 이미지와 같은 장면을 촬영해 인증하세요.";
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";
const DEEPSEEK_TIMEOUT_MS = 7000;
const STORE_EMOJI_OPTIONS = ["☕", "🍽️", "🏪", "🍺", "🍜", "🥐", "💇", "🛒", "🍰", "🧺", "📍"] as const;

type BackendMissionType = "TIME_WINDOW" | "DWELL" | "RECEIPT" | "INVENTORY" | "STAMP";

type StoreResponse = {
  id: number;
  name: string;
  address: string;
  detailAddress: string | null;
  lat: number;
  lng: number;
  ownerId: number;
  businessNumber: string | null;
  imageUrl: string | null;
};

type MissionDefinitionResponse = {
  id: number;
  storeId: number;
  type: BackendMissionType;
  configJson: string;
  rewardAmount: number;
  isActive?: boolean;
  active?: boolean;
  lat: number;
  lng: number;
};

type MissionCreateRequest = {
  type: BackendMissionType;
  configJson: string;
  rewardAmount: number;
};

type MissionUpdateRequest = {
  configJson: string;
  rewardAmount: number;
  active?: boolean;
};

type ApiErrorResponse = {
  message?: string;
  error?: string;
};

type DeepSeekMessage = {
  content?: string;
};

type DeepSeekChoice = {
  message?: DeepSeekMessage;
};

type DeepSeekChatCompletionResponse = {
  choices?: DeepSeekChoice[];
};

type TimeWindowConfig = {
  startHour: number;
  endHour: number;
  days?: QuietTimeDay[];
};

type DwellConfig = {
  durationMinutes: number;
};

type ReceiptConfig = {
  targetProductKey: string;
  targetProductPrice?: number;
};

type InventoryConfig = {
  answerImageUrl: string;
};

type StampConfig = {
  requiredCount: number;
};

const isQuietTimeDay = (value: unknown): value is QuietTimeDay =>
  value === "MON" ||
  value === "TUE" ||
  value === "WED" ||
  value === "THU" ||
  value === "FRI" ||
  value === "SAT" ||
  value === "SUN";

const parseErrorMessage = async (response: Response, fallbackMessage: string): Promise<string> => {
  try {
    const data = (await response.json()) as ApiErrorResponse;
    if (data.message) return data.message;
    if (data.error) return data.error;
  } catch {
    // Ignore json parse failures and use fallback.
  }

  return fallbackMessage;
};

const createHeaders = (token?: string): HeadersInit => ({
  "Content-Type": "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const fetchJson = async <T>(url: string, init: RequestInit, fallbackMessage: string): Promise<T> => {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, fallbackMessage));
  }
  return (await response.json()) as T;
};

const parseConfigJson = (configJson: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(configJson) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Ignore malformed config and use empty object fallback.
  }
  return {};
};

const asNumberOrUndefined = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const asStringOrUndefined = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value : undefined;

const asQuietTimeDaysOrUndefined = (value: unknown): QuietTimeDay[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const days = value.filter(isQuietTimeDay);
  return days.length > 0 ? days : undefined;
};

const toTimeWindowConfig = (raw: Record<string, unknown>): TimeWindowConfig => ({
  startHour: asNumberOrUndefined(raw.startHour) ?? 14,
  endHour: asNumberOrUndefined(raw.endHour) ?? 16,
  days: asQuietTimeDaysOrUndefined(raw.days),
});

const toDwellConfig = (raw: Record<string, unknown>): DwellConfig => ({
  durationMinutes: asNumberOrUndefined(raw.durationMinutes) ?? 20,
});

const toReceiptConfig = (raw: Record<string, unknown>): ReceiptConfig => ({
  targetProductKey: asStringOrUndefined(raw.targetProductKey) ?? "지정 상품",
  targetProductPrice: asNumberOrUndefined(raw.targetProductPrice),
});

const toInventoryConfig = (raw: Record<string, unknown>): InventoryConfig => ({
  answerImageUrl: asStringOrUndefined(raw.answerImageUrl) ?? "",
});

const toStampConfig = (raw: Record<string, unknown>): StampConfig => ({
  requiredCount: asNumberOrUndefined(raw.requiredCount) ?? 5,
});

const toKoreanDayText = (day: QuietTimeDay): string => {
  if (day === "MON") return "월";
  if (day === "TUE") return "화";
  if (day === "WED") return "수";
  if (day === "THU") return "목";
  if (day === "FRI") return "금";
  if (day === "SAT") return "토";
  return "일";
};

const toHourLabel = (value: number): string => {
  const normalized = ((value % 24) + 24) % 24;
  const hour = Math.floor(normalized);
  const minute = Math.round((normalized - hour) * 60);
  const minuteText = minute > 0 ? ` ${minute}분` : "";
  const period = hour < 12 ? "오전" : "오후";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${hour12}시${minuteText}`;
};

const DEEPSEEK_API_KEY = process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY?.trim();
const storeEmojiCacheByName = new Map<string, string>();

const getFallbackStoreEmoji = (name: string): string => {
  const normalizedName = name.toLowerCase();
  if (normalizedName.includes("카페") || normalizedName.includes("커피")) return "☕";
  if (normalizedName.includes("cu") || normalizedName.includes("gs") || normalizedName.includes("마트")) return "🏪";
  if (normalizedName.includes("식당") || normalizedName.includes("국수") || normalizedName.includes("치킨")) return "🍽️";
  return "📍";
};

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const extractAllowedEmoji = (rawText: string): string | null => {
  const normalized = rawText.trim();
  if (!normalized) return null;

  const matched = STORE_EMOJI_OPTIONS.find((emoji) => normalized.includes(emoji));
  return matched ?? null;
};

const requestStoreEmojiFromDeepSeek = async (name: string): Promise<string | null> => {
  if (!DEEPSEEK_API_KEY) return null;

  const response = await fetchWithTimeout(
    DEEPSEEK_API_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        temperature: 0,
        max_tokens: 8,
        messages: [
          {
            role: "system",
            content:
              "상호명으로 업종 이모지 1개만 고르는 분류기다. 반드시 아래 목록 중 하나만 출력하라: ☕, 🍽️, 🏪, 🍺, 🍜, 🥐, 💇, 🛒, 🍰, 🧺, 📍",
          },
          {
            role: "user",
            content: `상호명: ${name}`,
          },
        ],
      }),
    },
    DEEPSEEK_TIMEOUT_MS,
  );

  if (!response.ok) return null;

  const data = (await response.json()) as DeepSeekChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content ?? "";
  return extractAllowedEmoji(content);
};

const getStoreEmoji = async (name: string): Promise<string> => {
  const cacheKey = name.trim().toLowerCase();
  const cached = storeEmojiCacheByName.get(cacheKey);
  if (cached) return cached;

  const fallbackEmoji = getFallbackStoreEmoji(name);

  try {
    const deepSeekEmoji = await requestStoreEmojiFromDeepSeek(name);
    const resolvedEmoji = deepSeekEmoji ?? fallbackEmoji;
    storeEmojiCacheByName.set(cacheKey, resolvedEmoji);
    return resolvedEmoji;
  } catch {
    storeEmojiCacheByName.set(cacheKey, fallbackEmoji);
    return fallbackEmoji;
  }
};

const mapMissionDefinitionToMission = (missionDefinition: MissionDefinitionResponse): Mission => {
  const parsedConfig = parseConfigJson(missionDefinition.configJson);

  if (missionDefinition.type === "TIME_WINDOW") {
    const config = toTimeWindowConfig(parsedConfig);
    const dayText = config.days && config.days.length > 0
      ? ` (${config.days.map(toKoreanDayText).join("/")})`
      : "";
    return {
      id: missionDefinition.id.toString(),
      type: "quiet_time_visit",
      title: "한산 시간대 방문 인증",
      description: `${toHourLabel(config.startHour)}~${toHourLabel(config.endHour)}${dayText} 방문 시 인증됩니다.`,
      rewardCoins: missionDefinition.rewardAmount,
      quietTimeStartHour: config.startHour,
      quietTimeEndHour: config.endHour,
      quietTimeDays: config.days,
    };
  }

  if (missionDefinition.type === "DWELL") {
    const config = toDwellConfig(parsedConfig);
    return {
      id: missionDefinition.id.toString(),
      type: "stay_duration",
      title: `${config.durationMinutes}분 이상 체류`,
      description: "체류 시작/종료로 머문 시간을 인증하면 보상을 받습니다.",
      rewardCoins: missionDefinition.rewardAmount,
      minDurationMinutes: config.durationMinutes,
    };
  }

  if (missionDefinition.type === "RECEIPT") {
    const config = toReceiptConfig(parsedConfig);
    const priceLabel = config.targetProductPrice !== undefined
      ? ` (${config.targetProductPrice.toLocaleString("ko-KR")}원)`
      : "";
    return {
      id: missionDefinition.id.toString(),
      type: "receipt_purchase",
      title: "영수증 구매 인증",
      description: `${config.targetProductKey}${priceLabel} 구매 영수증을 촬영해 인증하세요.`,
      rewardCoins: missionDefinition.rewardAmount,
      receiptItemName: config.targetProductKey,
      receiptItemPrice: config.targetProductPrice,
    };
  }

  if (missionDefinition.type === "INVENTORY") {
    const config = toInventoryConfig(parsedConfig);
    return {
      id: missionDefinition.id.toString(),
      type: "camera_treasure_hunt",
      title: "카메라 보물찾기",
      description: "정답 이미지와 같은 장면을 촬영해 인증하세요.",
      rewardCoins: missionDefinition.rewardAmount,
      treasureGuideText: DEFAULT_TREASURE_GUIDE_TEXT,
      treasureGuideImageUri: config.answerImageUrl || undefined,
    };
  }

  const config = toStampConfig(parsedConfig);
  return {
    id: missionDefinition.id.toString(),
    type: "repeat_visit_stamp",
    title: `반복 방문 스탬프 (${config.requiredCount}회)`,
    description: "하루 1회 방문 인증으로 스탬프를 적립하고 목표를 달성하면 보상을 받습니다.",
    rewardCoins: missionDefinition.rewardAmount,
    stampGoalCount: config.requiredCount,
  };
};

const mapStoreToBoard = async (
  store: StoreResponse,
  missionDefinitions: MissionDefinitionResponse[],
): Promise<Board> => {
  const missions = missionDefinitions.map(mapMissionDefinitionToMission);
  const detailAddress = store.detailAddress?.trim();
  const addressLabel = store.address.trim();
  const description = detailAddress ? `${addressLabel} ${detailAddress}`.trim() : addressLabel;

  return {
    id: store.id.toString(),
    type: "board",
    coordinate: {
      latitude: store.lat,
      longitude: store.lng,
    },
    emoji: await getStoreEmoji(store.name),
    title: store.name,
    description: description || "가게 설명이 아직 등록되지 않았습니다.",
    createdAt: Date.now(),
    missions,
  };
};

export const listStores = async (): Promise<StoreResponse[]> =>
  fetchJson<StoreResponse[]>(`${API_BASE_URL}/api/stores`, { method: "GET" }, "매장 목록을 불러오지 못했습니다.");

export const listStoreMissions = async (storeId: number): Promise<MissionDefinitionResponse[]> =>
  fetchJson<MissionDefinitionResponse[]>(
    `${API_BASE_URL}/api/stores/${storeId}/missions`,
    { method: "GET" },
    "매장 미션 목록을 불러오지 못했습니다.",
  );

export const getStoreMission = async (storeId: number, missionId: number): Promise<MissionDefinitionResponse> =>
  fetchJson<MissionDefinitionResponse>(
    `${API_BASE_URL}/api/stores/${storeId}/missions/${missionId}`,
    { method: "GET" },
    "미션 정보를 불러오지 못했습니다.",
  );

export const createStoreMission = async (
  storeId: number,
  payload: MissionCreateRequest,
  token: string,
): Promise<MissionDefinitionResponse> =>
  fetchJson<MissionDefinitionResponse>(
    `${API_BASE_URL}/api/stores/${storeId}/missions`,
    {
      method: "POST",
      headers: createHeaders(token),
      body: JSON.stringify(payload),
    },
    "미션 등록에 실패했습니다.",
  );

export const updateStoreMission = async (
  storeId: number,
  missionId: number,
  payload: MissionUpdateRequest,
  token: string,
): Promise<MissionDefinitionResponse> =>
  fetchJson<MissionDefinitionResponse>(
    `${API_BASE_URL}/api/stores/${storeId}/missions/${missionId}`,
    {
      method: "PUT",
      headers: createHeaders(token),
      body: JSON.stringify(payload),
    },
    "미션 수정에 실패했습니다.",
  );

export const deleteStoreMission = async (storeId: number, missionId: number, token: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/stores/${storeId}/missions/${missionId}`, {
    method: "DELETE",
    headers: createHeaders(token),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "미션 삭제에 실패했습니다."));
  }
};

export const fetchBoardsFromStoreMissions = async (): Promise<Board[]> => {
  const stores = await listStores();
  const missionResults = await Promise.all(
    stores.map(async (store) => {
      try {
        const missions = await listStoreMissions(store.id);
        return { store, missions };
      } catch {
        return { store, missions: [] as MissionDefinitionResponse[] };
      }
    }),
  );

  return Promise.all(
    missionResults.map(async ({ store, missions }) => mapStoreToBoard(store, missions)),
  );
};
