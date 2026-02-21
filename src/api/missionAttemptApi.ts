const API_BASE_URL = "http://3.107.199.19:8080";

type ApiErrorResponse = {
  message?: string;
  error?: string;
};

export type MissionAttemptStatus = "PENDING" | "SUCCESS" | "FAILED" | "RETRY";

export type MissionAttemptRequest = {
  imageUrl?: string;
};

export type MissionAttemptResponse = {
  attemptId: number;
  missionId: number;
  status: MissionAttemptStatus;
  retryHint?: string | null;
  rewardId?: number | null;
  checkinAt?: string | null;
  checkoutAt?: string | null;
};

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

const createHeaders = (token: string, hasBody: boolean): HeadersInit => ({
  ...(hasBody ? { "Content-Type": "application/json" } : {}),
  Authorization: `Bearer ${token}`,
});

const fetchJson = async <T>(url: string, init: RequestInit, fallbackMessage: string): Promise<T> => {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, fallbackMessage));
  }
  return (await response.json()) as T;
};

export const attemptMission = async (
  missionId: number,
  payload: MissionAttemptRequest,
  token: string,
): Promise<MissionAttemptResponse> =>
  fetchJson<MissionAttemptResponse>(
    `${API_BASE_URL}/api/missions/${missionId}/attempts`,
    {
      method: "POST",
      headers: createHeaders(token, true),
      body: JSON.stringify(payload),
    },
    "미션 인증 요청에 실패했습니다.",
  );

export const checkinStayMission = async (missionId: number, token: string): Promise<MissionAttemptResponse> =>
  fetchJson<MissionAttemptResponse>(
    `${API_BASE_URL}/api/missions/${missionId}/attempts/checkin`,
    {
      method: "POST",
      headers: createHeaders(token, false),
    },
    "체류 체크인에 실패했습니다.",
  );

export const checkoutStayMission = async (missionId: number, token: string): Promise<MissionAttemptResponse> =>
  fetchJson<MissionAttemptResponse>(
    `${API_BASE_URL}/api/missions/${missionId}/attempts/checkout`,
    {
      method: "POST",
      headers: createHeaders(token, false),
    },
    "체류 체크아웃에 실패했습니다.",
  );

export const getMyMissionAttempts = async (missionId: number, token: string): Promise<MissionAttemptResponse[]> =>
  fetchJson<MissionAttemptResponse[]>(
    `${API_BASE_URL}/api/missions/${missionId}/attempts/me`,
    {
      method: "GET",
      headers: createHeaders(token, false),
    },
    "미션 수행 이력을 불러오지 못했습니다.",
  );
