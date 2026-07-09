import json
import logging
import smtplib
import threading
from email.mime.text import MIMEText
from typing import Optional
from urllib import request as urllib_request

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def _send_via_brevo_api(recipient_email: str, subject: str, body: str) -> bool:
    """Send email via Brevo REST API (HTTPS — port 443, firewall-friendly)."""
    api_key = settings.mail_api_key
    if not api_key:
        return False

    payload = json.dumps({
        "sender": {"email": settings.mail_from},
        "to": [{"email": recipient_email}],
        "subject": subject,
        "htmlContent": body,
    }).encode()

    req = urllib_request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=payload,
        headers={
            "api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )

    try:
        resp = urllib_request.urlopen(req, timeout=15)
        logger.info("Brevo API email sent to %s (status %s)", recipient_email, resp.status)
        return True
    except Exception as e:
        logger.error("Brevo API email failed to %s: %s", recipient_email, e)
        return False


def _send_via_smtp(recipient_email: str, subject: str, body: str) -> bool:
    """Send email via SMTP. Falls back to this if Brevo API is not configured."""
    if not settings.mail_server or not settings.mail_username:
        logger.warning("Email not sent: mail_server or mail_username not configured")
        return False

    msg = MIMEText(body, "html")
    msg["Subject"] = subject
    msg["From"] = settings.mail_from
    msg["To"] = recipient_email

    try:
        if settings.mail_ssl_tls:
            server = smtplib.SMTP_SSL(settings.mail_server, settings.mail_port, timeout=10)
        else:
            server = smtplib.SMTP(settings.mail_server, settings.mail_port, timeout=10)
            if settings.mail_starttls:
                server.starttls()

        server.login(settings.mail_username, settings.mail_password)
        server.sendmail(settings.mail_from, [recipient_email], msg.as_string())
        server.quit()
        logger.info("SMTP email sent successfully to %s", recipient_email)
        return True
    except Exception as e:
        logger.error("SMTP email failed to %s: %s", recipient_email, e)
        return False


def send_decision_email(recipient_email: str, application_number: str, decision: str, reason: Optional[str] = None, applicant_name: Optional[str] = None, loan_amount: Optional[float] = None, loan_type: Optional[str] = None) -> None:
    """Send a decision email in a background thread (non-blocking)."""
    from datetime import date
    name = applicant_name or "Applicant"
    amount_str = f"₹{loan_amount:,.2f}" if loan_amount is not None else "N/A"
    type_str = loan_type or "N/A"
    today = date.today().strftime("%B %d, %Y")

    if decision == "APPROVED":
        subject = f"Application {application_number} - Approved"
        body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: #fff; margin: 0; font-size: 24px;">Application Approved ✓</h1>
            </div>
            <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 12px 12px;">
                <p style="font-size: 16px; line-height: 1.6;">Dear <strong>{name}</strong>,</p>
                <p style="font-size: 16px; line-height: 1.6;">We are pleased to inform you that your loan application has been reviewed and <strong style="color: #059669;">approved</strong>.</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                    <tr><td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Application ID</td><td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">{application_number}</td></tr>
                    <tr><td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Loan Amount</td><td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">{amount_str}</td></tr>
                    <tr><td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Loan Type</td><td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">{type_str}</td></tr>
                    <tr><td style="padding: 10px 12px; color: #6b7280;">Approval Date</td><td style="padding: 10px 12px; font-weight: bold;">{today}</td></tr>
                </table>
                {f'<div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 12px 16px; border-radius: 8px; margin: 16px 0; font-size: 14px; color: #92400e;"><strong>Reason:</strong> {reason}</div>' if reason else ''}
                <p style="font-size: 14px; line-height: 1.6;">Your application has successfully completed our verification and approval process. Our team will contact you shortly regarding the next steps, including document execution and loan disbursement.</p>
                <p style="font-size: 14px; line-height: 1.6;">If you have any questions or require further assistance, please contact our support team.</p>
                <p style="font-size: 14px; line-height: 1.6;">Thank you for choosing our services. We appreciate your trust and look forward to serving you.</p>
                <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 13px; color: #6b7280;">
                    <p style="margin: 2px 0; font-weight: bold; color: #333;">Kind regards,</p>
                    <p style="margin: 2px 0; font-weight: bold; color: #059669;">Loan Approval Team</p>
                    <p style="margin: 2px 0;">Sxna Technologies</p>
                    <p style="margin: 2px 0; font-style: italic;">PolicyPilotAI Platform</p>
                    <p style="margin: 6px 0 2px;">Email: <a href="mailto:support@sxna.com" style="color: #059669;">support@sxna.com</a></p>
                    <p style="margin: 2px 0;">Phone: <a href="tel:+919627776066" style="color: #059669;">+91 96277 76066</a></p>
                </div>
            </div>
        </div>
        """
    else:
        subject = f"Application {application_number} - Update"
        body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <div style="background: linear-gradient(135deg, #dc2626, #ef4444); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: #fff; margin: 0; font-size: 24px;">Application Update</h1>
            </div>
            <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 12px 12px;">
                <p style="font-size: 16px; line-height: 1.6;">Dear <strong>{name}</strong>,</p>
                <p style="font-size: 16px; line-height: 1.6;">Your loan application has been reviewed and we regret to inform you that it could not be approved at this time.</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                    <tr><td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Application ID</td><td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">{application_number}</td></tr>
                    <tr><td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Loan Amount</td><td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">{amount_str}</td></tr>
                    <tr><td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Loan Type</td><td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">{type_str}</td></tr>
                    <tr><td style="padding: 10px 12px; color: #6b7280;">Review Date</td><td style="padding: 10px 12px; font-weight: bold;">{today}</td></tr>
                </table>
                {f'<div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 12px 16px; border-radius: 8px; margin: 16px 0; font-size: 14px; color: #92400e;"><strong>Reason:</strong> {reason}</div>' if reason else ''}
                <p style="font-size: 14px; line-height: 1.6;">We understand this may be disappointing. If you would like to discuss this decision or need clarification, please contact our support team who will be happy to assist you.</p>
                <p style="font-size: 14px; line-height: 1.6;">Thank you for considering our services.</p>
                <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 13px; color: #6b7280;">
                    <p style="margin: 2px 0; font-weight: bold; color: #333;">Kind regards,</p>
                    <p style="margin: 2px 0; font-weight: bold; color: #dc2626;">Loan Approval Team</p>
                    <p style="margin: 2px 0;">Sxna Technologies</p>
                    <p style="margin: 2px 0; font-style: italic;">PolicyPilotAI Platform</p>
                    <p style="margin: 6px 0 2px;">Email: <a href="mailto:support@sxna.com" style="color: #059669;">support@sxna.com</a></p>
                    <p style="margin: 2px 0;">Phone: <a href="tel:+919627776066" style="color: #059669;">+91 96277 76066</a></p>
                </div>
            </div>
        </div>
        """

    def _send():
        # Try Brevo API first (works behind firewalls, uses port 443)
        if _send_via_brevo_api(recipient_email, subject, body):
            return
        # Fall back to SMTP
        _send_via_smtp(recipient_email, subject, body)

    thread = threading.Thread(target=_send, daemon=True)
    thread.start()