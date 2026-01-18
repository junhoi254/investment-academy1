from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from database import Base

class UserRole(str, enum.Enum):
    admin = "admin"
    staff = "staff"
    member = "member"

class RoomType(str, enum.Enum):
    notice = "notice"
    stock = "stock"
    futures = "futures"
    crypto = "crypto"

class MessageType(str, enum.Enum):
    text = "text"
    signal = "signal"
    image = "image"
    file = "file"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(20), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    name = Column(String(50), nullable=False)
    role = Column(String(20), default="member")  # admin, staff, member
    is_approved = Column(Boolean, default=False)
    expiry_date = Column(DateTime, nullable=True)  # 회원 기간
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    messages = relationship("Message", back_populates="user")

class Room(Base):
    __tablename__ = "rooms"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    room_type = Column(String(20), nullable=False)  # notice, stock, futures, crypto
    is_free = Column(Boolean, default=False)  # 무료방 여부
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    messages = relationship("Message", back_populates="room")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    message_type = Column(String(20), default="text")  # text, signal, image, file, emoji
    file_url = Column(String(500), nullable=True)  # 파일/이미지 URL
    file_name = Column(String(255), nullable=True)  # 원본 파일명
    created_at = Column(DateTime, default=datetime.utcnow)
    
    room = relationship("Room", back_populates="messages")
    user = relationship("User", back_populates="messages")

class News(Base):
    __tablename__ = "news"
    
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(20), nullable=False)  # stock, futures, crypto
    title = Column(String(255), nullable=False)
    url = Column(String(500), nullable=False)
    source = Column(String(100), nullable=True)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class LinkPreviewCache(Base):
    __tablename__ = "link_preview_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    url = Column(String(500), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    image = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Thread(Base):
    """쓰레드 게시글 (관리자 작성)"""
    __tablename__ = "threads"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_pinned = Column(Boolean, default=False)  # 상단 고정
    is_active = Column(Boolean, default=True)   # 활성화 여부
    view_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    author = relationship("User", backref="threads")
    comments = relationship("ThreadComment", back_populates="thread", cascade="all, delete-orphan")

class ThreadComment(Base):
    """쓰레드 댓글 (회원 작성)"""
    __tablename__ = "thread_comments"
    
    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey("threads.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    thread = relationship("Thread", back_populates="comments")
    user = relationship("User")

class Settings(Base):
    """시스템 설정"""
    __tablename__ = "settings"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(String(500), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class UserRoomRead(Base):
    """사용자별 방 마지막 읽은 메시지 추적"""
    __tablename__ = "user_room_reads"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    last_read_message_id = Column(Integer, default=0)  # 마지막으로 읽은 메시지 ID
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User")
    room = relationship("Room")
