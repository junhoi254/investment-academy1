# 🎨 Render로 무료 배포 (Railway 대안)

## 🎯 왜 Render를 선택하나요?

- ✅ **완전 무료** (PostgreSQL 포함!)
- ✅ **Railway보다 쉬움** - 단계가 적음
- ✅ **더 많은 무료 시간** (750시간/월)
- ✅ **자동 SSL** (HTTPS)
- ✅ **GitHub 자동 배포**

### 소요 시간: 15분

---

## 📝 STEP 1: GitHub 준비 (5분)

### 이미 GitHub에 업로드했다면 → STEP 2로

### GitHub 처음이라면:

1. https://github.com 접속
2. **"Sign up"** 클릭
3. 이메일, 비밀번호 입력
4. 가입 완료

**GitHub Desktop 사용:**

1. https://desktop.github.com 다운로드
2. 설치 후 실행
3. GitHub 로그인
4. **"Add an Existing Repository"**
5. `investment-academy` 폴더 선택
6. **"Publish repository"**
7. 이름: `investment-academy`
8. **"Publish"** 클릭

→ GitHub 업로드 완료! ✅

---

## 🎨 STEP 2: Render 가입 (2분)

### 2-1. 회원가입

1. https://render.com 접속
2. 오른쪽 위 **"Get Started"** 클릭
3. **"Sign up with GitHub"** 클릭
4. GitHub 로그인
5. **"Authorize Render"** 클릭

→ Render 대시보드 열림! ✅

---

## 🗄️ STEP 3: 데이터베이스 만들기 (3분)

### 3-1. PostgreSQL 생성

1. 대시보드에서 **"New +"** 클릭
2. **"PostgreSQL"** 선택

3. 정보 입력:
   ```
   Name: investment-academy-db
   Database: tradingchat
   User: admin
   Region: Singapore (가장 가까움)
   ```

4. **Plan 선택:**
   → **"Free"** 선택 (⭐ 무료!)

5. **"Create Database"** 클릭

→ 데이터베이스 생성 시작! (1-2분)

### 3-2. 연결 정보 복사

**생성 완료 후:**

1. 데이터베이스 클릭
2. **"Internal Database URL"** 복사
3. 메모장에 붙여넣기 (나중에 사용)

예시:
```
postgresql://admin:XXX@dpg-YYY-a.singapore-postgres.render.com/tradingchat
```

---

## 🔧 STEP 4: Backend 배포 (5분)

### 4-1. 새 Web Service 생성

1. 대시보드 → **"New +"** → **"Web Service"**
2. **"Build and deploy from a Git repository"** 선택
3. **"Next"** 클릭

### 4-2. GitHub 저장소 연결

1. **"Connect" 버튼 클릭**
2. GitHub 목록에서 **"investment-academy"** 찾기
3. **"Connect"** 클릭

### 4-3. 설정 입력

**기본 정보:**
```
Name: investment-academy-backend
Region: Singapore
Branch: main
Root Directory: backend
```

**환경:**
```
Environment: Python 3
```

**빌드 명령:**
```
pip install -r requirements.txt
```

**시작 명령:**
```
uvicorn main:app --host 0.0.0.0 --port $PORT
```

**Plan:**
→ **"Free"** 선택

### 4-4. 환경 변수 추가

**아래로 스크롤 → "Environment Variables" 섹션:**

**"Add Environment Variable" 클릭하여 추가:**

```
SECRET_KEY = your-super-secret-key-12345
```

```
DATABASE_URL = (위에서 복사한 PostgreSQL URL)
```

```
MT4_API_KEY = your-mt4-api-key
```

```
PYTHON_VERSION = 3.11
```

### 4-5. 배포!

1. **"Create Web Service"** 클릭

2. 자동 배포 시작:
```
Building...
Installing dependencies...
Starting server...
```

→ 5-10분 소요 (커피 타임 ☕)

### 4-6. Backend URL 확인

**배포 완료 후:**

상단에 URL 표시:
```
https://investment-academy-backend.onrender.com
```

→ **복사해두세요!** (프론트엔드에서 사용)

---

## 🌐 STEP 5: Frontend 배포 (5분)

### 5-1. 새 Static Site 생성

1. 대시보드 → **"New +"** → **"Static Site"**
2. GitHub 저장소: **"investment-academy"** 선택
3. **"Connect"** 클릭

### 5-2. 설정 입력

```
Name: investment-academy
Branch: main
Root Directory: frontend
```

**빌드 명령:**
```
npm install && npm run build
```

**Publish Directory:**
```
build
```

### 5-3. 환경 변수 추가

**⚠️ 중요! Backend URL 사용**

**"Advanced" 클릭 → "Environment Variables":**

```
REACT_APP_API_URL = https://investment-academy-backend.onrender.com
```

```
REACT_APP_WS_URL = wss://investment-academy-backend.onrender.com
```

### 5-4. 배포!

1. **"Create Static Site"** 클릭

2. 빌드 시작:
```
Installing dependencies...
Building React app...
Deploying...
```

