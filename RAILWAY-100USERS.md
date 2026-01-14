# 🚂 Railway 배포 - 100명 사용자용 (완전 초보 가이드)

## 🎯 왜 Railway가 100명에게 최적인가요?

- ✅ **24시간 항상 실행** (슬립 모드 없음!)
- ✅ **빠른 속도** (응답 시간 빠름)
- ✅ **안정적** (갑자기 꺼지지 않음)
- ✅ **100명 동시 접속 가능**
- ✅ **월 500시간 무료** (20일 24시간 운영)

### 소요 시간: 20분

---

## 📝 STEP 1: GitHub Desktop 설치 (5분)

### 왜 필요한가요?
Railway는 GitHub에서 코드를 가져옵니다.  
GitHub Desktop을 쓰면 **클릭만으로** 업로드 가능!

### 1-1. 다운로드

1. 구글에서 "github desktop" 검색
2. 또는 https://desktop.github.com 접속
3. 큰 보라색 버튼 **"Download for Windows"** 클릭
   - Mac 사용자: "Download for macOS"

4. 다운로드 완료 대기 (약 100MB)

### 1-2. 설치

**Windows:**
1. 다운로드된 파일 더블클릭
2. 자동으로 설치 시작
3. 1-2분 대기
4. 자동으로 GitHub Desktop 실행됨

**Mac:**
1. 다운로드된 .zip 파일 더블클릭
2. GitHub Desktop.app을 Applications 폴더로 드래그
3. Applications에서 GitHub Desktop 실행

### 1-3. GitHub 계정 만들기

**GitHub Desktop 첫 화면:**

1. **"Sign in to GitHub.com"** 클릭

2. **GitHub 계정이 없다면:**
   - 웹 브라우저 자동으로 열림
   - **"Create an account"** 클릭
   - 정보 입력:
   ```
   Email: your-email@gmail.com
   Password: (안전한 비밀번호)
   Username: investment-teacher (영문으로)
   ```
   - **"Create account"** 클릭
   - 이메일 인증 (받은편지함 확인)

3. **로그인:**
   - GitHub Desktop으로 돌아가기
   - 자동으로 로그인됨
   - **"Authorize desktop"** 클릭
   - **"Finish"** 클릭

→ GitHub Desktop 설치 완료! ✅

---

## 📤 STEP 2: GitHub에 코드 올리기 (5분)

### 2-1. 저장소 추가

**GitHub Desktop 화면:**

1. 왼쪽 위 **"Current Repository"** 클릭
2. **"Add"** 드롭다운 클릭
3. **"Add Existing Repository"** 선택

### 2-2. 폴더 선택

1. **"Choose..."** 버튼 클릭
2. 바탕화면의 **"investment-academy"** 폴더 선택
3. **"폴더 선택"** 또는 **"Select Folder"** 클릭

**화면에 메시지:**
```
This directory does not appear to be a Git repository.
Would you like to create a repository here instead?
```

4. **"create a repository"** 링크 클릭

### 2-3. 저장소 생성

**"Create a Repository" 화면:**

1. 정보 확인:
   ```
   Name: investment-academy
   Local Path: (바탕화면 경로)
   Initialize this repository with a README: (체크 해제)
   Git Ignore: None
   License: None
   ```

2. **"Create Repository"** 클릭

→ Git 저장소 생성됨! ✅

### 2-4. GitHub.com에 업로드

**GitHub Desktop:**

1. 중앙에 변경된 파일 목록 보임
2. 왼쪽 하단 입력란:
   ```
   Summary: 투자학당 초기 업로드
   Description: (비워두기)
   ```

3. **"Commit to main"** 버튼 클릭

4. 상단 **"Publish repository"** 버튼 클릭

5. 팝업 창:
   ```
   Name: investment-academy
   Description: 투자학당 - 일타훈장님 리딩방
   □ Keep this code private (체크 해제 - 공개)
   ```

6. **"Publish Repository"** 클릭

**업로드 시작!**
```
Uploading to GitHub...
```
→ 2-5분 소요 (파일 크기에 따라)

**완료 메시지:**
```
✅ Successfully published repository
```

→ GitHub 업로드 완료! ✅

---

## 🚂 STEP 3: Railway 가입 (2분)

### 3-1. Railway 접속

1. https://railway.app 접속
2. 오른쪽 위 **"Login"** 클릭

