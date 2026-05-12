import os
import time
import logging
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from app.services.settings_service import runtime_settings_service
from app.tasks.celery_tasks import process_resume_file

logger = logging.getLogger(__name__)


class ResumeFileHandler(FileSystemEventHandler):
    SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".doc"}

    def on_created(self, event):
        if event.is_directory:
            return
        file_path = event.src_path
        ext = Path(file_path).suffix.lower()
        if ext in self.SUPPORTED_EXTENSIONS:
            logger.info(f"检测到新简历文件: {file_path}")
            time.sleep(1)
            process_resume_file.delay(file_path, job_id=None)


class FileWatcher:
    def __init__(self):
        self.observer = None

    def start(self):
        watch_dir = runtime_settings_service.get_value("RESUME_WATCH_DIR")
        os.makedirs(watch_dir, exist_ok=True)

        event_handler = ResumeFileHandler()
        self.observer = Observer()
        self.observer.schedule(event_handler, watch_dir, recursive=False)
        self.observer.start()
        logger.info(f"文件监控已启动，监控目录: {watch_dir}")

    def stop(self):
        if self.observer:
            self.observer.stop()
            self.observer.join()
            logger.info("文件监控已停止")


file_watcher = FileWatcher()
