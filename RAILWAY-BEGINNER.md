# 🚂 Railway로 인터넷에 올리기 (초보자용)

## 🎯 이게 뭔가요?
지금까지는 **내 컴퓨터에서만** 투자학당이 실행되었습니다.  
Railway를 사용하면 **인터넷 어디서나** 접속할 수 있게 됩니다!

### 장점:
- ✅ **완전 무료** (신용카드 필요 없음!)
- ✅ **24시간 작동** (컴퓨터 꺼도 됨)
- ✅ **자동 URL** 제공 (예: https://투자학당.railway.app)
- ✅ **클릭만으로 배포** (코딩 필요 없음)

### 소요 시간: 15분

---

## 📝 STEP 1: GitHub 계정 만들기 (5분)

### 1-1. GitHub 가입

1. https://github.com 접속
2. 오른쪽 위 **"Sign up"** 클릭

3. **정보 입력:**
   ```
   이메일: your-email@gmail.com
   비밀번호: (안전한 비밀번호)
   사용자 이름: (영문으로, 예: investment-teacher)
   ```

4. **이메일 인증:**
   - 이메일 받은편지함 확인
   - 인증 코드 입력

5. **계정 설정:**
   - "Just me" 선택
   - "Student" 또는 "Teacher" 선택
   - "Continue" 클릭

→ GitHub 계정 생성 완료! ✅

---

## 📤 STEP 2: GitHub에 코드 올리기 (5분)

### 2-1. GitHub Desktop 설치 (쉬운 방법)

**방법 A: GitHub Desktop 사용 (추천)**

1. https://desktop.github.com 접속
2. **"Download for Windows"** 또는 **"Download for macOS"** 클릭
3. 다운로드된 파일 실행
4. GitHub 계정으로 로그인

**설치 완료 후:**

5. **"Add an Existing Repository"** 클릭
6. **"Choose"** 버튼 클릭
7. 바탕화면의 **"investment-academy"** 폴더 선택
8. **"Add Repository"** 클릭

→ 왼쪽에 파일 목록 보임 ✅

### 2-2. 저장소 생성

1. GitHub Desktop에서 **"Publish repository"** 클릭
2. 입력:
   ```
   Name: investment-academy
   Description: 투자학당 - 일타훈장님 리딩방
   □ Keep this code private (체크 해제 - 공개)
   ```
3. **"Publish Repository"** 클릭

→ 업로드 시작! (2-3분 소요)

**완료 메시지:**
```
✅ Published investment-academy to GitHub
```

---

**방법 B: 명령어 사용 (Git에 익숙한 경우)**

```bash
cd ~/Desktop/investment-academy

git init
git add .
git commit -m "투자학당 초기 업로드"

git remote add origin https://github.com/your-username/investment-academy.git
git branch -M main
git push -u origin main
```

---

## 🚂 STEP 3: Railway 배포 (5분)

### 3-1. Railway 가입

1. https://railway.app 접속
2. **"Login"** 클릭 (오른쪽 위)
3. **"Login with GitHub"** 클릭
4. GitHub 로그인 화면 → 비밀번호 입력
5. **"Authorize Railway"** 클릭

→ Railway 대시보드 열림! ✅

### 3-2. 새 프로젝트 생성

1. **"New Project"** 클릭 (보라색 버튼)
2. **"Deploy from GitHub repo"** 선택
3. **"Configure GitHub App"** 클릭
4. 저장소 목록에서 **"investment-academy"** 선택
5. **"Deploy Now"** 클릭

→ 배포 시작! (5-10분 소요)

### 3-3. Backend 서비스 설정

**화면에 "Service" 카드 2개 나타남:**
- backend (Python)
- frontend (Node.js)

**Backend 카드 클릭:**

1. **"Settings"** 탭 클릭
2. **"Root Directory"** 찾기
3. 입력: `backend`
4. **"Start Command"** 찾기
5. 입력: `uvicorn main:app --host 0.0.0.0 --port $PORT`

6. **"Variables"** 탭 클릭
7. **"New Variable"** 클릭
8. 다음 변수들 추가:

```
SECRET_KEY = your-super-secret-key-12345
DATABASE_URL = sqlite:///./trading_chat.db
MT4_API_KEY = your-mt4-api-key
PORT = 8000
```

9. **"Deploy"** 버튼 클릭

### 3-4. Frontend 서비스 설정

**Frontend 카드 클릭:**

1. **"Settings"** 탭
2. **"Root Directory"**: `frontend`
3. **"Build Command"**: `npm install && npm run build`
4. **"Start Command"**: `npx serve -s build -l $PORT`

5. **"Variables"** 탭
6. 변수 추가:

**⚠️ 중요! Backend URL 먼저 복사하기:**
- Backend 카드로 돌아가기
- **"Settings"** → **"Domains"** 탭
- 표시된 URL 복사 (예: https://backend-production-xxxx.railway.app)

**Frontend 변수 추가:**
```
REACT_APP_API_URL = https://backend-production-xxxx.railway.app
REACT_APP_WS_URL = wss://backend-production-xxxx.railway.app
```

7. **"Deploy"** 클릭

### 3-5. 도메인 확인

**Frontend 카드 클릭:**
1. **"Settings"** → **"Domains"**
2. **"Generate Domain"** 클릭
3. 생성된 URL 복사

**예시:**
```
https://investment-academy-production.railway.app
```

→ 이게 여러분의 투자학당 주소입니다! 🎉

---

## 🎊 STEP 4: 확인하기 (1분)

### 4-1. 브라우저에서 접속

1. 새 브라우저 탭 열기
2. Frontend URL 붙여넣기
3. Enter

### 4-2. 로그인 테스트

**일타훈장님 로고 보이는 로그인 화면:**
```
전화번호: 010-0000-0000
비밀번호: admin1234
```

로그인 클릭!

### 4-3. 성공! ✅

→ 투자학당 메인 화면 표시
→ 이제 **인터넷 어디서나** 접속 가능!

---

## 📱 STEP 5: URL 공유하기

### 5-1. URL 복사

Railway Frontend 도메인:
```
https://investment-academy-production.railway.app
```

### 5-2. 공유 방법

**카카오톡:**
1. 카톡 열기
2. 단체방 또는 개인 메시지
3. URL 붙여넣기
4. "투자학당 회원가입하세요!" 메시지 추가

**문자 메시지:**
```
[투자학당 안내]
일타훈장님의 리딩방에 초대합니다.

접속 주소:
https://investment-academy-production.railway.app

관리자 승인 후 이용 가능합니다.
```

**QR 코드 만들기:**
1. https://qr-code-generator.com 접속
2. URL 입력
3. QR 코드 생성
4. 이미지 다운로드
5. 카톡, 블로그 등에 공유

---

## ⚙️ STEP 6: 관리자 설정 (5분)

### 6-1. 서브관리자 생성

1. 투자학당 접속
2. 관리자(010-0000-0000)로 로그인
3. **"관리자 페이지"** 클릭
4. **"서브관리자 관리"** 탭
5. **서브관리자 정보 입력:**
   ```
   이름: 김부관리
   전화번호: 010-1234-5678
   비밀번호: staff1234
   ```
6. **"서브관리자 생성"** 클릭

→ 서브관리자 계정 생성 완료! ✅

### 6-2. 회원 가입 승인

**누군가 회원가입하면:**
1. 관리자 페이지 → **"회원 관리"** 탭
2. 승인 대기 중인 회원 확인
3. **"승인"** 버튼 클릭

→ 해당 회원이 로그인 가능해짐!

### 6-3. 회원 기간 설정

1. 승인된 회원 찾기
2. **"기간설정"** 버튼 클릭
3. 일수 입력 (예: 30 → 30일 사용)
4. 확인

→ 회원이 30일 동안 이용 가능!

---

## 📊 STEP 7: 첫 리딩 시작하기 (5분)

### 7-1. 채팅방 입장

1. 메인 화면
2. **"해외선물 리딩방"** 클릭
3. 채팅 화면 열림

### 7-2. 메시지 보내기

**일타훈장님만 가능:**
```
안녕하세요! 일타훈장입니다.
오늘부터 투자학당 리딩을 시작합니다! 📈
```

입력 후 **"전송"** 클릭

### 7-3. 이미지 공유

1. **🖼️** 버튼 클릭
2. 차트 이미지 선택
3. 자동 업로드 및 공유!

### 7-4. 파일 공유

1. **📎** 버튼 클릭
2. PDF, Excel 파일 선택
3. 자동 업로드 및 공유!

### 7-5. 이모티콘 사용

1. **😊** 버튼 클릭
2. 원하는 이모티콘 선택
3. 메시지에 추가!

---

## 💰 무료 사용 한도

### Railway 무료 티어:
```
✅ 월 $5 크레딧 (무료)
✅ 약 500시간 실행 가능
✅ 100GB 대역폭
✅ 동시 접속 50명 가능
```

### 한도 초과 시:
- 이메일로 알림 받음
- 유료 플랜 선택 가능 ($5/월~)
- 또는 다른 무료 서비스로 이동

---

## 🔧 문제 해결

### Q: 배포가 실패했어요
1. Railway 대시보드
2. Backend/Frontend 카드 클릭
3. **"Deployments"** 탭
4. 빨간색 X 표시 클릭
5. 오류 로그 확인

**자주 발생하는 오류:**
- "Module not found" → requirements.txt 확인
- "Port already in use" → PORT 변수 확인

### Q: 로그인이 안 돼요
- Backend가 정상 실행 중인지 확인
- Backend URL/api/docs 접속해서 API 확인

### Q: 채팅이 안 돼요
- WebSocket 연결 확인
- Backend URL이 WSS로 시작하는지 확인

### Q: 파일 업로드가 안 돼요
- Railway는 파일 저장소 제공 안 함
- AWS S3 또는 Cloudinary 연동 필요 (추후 가이드)

---

## 🎯 완료 체크리스트

- [ ] GitHub 계정 생성
- [ ] GitHub에 코드 업로드
- [ ] Railway 계정 생성
- [ ] Backend 배포 성공
- [ ] Frontend 배포 성공
- [ ] 도메인 URL 받음
- [ ] 브라우저에서 접속 성공
- [ ] 로그인 성공
- [ ] 서브관리자 생성
- [ ] 첫 메시지 전송

**모두 완료하셨나요? 축하합니다!** 🎊

---

## 🚀 다음 단계

### 1. 커스텀 도메인 연결 (선택)
- "investment-academy.com" 같은 도메인 구매
- Railway에서 도메인 연결

### 2. 모바일 앱 만들기
→ [모바일 앱 초보자 가이드](#앱-만들기-초보자용)

### 3. 기능 추가
- 푸시 알림
- 결제 시스템
- 회원 등급제

---

## 📞 도움이 필요하신가요?

### 스크린샷 공유
1. Railway 화면 캡처
2. 오류 메시지 캡처
3. Issue로 문의

### 동영상 튜토리얼
- YouTube에서 "Railway 배포" 검색
- 비슷한 프로젝트 배포 영상 참고

---

**투자학당이 이제 인터넷에서 24시간 돌아갑니다!** 🎓

다음: [모바일 앱 만들기 (초보자용)](#)
