const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 진행 중인 요청을 추적하는 캐시
const pendingRequests = new Map<string, Promise<any>>();

// CSRF 토큰 가져오기
const getCSRFToken = () => {
  const name = "csrftoken";
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
};

// 요청 키 생성
const getRequestKey = (endpoint: string, options: RequestInit = {}) => {
  const method = options.method || "GET";
  const body = options.body ? JSON.stringify(options.body) : "";
  return `${method}:${endpoint}:${body}`;
};

// 공통 API 호출 함수
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const csrfToken = getCSRFToken();
  const requestKey = getRequestKey(endpoint, options);

  // 이미 진행 중인 동일한 요청이 있으면 해당 요청을 반환
  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }

  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken && { "X-CSRFToken": csrfToken }),
      ...options.headers,
    },
    credentials: "include", // 쿠키 포함
    ...options,
  };

  const requestPromise = (async () => {
    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API Error Response:", errorData); // 디버깅용 로그 추가

        // Django REST Framework의 오류 응답 처리
        let errorMessage = `HTTP error! status: ${response.status}`;

        if (errorData.detail) {
          // detail 필드가 있는 경우 (우선순위 1)
          errorMessage = errorData.detail;
        } else if (
          errorData.non_field_errors &&
          errorData.non_field_errors.length > 0
        ) {
          // non_field_errors 배열이 있는 경우
          errorMessage = errorData.non_field_errors[0];
        } else if (errorData.error) {
          // error 필드가 있는 경우
          errorMessage = errorData.error;
        } else if (errorData.message) {
          // message 필드가 있는 경우
          errorMessage = errorData.message;
        } else if (typeof errorData === "string") {
          // 문자열로 직접 오류 메시지가 온 경우
          errorMessage = errorData;
        } else if (typeof errorData === "object") {
          // 객체인 경우 첫 번째 필드의 값을 사용
          const firstKey = Object.keys(errorData)[0];
          if (firstKey) {
            const firstValue = errorData[firstKey];
            if (Array.isArray(firstValue)) {
              errorMessage = firstValue[0]; // 배열의 첫 번째 요소
            } else if (typeof firstValue === "string") {
              errorMessage = firstValue;
            }
          }
        }

        throw new Error(errorMessage);
      }

      // DELETE 요청이나 응답 본문이 없는 경우 빈 객체 반환
      if (
        response.status === 204 ||
        response.headers.get("content-length") === "0"
      ) {
        return {};
      }

      // 응답 본문이 있는 경우에만 JSON 파싱 시도
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      } else {
        return {};
      }
    } catch (error) {
      console.error("API call failed:", error);
      throw error;
    } finally {
      // 요청 완료 후 캐시에서 제거
      pendingRequests.delete(requestKey);
    }
  })();

  // 진행 중인 요청을 캐시에 저장
  pendingRequests.set(requestKey, requestPromise);

  return requestPromise;
};

