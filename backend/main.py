from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO
from PIL import Image
import io
import numpy as np
from typing import List

# --- Response shapes ---
class DetectedObject(BaseModel):
    label: str
    confidence: float
    bbox: List[float]

class AnalysisResponse(BaseModel):
    filename: str
    model_used: str
    objects_detected: int
    detections: List[DetectedObject]

# --- App setup ---
app = FastAPI(title="VisionAPI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# loads once when server starts, not on every request
model = YOLO("yolov8n.pt")
print("Model loaded")

# --- Endpoints ---
@app.get("/health")
def health():
    return {"status": "ok", "model": "yolov8n"}


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze(file: UploadFile = File(...)):

    if file.content_type not in ["image/jpeg", "image/png", "image/jpg", "image/webp"]:
        raise HTTPException(status_code=400, detail="Upload an image file")

    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    image_np = np.array(image)

    results = model(image_np)
    detections = []

    for box in results[0].boxes:
        detections.append(DetectedObject(
            label=model.names[int(box.cls[0])],
            confidence=round(float(box.conf[0]), 3),
            bbox=[round(x, 1) for x in box.xyxy[0].tolist()]
        ))

    return AnalysisResponse(
        filename=file.filename,
        model_used="yolov8n",
        objects_detected=len(detections),
        detections=detections
    )