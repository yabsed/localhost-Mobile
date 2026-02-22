const API_BASE_URL = "http://3.107.48.162:8080";

type ApiErrorResponse = {
  message?: string;
  error?: string;
};

export type MissionAttemptStatus = "PENDING" | "SUCCESS" | "FAILED" | "RETRY";

export type MissionAttemptRequest = {
  imageUri?: string;
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

const createHeaders = (token: string, contentType?: "application/json"): HeadersInit => ({
  ...(contentType ? { "Content-Type": contentType } : {}),
  Authorization: `Bearer ${token}`,
});

const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  heic: "image/heic",
  heif: "image/heif",
  webp: "image/webp",
};

const getFileExtension = (uri: string): string | null => {
  const normalizedUri = uri.split("?")[0];
  const fileName = normalizedUri.split("/").pop();
  if (!fileName) return null;

  const extension = fileName.split(".").pop()?.toLowerCase();
  if (!extension || extension === fileName.toLowerCase()) return null;
  return extension;
};

const getImageMimeType = (uri: string): string => {
  const extension = getFileExtension(uri);
  if (!extension) return "image/jpeg";
  return MIME_TYPE_BY_EXTENSION[extension] ?? "image/jpeg";
};

const getImageFileName = (uri: string): string => {
  const normalizedUri = uri.split("?")[0];
  const fileName = normalizedUri.split("/").pop();
  if (fileName && fileName.length > 0) return fileName;

  const extension = getFileExtension(uri) ?? "jpg";
  return `mission-image.${extension}`;
};

const buildAttemptBody = (
  payload: MissionAttemptRequest,
): { body?: BodyInit; contentType?: "application/json" } => {
  const imageUri = payload.imageUri?.trim();
  if (!imageUri) {
    return {};
  }

  const formData = new FormData();
  const imageFile = {
    uri: imageUri,
    name: getImageFileName(imageUri),
    type: getImageMimeType(imageUri),
  } as unknown as Blob;
  formData.append("image", imageFile);

  return { body: formData };
};

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
): Promise<MissionAttemptResponse> => {
  const { body, contentType } = buildAttemptBody(payload);
  return fetchJson<MissionAttemptResponse>(
    `${API_BASE_URL}/api/missions/${missionId}/attempts`,
    {
      method: "POST",
      headers: createHeaders(token, contentType),
      body,
    },
    "미션 인증 요청에 실패했습니다.",
  );
};

export const checkinStayMission = async (missionId: number, token: string): Promise<MissionAttemptResponse> =>
  fetchJson<MissionAttemptResponse>(
    `${API_BASE_URL}/api/missions/${missionId}/attempts/checkin`,
    {
      method: "POST",
      headers: createHeaders(token),
    },
    "체류 체크인에 실패했습니다.",
  );

export const checkoutStayMission = async (missionId: number, token: string): Promise<MissionAttemptResponse> =>
  fetchJson<MissionAttemptResponse>(
    `${API_BASE_URL}/api/missions/${missionId}/attempts/checkout`,
    {
      method: "POST",
      headers: createHeaders(token),
    },
    "체류 체크아웃에 실패했습니다.",
  );

export const getMyMissionAttempts = async (missionId: number, token: string): Promise<MissionAttemptResponse[]> =>
  fetchJson<MissionAttemptResponse[]>(
    `${API_BASE_URL}/api/missions/${missionId}/attempts/me`,
    {
      method: "GET",
      headers: createHeaders(token),
    },
    "미션 수행 이력을 불러오지 못했습니다.",
  );