// 인증 관련 API
export const authAPI = {
  login: async (username: string, password: string) => {
    return apiCall("/login/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  logout: async () => {
    return apiCall("/logout/", {
      method: "POST",
    });
  },
};

// 사용자 관련 API
export const userAPI = {
  getUsers: async () => {
    return apiCall("/users/");
  },

  getUser: async (id: number) => {
    return apiCall(`/users/${id}/`);
  },

  createUser: async (userData: any) => {
    return apiCall("/users/", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  updateUser: async (id: number, userData: any) => {
    return apiCall(`/users/${id}/`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  },

  deleteUser: async (id: number) => {
    return apiCall(`/users/${id}/`, {
      method: "DELETE",
    });
  },

  getProfile: async () => {
    return apiCall("/users/profile/");
  },

  updateProfile: async (profileData: any) => {
    return apiCall("/users/update_profile/", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  },

  changePassword: async (passwordData: any) => {
    return apiCall("/users/change_password/", {
      method: "POST",
      body: JSON.stringify(passwordData),
    });
  },
};

// 반 관련 API
export const classAPI = {
  getClasses: async (subject?: string) => {
    const params = subject ? `?subject=${subject}` : "";
    return apiCall(`/classes/${params}`);
  },

  getClass: async (id: number) => {
    return apiCall(`/classes/${id}/`);
  },

  createClass: async (classData: any) => {
    return apiCall("/classes/", {
      method: "POST",
      body: JSON.stringify(classData),
    });
  },

  updateClass: async (id: number, classData: any) => {
    return apiCall(`/classes/${id}/`, {
      method: "PUT",
      body: JSON.stringify(classData),
    });
  },

  deleteClass: async (id: number) => {
    return apiCall(`/classes/${id}/`, {
      method: "DELETE",
    });
  },
};

// 학생 관련 API
export const studentAPI = {
  getStudents: async (classId?: number) => {
    const params = classId ? `?class_id=${classId}` : "";
    return apiCall(`/students/${params}`);
  },

  getStudent: async (id: number) => {
    return apiCall(`/students/${id}/`);
  },

  createStudent: async (studentData: any) => {
    return apiCall("/students/", {
      method: "POST",
      body: JSON.stringify(studentData),
    });
  },

  updateStudent: async (id: number, studentData: any) => {
    return apiCall(`/students/${id}/`, {
      method: "PUT",
      body: JSON.stringify(studentData),
    });
  },

  deleteStudent: async (id: number) => {
    return apiCall(`/students/${id}/`, {
      method: "DELETE",
    });
  },

  getAttendanceRecords: async (studentId: number) => {
    return apiCall(`/students/${studentId}/attendance_records/`);
  },

  getExamRecords: async (studentId: number) => {
    return apiCall(`/students/${studentId}/exam_records/`);
  },
};

// 출석 관련 API
export const attendanceAPI = {
  getAttendances: async (
    studentId?: number,
    classId?: number,
    date?: string
  ) => {
    const params = new URLSearchParams();
    if (studentId) params.append("student_id", studentId.toString());
    if (classId) params.append("class_id", classId.toString());
    if (date) params.append("date", date);

    const queryString = params.toString();
    const endpoint = queryString
      ? `/attendances/?${queryString}`
      : "/attendances/";
    return apiCall(endpoint);
  },

  getAttendance: async (id: number) => {
    return apiCall(`/attendances/${id}/`);
  },

  createAttendance: async (attendanceData: any) => {
    return apiCall("/attendances/", {
      method: "POST",
      body: JSON.stringify(attendanceData),
    });
  },

  updateAttendance: async (id: number, attendanceData: any) => {
    return apiCall(`/attendances/${id}/`, {
      method: "PUT",
      body: JSON.stringify(attendanceData),
    });
  },

  deleteAttendance: async (id: number) => {
    return apiCall(`/attendances/${id}/`, {
      method: "DELETE",
    });
  },
};

// 시험 관련 API
export const examAPI = {
  getExams: async (studentId?: number, classId?: number) => {
    const params = new URLSearchParams();
    if (studentId) params.append("student_id", studentId.toString());
    if (classId) params.append("class_id", classId.toString());

    const queryString = params.toString();
    const endpoint = queryString ? `/exams/?${queryString}` : "/exams/";
    return apiCall(endpoint);
  },

  getExam: async (id: number) => {
    return apiCall(`/exams/${id}/`);
  },

  getExamAverages: async (studentId?: number, classId?: number) => {
    const params = new URLSearchParams();
    if (studentId) params.append("student_id", studentId.toString());
    if (classId) params.append("class_id", classId.toString());

    const queryString = params.toString();
    const endpoint = queryString
      ? `/exams/exam_averages/?${queryString}`
      : "/exams/exam_averages/";
    return apiCall(endpoint);
  },

  createExam: async (examData: any) => {
    return apiCall("/exams/", {
      method: "POST",
      body: JSON.stringify(examData),
    });
  },

  updateExam: async (id: number, examData: any) => {
    return apiCall(`/exams/${id}/`, {
      method: "PUT",
      body: JSON.stringify(examData),
    });
  },

  deleteExam: async (id: number) => {
    return apiCall(`/exams/${id}/`, {
      method: "DELETE",
    });
  },
};

// 대시보드 관련 API
export const dashboardAPI = {
  getDashboardStats: async (classId?: number, month?: Date) => {
    const params = new URLSearchParams();
    if (classId) params.append("class_id", classId.toString());
    if (month) {
      const year = month.getFullYear();
      const monthNum = month.getMonth() + 1; // getMonth()는 0부터 시작하므로 +1
      params.append("month", `${year}-${monthNum.toString().padStart(2, "0")}`);
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/dashboard/?${queryString}` : "/dashboard/";
    return apiCall(endpoint);
  },
};

// 알림톡 전송 관련 API
export const notificationAPI = {
  // 개별 알림톡 전송
  sendSingleNotification: async (studentId: number, attendanceId: number) => {
    return apiCall("/notifications/", {
      method: "POST",
      body: JSON.stringify({
        type: "single",
        student_id: studentId,
        attendance_id: attendanceId,
      }),
    });
  },

  // 일괄 알림톡 미리보기
  getBulkNotificationPreview: async (studentIds: number[], targetDate: string) => {
    return apiCall("/notifications/", {
      method: "POST",
      body: JSON.stringify({
        type: "bulk",
        student_ids: studentIds,
        target_date: targetDate,
        preview: true,
      }),
    });
  },

  // 일괄 알림톡 전송
  sendBulkNotification: async (studentIds: number[], targetDate: string) => {
    return apiCall("/notifications/", {
      method: "POST",
      body: JSON.stringify({
        type: "bulk",
        student_ids: studentIds,
        target_date: targetDate,
        preview: false,
      }),
    });
  },
};
