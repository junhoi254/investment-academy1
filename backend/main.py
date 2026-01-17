from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, UploadFile, File, Header, Request, Query
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
        self.user_connections: dict = {}    # user_id: websocket
        self.online_users: dict = {}        # room_id: {user_id: user_info}

    async def connect(self, websocket: WebSocket, room_id: str, user_id: int, user_name: str = "", user_role: str = ""):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)
        self.user_connections[user_id] = websocket
        
        # 접속자 정보 저장
        if room_id not in self.online_users:
            self.online_users[room_id] = {}
        self.online_users[room_id][user_id] = {
            "user_id": user_id,
            "name": user_name,
            "role": user_role,
            "connected_at": datetime.utcnow().isoformat()
        }

    def disconnect(self, websocket: WebSocket, room_id: str, user_id: int):
        if room_id in self.active_connections and websocket in self.active_connections[room_id]:
            self.active_connections[room_id].remove(websocket)
        if user_id in self.user_connections:
            del self.user_connections[user_id]
        # 접속자 정보 제거
        if room_id in self.online_users and user_id in self.online_users[room_id]:
            del self.online_users[room_id][user_id]

    async def send_message(self, message: dict, room_id: str):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass
    
    def get_online_users(self, room_id: str = None):
        if room_id:
            return list(self.online_users.get(room_id, {}).values())
        # 전체 접속자
        all_users = []
        for rid, users in self.online_users.items():
            for uid, info in users.items():
                info_copy = info.copy()
                info_copy["room_id"] = rid
                all_users.append(info_copy)
        return all_users

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
        "user": {"id": user.id, "phone": user.phone, "name": user.name, "role": user.role, "is_approved": user.is_approved, "expiry_date": user.expiry_date.isoformat() if user.expiry_date else None}
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

@app.get("/api/admin/online-users")
async def get_online_users(room_id: int = None, admin: models.User = Depends(get_admin_user)):
    """현재 접속 중인 사용자 목록 (관리자 전용)"""
    if room_id:
        return {"users": manager.get_online_users(str(room_id)), "room_id": room_id}
    return {"users": manager.get_online_users()}

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

@app.get("/api/reset-admin-temp")
async def reset_admin_temp(db: Session = Depends(get_db)):
    """임시 관리자 비밀번호 변경 API - 사용 후 삭제할 것!"""
    admin = db.query(models.User).filter(models.User.role == "admin").first()
    if admin:
        admin.phone = "010-6512-6542"
        admin.password = get_password_hash("Rlawnsghl1!")
        admin.name = "타점잡는 교장쌤"
        db.commit()
        return {"message": "관리자 변경 완료!", "phone": "010-6512-6542", "name": "타점잡는 교장쌤"}
    return {"message": "관리자를 찾을 수 없습니다"}

@app.put("/api/admin/rooms/{room_id}")
async def update_room(
    room_id: int,
    room_data: schemas.RoomCreate,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """채팅방 수정 (관리자 전용)"""
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="채팅방을 찾을 수 없습니다")
    
    room.name = room_data.name
    room.room_type = room_data.room_type
    room.is_free = room_data.is_free
    room.description = room_data.description
    
    db.commit()
    db.refresh(room)
    
    return room

@app.delete("/api/admin/rooms/{room_id}")
async def delete_room(
    room_id: int,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """채팅방 삭제 (관리자 전용) - 메시지도 함께 삭제"""
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="채팅방을 찾을 수 없습니다")
    
    # 채팅방의 모든 메시지 삭제
    db.query(models.Message).filter(models.Message.room_id == room_id).delete()
    
    # 채팅방 삭제
    db.delete(room)
    db.commit()
    
    return {"message": "채팅방이 삭제되었습니다"}

