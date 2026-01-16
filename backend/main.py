from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, UploadFile, File
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import jwt
import bcrypt
from pydantic import BaseModel
import json
import os
import uuid
from pathlib import Path

from database import get_db, engine, SessionLocal
import models
import schemas

# 업로드 폴더 생성
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# 데이터베이스 테이블 생성
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="투자학당 - Investment Academy")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 업로드된 파일 서빙
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# JWT 설정
SECRET_KEY = os.getenv("SECRET_KEY", "investment-academy-secret-key-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24시간

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/token", auto_error=False)

# WebSocket 연결 관리자
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict = {}
        self.user_connections: dict = {}

    async def connect(self, websocket: WebSocket, room_id: str, user_id: int):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)
        self.user_connections[user_id] = websocket

    def disconnect(self, websocket: WebSocket, room_id: str, user_id: int):
        if room_id in self.active_connections and websocket in self.active_connections[room_id]:
            self.active_connections[room_id].remove(websocket)
        if user_id in self.user_connections:
            del self.user_connections[user_id]

    async def send_message(self, message: dict, room_id: str):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass

manager = ConnectionManager()

# 유틸리티 함수
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def format_phone_number(phone: str) -> str:
    phone = phone.replace("-", "")
    if len(phone) == 11:
        return f"{phone[:3]}-{phone[3:7]}-{phone[7:]}"
    elif len(phone) == 10:
        return f"{phone[:3]}-{phone[3:6]}-{phone[6:]}"
    return phone

# 인증 함수
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    if not token:
        raise HTTPException(status_code=401, detail="인증이 필요합니다")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="토큰이 만료되었습니다")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="사용자를 찾을 수 없습니다")
    if not user.is_approved:
        raise HTTPException(status_code=403, detail="관리자 승인 대기 중입니다")
    if user.role == "member" and user.expiry_date and user.expiry_date < datetime.utcnow():
        raise HTTPException(status_code=403, detail="회원 기간이 만료되었습니다")
    
    return user

