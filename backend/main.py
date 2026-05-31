from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ultralytics import YOLO
from PIL import Image
from datetime import datetime, timedelta
from typing import List, Optional
from dotenv import load_dotenv
import io
import numpy as np
import base64
import cv2
import os
import torch
from database import get_db, engine
from models import User, Analysis, Base
from passlib.context import CryptContext
from jose import JWTError, jwt

load_dotenv()

Base.metadata.create_all(bind=engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

class DetectedObject(BaseModel):
    label: str
    confidence: float
    bbox: List[float]

class AnalysisResponse(BaseModel):
    filename: str
    model_used: str
    objects_detected: int
    detections: List[DetectedObject]
    annotated_image: Optional[str] = None

class UserCreate(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

app = FastAPI(title="VisionAPI", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_original_torch_load = torch.load
def patched_torch_load(f, *args, **kwargs):
    if 'weights_only' not in kwargs:
        kwargs['weights_only'] = False
    return _original_torch_load(f, *args, **kwargs)
torch.load = patched_torch_load

model = YOLO("yolov8s.pt")
print("Model loaded")

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str):
    return pwd_context.verify(plain, hashed)

def create_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@app.get("/health")
def health():
    return {"status": "ok", "model": "yolov8s", "version": "2.0.0"}

@app.post("/register", status_code=201)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=user_data.email,
        hashed_password=hash_password(user_data.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "Account created", "email": user.email}

@app.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Wrong email or password")
    token = create_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if file.content_type not in ["image/jpeg", "image/png", "image/jpg", "image/webp"]:
        raise HTTPException(status_code=400, detail="Upload an image file")

    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    image_np = np.array(image)

    results = model(image_np)
    detections = []
    annotated = image_np.copy()

    for box in results[0].boxes:
        label = model.names[int(box.cls[0])]
        confidence = round(float(box.conf[0]), 3)
        bbox = [round(x, 1) for x in box.xyxy[0].tolist()]

        detections.append(DetectedObject(
            label=label,
            confidence=confidence,
            bbox=bbox
        ))

        x1, y1, x2, y2 = int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])
        color = (59, 130, 246)
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 1)

        label_text = f"{label} {confidence:.0%}"
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.45
        text_thickness = 1
        (text_width, text_height), baseline = cv2.getTextSize(label_text, font, font_scale, text_thickness)
        text_top = max(y1 - text_height - baseline - 6, 0)
        text_bottom = text_top + text_height + baseline + 6
        text_right = min(x1 + text_width + 8, annotated.shape[1] - 1)

        cv2.rectangle(annotated, (x1, text_top), (text_right, text_bottom), color, -1)
        cv2.putText(
            annotated,
            label_text,
            (x1 + 4, text_bottom - 4),
            font,
            font_scale,
            (255, 255, 255),
            text_thickness,
            cv2.LINE_AA
        )

    _, buffer = cv2.imencode(".jpg", cv2.cvtColor(annotated, cv2.COLOR_RGB2BGR))
    annotated_b64 = base64.b64encode(buffer).decode("utf-8")

    analysis = Analysis(
        user_id=current_user.id,
        filename=file.filename,
        objects_detected=len(detections)
    )
    db.add(analysis)
    db.commit()

    return AnalysisResponse(
        filename=file.filename,
        model_used="yolov8s",
        objects_detected=len(detections),
        detections=detections,
        annotated_image=annotated_b64
    )

@app.get("/history")
def history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    analyses = db.query(Analysis).filter(Analysis.user_id == current_user.id).all()
    return [
        {
            "id": a.id,
            "filename": a.filename,
            "objects_detected": a.objects_detected,
            "created_at": a.created_at
        }
        for a in analyses
    ]