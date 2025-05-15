# Comet Student Management System

학생 관리 시스템 프로젝트입니다.

## 기술 스택

- Frontend: React (TypeScript)
- Backend: Django
- Database: AWS RDS (MySQL)

## 설치 방법

### Backend 설정

1. Python 가상환경 생성 및 활성화

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
.\venv\Scripts\activate   # Windows
```

2. 필요한 패키지 설치

```bash
pip install -r requirements.txt
```

3. Django 서버 실행

```bash
cd backend
python manage.py runserver
```

### Frontend 설정

1. Node.js 설치 (https://nodejs.org/)

2. React 프로젝트 설정

```bash
cd frontend
npm install
npm start
```

## 환경 변수 설정

`.env` 파일을 생성하고 다음 변수들을 설정하세요:

```
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=your_db_host
DB_PORT=3306
```

## 개발 환경

- Python 3.13 이상
- Node.js 22.15 이상
- MySQL 8.0 이상
