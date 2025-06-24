const API_BASE_URL = "http://localhost:8000/api";

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
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
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
  getDashboardStats: async (classId?: number) => {
    const params = classId ? `?class_id=${classId}` : "";
    return apiCall(`/dashboard/${params}`);
  },
};
