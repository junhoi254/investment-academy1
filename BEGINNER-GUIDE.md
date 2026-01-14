# 👶 투자학당 - 완전 초보자 가이드

## 📌 이 가이드는 누구를 위한 것인가요?
- ✅ 컴퓨터는 사용할 수 있지만 프로그래밍은 처음
- ✅ 파일 다운로드, 압축 해제는 할 줄 암
- ✅ 클릭, 복사, 붙여넣기는 할 줄 암
- ✅ "터미널"이 뭔지 모름 (괜찮아요!)

---

## 🎯 목표: 내 컴퓨터에서 투자학당 실행하기

### 필요한 시간: 약 30분
### 필요한 것: 
- Windows 또는 Mac 컴퓨터
- 인터넷 연결

---

## 📥 STEP 1: 프로그램 다운로드 (10분)

### 1-1. Python 설치 (백엔드용)

**Windows 사용자:**
1. 구글에서 "python download" 검색
2. https://www.python.org/downloads/ 클릭
3. 노란색 "Download Python 3.12.x" 버튼 클릭
4. 다운로드된 파일 더블클릭
5. ⚠️ **중요!** "Add Python to PATH" 체크박스 체크!
6. "Install Now" 클릭
7. 설치 완료까지 대기 (3-5분)

**Mac 사용자:**
1. 터미널 열기 (Cmd + Space → "terminal" 입력)
2. 아래 명령어 복사해서 붙여넣고 Enter
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
3. 비밀번호 입력 (화면에 안 보여도 정상)
4. 완료되면 다음 명령어 입력:
```bash
brew install python3
```

**설치 확인:**
- Windows: 시작 → "cmd" 검색 → 명령 프롬프트 열기
- Mac: 터미널 열기
- 다음 입력:
```bash
python --version
```
→ "Python 3.12.x" 나오면 성공! ✅

---

### 1-2. Node.js 설치 (프론트엔드용)

**Windows/Mac 공통:**
1. https://nodejs.org 접속
2. 왼쪽 큰 버튼 "LTS" 클릭 (20.x.x 버전)
3. 다운로드된 파일 더블클릭
4. "Next" 계속 클릭 (기본 설정 그대로)
5. 설치 완료까지 대기 (3-5분)

**설치 확인:**
```bash
node --version
npm --version
```
→ 버전 번호 나오면 성공! ✅

---

### 1-3. 투자학당 프로젝트 다운로드

1. 위에서 제공된 **"investment-academy.tar.gz"** 파일 다운로드
2. 바탕화면에 저장

---

## 📂 STEP 2: 압축 해제 (2분)

**Windows:**
1. 바탕화면의 "investment-academy.tar.gz" 우클릭
2. "압축 풀기" 또는 "Extract" 선택
3. 압축 프로그램 없으면:
   - 7-Zip 설치: https://www.7-zip.org
   - 다운로드 → 설치 → 다시 우클릭 → "7-Zip" → "여기에 압축 풀기"

**Mac:**
1. "investment-academy.tar.gz" 더블클릭
2. 자동으로 압축 해제됨

**결과:**
→ 바탕화면에 "investment-academy" 폴더 생성됨 ✅

---

## 💻 STEP 3: 터미널/명령 프롬프트 열기 (1분)

**Windows:**
1. 바탕화면의 "investment-academy" 폴더 열기
2. 주소창에 "cmd" 입력하고 Enter
3. 검은 창 뜸 → 이게 명령 프롬프트!

**Mac:**
1. Finder에서 "investment-academy" 폴더 우클릭
2. "Services" → "New Terminal at Folder" 선택
3. 흰색 또는 검은색 창 뜸 → 이게 터미널!

---

## 🚀 STEP 4: 백엔드 실행 (5분)

### 4-1. 백엔드 폴더로 이동

**터미널/명령 프롬프트에 입력:**
```bash
cd backend
```

### 4-2. 파이썬 가상환경 만들기

**입력:**
```bash
python -m venv venv
```
→ 2-3분 대기 (파일 만드는 중)

### 4-3. 가상환경 활성화

**Windows:**
```bash
venv\Scripts\activate
```

**Mac:**
```bash
source venv/bin/activate
```

**확인:**
→ 앞에 (venv) 표시되면 성공! ✅

### 4-4. 필요한 패키지 설치

**입력:**
```bash
pip install -r requirements.txt
```
→ 5분 정도 대기 (자동으로 다운로드 중)
→ 중간에 경고 메시지 나와도 무시해도 됨

### 4-5. 서버 실행

**입력:**
```bash
python main.py
```

