import random
import re
import socket
from django.conf import settings
from django.core.mail import send_mail

# Blocklist of popular disposable / temporary email domains
DISPOSABLE_DOMAINS = {
    "tempmail.com", "temp-mail.org", "temp-mail.io", "tempmailo.com",
    "mailinator.com", "mailinator.net", "mailinator2.com",
    "10minutemail.com", "10minutemail.net", "10minmail.com",
    "guerrillamail.com", "guerrillamail.net", "guerrillamail.biz", "guerrillamail.org",
    "sharklasers.com", "grr.la", "guerrillamailblock.com",
    "trashmail.com", "trashmail.net", "trashmail.org",
    "yopmail.com", "yopmail.fr", "yopmail.net",
    "dispostable.com", "getairmail.com", "fakeinbox.com",
    "throwawaymail.com", "mytemp.email", "mohmal.com",
    "crazymailing.com", "generator.email", "armyspy.com",
    "cuvox.de", "dayrep.com", "einrot.com", "fleckens.hu",
    "gustr.com", "jourrapide.com", "rhyta.com", "superrito.com",
    "teleworm.us", "inboxkitten.com", "burnermail.io",
}


def is_disposable_domain(email: str) -> bool:
    """Checks if the email domain is in the known disposable/throwaway blocklist."""
    if not email or "@" not in email:
        return False
    domain = email.strip().split("@")[-1].lower()
    return domain in DISPOSABLE_DOMAINS


def validate_email_deliverability(email: str) -> tuple[bool, str]:
    """
    Validates format, checks disposable blocklist, and optionally verifies domain DNS.
    Returns (is_valid, error_message).
    """
    email = email.strip().lower()
    pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    if not re.match(pattern, email):
        return False, "Invalid email address format."

    domain = email.split("@")[-1]

    # Check throwaway / disposable domains
    if is_disposable_domain(email):
        return False, f"Disposable email domain '@{domain}' is not allowed. Please use a permanent email address."

    # Verify domain has valid DNS structure
    try:
        # Check if domain resolves
        socket.gethostbyname(domain)
    except (socket.gaierror, socket.herror, Exception):
        return False, f"The email domain '@{domain}' does not exist or cannot receive mail."

    return True, ""


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validates password strength:
    - Minimum 8 characters (8+ characters)
    - At least one uppercase letter [A-Z]
    - At least one lowercase letter [a-z]
    - At least one numeric digit [0-9]
    - At least one special symbol [!@#$%^&*(),.?":{}|<>\-_=+[\]\\;/`~]
    """
    if not password or len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter (A-Z)."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter (a-z)."
    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least one number (0-9)."
    if not re.search(r'[!@#$%^&*(),.?":{}|<>\-_=+[\]\\;/`~]', password):
        return False, "Password must contain at least one special symbol (e.g. @, #, $, %, !, *)."
    return True, ""


def generate_otp_code(length: int = 6) -> str:
    """Generates a secure numeric verification code (e.g. 849201)."""
    return "".join([str(random.randint(0, 9)) for _ in range(length)])


def send_verification_email(email: str, code: str, purpose: str = "REGISTRATION", username: str = "") -> bool:
    """
    Dispatches a formatted verification email with the 6-digit OTP code.
    Uses Django's send_mail (console backend in dev, SMTP in prod).
    """
    subject = "Jira Software - Your Verification Code"
    if purpose == "PASSWORD_RESET":
        subject = "Jira Software - Password Reset Code"

    purpose_text = "verify your email address and activate your account" if purpose == "REGISTRATION" else "reset your account password"

    message = f"""Hello {username or 'there'},

Your Jira Software verification code is:

    ======================
           {code}
    ======================

Use this 6-digit code to {purpose_text}.
This code is valid for 15 minutes.

If you did not request this code, please ignore this email.

Best regards,
The Jira Software Team
"""

    html_message = f"""
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #DFE1E6; border-radius: 8px; background: #FFFFFF;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
            <h2 style="color: #0052CC; margin: 0;">Jira Software</h2>
        </div>
        <h3 style="color: #172B4D; margin-top: 0;">{ 'Activate Your Account' if purpose == 'REGISTRATION' else 'Reset Your Password' }</h3>
        <p style="color: #42526E; font-size: 14px; line-height: 1.5;">
            Use the 6-digit verification code below to {purpose_text}:
        </p>
        <div style="background: #F4F5F7; border: 2px dashed #0052CC; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
            <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0052CC;">{code}</span>
        </div>
        <p style="color: #6B778C; font-size: 13px;">
            ⏰ This code will expire in <strong>15 minutes</strong>.
        </p>
        <hr style="border: none; border-top: 1px solid #EBECF0; margin: 24px 0;" />
        <p style="color: #8993A4; font-size: 12px; margin: 0;">
            If you did not request this email, you can safely ignore it.
        </p>
    </div>
    """

    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@jira-software.local")

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=[email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"[Email Dispatch Error]: {e}")
        return False