### 3-2. GitHub로 로그인

1. **"Login with GitHub"** 클릭 (큰 검은 버튼)
2. GitHub 로그인 화면 나타남
3. 비밀번호 입력
4. **"Sign in"** 클릭
5. **"Authorize Railway"** 클릭 (Railway 권한 승인)

→ Railway 대시보드 열림! ✅

**화면:**
```
Welcome to Railway! 🎉
Let's create your first project.
```

---

## 🎨 STEP 4: Backend 배포 (5분)

### 4-1. 새 프로젝트 생성

**Railway 대시보드:**

1. 가운데 큰 **"New Project"** 버튼 클릭
2. **"Deploy from GitHub repo"** 선택
3. **"Configure GitHub App"** 클릭

### 4-2. GitHub 저장소 연결

**GitHub 권한 화면:**

1. **"Only select repositories"** 선택
2. 드롭다운에서 **"investment-academy"** 체크
3. **"Install & Authorize"** 클릭

**Railway로 돌아옴:**

4. 저장소 목록에서 **"investment-academy"** 클릭
5. **"Deploy Now"** 클릭

**자동 배포 시작!**
```
Analyzing repository...
Creating services...
```

### 4-3. Backend 서비스 설정

**화면에 2개 카드 나타남:**
- `backend` (Python 감지됨)
- `frontend` (Node.js 감지됨)

**Backend 카드 클릭:**

1. **"Settings"** 탭 클릭 (오른쪽 상단)

2. **"Root Directory"** 찾기
   - 입력: `backend`

3. **"Start Command"** 찾기
   - 입력: `uvicorn main:app --host 0.0.0.0 --port $PORT`

4. **스크롤 다운 → "Variables"** 섹션

5. **"New Variable"** 클릭
   - Key: `SECRET_KEY`
   - Value: `your-super-secret-key-change-this-12345`
   - **"Add"** 클릭

6. **"New Variable"** 다시 클릭
   - Key: `DATABASE_URL`
   - Value: `sqlite:///./trading_chat.db`
   - **"Add"** 클릭

7. **"New Variable"** 다시 클릭
   - Key: `MT4_API_KEY`
   - Value: `your-mt4-api-key`
   - **"Add"** 클릭

8. **"New Variable"** 다시 클릭
   - Key: `PORT`
   - Value: `8000`
   - **"Add"** 클릭

9. 왼쪽 상단 **"Deploy"** 버튼 클릭

**배포 시작!**
```
Building...
Installing Python dependencies...
Starting server...
```
→ 5-10분 소요 (처음에만 오래 걸림) ☕

### 4-4. Backend URL 확인

**배포 완료 후:**

1. **"Settings"** 탭 다시 클릭
2. **"Networking"** 섹션 찾기
3. **"Generate Domain"** 버튼 클릭

**자동으로 URL 생성:**
```
https://backend-production-xxxx.up.railway.app
```

4. **이 URL 복사해두세요!** (메모장에 붙여넣기)

→ Backend 배포 완료! ✅

---

## 🌐 STEP 5: Frontend 배포 (5분)

### 5-1. Frontend 서비스 설정

**Railway 대시보드로 돌아가기:**

1. 왼쪽 위 프로젝트 이름 클릭
2. **Frontend 카드** 클릭

### 5-2. Frontend 설정

**Settings 탭:**

1. **"Root Directory"**
   - 입력: `frontend`

2. **"Build Command"**
   - 입력: `npm install && npm run build`

3. **"Start Command"**
   - 입력: `npx serve -s build -l $PORT`

4. **"Install Command"** (있다면)
   - 입력: `npm install`

### 5-3. 환경 변수 추가

**⚠️ 중요! Backend URL 사용**

**Variables 섹션:**

1. **"New Variable"** 클릭
   - Key: `REACT_APP_API_URL`
   - Value: `https://backend-production-xxxx.up.railway.app`
   - (위에서 복사한 Backend URL)
   - **"Add"** 클릭

2. **"New Variable"** 다시 클릭
   - Key: `REACT_APP_WS_URL`
   - Value: `wss://backend-production-xxxx.up.railway.app`
   - (Backend URL의 https를 wss로 변경)
   - **"Add"** 클릭

3. **"Deploy"** 버튼 클릭