**성공 메시지:**
```
✅ 서버 시작 완료!
📌 관리자 계정: 010-0000-0000 / admin1234
INFO:     Uvicorn running on http://0.0.0.0:8000
```

⚠️ **이 창은 절대 닫지 마세요!**  
→ 서버가 돌아가는 중입니다

---

## 🌐 STEP 5: 프론트엔드 실행 (5분)

### 5-1. 새 터미널/명령 프롬프트 열기

**Windows:**
1. 다시 "investment-academy" 폴더 열기
2. 주소창에 "cmd" 입력

**Mac:**
1. Cmd + T (새 탭 열기)
2. 또는 새 터미널 창 열기

### 5-2. 프론트엔드 폴더로 이동

**입력:**
```bash
cd frontend
```

### 5-3. 패키지 설치

**입력:**
```bash
npm install
```
→ 3-5분 대기 (자동 다운로드)

### 5-4. 프론트엔드 실행

**입력:**
```bash
npm start
```

**성공 메시지:**
```
Compiled successfully!

You can now view investment-academy in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

→ 자동으로 브라우저 열림! 🎉

---

## 🎓 STEP 6: 투자학당 사용하기 (2분)

### 6-1. 로그인 화면

브라우저에 나타난 화면:
```
┌─────────────────────────────┐
│                             │
│    [일타훈장님 사진]        │
│                             │
│   투자학당 로그인           │
│                             │
│  전화번호: [          ]     │
│  비밀번호: [          ]     │
│                             │
│      [로그인 버튼]          │
└─────────────────────────────┘
```

### 6-2. 관리자로 로그인

**입력:**
- 전화번호: `010-0000-0000`
- 비밀번호: `admin1234`

**[로그인] 버튼 클릭**

### 6-3. 성공! ✅

→ 투자학당 메인 화면 표시됨!
→ 무료 채팅방, 유료 채팅방 보임
→ 관리자 페이지 버튼 보임

**축하합니다! 투자학당이 실행되었습니다!** 🎉

---

## 🛑 중지하는 방법

### 백엔드 중지:
1. 백엔드 실행 중인 터미널/명령 프롬프트 클릭
2. Ctrl + C (Windows/Mac 공통)

### 프론트엔드 중지:
1. 프론트엔드 실행 중인 터미널/명령 프롬프트 클릭
2. Ctrl + C

### 다시 실행하려면:
- STEP 4-5부터 다시 시작 (설치는 다시 안 해도 됨)

---

## 📱 다음 단계: 인터넷에 올리기

지금까지는 **내 컴퓨터에서만** 실행한 것입니다.  
다른 사람들도 접속하게 하려면 **서버 배포**가 필요합니다.

### 가장 쉬운 방법: Railway (무료)

**준비물:**
- GitHub 계정 (없으면 만들기)
- Railway 계정 (무료)

**다음 가이드로 이동:**
→ [초보자를 위한 Railway 배포 가이드](#railway-배포-초보자용)

---

## 🐛 문제 해결

### Q: "python을 찾을 수 없습니다"
→ Python 설치 시 "Add to PATH" 체크 안 했음
→ Python 재설치 (체크박스 확인!)

### Q: "npm을 찾을 수 없습니다"
→ Node.js 재설치
→ 컴퓨터 재부팅

### Q: 포트 8000이 이미 사용 중
→ 다른 프로그램이 8000 포트 사용 중
→ 컴퓨터 재부팅

### Q: 브라우저 자동으로 안 열림
→ 수동으로 브라우저 열고
→ 주소창에 `http://localhost:3000` 입력

### Q: 로그인 안 됨
→ 백엔드가 실행 중인지 확인
→ http://localhost:8000/docs 접속해서 확인

---

## 📞 더 도움이 필요하신가요?

### 스크린샷 찍어서 질문하세요!
1. 오류 메시지 화면 캡처
2. GitHub Issue 등록
3. 카카오톡으로 문의

### 원격 지원
- TeamViewer 설치
- AnyDesk 설치
→ 화면 공유로 직접 도와드릴 수 있습니다

---

## 🎯 체크리스트

완료한 항목에 체크하세요!

- [ ] Python 설치 완료
- [ ] Node.js 설치 완료
- [ ] 프로젝트 다운로드 완료
- [ ] 압축 해제 완료
- [ ] 백엔드 실행 성공
- [ ] 프론트엔드 실행 성공
- [ ] 브라우저에서 화면 확인
- [ ] 로그인 성공

**모두 체크되었나요? 축하합니다!** 🎊

---

다음: [Railway로 인터넷에 올리기 (초보자용)](#railway-배포-초보자용)