@app.get("/api/rooms/{room_id}/messages", response_model=List[schemas.MessageResponse])
async def get_room_messages(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """채팅방 메시지 조회"""
    from sqlalchemy.orm import joinedload
    
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="채팅방을 찾을 수 없습니다")
    
    # 유료방인 경우 로그인 필수
    if not room.is_free and not current_user:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다")
    
    # user 정보를 함께 로드
    messages = db.query(models.Message).options(
        joinedload(models.Message.user)
    ).filter(
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
    
    room_id = message.room_id
    db.delete(message)
    db.commit()
    
    # WebSocket으로 삭제 이벤트 브로드캐스트
    await manager.send_message({
        "type": "delete",
        "message_id": message_id
    }, str(room_id))
    
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
        
        await manager.connect(websocket, str(room_id), user_id, user.name, user.role)
        
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

MT4_API_KEY = "tajum-signal-2026"  # API 키 (MT4 EA에서 동일하게 사용)

@app.post("/api/mt4/signal")
async def receive_mt4_signal(
    symbol: str,
    action: str,  # BUY, SELL, CLOSE
    price: float,
    sl: float = 0,
    tp: float = 0,
    lots: float = 0,
    api_key: str = "",
    db: Session = Depends(get_db)
):
    """MT4에서 시그널 수신"""
    # API Key 검증 임시 비활성화 (테스트용)
    print(f"[MT4 SIGNAL] Received: symbol={symbol}, action={action}, price={price}, api_key={api_key}")
    # if api_key != MT4_API_KEY:
    #     raise HTTPException(status_code=403, detail="Invalid API key")
    
    # 해외선물 리딩방 찾기 (room_id=3 또는 room_type 검색)
    room = db.query(models.Room).filter(models.Room.id == 3).first()
    if not room:
        room = db.query(models.Room).filter(models.Room.room_type == "futures").first()
    if not room:
        room = db.query(models.Room).filter(models.Room.room_type == "해외선물").first()
    if not room:
        raise HTTPException(status_code=404, detail="해외선물 채팅방을 찾을 수 없습니다")
    
    print(f"[MT4 SIGNAL] Sending to room: id={room.id}, name={room.name}")
    
    # 시그널 타입에 따른 이모지
    if action == "BUY":
        emoji = "🟢"
        action_text = "매수 (LONG)"
    elif action == "SELL":
        emoji = "🔴"
        action_text = "매도 (SHORT)"
    else:
        emoji = "⚪"
        action_text = "청산"
    
    content = f"""{emoji} {action_text} 시그널

📊 종목: {symbol}
💰 진입가: {price}"""
    
    if sl > 0:
        content += f"\n🛑 손절가: {sl}"
    if tp > 0:
        content += f"\n🎯 목표가: {tp}"
    if lots > 0:
        content += f"\n📦 수량: {lots} Lots"
    
    # 관리자 ID로 메시지 저장
    admin = db.query(models.User).filter(models.User.role == "admin").first()
    
    message = models.Message(
        room_id=room.id,
        user_id=admin.id if admin else 1,
        content=content,
        message_type="signal"
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    
    # WebSocket으로 실시간 전송 (일반 채팅과 동일한 형식)
    await manager.send_message({
        "type": "message",
        "id": message.id,
        "user_id": admin.id if admin else 1,
        "user_name": admin.name if admin else "시스템",
        "user_role": "admin",
        "content": content,
        "message_type": "signal",
        "timestamp": message.created_at.isoformat()
    }, str(room.id))
    
    return {"success": True, "message": "시그널이 전송되었습니다"}

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
    
    # 1. 캐시 확인 (빈 캐시는 무시)
    cached = db.query(models.LinkPreviewCache).filter(models.LinkPreviewCache.url == url).first()
    if cached and cached.title:  # title이 있는 경우에만 캐시 사용
        return {
            "url": url,
            "title": cached.title or "",
            "description": cached.description or "",
            "image": cached.image or ""
        }
    
    # 빈 캐시가 있으면 삭제
    if cached and not cached.title:
        db.delete(cached)
        db.commit()
    
    # 2. 캐시 없으면 크롤링
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
        }
        
        timeout = aiohttp.ClientTimeout(total=10)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(url, headers=headers, allow_redirects=True, ssl=False) as response:
                if response.status != 200:
                    print(f"Link preview failed: {url} - status {response.status}")
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
                
                # title이 있을 때만 캐시에 저장
                if title:
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
        print(f"Link preview error for {url}: {e}")
        return {"url": url, "title": "", "description": "", "image": ""}

@app.delete("/api/admin/link-preview-cache")
async def clear_link_preview_cache(
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """링크 미리보기 캐시 전체 삭제 (관리자 전용)"""
    count = db.query(models.LinkPreviewCache).count()
    db.query(models.LinkPreviewCache).delete()
    db.commit()
    return {"message": f"링크 미리보기 캐시 {count}개가 삭제되었습니다"}

# ==================== 뉴스 API ====================

@app.get("/api/news/{category}")
async def get_news(category: str, current_user: models.User = Depends(get_current_user)):
    from news_crawler import crawl_news
    try:
        news_list = await crawl_news(category)
        return {"news": news_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== 쓰레드(게시판) API ====================

@app.get("/api/threads", response_model=List[schemas.ThreadResponse])
async def get_threads(db: Session = Depends(get_db)):
    """쓰레드 목록 조회 (활성화된 것만, 고정글 우선)"""
    from sqlalchemy.orm import joinedload
    from sqlalchemy import func
    
    threads = db.query(models.Thread).options(
        joinedload(models.Thread.author)
    ).filter(
        models.Thread.is_active == True
    ).order_by(
        models.Thread.is_pinned.desc(),
        models.Thread.created_at.desc()
    ).all()
    
    # 댓글 수 추가
    result = []
    for thread in threads:
        comment_count = db.query(func.count(models.ThreadComment.id)).filter(
            models.ThreadComment.thread_id == thread.id
        ).scalar()
        
        thread_dict = {
            "id": thread.id,
            "title": thread.title,
            "content": thread.content,
            "author_id": thread.author_id,
            "is_pinned": thread.is_pinned,
            "is_active": thread.is_active,
            "view_count": thread.view_count,
            "created_at": thread.created_at,
            "updated_at": thread.updated_at,
            "author": thread.author,
            "comment_count": comment_count
        }
        result.append(thread_dict)
    
    return result

@app.get("/api/threads/{thread_id}", response_model=schemas.ThreadResponse)
async def get_thread(thread_id: int, db: Session = Depends(get_db)):
    """쓰레드 상세 조회 (조회수 증가)"""
    from sqlalchemy.orm import joinedload
    from sqlalchemy import func
    
    thread = db.query(models.Thread).options(
        joinedload(models.Thread.author)
    ).filter(models.Thread.id == thread_id).first()
    
    if not thread:
        raise HTTPException(status_code=404, detail="쓰레드를 찾을 수 없습니다")
    
    # 조회수 증가
    thread.view_count += 1
    db.commit()
    
    # 댓글 수
    comment_count = db.query(func.count(models.ThreadComment.id)).filter(
        models.ThreadComment.thread_id == thread.id
    ).scalar()
    
    return {
        "id": thread.id,
        "title": thread.title,
        "content": thread.content,
        "author_id": thread.author_id,
        "is_pinned": thread.is_pinned,
        "is_active": thread.is_active,
        "view_count": thread.view_count,
        "created_at": thread.created_at,
        "updated_at": thread.updated_at,
        "author": thread.author,
        "comment_count": comment_count
    }

@app.post("/api/admin/threads", response_model=schemas.ThreadResponse)
async def create_thread(
    thread_data: schemas.ThreadCreate,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """쓰레드 생성 (관리자 전용)"""
    new_thread = models.Thread(
        title=thread_data.title,
        content=thread_data.content,
        author_id=admin.id,
        is_pinned=thread_data.is_pinned
    )
    db.add(new_thread)
    db.commit()
    db.refresh(new_thread)
    
    new_thread.author = admin
    return {
        "id": new_thread.id,
        "title": new_thread.title,
        "content": new_thread.content,
        "author_id": new_thread.author_id,
        "is_pinned": new_thread.is_pinned,
        "is_active": new_thread.is_active,
        "view_count": new_thread.view_count,
        "created_at": new_thread.created_at,
        "updated_at": new_thread.updated_at,
        "author": new_thread.author,
        "comment_count": 0
    }

@app.put("/api/admin/threads/{thread_id}", response_model=schemas.ThreadResponse)
async def update_thread(
    thread_id: int,
    thread_data: schemas.ThreadUpdate,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """쓰레드 수정 (관리자 전용)"""
    thread = db.query(models.Thread).filter(models.Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="쓰레드를 찾을 수 없습니다")
    
    if thread_data.title is not None:
        thread.title = thread_data.title
    if thread_data.content is not None:
        thread.content = thread_data.content
    if thread_data.is_pinned is not None:
        thread.is_pinned = thread_data.is_pinned
    if thread_data.is_active is not None:
        thread.is_active = thread_data.is_active
    
    db.commit()
    db.refresh(thread)
    
    return thread

@app.delete("/api/admin/threads/{thread_id}")
async def delete_thread(
    thread_id: int,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """쓰레드 삭제 (관리자 전용)"""
    thread = db.query(models.Thread).filter(models.Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="쓰레드를 찾을 수 없습니다")
    
    db.delete(thread)
    db.commit()
    
    return {"message": "쓰레드가 삭제되었습니다"}

# ==================== 쓰레드 댓글 API ====================

@app.get("/api/threads/{thread_id}/comments", response_model=List[schemas.ThreadCommentResponse])
async def get_thread_comments(thread_id: int, db: Session = Depends(get_db)):
    """쓰레드 댓글 목록 조회"""
    from sqlalchemy.orm import joinedload
    
    comments = db.query(models.ThreadComment).options(
        joinedload(models.ThreadComment.user)
    ).filter(
        models.ThreadComment.thread_id == thread_id
    ).order_by(models.ThreadComment.created_at.asc()).all()
    
    return comments

@app.post("/api/threads/{thread_id}/comments", response_model=schemas.ThreadCommentResponse)
async def create_thread_comment(
    thread_id: int,
    comment_data: schemas.ThreadCommentCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """쓰레드 댓글 작성 (승인된 회원 + 관리자/스태프)"""
    # 승인된 사용자 또는 관리자/스태프인지 확인
    if not current_user.is_approved and current_user.role not in ["admin", "staff"]:
        raise HTTPException(status_code=403, detail="승인된 회원만 댓글을 작성할 수 있습니다")
    
    # 쓰레드 존재 여부 확인
    thread = db.query(models.Thread).filter(models.Thread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="쓰레드를 찾을 수 없습니다")
    
    if not thread.is_active:
        raise HTTPException(status_code=403, detail="비활성화된 쓰레드입니다")
    
    # 댓글 생성
    new_comment = models.ThreadComment(
        thread_id=thread_id,
        user_id=current_user.id,
        content=comment_data.content
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    
    new_comment.user = current_user
    return new_comment

@app.delete("/api/threads/comments/{comment_id}")
async def delete_thread_comment(
    comment_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """쓰레드 댓글 삭제 (본인 또는 관리자)"""
    comment = db.query(models.ThreadComment).filter(models.ThreadComment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="댓글을 찾을 수 없습니다")
    
    # 본인 또는 관리자만 삭제 가능
    if comment.user_id != current_user.id and current_user.role not in ["admin", "staff"]:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다")
    
    db.delete(comment)
    db.commit()
    
    return {"message": "댓글이 삭제되었습니다"}

# ==================== MT4 시그널 API ====================

# MT4 시그널 API Key
MT4_API_KEY = os.getenv("MT4_API_KEY", "tajum-signal-2026")

class SignalData(BaseModel):
    symbol: str
    action: str  # BUY, SELL, CLOSE, CLOSE_BUY, CLOSE_SELL, MODIFY
    price: float
    sl: Optional[float] = None
    tp: Optional[float] = None
    ticket: Optional[int] = None
    comment: Optional[str] = None
    direction: Optional[str] = None  # BUY 또는 SELL (종료 시 원래 포지션 방향)
    api_key: Optional[str] = None  # Body에서도 API Key 받기

@app.post("/api/signal/receive")
async def receive_signal(
    request: Request,
    signal: SignalData, 
    db: Session = Depends(get_db),
    api_key: Optional[str] = Query(None, description="API Key")
):
    """MT4 EA로부터 시그널 수신"""
    # API Key 우선순위: Query param > Body > Header
    key = api_key
    if not key and signal.api_key:
        key = signal.api_key
    if not key:
        key = request.headers.get("X-API-Key")
    if not key:
        key = request.headers.get("x-api-key")
    
    print(f"[SIGNAL DEBUG] api_key(query)={api_key}, signal.api_key={signal.api_key}, header={request.headers.get('X-API-Key')}, final_key={key}")
    
    return await _receive_signal_internal(signal, db, key)

@app.post("/api/signal")
async def receive_signal_v2(
    request: Request,
    signal: SignalData, 
    db: Session = Depends(get_db),
    api_key: Optional[str] = Query(None, description="API Key")
):
    """MT4 EA로부터 시그널 수신 (대체 경로)"""
    key = api_key
    if not key and signal.api_key:
        key = signal.api_key
    if not key:
        key = request.headers.get("X-API-Key")
    if not key:
        key = request.headers.get("x-api-key")
    return await _receive_signal_internal(signal, db, key)

@app.get("/api/signal/test")
async def test_signal():
    """시그널 API 테스트"""
    return {"status": "ok", "expected_key": MT4_API_KEY[:4] + "****"}

async def _receive_signal_internal(signal: SignalData, db: Session, api_key: str = None):
    """시그널 처리 내부 함수"""
    # API Key 검증
    if api_key != MT4_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")
    
    action_upper = signal.action.upper()
    
    # 포지션 방향 (BUY/SELL)
    if action_upper in ["BUY", "SELL"]:
        # 진입 시그널
        direction = "매수(BUY)" if action_upper == "BUY" else "매도(SELL)"
        message_lines = [
            "OPEN",
            f"🟢 포지션 진입 {direction}",
            "",
            f"📊 【{signal.symbol}】",
            "",
            f"💰 진입가: {signal.price}"
        ]
        if signal.sl:
            message_lines.append(f"🛑 손절가: {signal.sl}")
        if signal.tp:
            message_lines.append(f"🎯 목표가: {signal.tp}")
        message_lines.append("")
        message_lines.append("투자의 책임은 본인에게 있습니다.")
        
    elif action_upper in ["CLOSE", "CLOSE_BUY", "CLOSE_SELL"]:
        # 종료 시그널
        if action_upper == "CLOSE_BUY":
            direction = "매수(BUY)"
        elif action_upper == "CLOSE_SELL":
            direction = "매도(SELL)"
        elif signal.direction:
            direction = "매수(BUY)" if signal.direction.upper() == "BUY" else "매도(SELL)"
        elif signal.comment and "BUY" in signal.comment.upper():
            direction = "매수(BUY)"
        elif signal.comment and "SELL" in signal.comment.upper():
            direction = "매도(SELL)"
        else:
            direction = ""
        
        message_lines = [
            "CLOSE",
            f"🔴 포지션 종료 {direction}".strip(),
            "",
            f"📊 【{signal.symbol}】",
            "",
            "투자의 책임은 본인에게 있습니다."
        ]
    else:
        # 기타 (MODIFY 등)
        message_lines = [
            f"🔄 【{signal.symbol}】 {action_upper}",
            f"💰 가격: {signal.price}",
            "",
            "투자의 책임은 본인에게 있습니다."
        ]
    
    message_content = "\n".join(message_lines)
    
    # 해외선물 리딩방 찾기
    room = db.query(models.Room).filter(models.Room.room_type == "해외선물").first()
    if not room:
        room = db.query(models.Room).filter(models.Room.room_type == "futures").first()
    if not room:
        # 방 이름으로 찾기
        room = db.query(models.Room).filter(models.Room.name.contains("해외선물")).first()
    if not room:
        room = db.query(models.Room).filter(models.Room.name.contains("VVIP")).first()
    if not room:
        raise HTTPException(status_code=404, detail="해외선물 리딩방을 찾을 수 없습니다")
    
    # 관리자 찾기
    admin = db.query(models.User).filter(models.User.role == "admin").first()
    if not admin:
        raise HTTPException(status_code=500, detail="관리자 계정을 찾을 수 없습니다")
    
    # 메시지 저장
    new_message = models.Message(
        room_id=room.id,
        user_id=admin.id,
        content=message_content,
        message_type="signal"
    )
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    # WebSocket으로 브로드캐스트
    broadcast_data = {
        "type": "message",
        "message": {
            "id": new_message.id,
            "room_id": room.id,
            "user_id": admin.id,
            "content": message_content,
            "message_type": "signal",
            "created_at": new_message.created_at.isoformat(),
            "user": {
                "id": admin.id,
                "name": admin.name,
                "role": admin.role
            }
        }
    }
    
    await manager.send_message(broadcast_data, str(room.id))
    
    return {
        "success": True,
        "message": "시그널이 전송되었습니다",
        "signal_id": new_message.id,
        "room_id": room.id
    }

@app.get("/api/signal/test")
async def test_signal_endpoint():
    """시그널 API 테스트용 엔드포인트"""
    return {"status": "ok", "message": "시그널 API가 정상 작동 중입니다"}

# ==================== 설정 API ====================

@app.get("/api/settings/{key}")
async def get_setting(key: str, db: Session = Depends(get_db)):
    """설정 값 조회"""
    setting = db.query(models.Settings).filter(models.Settings.key == key).first()
    if not setting:
        return {"key": key, "value": None}
    return {"key": setting.key, "value": setting.value}

@app.put("/api/admin/settings/{key}")
async def update_setting(
    key: str,
    value: str,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """설정 값 변경 (관리자 전용)"""
    setting = db.query(models.Settings).filter(models.Settings.key == key).first()
    if setting:
        setting.value = value
    else:
        setting = models.Settings(key=key, value=value)
        db.add(setting)
    
    db.commit()
    return {"key": key, "value": value}

@app.get("/api/admin/settings")
async def get_all_settings(admin: models.User = Depends(get_admin_user), db: Session = Depends(get_db)):
    """모든 설정 조회 (관리자 전용)"""
    settings = db.query(models.Settings).all()
    return {s.key: s.value for s in settings}

# ==================== 서버 시작 ====================

@app.on_event("startup")
async def startup_event():
    # 테이블 자동 생성 (새 테이블 추가 시 자동 반영)
    from database import engine, Base
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 관리자 계정 생성
        admin = db.query(models.User).filter(models.User.phone == "010-6512-6542").first()
        if not admin:
            admin = models.User(
                phone="010-6512-6542",
                password=get_password_hash("Rlawnsghl1!"),
                name="타점잡는 교장쌤",
                role="admin",
                is_approved=True
            )
            db.add(admin)
            db.commit()
        
        # 기본 채팅방 생성
        rooms = db.query(models.Room).all()
        if not rooms:
            default_rooms = [
                models.Room(name="교장쌤 소식방", room_type="notice", is_free=True, description="교장쌤만 메세지 작성"),
                models.Room(name="주식 리딩방", room_type="stock", is_free=False, description="주식 매매 시그널"),
                models.Room(name="해외선물 리딩방", room_type="futures", is_free=False, description="해외선물 매매 시그널"),
                models.Room(name="코인선물 리딩방", room_type="crypto", is_free=False, description="코인선물 매매 시그널"),
            ]
            db.add_all(default_rooms)
            db.commit()
        
        print("✅ 서버 시작 완료!")
        print("📌 관리자: 010-6512-6542 / Rlawnsghl1!")
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)