import firebase_admin
from firebase_admin import credentials, firestore
import os
from app.core.config import settings

# Initialize Firebase Admin
try:
    firebase_admin.get_app()
except ValueError:
    # Uses Application Default Credentials (ADC) with explicit project ID option
    firebase_admin.initialize_app(options={'projectId': settings.FIREBASE_PROJECT_ID})

db = firestore.client()
