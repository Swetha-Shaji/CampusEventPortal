import redis.asyncio as redis
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.decorator import cache
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, Base, get_db
import models
import schemas
import utils
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from pydantic import BaseModel
from typing import Optional
import os
import shutil
from fastapi import File, UploadFile, Form
from fastapi.staticfiles import StaticFiles
from datetime import datetime, timezone, time
from sqlalchemy import func
import random
from datetime import timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import Request
from fastapi.responses import JSONResponse
import traceback
from PIL import Image
from io import BytesIO

# =========================================================
# DATABASE
# =========================================================

import time
MAX_RETRIES = 5
for attempt in range(MAX_RETRIES):
    try:
        models.Base.metadata.create_all(bind=engine)
        print("Database tables created successfully.")
        break
    except Exception as e:
        print(f"Database connection failed (attempt {attempt + 1}/{MAX_RETRIES}): {e}")
        time.sleep(3)


# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(
    title="Campus Event Portal API",
    description="REST API for managing campus events, registrations, and users.",
    version="1.0.0"
)

redis_client = None

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # 1. Prints the full red error trace and line number in your Docker logs
    print(f"FAILED REQUEST URL: {request.url}")
    traceback.print_exc() 
    
    # 2. Returns the exact error message to your frontend instead of a generic 500
    return JSONResponse(
        status_code=500,
        content={"detail": f"Exact Server Error: {str(exc)}"}
    )

# Create all database tables automatically
@app.on_event("startup")
async def startup():
    global redis_client
    # Connects to the redis container defined in docker-compose.yml
    redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
    redis_client = redis.from_url(redis_url, encoding="utf-8", decode_responses=True)
    
    # Initialize caching and rate limiting
    FastAPICache.init(RedisBackend(redis_client), prefix="campus-cache")
    await FastAPILimiter.init(redis_client)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://127.0.0.1",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def read_root():
    return {
        "status": "ok",
        "message": "Campus Event Portal API is successfully running!"
    }


# =========================================================
# OTP REGISTRATION ROUTES
# =========================================================

