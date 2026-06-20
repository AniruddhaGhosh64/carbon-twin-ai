import firebase_admin
from firebase_admin import credentials, firestore
import os
from app.core.config import settings

# Initialize Firebase Admin
try:
    firebase_admin.get_app()
except ValueError:
    if settings.FIREBASE_CREDENTIALS_PATH and os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        firebase_admin.initialize_app(cred)
    else:
        # Falls back to Application Default Credentials (ADC) with explicit project ID option
        firebase_admin.initialize_app(options={'projectId': settings.FIREBASE_PROJECT_ID})

db = firestore.client()
