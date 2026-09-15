from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from models import EventCategoryEnum, EventLocationTypeEnum, EventFormatEnum

# --- USER SCHEMAS ---
class UserBase(BaseModel):
    email: str
    name: str  # Forces the name to be required!
    role: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    registration_number: Optional[str] = None
    college_name: Optional[str] = None
    course_name: Optional[str] = None
    department: Optional[str] = None
    year_of_passing: Optional[str] = None
    contact: Optional[str] = None
    password: Optional[str] = None    

class UserOut(UserBase):
    id: int
    registration_number: Optional[str] = None
    college_name: Optional[str] = None
    course_name: Optional[str] = None
    department: Optional[str] = None
    year_of_passing: Optional[str] = None
    contact: Optional[str] = None
    access_token: Optional[str] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str


# --- EVENT SCHEMAS ---
class EventBase(BaseModel):
    title: str
    description: Optional[str] = None          # <--- Make Optional
    category: EventCategoryEnum            
    date_from: Optional[datetime] = None       # <--- Make Optional
    date_to: Optional[datetime] = None            
    registration_deadline: Optional[datetime] = None # <--- Make Optional
    location_type: Optional[EventLocationTypeEnum] = None # <--- Make Optional
    location: Optional[str] = None
    location_link: Optional[str] = None
    meet_url: Optional[str] = None
    contact: Optional[str] = None 
    organization_name: Optional[str] = None  
    event_format: EventFormatEnum          
    min_team_size: Optional[int] = None    
    max_team_size: Optional[int] = None
    status: Optional[str] = "active"
    scheduled_publish_date: Optional[datetime] = None
    banner_url: Optional[str] = None

class EventCreate(EventBase):
    registration_deadline: Optional[datetime] = None

class EventOut(EventBase):
    id: int
    created_by_id: int

    class Config:
        from_attributes = True


# --- REGISTRATION SCHEMAS ---
class RegistrationOut(BaseModel):
    id: int
    user_id: int
    event_id: int
    status: str

    class Config:
        from_attributes = True

class EventRegister(BaseModel):
    team_leader: Optional[str] = None
    team_members: Optional[list[str]] = None        

class BroadcastCreate(BaseModel):
    message: str    

class SendOTPRequest(BaseModel):
    name: str
    email: EmailStr

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp_code: str

class CompleteRegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "student"