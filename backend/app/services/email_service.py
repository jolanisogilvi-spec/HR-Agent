import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import List, Optional
from app.services.settings_service import runtime_settings_service

logger = logging.getLogger(__name__)


class EmailService:

    def _send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        try:
            email_config = runtime_settings_service.get_email_config()
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{email_config['smtp_from_name']} <{email_config['smtp_from_email']}>"
            msg["To"] = to_email

            part = MIMEText(html_content, "html", "utf-8")
            msg.attach(part)

            with smtplib.SMTP(email_config["smtp_host"], email_config["smtp_port"]) as server:
                server.starttls()
                server.login(email_config["smtp_user"], email_config["smtp_password"])
                server.sendmail(email_config["smtp_from_email"], to_email, msg.as_string())

            logger.info(f"邮件发送成功: {to_email} - {subject}")
            return True
        except Exception as e:
            logger.error(f"邮件发送失败: {to_email} - {e}")
            return False

    def send_interview_invitation(
        self,
        to_email: str,
        candidate_name: str,
        job_title: str,
        interview_times: List[datetime],
        interviewer_name: Optional[str] = None,
        meeting_link: Optional[str] = None,
        location: Optional[str] = None,
    ) -> bool:
        times_html = "".join(
            f"<li>选项{i+1}：{t.strftime('%Y年%m月%d日 %H:%M')}</li>"
            for i, t in enumerate(interview_times)
        )
        interviewer_info = f"<p><strong>面试官：</strong>{interviewer_name}</p>" if interviewer_name else ""
        location_info = f"<p><strong>面试地点：</strong>{location}</p>" if location else ""
        link_info = f'<p><strong>会议链接：</strong><a href="{meeting_link}">{meeting_link}</a></p>' if meeting_link else ""

        email_config = runtime_settings_service.get_email_config()
        html_content = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Microsoft YaHei', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f0f7ff; padding: 20px; border-radius: 8px; border-left: 4px solid #1890ff;">
    <h2 style="color: #1890ff; margin-top: 0;">面试邀约通知</h2>
    <p>尊敬的 <strong>{candidate_name}</strong> 您好，</p>
    <p>感谢您对 <strong>{job_title}</strong> 职位的申请！经过我们的初步筛选，我们很高兴地通知您，您已通过简历筛选阶段，现邀请您参加面试。</p>
    <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
      <h3 style="margin-top: 0; color: #333;">面试安排</h3>
      {interviewer_info}
      {location_info}
      {link_info}
      <p><strong>候选面试时间（请选择其中一个）：</strong></p>
      <ul>{times_html}</ul>
    </div>
    <p>请回复此邮件确认您方便的时间，或通过系统链接进行确认。</p>
    <p style="color: #666; font-size: 14px;">如有任何问题，欢迎随时与我们联系。</p>
    <p>祝好，<br><strong>{email_config['smtp_from_name']}</strong></p>
  </div>
</body>
</html>"""
        return self._send_email(to_email, f"面试邀约 - {job_title}", html_content)

    def send_interview_pass_notification(
        self, to_email: str, candidate_name: str, job_title: str
    ) -> bool:
        email_config = runtime_settings_service.get_email_config()
        html_content = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Microsoft YaHei', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f6ffed; padding: 20px; border-radius: 8px; border-left: 4px solid #52c41a;">
    <h2 style="color: #52c41a; margin-top: 0;">恭喜您通过面试！</h2>
    <p>尊敬的 <strong>{candidate_name}</strong> 您好，</p>
    <p>恭喜您！经过面试评估，您已成功通过 <strong>{job_title}</strong> 职位的面试。</p>
    <p>我们的HR团队将在近期与您联系，讨论后续的入职安排事宜，请保持手机畅通。</p>
    <p>期待与您共事！</p>
    <p>祝好，<br><strong>{email_config['smtp_from_name']}</strong></p>
  </div>
</body>
</html>"""
        return self._send_email(to_email, f"面试结果通知 - {job_title}", html_content)

    def send_rejection_notification(
        self, to_email: str, candidate_name: str, job_title: str
    ) -> bool:
        email_config = runtime_settings_service.get_email_config()
        html_content = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Microsoft YaHei', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #fff7e6; padding: 20px; border-radius: 8px; border-left: 4px solid #fa8c16;">
    <h2 style="color: #fa8c16; margin-top: 0;">感谢您的申请</h2>
    <p>尊敬的 <strong>{candidate_name}</strong> 您好，</p>
    <p>感谢您对 <strong>{job_title}</strong> 职位的申请及对我们公司的关注。</p>
    <p>经过认真评估，我们认为目前该职位与您的背景暂时不是最佳匹配。但我们非常感谢您付出的时间和精力，也相信您一定能找到更适合您的机会。</p>
    <p>我们会将您的简历保存在人才库中，如有合适机会我们将主动联系您。</p>
    <p>祝您求职顺利！</p>
    <p>祝好，<br><strong>{email_config['smtp_from_name']}</strong></p>
  </div>
</body>
</html>"""
        return self._send_email(to_email, f"申请结果通知 - {job_title}", html_content)


email_service = EmailService()