→ 5-10분 소요

### 5-5. Frontend URL 확인

**배포 완료 후:**

```
https://investment-academy.onrender.com
```

→ 이게 여러분의 투자학당 주소! 🎉

---

## 🎓 STEP 6: 접속 테스트 (2분)

### 6-1. 브라우저에서 열기

1. Frontend URL 복사
2. 새 브라우저 탭에서 열기

### 6-2. 로그인

```
전화번호: 010-0000-0000
비밀번호: admin1234
```

**로그인 클릭!**

→ 성공! 투자학당 실행 중! ✅

---

## 📱 URL 공유하기

### 카카오톡:

```
[투자학당 오픈 안내]

일타훈장님의 리딩방이 정식 오픈했습니다! 🎓

🔗 접속 주소:
https://investment-academy.onrender.com

📊 제공 서비스:
- 실시간 트레이딩 시그널
- 전문가 차트 분석
- 투자 전략 공유

💎 회원 가입 후 관리자 승인을 받으시면
프리미엄 리딩방을 이용하실 수 있습니다.

📞 문의: 010-XXXX-XXXX
```

---

## ⚡ 24시간 실행 유지

### 문제:
Render 무료 플랜은 **15분 미사용 시 슬립 모드**

### 해결책 1: UptimeRobot (무료, 추천!)

1. https://uptimerobot.com 가입
2. **"+ Add New Monitor"**
3. 설정:
   ```
   Monitor Type: HTTP(s)
   URL: https://investment-academy-backend.onrender.com
   Monitoring Interval: Every 5 minutes
   ```
4. **"Create Monitor"**

→ 5분마다 자동으로 서버 깨움! ✅

### 해결책 2: Render 유료 플랜

- 월 $7
- 24시간 항상 실행
- 더 빠른 성능

---

## 💰 무료 한도

### Render 무료 플랜:
```
✅ 750시간/월 실행 시간
✅ PostgreSQL 90일 무료
✅ 100GB 대역폭
✅ 자동 SSL/HTTPS
⚠️ 15분 미사용 시 슬립
✅ 동시 접속 50-100명
```

### 90일 후 데이터베이스:
- 유료 전환 ($7/월)
- 또는 SQLite로 변경

---

## 🔄 코드 업데이트 방법

### GitHub Desktop 사용:

1. 로컬에서 코드 수정
2. GitHub Desktop 열기
3. 변경사항 확인
4. Commit 메시지 입력
5. **"Commit to main"** 클릭
6. **"Push origin"** 클릭

→ Render가 자동으로 재배포! ✅

### 명령어 사용:

```bash
cd investment-academy
git add .
git commit -m "업데이트 내용"
git push
```

→ 자동 재배포!

---

## 🔧 문제 해결

### Q: 배포가 실패했어요

**Render 대시보드:**
1. Web Service 클릭
2. **"Logs"** 탭 확인
3. 빨간색 오류 메시지 확인

**자주 발생하는 오류:**
```
ModuleNotFoundError: No module named 'XXX'
→ requirements.txt에 패키지 추가

Database connection failed
→ DATABASE_URL 확인
```

### Q: 웹사이트가 너무 느려요

**원인:**
- 슬립 모드에서 깨어나는 중 (15-30초)
- UptimeRobot 설정으로 해결

### Q: 로그인이 안 돼요

1. Backend 상태 확인
2. Backend URL/docs 접속
3. API 작동 확인

### Q: PostgreSQL 90일 후에는?

**옵션 1:** 유료 전환 ($7/월)
**옵션 2:** SQLite로 변경
```python
# database.py 수정
DATABASE_URL = "sqlite:///./trading_chat.db"
```

---

## 📊 Render vs 다른 서비스

| 특징 | Render | Railway | Replit |
|------|--------|---------|--------|
| **가입** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **배포** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **무료 시간** | 750시간 | 500시간 | 제한적 |
| **데이터베이스** | ✅ PostgreSQL | ❌ | ❌ |
| **24시간 실행** | ⚠️ 조건부 | ✅ | ❌ |
| **성능** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **추천** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |

---

## 🎯 완료 체크리스트

- [ ] GitHub 계정 생성
- [ ] 코드 GitHub 업로드
- [ ] Render 가입
- [ ] PostgreSQL 생성
- [ ] Backend 배포 성공
- [ ] Frontend 배포 성공
- [ ] URL 확인
- [ ] 로그인 테스트 성공
- [ ] UptimeRobot 설정 (선택)

**모두 완료! 축하합니다!** 🎊

---

## 🚀 다음 단계

### 1. 커스텀 도메인 (선택)
- "investment-academy.com" 구매
- Render에서 도메인 연결

### 2. 이메일 알림 설정
- 회원 가입 시 이메일 발송
- 비밀번호 재설정 기능

### 3. 모바일 앱 제작
→ [모바일 앱 만들기 가이드](#)

---

**Render로 안정적인 투자학당 배포 완료!** 🎨✨

이전: [Replit으로 배포](#) | 다음: [모바일 앱 만들기](#)
