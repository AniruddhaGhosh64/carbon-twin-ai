import datetime
import bcrypt
from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.user import UserRegisterRequest, UserLoginRequest, GoogleLoginRequest, UserResponse
from app.repositories.user_repository import UserRepository
from app.core.security import rate_limiter

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
user_repo = UserRepository()

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except ValueError:
        return False

@router.post("/register", response_model=UserResponse, dependencies=[Depends(rate_limiter(limit=3, timeframe=60))])
def register_user(request: UserRegisterRequest):

    existing_user = user_repo.get_user_by_email(request.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    hashed_pw = hash_password(request.password)
    user_data = {
        "email": request.email.lower(),
        "name": request.name,
        "hashed_password": hashed_pw,
        "providers": ["local"],
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
        "image": None
    }

    created = user_repo.create_user(user_data)
    return UserResponse(
        id=created["id"],
        email=created["email"],
        name=created["name"],
        providers=created["providers"],
        created_at=created["created_at"],
        image=created["image"]
    )

@router.post("/login", response_model=UserResponse, dependencies=[Depends(rate_limiter(limit=5, timeframe=60))])
def login_user(request: UserLoginRequest):
    user = user_repo.get_user_by_email(request.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address."
        )

    if "local" not in user.get("providers", []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account is registered with Google. Please use Google Login."
        )

    hashed_password = user.get("hashed_password")
    if not hashed_password or not verify_password(request.password, hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or password."
        )

    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        providers=user["providers"],
        created_at=user["created_at"],
        image=user.get("image")
    )

@router.post("/google-login", response_model=UserResponse, dependencies=[Depends(rate_limiter(limit=5, timeframe=60))])
def google_login_user(request: GoogleLoginRequest):
    user = user_repo.get_user_by_email(request.email)
    
    if user:
        # User exists, support linking Google if not already linked
        providers = list(user.get("providers", []))
        updated = False
        if "google" not in providers:
            providers.append("google")
            user_repo.update_user_providers(request.email, providers)
            user["providers"] = providers
            updated = True
        
        # Optionally update profile picture if it was missing
        if request.image and not user.get("image"):
            user_repo.collection.document(request.email.lower()).update({
                "image": request.image
            })
            user["image"] = request.image
            
        return UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            providers=user["providers"],
            created_at=user["created_at"],
            image=user.get("image")
        )
    else:
        # Create a new Google account
        user_data = {
            "email": request.email.lower(),
            "name": request.name,
            "hashed_password": None,
            "providers": ["google"],
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
            "image": request.image
        }
        
        created = user_repo.create_user(user_data)
        return UserResponse(
            id=created["id"],
            email=created["email"],
            name=created["name"],
            providers=created["providers"],
            created_at=created["created_at"],
            image=created["image"]
        )
