from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum, Boolean
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime, timezone
import enum

class RoleEnum(str, enum.Enum):
    student = "student"
    admin = "admin"

class EventCategoryEnum(str, enum.Enum):
    conference = "conference"
    courses = "courses"
    hackathons = "hackathons"
    jobfair = "jobfair"
    internship = "internship"
    workshop = "workshop"
    collegefest = "collegefest"
    others = "others"

class EventLocationTypeEnum(str, enum.Enum):
    online = "online"
    offline = "offline"

class EventFormatEnum(str, enum.Enum): # <--- NEW ENUM
    individual = "individual"
    team = "team"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.student)
    registration_number = Column(String, nullable=True)
    college_name = Column(String, nullable=True)
    course_name = Column(String, nullable=True)
    department = Column(String, nullable=True)
    year_of_passing = Column(String, nullable=True)
    contact = Column(String, nullable=True)

# src/models.py

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    comments = relationship("EventComment", back_populates="event", cascade="all, delete-orphan")
    description = Column(String, nullable=True)
    category = Column(Enum(EventCategoryEnum), nullable=False)
    contact = Column(String, nullable=True) 
    organization_name = Column(String, nullable=True) # Now allows NULL for drafts
    location_type = Column(Enum(EventLocationTypeEnum), nullable=True) # Now allows NULL for drafts
    
    event_format = Column(Enum(EventFormatEnum), default=EventFormatEnum.individual, nullable=False)
    min_team_size = Column(Integer, nullable=True)
    max_team_size = Column(Integer, nullable=True)
    status = Column(String, default="active", nullable=False) # "active", "draft", "scheduled", or "cancelled"
    scheduled_publish_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    
    date_from = Column(DateTime, nullable=True) 
    date_to = Column(DateTime, nullable=True)   
    registration_deadline = Column(DateTime, nullable=True) # Now allows NULL for drafts
    location = Column(String, nullable=True)
    location_link = Column(String, nullable=True)
    meet_url = Column(String, nullable=True)
    banner_url = Column(String, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"))
    creator = relationship("User")
    registrations = relationship("Registration", back_populates="event")

class Registration(Base):
    __tablename__ = "registrations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    event_id = Column(Integer, ForeignKey("events.id"))
    team_leader = Column(String, nullable=True)
    team_members = Column(Text, nullable=True)
    status = Column(String, default="registered", nullable=False)
    registered_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User")
    event = relationship("Event", back_populates="registrations")

class EventComment(Base):
    __tablename__ = "event_comments"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    user_name = Column(String)
    role = Column(String, default="student")  # 'student' or 'admin'
    message = Column(String)
    admin_reply = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    admin_replied_at = Column(DateTime, nullable=True)

    event = relationship("Event", back_populates="comments")
    user = relationship("User")  

class EventBroadcast(Base):
    __tablename__ = "event_broadcasts"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"))
    admin_id = Column(Integer, ForeignKey("users.id"))
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    event = relationship("Event")
    admin = relationship("User")     

class BroadcastRead(Base):
    __tablename__ = "broadcast_reads"

    id = Column(Integer, primary_key=True, index=True)
    broadcast_id = Column(Integer, ForeignKey("event_broadcasts.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))     

class CommentRead(Base):
    __tablename__ = "comment_reads"

    id = Column(Integer, primary_key=True, index=True)
    comment_id = Column(Integer, ForeignKey("event_comments.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))    


class OTPVerification(Base):
    __tablename__ = "otp_verifications"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    otp_code = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_verified = Column(Boolean, default=False)    