**빌드 시작!**
```
Installing dependencies...
Building React app...
Starting server...
```
→ 5-10분 소요 ☕

### 5-4. Frontend URL 생성

**배포 완료 후:**

1. **"Settings"** → **"Networking"**
2. **"Generate Domain"** 클릭

**Frontend URL:**
```
https://frontend-production-xxxx.up.railway.app
```

→ Frontend 배포 완료! ✅

---

## 🎓 STEP 6: 투자학당 접속 (1분)

### 6-1. 브라우저에서 열기

1. Frontend URL 복사
2. 새 브라우저 탭 열기
3. 주소창에 붙여넣기
4. Enter

### 6-2. 로그인 화면

**일타훈장님 로고 보이는 화면:**
```
┌─────────────────────────────┐
│                             │
│    [일타훈장님 사진]        │
│                             │
│   투자학당 로그인           │
│                             │
│  전화번호: 010-0000-0000    │
│  비밀번호: admin1234        │
│                             │
│      [로그인]               │
└─────────────────────────────┘
```

### 6-3. 로그인!

1. 전화번호 입력: `010-0000-0000`
2. 비밀번호 입력: `admin1234`
3. **로그인** 버튼 클릭

**성공!** 🎉
→ 투자학당 메인 화면 표시
→ 채팅방 목록 보임
→ 관리자 페이지 버튼 보임

---

## 📱 STEP 7: URL 회원들에게 공유 (2분)

### 7-1. URL 짧게 만들기 (선택)

**원래 URL:**
```
https://frontend-production-xxxx.up.railway.app
```

**짧게 만들기:**
1. https://bitly.com 접속
2. 무료 가입
3. URL 입력
4. **"Create"** 클릭
5. 짧은 URL 받기:
   ```
   https://bit.ly/investment-academy
   ```

### 7-2. 카카오톡으로 공유

```
[투자학당 정식 오픈 안내] 🎓

일타훈장님의 리딩방이 정식 오픈했습니다!

🔗 접속 주소:
https://bit.ly/investment-academy

📊 제공 서비스:
✅ 실시간 트레이딩 시그널
✅ 전문가 차트 분석
✅ 주식/해외선물/코인 리딩
✅ MT4 자동 시그널
✅ 파일/이미지 공유
✅ 투자 전략 문서

💎 회원 혜택:
- 일타훈장님 직접 리딩
- 서브관리자 실시간 분석
- 24시간 시그널 알림
- 수익 인증 공유

📱 가입 방법:
1. 위 링크 접속
2. 회원가입 (무료)
3. 관리자 승인 대기
4. 리딩방 입장!

📞 문의: 010-XXXX-XXXX
👨‍🏫 운영: 일타훈장님
```

### 7-3. QR 코드 만들기

1. https://qr-code-generator.com 접속
2. URL 입력
3. **"Create QR Code"** 클릭
4. 다운로드
5. 카톡, SNS에 공유!

---

## 💰 무료 사용량 확인

### Railway 무료 플랜:

```
✅ 월 $5 크레딧 (무료)
✅ 약 500시간 실행
✅ 100GB 아웃바운드 대역폭
✅ 100GB 인바운드 대역폭
✅ 동시 접속 100명 가능
```

### 사용량 확인:

1. Railway 대시보드
2. 오른쪽 위 **프로필** 클릭
3. **"Account Settings"**
4. **"Usage"** 탭

**화면:**
```
Current Usage: $2.34 / $5.00
Time Remaining: 15 days
```

### 500시간은 얼마나 되나요?

```
24시간 × 20일 = 480시간
→ 한 달에 20일 24시간 운영 가능!

실제로는:
- Backend: 300시간
- Frontend: 200시간
→ 충분히 한 달 내내 실행 가능!
```

---

## ⚡ 24시간 운영 보장

### Railway는 슬립 모드 없음!

- ✅ 항상 실행됨
- ✅ 빠른 응답 (대기 시간 0초)
- ✅ 사용자가 언제 접속해도 OK

**다른 서비스 비교:**
```
Replit: 1시간 미사용 시 종료 ❌
Render: 15분 미사용 시 종료 ❌
Railway: 항상 실행 ✅
```

---

## 🔄 코드 업데이트 방법

### 기능 추가나 버그 수정 후:

**GitHub Desktop에서:**