@app.post("/auth/send-otp")
async def send_otp(request: schemas.SendOTPRequest, db: Session = Depends(get_db)):
    clean_email = request.email.strip().lower()
    
    existing_user = db.query(models.User).filter(models.User.email == clean_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    # Rate-limit: Check if an OTP was generated in the last 60 seconds
    ttl = await redis_client.ttl(f"otp:{clean_email}")
    if ttl > 240:
        raise HTTPException(
            status_code=429, 
            detail="Please wait 60 seconds before requesting a new OTP."
        )
        
    otp = str(random.randint(100000, 999999))
    await redis_client.setex(f"otp:{clean_email}", 300, otp)
    
    try:
        sender = os.getenv("EMAIL_USERNAME")
        password = os.getenv("EMAIL_PASSWORD")
        host = os.getenv("EMAIL_HOST")
        port = int(os.getenv("EMAIL_PORT", 465))
        
        msg = MIMEMultipart()
        msg['From'] = sender
        msg['To'] = clean_email
        msg['Subject'] = "Campus Event Portal - Verification OTP"
        
        body = f"Hello {request.name},\n\nYour OTP for registration is: {otp}\n\nIt will expire in 5 minutes."
        msg.attach(MIMEText(body, 'plain'))
        
        server = smtplib.SMTP_SSL(host, port)
        server.login(sender, password)
        server.send_message(msg)
        server.quit()
        
    except Exception as e:
        print(f"Failed to send email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send OTP email. Please try again.")
        
    return {"message": "OTP sent successfully"}

@app.post("/auth/verify-otp")
async def verify_otp(request: schemas.VerifyOTPRequest):
    clean_email = request.email.strip().lower()
    
    stored_otp = await redis_client.get(f"otp:{clean_email}")
    if not stored_otp or stored_otp != request.otp_code:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        
    await redis_client.setex(f"verified:{clean_email}", 900, "true")
    await redis_client.delete(f"otp:{clean_email}")
    
    return {"message": "OTP verified successfully"}

@app.post("/auth/complete-register")
async def complete_register(request: schemas.CompleteRegisterRequest, db: Session = Depends(get_db)):
    clean_email = request.email.strip().lower()
    
    is_verified = await redis_client.get(f"verified:{clean_email}")
    if is_verified != "true":
        raise HTTPException(status_code=400, detail="Email not verified. Please complete OTP verification first.")
        
    existing_user = db.query(models.User).filter(models.User.email == clean_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    try:
        hashed_password = utils.get_password_hash(request.password)
        new_user = models.User(
            name=request.name,
            email=clean_email,
            password_hash=hashed_password,
            role=request.role
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        await redis_client.delete(f"verified:{clean_email}")
        return {"message": "Registration successful"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create account")


# =========================================================
# AUTHENTICATION ROUTES
# =========================================================

@app.post("/register")
def register_user(
    user: schemas.UserCreate,
    db: Session = Depends(get_db)
):
    # 1. Clean the email
    clean_email = user.email.strip().lower()

    # Check whether email already exists
    existing_user = (
        db.query(models.User)
        .filter(models.User.email == clean_email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    try:
        # Hash password
        hashed_password = utils.get_password_hash(user.password)

        # Create user with clean_email
        new_user = models.User(
            name=user.name,
            email=clean_email,
            password_hash=hashed_password,
            role=user.role
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return new_user

    except Exception as e:
        db.rollback()

        print("Registration error:", str(e))

        raise HTTPException(
            status_code=500,
            detail="Failed to create user"
        )


@app.post("/login", response_model=schemas.Token)
def login_user(
    user_credentials: schemas.UserLogin,
    db: Session = Depends(get_db)
):
    try:
        # Strictly read from the JSON body
        login_email = user_credentials.email
        login_password = user_credentials.password

        if not login_email or not login_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email and password are required"
            )

        clean_email = login_email.strip().lower()

        user = (
            db.query(models.User)
            .filter(models.User.email == clean_email)
            .first()
        )

        if not user or not utils.verify_password(
            login_password,
            user.password_hash
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        access_token = utils.create_access_token(
            data={
                "sub": user.email,
                "id": user.id,
                "role": user.role.value
            }
        )

        return {
            "access_token": access_token,
            "token_type": "bearer"
        }

    except HTTPException:
        # Re-raise standard FastAPI errors normally
        raise
    except Exception as e:
        # Catch unexpected crashes and return the exact error message
        print(f"Login Crash Details: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Exact Server Error: {str(e)}"
        )

# =========================================================
# SECURITY
# =========================================================

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    try:
        # Decode JWT
        payload = jwt.decode(
            token,
            utils.SECRET_KEY,
            algorithms=[utils.ALGORITHM]
        )

        email = payload.get("sub")

        if email is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid token payload"
            )

    except jwt.PyJWTError:
        raise HTTPException(
            status_code=401,
            detail="Could not validate credentials"
        )

    # Find user in database
    user = (
        db.query(models.User)
        .filter(models.User.email == email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user


def get_admin_user(
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.RoleEnum.admin:
        raise HTTPException(
            status_code=403,
            detail="Not authorized. Admins only."
        )

    return current_user


# =========================================================
# PROFILE ROUTES
# =========================================================

# ---------------------------------------------------------
# GET CURRENT USER
# ---------------------------------------------------------

@app.get(
    "/users/me",
    response_model=schemas.UserOut
)
def get_user_profile(
    current_user: models.User = Depends(get_current_user)
):
    return current_user


# ---------------------------------------------------------
# UPDATE CURRENT USER
# ---------------------------------------------------------
@app.put(
    "/users/me",
    response_model=schemas.UserOut
)
def update_user_profile(
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    update_data = user_update.dict(exclude_unset=True)

    if "name" in update_data:
        new_name = update_data["name"].strip()
        if not new_name:
            raise HTTPException(
                status_code=400,
                detail="Name cannot be empty"
            )
        current_user.name = new_name
        del update_data["name"]

    if "password" in update_data and update_data["password"]:
        password = update_data["password"]
        if len(password) < 6:
            raise HTTPException(
                status_code=400,
                detail="Password must be at least 6 characters"
            )
        current_user.password_hash = utils.get_password_hash(password)
        del update_data["password"]

    if "email" in update_data and update_data["email"]:
        update_data["email"] = update_data["email"].strip().lower()

    for key, value in update_data.items():
        setattr(current_user, key, value)

    try:
        db.commit()
        db.refresh(current_user)

    except Exception as e:
        db.rollback()
        print("Profile update error:", str(e))
        raise HTTPException(
            status_code=500,
            detail="Failed to update profile"
        )

    # Generate a fresh JWT access token with the updated email (sub claim)
    access_token = utils.create_access_token(
        data={
            "sub": current_user.email,
            "id": current_user.id,
            "role": current_user.role.value
        }
    )

    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role.value,
        "registration_number": current_user.registration_number,
        "college_name": current_user.college_name,
        "course_name": current_user.course_name,
        "department": current_user.department,
        "year_of_passing": current_user.year_of_passing,
        "contact": current_user.contact,
        "access_token": access_token
    }


# =========================================================
# EVENT ROUTES
# =========================================================

# 1. Setup Static Directory for Images
os.makedirs("static/banners", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.post("/events", response_model=schemas.EventOut)
async def create_event(
    title: str = Form(...),
    category: models.EventCategoryEnum = Form(...),
    status: str = Form("active"),  # Accepts "draft", "scheduled", or "active"
    scheduled_publish_date: Optional[datetime] = Form(None),
    description: Optional[str] = Form(None),
    date_from: Optional[datetime] = Form(None),
    date_to: Optional[datetime] = Form(None),
    registration_deadline: Optional[datetime] = Form(None),
    location_type: Optional[models.EventLocationTypeEnum] = Form(None),
    event_format: Optional[models.EventFormatEnum] = Form(None),          
    min_team_size: Optional[int] = Form(None),                 
    max_team_size: Optional[int] = Form(None),
    location: Optional[str] = Form(None),
    location_link: Optional[str] = Form(None), 
    meet_url: Optional[str] = Form(None),
    contact: Optional[str] = Form(None),
    organization_name: Optional[str] = Form(None),
    banner: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    # If saving as active or scheduled, enforce strict validations & banner requirement
    if status in ["active", "scheduled"]:
        if not date_from or not registration_deadline or not organization_name or not location_type:
            raise HTTPException(status_code=400, detail="Missing required fields for publishing or scheduling an event.")
        if not banner:
            raise HTTPException(status_code=400, detail="Banner image is required for published/scheduled events.")
        if status == "scheduled" and not scheduled_publish_date:
            raise HTTPException(status_code=400, detail="A schedule date/time is required when scheduling an event.")

    db_banner_url = None
    if banner:
        try:
            image_data = await banner.read()
            img = Image.open(BytesIO(image_data))
            
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
                
            img.thumbnail((1920, 1080), Image.Resampling.LANCZOS)
            
            unique_filename = f"{datetime.now().timestamp()}_{current_user.id}.webp"
            file_location = f"static/banners/{unique_filename}"
            
            img.save(file_location, "WEBP", quality=80)
            db_banner_url = f"/static/banners/{unique_filename}"
        except Exception as e:
            raise HTTPException(status_code=400, detail="Invalid image file format")

    new_event = models.Event(
        title=title,
        description=description,
        category=category,
        date_from=date_from,
        date_to=date_to,
        registration_deadline=registration_deadline or datetime.now(timezone.utc),
        location_type=location_type or models.EventLocationTypeEnum.offline,
        location=location,
        location_link=location_link,
        meet_url=meet_url, 
        contact=contact,
        organization_name=organization_name,
        event_format=event_format or models.EventFormatEnum.individual,          
        min_team_size=min_team_size,        
        max_team_size=max_team_size,
        banner_url=db_banner_url,
        status=status,
        scheduled_publish_date=scheduled_publish_date,
        created_by_id=current_user.id
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    return new_event


# ---------------------------------------------------------
# GET ALL EVENTS (Includes Auto-activation check for scheduled events)
# ---------------------------------------------------------
@app.get("/events", response_model=list[schemas.EventOut])
def get_events(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Use UTC time to accurately match ISO strings sent from the frontend
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    scheduled_events = db.query(models.Event).filter(models.Event.status == "scheduled").all()
    
    updated = False
    for ev in scheduled_events:
        if ev.scheduled_publish_date:
            sched_date = ev.scheduled_publish_date
            if sched_date.tzinfo is not None:
                sched_date = sched_date.astimezone(timezone.utc).replace(tzinfo=None)
            
            if now >= sched_date:
                ev.status = "active"
                updated = True

    if updated:
        db.commit()

    return db.query(models.Event).filter(models.Event.status != "draft").all()


@app.put("/events/{event_id}", response_model=schemas.EventOut)
async def update_event(
    event_id: int,
    title: str = Form(None),
    description: Optional[str] = Form(None),
    category: models.EventCategoryEnum = Form(None),
    status: Optional[str] = Form(None),
    scheduled_publish_date: Optional[datetime] = Form(None),
    date_from: Optional[datetime] = Form(None),
    date_to: Optional[datetime] = Form(None),
    registration_deadline: Optional[datetime] = Form(None),
    location_type: Optional[models.EventLocationTypeEnum] = Form(None),
    event_format: Optional[models.EventFormatEnum] = Form(None),         
    min_team_size: Optional[int] = Form(None),                 
    max_team_size: Optional[int] = Form(None),
    location: Optional[str] = Form(None),
    location_link: Optional[str] = Form(None), 
    meet_url: Optional[str] = Form(None),
    contact: Optional[str] = Form(None),
    organization_name: Optional[str] = Form(None),
    banner: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if title: event.title = title
    if description is not None: event.description = description
    if category: event.category = category
    if status: event.status = status
    if scheduled_publish_date is not None: event.scheduled_publish_date = scheduled_publish_date
    if date_from is not None: event.date_from = date_from
    if date_to is not None: event.date_to = date_to
    if registration_deadline is not None: event.registration_deadline = registration_deadline
    if contact is not None: event.contact = contact
    if organization_name is not None: event.organization_name = organization_name
    if location_type: event.location_type = location_type

    if event_format:                                           
        event.event_format = event_format
        if event_format == models.EventFormatEnum.individual:
            event.min_team_size = None
            event.max_team_size = None
        else:
            if min_team_size is not None: event.min_team_size = min_team_size
            if max_team_size is not None: event.max_team_size = max_team_size
    
    curr_loc_type = location_type or event.location_type
    if curr_loc_type == models.EventLocationTypeEnum.online:
        event.location = None
        event.location_link = None
        if meet_url is not None: event.meet_url = meet_url
    else:
        event.meet_url = None
        if location is not None: event.location = location
        if location_link is not None: event.location_link = location_link

    if banner:
        try:
            image_data = await banner.read()
            img = Image.open(BytesIO(image_data))
            
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
                
            img.thumbnail((1920, 1080), Image.Resampling.LANCZOS)
            
            unique_filename = f"{datetime.now().timestamp()}_{current_user.id}.webp"
            file_location = f"static/banners/{unique_filename}"
            
            img.save(file_location, "WEBP", quality=80)
            event.banner_url = f"/static/banners/{unique_filename}"
        except Exception as e:
            raise HTTPException(status_code=400, detail="Invalid image file format")

    db.commit()
    db.refresh(event)
    return event
# ---------------------------------------------------------
# CANCEL/DELETE EVENT (Marks status as cancelled & broadcasts reason)
# ---------------------------------------------------------
@app.delete("/events/{event_id}")
def delete_event(
    event_id: int,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # 1. Update event status to cancelled
    event.status = "cancelled"

    # 2. Automatically create a broadcast notification with the cancellation reason
    cancellation_message = (
        f"Notice: The event '{event.title}' has been cancelled by the coordinator. "
        f"Reason: {reason.strip()}" if reason and reason.strip() 
        else f"Notice: The event '{event.title}' has been cancelled by the coordinator."
    )

    new_broadcast = models.EventBroadcast(
        event_id=event.id,
        admin_id=current_user.id,
        message=cancellation_message
    )
    db.add(new_broadcast)

    db.commit()
    db.refresh(event)

    return {
        "status": "success",
        "message": "Event marked as cancelled and broadcast notification sent successfully!",
        "event_status": event.status
    }

# =========================================================
# REGISTRATION ROUTES
# =========================================================

@app.post("/events/{event_id}/register", response_model=schemas.RegistrationOut)
def register_for_event(
    event_id: int,
    reg_data: schemas.EventRegister = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    existing_reg = db.query(models.Registration).filter(
        models.Registration.event_id == event_id,
        models.Registration.user_id == current_user.id
    ).first()

    team_leader = None
    team_members_str = None

    if event.event_format == models.EventFormatEnum.team:
        if not reg_data or not reg_data.team_leader or reg_data.team_members is None:
            raise HTTPException(status_code=400, detail="Team leader and member names are required for team events")
        
        team_leader = reg_data.team_leader.strip()
        
        # Filter out empty strings to get the actual valid members list
        valid_members = [m.strip() for m in reg_data.team_members if m.strip()]
        
        total_members_count = 1 + len(valid_members)
        if total_members_count < event.min_team_size or total_members_count > event.max_team_size:
            raise HTTPException(
                status_code=400, 
                detail=f"Team size must be between {event.min_team_size} and {event.max_team_size} members."
            )
        
        team_members_str = ",".join(valid_members)

    if existing_reg:
        # If they previously cancelled, re-activate and update their registration status
        existing_reg.status = "registered"
        existing_reg.team_leader = team_leader
        existing_reg.team_members = team_members_str
        db.commit()
        db.refresh(existing_reg)
        return existing_reg

    new_reg = models.Registration(
        user_id=current_user.id,
        event_id=event_id,
        team_leader=team_leader,
        team_members=team_members_str,
        status="registered"
    )

    db.add(new_reg)
    db.commit()
    db.refresh(new_reg)

    return new_reg


@app.delete("/events/{event_id}/cancel")
def cancel_registration(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    registration = (
        db.query(models.Registration)
        .filter(
            models.Registration.event_id == event_id,
            models.Registration.user_id == current_user.id
        )
        .first()
    )

    if not registration:
        raise HTTPException(
            status_code=404,
            detail="Registration not found"
        )

    # Update status to cancelled instead of deleting row
    registration.status = "cancelled"
    db.commit()

    return {
        "message": "Registration cancelled successfully"
    }


@app.get("/my-registrations")
def get_my_registrations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Only return active registrations where status is 'registered' for the student dashboard
    registrations = db.query(models.Registration).filter(
        models.Registration.user_id == current_user.id,
        models.Registration.status == "registered"
    ).all()
    return registrations

@app.get("/my-all-registrations")
def get_my_all_registrations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    registrations = db.query(models.Registration).filter(
        models.Registration.user_id == current_user.id
    ).all()
    return registrations    


@app.get("/admin/participants")
def get_all_participants(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    # Returns all user registration records including cancelled ones for admin portal review
    registrations = db.query(models.Registration).all()
    result = []
    for reg in registrations:
        user = reg.user
        event = reg.event
        if user and event:
            participant_data = {
                "registration_id": reg.id,
                "user_id": user.id,
                "name": user.name,
                "email": user.email,
                "registration_number": user.registration_number,
                "college_name": user.college_name,
                "course_name": user.course_name,
                "department": user.department,
                "year_of_passing": user.year_of_passing,
                "contact": user.contact,
                "event_id": event.id,
                "event_title": event.title,
                "reg_status": reg.status.capitalize(),
                "registered_at": reg.registered_at
            }
            result.append(participant_data)
    return result

# --- DISCUSSION / Q&A ENDPOINTS ---

@app.get("/admin/discussions")
def get_all_discussions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    # Fetch real event comments/discussions from your database model
    # Replace 'models.EventComment' with your actual discussion model name if different
    discussions = db.query(models.EventComment).all()
    return discussions

@app.put("/admin/discussions/{comment_id}")
def reply_to_discussion(
    comment_id: int,
    reply_data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    comment = db.query(models.EventComment).filter(models.EventComment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Discussion not found")
    
    comment.admin_reply = reply_data.get("admin_reply")
    comment.admin_replied_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(comment)
    return comment    

# --- REGISTERED EVENT HUB ENDPOINTS ---

@app.get("/events/{event_id}/comments")
def get_event_comments(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    comments = db.query(models.EventComment).filter(models.EventComment.event_id == event_id).all()
    
    read_comment_ids = [
        r.comment_id for r in db.query(models.CommentRead)
        .filter(models.CommentRead.user_id == current_user.id)
        .all()
    ]
    
    result = []
    for c in comments:
        result.append({
            "id": c.id,
            "event_id": c.event_id,
            "user_id": c.user_id,
            "user_name": c.user_name,
            "role": c.role,
            "message": c.message,
            "admin_reply": c.admin_reply,
            "created_at": c.created_at,
            "admin_replied_at": c.admin_replied_at,
            "is_read_by_student": c.id in read_comment_ids
        })
    return result

@app.post("/events/{event_id}/comments")
def post_event_comment(
    event_id: int,
    comment_data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Creates a new public comment/question from a registered student
    new_comment = models.EventComment(
        event_id=event_id,
        user_id=current_user.id,
        user_name=current_user.name,
        role="student",
        message=comment_data.get("message"),
        
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return new_comment    

@app.post("/events/{event_id}/broadcast")
def send_event_broadcast(
    event_id: int,
    broadcast_data: schemas.BroadcastCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    # Verify event exists
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    new_broadcast = models.EventBroadcast(
        event_id=event_id,
        admin_id=current_user.id,
        message=broadcast_data.message.strip()
    )
    
    db.add(new_broadcast)
    db.commit()
    db.refresh(new_broadcast)

    return {
        "status": "success",
        "message": "Broadcast sent and saved successfully!",
        "broadcast_id": new_broadcast.id,
        "created_at": new_broadcast.created_at
    }

@app.get("/events/{event_id}/broadcasts")
def get_event_broadcasts(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    broadcasts = (
        db.query(models.EventBroadcast)
        .filter(models.EventBroadcast.event_id == event_id)
        .order_by(models.EventBroadcast.created_at.desc())
        .all()
    )
    
    # Get IDs of broadcasts read by this specific user
    read_ids = [
        r.broadcast_id for r in db.query(models.BroadcastRead)
        .filter(models.BroadcastRead.user_id == current_user.id)
        .all()
    ]
    
    result = []
    for b in broadcasts:
        result.append({
            "id": b.id,
            "event_id": b.event_id,
            "message": b.message,
            "created_at": b.created_at,
            "is_read": b.id in read_ids
        })
    return result

@app.post("/events/broadcasts/{broadcast_id}/read")
def mark_broadcast_read(
    broadcast_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    existing = db.query(models.BroadcastRead).filter(
        models.BroadcastRead.broadcast_id == broadcast_id,
        models.BroadcastRead.user_id == current_user.id
    ).first()
    
    if not existing:
        new_read = models.BroadcastRead(broadcast_id=broadcast_id, user_id=current_user.id)
        db.add(new_read)
        db.commit()
        
    return {"status": "success"}

# ---------------------------------------------------------
# GET UNREAD ADMIN REPLIES COUNT FOR STUDENT
# ---------------------------------------------------------
@app.get("/my-unread-replies-count")
def get_my_unread_replies_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Find all comments posted by this student that have an admin reply
    replied_comments = (
        db.query(models.EventComment)
        .filter(
            models.EventComment.user_id == current_user.id,
            models.EventComment.admin_reply != None
        )
        .all()
    )
    
    # Get IDs of comment replies already marked as read by this student
    read_comment_ids = [
        r.comment_id for r in db.query(models.CommentRead)
        .filter(models.CommentRead.user_id == current_user.id)
        .all()
    ]
    
    # Count replies that haven't been read yet
    unread_count = sum(1 for c in replied_comments if c.id not in read_comment_ids)
    
    return {"unread_count": unread_count}


# ---------------------------------------------------------
# MARK COMMENT REPLY AS READ
# ---------------------------------------------------------
@app.post("/events/comments/{comment_id}/read")
def mark_comment_read(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    existing = db.query(models.CommentRead).filter(
        models.CommentRead.comment_id == comment_id,
        models.CommentRead.user_id == current_user.id
    ).first()
    
    if not existing:
        new_read = models.CommentRead(comment_id=comment_id, user_id=current_user.id)
        db.add(new_read)
        db.commit()
        
    return {"status": "success"}    

@app.get("/admin/event-records")
def get_event_records(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)
):
    # Removed status filter to allow listing cancelled events too
    events = db.query(models.Event).all()
    result = []
    for ev in events:
        reg_count = db.query(models.Registration).filter(models.Registration.event_id == ev.id).count()
        result.append({
            "id": ev.id,
            "title": ev.title,
            "description": ev.description,
            "category": ev.category,
            "event_format": ev.event_format,
            "status": ev.status,
            "date_from": ev.date_from,
            "date_to": ev.date_to,
            "registration_deadline": ev.registration_deadline,
            "location_type": ev.location_type,
            "location": ev.location,
            "organization_name": ev.organization_name,
            "banner_url": ev.banner_url,
            "registered_count": reg_count,
            "created_at": ev.created_at
        })
    return result


# --- NEW OTP & REGISTRATION FLOW ROUTES ---

@app.post("/auth/send-otp", dependencies=[Depends(RateLimiter(times=3, seconds=60))])
def send_otp(
    data: schemas.SendOTPRequest,
    db: Session = Depends(get_db)
):
    clean_email = data.email.strip().lower()

    # Check if email is already registered
    existing_user = db.query(models.User).filter(models.User.email == clean_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Generate a random 6-digit OTP
    otp_code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.utcnow() + timedelta(minutes=10) # Valid for 10 minutes

    # Remove any existing unverified OTPs for this email
    db.query(models.OTPVerification).filter(models.OTPVerification.email == clean_email).delete()

    new_otp = models.OTPVerification(
        email=clean_email,
        otp_code=otp_code,
        expires_at=expires_at,
        is_verified=False
    )
    db.add(new_otp)
    db.commit()

    # --- SEND EMAIL VIA SMTP ---
    smtp_host = os.getenv("EMAIL_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("EMAIL_PORT", 465)) # Changed default to 465
    smtp_user = os.getenv("EMAIL_USERNAME")
    smtp_password = os.getenv("EMAIL_PASSWORD")

    if not smtp_user or not smtp_password:
        raise HTTPException(status_code=500, detail="Email server credentials are not configured on the server.")

    try:
        msg = MIMEMultipart()
        msg["From"] = smtp_user
        msg["To"] = clean_email
        msg["Subject"] = "Your Campus Events Verification Code"

        body = f"""
        Hi {data.name},
        
        Your One-Time Password (OTP) for registering on Campus Events Portal is: {otp_code}
        
        This code is valid for 10 minutes. Do not share it with anyone.
        
        Best regards,
        Campus Events Team
        """
        msg.attach(MIMEText(body, "plain"))

        # Use SMTP_SSL instead of SMTP + starttls()
        server = smtplib.SMTP_SSL(smtp_host, smtp_port)
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_user, clean_email, msg.as_string())
        server.quit()

    except Exception as e:
        print("SMTP Email sending error:", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

    return {"status": "success", "message": "OTP sent successfully to your email."}


@app.post("/auth/verify-otp")
def verify_otp(
    data: schemas.VerifyOTPRequest,
    db: Session = Depends(get_db)
):
    clean_email = data.email.strip().lower()
    
    otp_record = (
        db.query(models.OTPVerification)
        .filter(models.OTPVerification.email == clean_email)
        .order_by(models.OTPVerification.id.desc())
        .first()
    )

    if not otp_record:
        raise HTTPException(status_code=400, detail="No OTP request found for this email.")

    if datetime.utcnow() > otp_record.expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    if otp_record.otp_code != data.otp_code.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP code.")

    # Mark as verified
    otp_record.is_verified = True
    db.commit()

    return {"status": "success", "message": "OTP verified successfully."}


@app.post("/auth/complete-register")
def complete_register(
    data: schemas.CompleteRegisterRequest,
    db: Session = Depends(get_db)
):
    clean_email = data.email.strip().lower()

    # Check if already registered
    if db.query(models.User).filter(models.User.email == clean_email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Ensure OTP was verified first
    otp_record = (
        db.query(models.OTPVerification)
        .filter(models.OTPVerification.email == clean_email, models.OTPVerification.is_verified == True)
        .order_by(models.OTPVerification.id.desc())
        .first()
    )

    if not otp_record:
        raise HTTPException(status_code=400, detail="Email not verified with OTP.")

    try:
        hashed_password = utils.get_password_hash(data.password)
        new_user = models.User(
            name=data.name.strip(),
            email=clean_email,
            password_hash=hashed_password,
            role=data.role
        )

        db.add(new_user)
        # Clean up the OTP record after successful registration
        db.query(models.OTPVerification).filter(models.OTPVerification.email == clean_email).delete()
        
        db.commit()
        db.refresh(new_user)

        return {"status": "success", "message": "Account created successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create user")