async def get_current_user_optional(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """선택적 인증 - 실패해도 None 반환"""
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            return None
        user = db.query(models.User).filter(models.User.id == user_id).first()
        return user if user and user.is_approved else None
    except:
        return None

async def get_admin_user(current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    return current_user

# ==================== 인증 API ====================

@app.post("/api/register", response_model=schemas.UserResponse)
async def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    phone = format_phone_number(user_data.phone)
    
    existing = db.query(models.User).filter(models.User.phone == phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="이미 등록된 전화번호입니다")
    
    new_user = models.User(
        phone=phone,
        password=get_password_hash(user_data.password),
        name=user_data.name,
        role="member",
        is_approved=False
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/api/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    phone = format_phone_number(form_data.username)
    user = db.query(models.User).filter(models.User.phone == phone).first()
    
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(status_code=401, detail="전화번호 또는 비밀번호가 올바르지 않습니다")
    
    if not user.is_approved:
        raise HTTPException(status_code=403, detail="관리자 승인 대기 중입니다")
    
    if user.role == "member" and user.expiry_date and user.expiry_date < datetime.utcnow():
        raise HTTPException(status_code=403, detail="회원 기간이 만료되었습니다")
    
    access_token = create_access_token(
        data={"sub": user.id, "role": user.role},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"id": user.id, "phone": user.phone, "name": user.name, "role": user.role}
    }

@app.get("/api/me", response_model=schemas.UserResponse)
async def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user

# ==================== 관리자 API ====================

@app.get("/api/admin/users", response_model=List[schemas.UserResponse])
async def get_all_users(admin: models.User = Depends(get_admin_user), db: Session = Depends(get_db)):
    return db.query(models.User).all()

@app.put("/api/admin/users/{user_id}/approve")
async def approve_user(user_id: int, admin: models.User = Depends(get_admin_user), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    user.is_approved = True
    db.commit()
    return {"message": "승인되었습니다"}

@app.put("/api/admin/users/{user_id}/password")
async def change_user_password(user_id: int, password_data: schemas.PasswordChange, admin: models.User = Depends(get_admin_user), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    user.password = get_password_hash(password_data.new_password)
    db.commit()
    return {"message": "비밀번호가 변경되었습니다"}

@app.put("/api/admin/users/{user_id}/expiry")
async def update_user_expiry(user_id: int, expiry_data: schemas.ExpiryUpdate, admin: models.User = Depends(get_admin_user), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    user.expiry_date = expiry_data.expiry_date
    db.commit()
    return {"message": "회원 기간이 설정되었습니다"}

@app.post("/api/admin/staff", response_model=schemas.UserResponse)
async def create_staff(staff_data: schemas.StaffCreate, admin: models.User = Depends(get_admin_user), db: Session = Depends(get_db)):
    phone = format_phone_number(staff_data.phone)
    existing = db.query(models.User).filter(models.User.phone == phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="이미 등록된 전화번호입니다")
    
    new_staff = models.User(
        phone=phone,
        password=get_password_hash(staff_data.password),
        name=staff_data.name,
        role="staff",
        is_approved=True
    )
    db.add(new_staff)
    db.commit()
    db.refresh(new_staff)
    return new_staff

@app.delete("/api/admin/users/{user_id}")
async def delete_user(user_id: int, admin: models.User = Depends(get_admin_user), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="관리자는 삭제할 수 없습니다")
    db.delete(user)
    db.commit()
    return {"message": "사용자가 삭제되었습니다"}

# ==================== 채팅방 API ====================

@app.get("/api/rooms/free", response_model=List[schemas.RoomResponse])
async def get_free_rooms(db: Session = Depends(get_db)):
    return db.query(models.Room).filter(models.Room.is_free == True).all()

@app.get("/api/rooms/paid", response_model=List[schemas.RoomResponse])
async def get_paid_rooms(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Room).filter(models.Room.is_free == False).all()

@app.post("/api/rooms", response_model=schemas.RoomResponse)
async def create_room(room_data: schemas.RoomCreate, admin: models.User = Depends(get_admin_user), db: Session = Depends(get_db)):
    new_room = models.Room(**room_data.dict())
    db.add(new_room)
    db.commit()
    db.refresh(new_room)
    return new_room

@app.get("/api/rooms/{room_id}/messages", response_model=List[schemas.MessageResponse])
async def get_room_messages(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """채팅방 메시지 조회"""
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="채팅방을 찾을 수 없습니다")
    
    # 유료방인 경우 로그인 필수
    if not room.is_free and not current_user:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다")
    
    messages = db.query(models.Message).filter(
        models.Message.room_id == room_id
    ).order_by(models.Message.created_at.desc()).limit(50).all()
    
    return messages[::-1]

# ==================== 메시지 삭제 API ====================

@app.delete("/api/messages/{message_id}")
async def delete_message(message_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["admin", "subadmin", "staff"]:
        raise HTTPException(status_code=403, detail="메시지 삭제 권한이 없습니다")
    
    message = db.query(models.Message).filter(models.Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="메시지를 찾을 수 없습니다")
    
    db.delete(message)
    db.commit()
    return {"message": "삭제되었습니다", "deleted_id": message_id}

# ==================== 파일 업로드 API ====================

@app.post("/api/upload/image")
async def upload_image(file: UploadFile = File(...), current_user: models.User = Depends(get_current_user)):
    allowed = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    ext = os.path.splitext(file.filename)[1].lower()
    
    if ext not in allowed:
        raise HTTPException(status_code=400, detail="지원하지 않는 이미지 형식입니다")
    
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="파일 크기는 5MB 이하여야 합니다")
    
    filename = f"{uuid.uuid4()}{ext}"
    filepath = UPLOAD_DIR / filename
    
    with open(filepath, "wb") as f:
        f.write(contents)
    
    return {"url": f"/uploads/{filename}", "filename": file.filename, "type": "image"}

@app.post("/api/upload/file")
async def upload_file(file: UploadFile = File(...), current_user: models.User = Depends(get_current_user)):
    allowed = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".zip"}
    ext = os.path.splitext(file.filename)[1].lower()
    
    if ext not in allowed:
        raise HTTPException(status_code=400, detail="지원하지 않는 파일 형식입니다")
    
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="파일 크기는 10MB 이하여야 합니다")
    
    filename = f"{uuid.uuid4()}{ext}"
    filepath = UPLOAD_DIR / filename
    
    with open(filepath, "wb") as f:
        f.write(contents)
    
    return {"url": f"/uploads/{filename}", "filename": file.filename, "type": "file"}

# ==================== WebSocket ====================

@app.websocket("/ws/chat/{room_id}")
async def websocket_chat(websocket: WebSocket, room_id: int, token: str):
    """채팅 WebSocket"""
    db = SessionLocal()
    user_id = None
    user = None
    
    try:
        # 토큰 검증
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user or not user.is_approved:
            await websocket.close(code=1008)
            return
        
        room = db.query(models.Room).filter(models.Room.id == room_id).first()
        if not room:
            await websocket.close(code=1008)
            return
        
        await manager.connect(websocket, str(room_id), user_id)
        
        # 입장 알림
        await manager.send_message({
            "type": "system",
            "message": f"{user.name}님이 입장하셨습니다.",
            "timestamp": datetime.utcnow().isoformat()
        }, str(room_id))
        
        while True:
            data = await websocket.receive_json()
            
            # 일반 회원은 메시지 전송 불가
            if user.role == "member":
                await websocket.send_json({
                    "type": "error",
                    "message": "관리자와 직원만 메시지를 보낼 수 있습니다."
                })
                continue
            
            # 메시지 저장
            message = models.Message(
                room_id=room_id,
                user_id=user_id,
                content=data.get("message"),
                message_type=data.get("type", "text")
            )
            db.add(message)
            db.commit()
            db.refresh(message)
            
            # 브로드캐스트
            await manager.send_message({
                "type": "message",
                "id": message.id,
                "user_id": user.id,
                "user_name": user.name,
                "user_role": user.role,
                "content": message.content,
                "message_type": message.message_type,
                "timestamp": message.created_at.isoformat()
            }, str(room_id))
            
    except WebSocketDisconnect:
        if user_id and user:
            manager.disconnect(websocket, str(room_id), user_id)
            await manager.send_message({
                "type": "system",
                "message": f"{user.name}님이 퇴장하셨습니다.",
                "timestamp": datetime.utcnow().isoformat()
            }, str(room_id))
    except jwt.PyJWTError as e:
        print(f"WebSocket JWT error: {e}")
        await websocket.close(code=1008)
    except Exception as e:
        print(f"WebSocket error: {e}")
        if user_id and user:
            manager.disconnect(websocket, str(room_id), user_id)
    finally:
        db.close()

# ==================== MT4 API ====================

@app.post("/api/mt4/position")
async def receive_mt4_position(position_data: schemas.MT4Position, api_key: str, db: Session = Depends(get_db)):
    if api_key != "your-mt4-api-key":
        raise HTTPException(status_code=403, detail="Invalid API key")
    
    room = db.query(models.Room).filter(models.Room.room_type == "futures").first()
    if not room:
        raise HTTPException(status_code=404, detail="해외선물 채팅방을 찾을 수 없습니다")
    
    content = f"""🔔 포지션 알림

상품: {position_data.symbol}
타입: {"매수" if position_data.type == "BUY" else "매도"}
수량: {position_data.lots}
진입가: {position_data.open_price}
손절가: {position_data.sl}
목표가: {position_data.tp}
시간: {position_data.open_time}"""
    
    message = models.Message(
        room_id=room.id,
        user_id=1,
        content=content,
        message_type="signal"
    )
    db.add(message)
    db.commit()
    
    await manager.send_message({
        "type": "signal",
        "content": content,
        "timestamp": datetime.utcnow().isoformat()
    }, str(room.id))
    
    return {"message": "포지션이 전송되었습니다"}

# ==================== URL 미리보기 API ====================

@app.get("/api/link-preview")
async def get_link_preview(url: str, db: Session = Depends(get_db)):
    """URL의 OG 메타데이터 가져오기 (캐시 사용)"""
    import aiohttp
    from bs4 import BeautifulSoup
    
    # 1. 캐시 확인
    cached = db.query(models.LinkPreviewCache).filter(models.LinkPreviewCache.url == url).first()
    if cached:
        return {
            "url": url,
            "title": cached.title or "",
            "description": cached.description or "",
            "image": cached.image or ""
        }
    
    # 2. 캐시 없으면 크롤링
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, timeout=5) as response:
                if response.status != 200:
                    return {"url": url, "title": "", "description": "", "image": ""}
                
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')
                
                # OG 태그 추출
                og_title = soup.find('meta', property='og:title')
                og_desc = soup.find('meta', property='og:description')
                og_image = soup.find('meta', property='og:image')
                
                # 일반 태그 fallback
                title = og_title['content'] if og_title else (soup.title.string if soup.title else "")
                description = og_desc['content'] if og_desc else ""
                image = og_image['content'] if og_image else ""
                
                # 3. 캐시에 저장
                new_cache = models.LinkPreviewCache(
                    url=url,
                    title=title[:255] if title else "",
                    description=description[:500] if description else "",
                    image=image[:500] if image else ""
                )
                db.add(new_cache)
                db.commit()
                
                return {
                    "url": url,
                    "title": title[:100] if title else "",
                    "description": description[:200] if description else "",
                    "image": image
                }
    except Exception as e:
        print(f"Link preview error: {e}")
        return {"url": url, "title": "", "description": "", "image": ""}

# ==================== 뉴스 API ====================

@app.get("/api/news/{category}")
async def get_news(category: str, current_user: models.User = Depends(get_current_user)):
    from news_crawler import crawl_news
    try:
        news_list = await crawl_news(category)
        return {"news": news_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== 서버 시작 ====================

@app.on_event("startup")
async def startup_event():
    db = SessionLocal()
    try:
        # 관리자 계정 생성
        admin = db.query(models.User).filter(models.User.phone == "010-0000-0000").first()
        if not admin:
            admin = models.User(
                phone="010-0000-0000",
                password=get_password_hash("admin1234"),
                name="일타훈장님",
                role="admin",
                is_approved=True
            )
            db.add(admin)
            db.commit()
        
        # 기본 채팅방 생성
        rooms = db.query(models.Room).all()
        if not rooms:
            default_rooms = [
                models.Room(name="투자학당!! 일타훈장님!!", room_type="notice", is_free=True, description="누구나 볼 수 있는 공지방"),
                models.Room(name="주식 리딩방", room_type="stock", is_free=False, description="주식 매매 시그널"),
                models.Room(name="해외선물 리딩방", room_type="futures", is_free=False, description="해외선물 매매 시그널"),
                models.Room(name="코인선물 리딩방", room_type="crypto", is_free=False, description="코인선물 매매 시그널"),
            ]
            db.add_all(default_rooms)
            db.commit()
        
        print("✅ 서버 시작 완료!")
        print("📌 관리자: 010-0000-0000 / admin1234")
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