1. 왼쪽에 변경된 파일 목록 보임
2. 왼쪽 하단:
   ```
   Summary: 기능 추가 (또는 버그 수정)
   ```
3. **"Commit to main"** 클릭
4. **"Push origin"** 클릭

**Railway에서:**
→ 자동으로 재배포 시작!
→ 5분 후 변경사항 반영!

---

## 🎯 회원 100명 운영 가이드

### 1일차: 서버 배포
```
✅ Railway 배포 완료
✅ URL 확인
✅ 로그인 테스트
```

### 2일차: 회원 모집
```
✅ 카톡 공지
✅ QR 코드 배포
✅ 첫 10명 가입
```

### 3-7일차: 초기 운영
```
✅ 회원 승인
✅ 서브관리자 임명
✅ 무료방 운영
✅ 첫 리딩 시작
```

### 2주차: 본격 운영
```
✅ 유료 회원 전환
✅ 기간 설정 (30일)
✅ 리딩 시그널 제공
✅ 파일/이미지 공유
```

### 1개월차: 안정화
```
✅ 100명 달성
✅ 서브관리자 추가
✅ MT4 자동 시그널
✅ 수익 인증 공유
```

---

## 📊 성능 모니터링

### Railway 대시보드:

1. 프로젝트 클릭
2. **"Metrics"** 탭

**확인 가능:**
```
- CPU 사용량
- 메모리 사용량
- 네트워크 트래픽
- 응답 시간
```

### 문제 발생 시:

**Logs 확인:**
1. Backend 또는 Frontend 카드 클릭
2. **"Deployments"** 탭
3. 최신 배포 클릭
4. **"View Logs"** 클릭

**오류 메시지 확인 가능!**

---

## 🔧 문제 해결

### Q: 배포가 실패했어요

**확인:**
1. Railway 대시보드
2. Backend 카드 클릭
3. **"Deployments"** → 빨간 X 클릭
4. 오류 로그 확인

**자주 발생하는 오류:**
```
"Module not found"
→ requirements.txt 확인

"Port already in use"
→ PORT 변수 확인 (8000)

"Build failed"
→ Start Command 확인
```

### Q: 로그인이 안 돼요

1. Backend 실행 중인지 확인
2. Backend URL/docs 접속
3. API 문서 보이는지 확인
4. Frontend 환경 변수 확인

### Q: 채팅이 안 돼요

1. WebSocket 연결 확인
2. Backend URL이 wss://로 시작하는지 확인
3. 방화벽 설정 확인

### Q: 사용량이 너무 많아요

**옵션 1:** 최적화
- 이미지 압축
- 불필요한 로그 제거

**옵션 2:** 유료 전환
- $20/월 프로 플랜
- 무제한 사용

---

## 💡 성능 최적화 팁

### 1. 이미지 최적화
```
- 업로드 전 압축
- 최대 5MB로 제한
- WebP 형식 사용
```

### 2. 데이터베이스 정리
```
- 오래된 메시지 삭제 (30일 이상)
- 로그 파일 정리
```

### 3. 캐싱 활용
```
- 자주 사용하는 데이터 캐싱
- CDN 사용 (추후)
```

---

## 🎊 완료 체크리스트

- [ ] GitHub Desktop 설치
- [ ] GitHub 계정 생성
- [ ] 코드 GitHub 업로드
- [ ] Railway 가입
- [ ] Backend 배포 성공
- [ ] Backend URL 확인
- [ ] Frontend 배포 성공
- [ ] Frontend URL 확인
- [ ] 브라우저 접속 성공
- [ ] 로그인 테스트 성공
- [ ] URL 회원들에게 공유
- [ ] 첫 회원 가입 확인

**모두 완료! 축하합니다!** 🎉

---

## 🚀 다음 단계

### 1주일 후:
- [ ] 회원 30명 달성
- [ ] 서브관리자 1명 임명
- [ ] 무료방/유료방 운영

### 1개월 후:
- [ ] 회원 100명 달성
- [ ] 안정적 운영 확인
- [ ] 모바일 앱 제작 고려

### 3개월 후:
- [ ] 유료 플랜 전환 고려
- [ ] 커스텀 도메인 연결
- [ ] 추가 기능 개발

---

**Railway로 100명 안정적 운영 시작!** 🚂✨

궁금한 점 있으면 언제든 물어보세요! 👨‍🏫
