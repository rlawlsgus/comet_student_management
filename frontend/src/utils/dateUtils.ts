/**
 * 시간 문자열을 HH:MM 형식으로 변환
 * @param timeString - "14:00:00" 형식의 시간 문자열
 * @returns "14:00" 형식의 시간 문자열
 */
export const formatTime = (timeString: string): string => {
  try {
    // "14:00:00" 형식을 "14:00" 형식으로 변환
    const time = new Date(`2000-01-01T${timeString}`);
    return time.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch (error) {
    // 파싱 실패 시 원본 문자열 반환
    console.warn("시간 파싱 실패:", timeString, error);
    return timeString;
  }
};

/**
 * 날짜를 YYYY-MM-DD 형식으로 변환
 * @param date - Date 객체 또는 날짜 문자열
 * @returns "2024-01-01" 형식의 날짜 문자열
 */
export const formatDate = (date: Date | string): string => {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toISOString().split("T")[0];
  } catch (error) {
    console.warn("날짜 파싱 실패:", date, error);
    return String(date);
  }
};

/**
 * 날짜를 한국어 형식으로 변환
 * @param date - Date 객체 또는 날짜 문자열
 * @returns "2024년 1월 1일" 형식의 날짜 문자열
 */
export const formatDateKorean = (date: Date | string): string => {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    console.warn("날짜 파싱 실패:", date, error);
    return String(date);
  }
};
