import os

DATABASE_URL = os.environ["DATABASE_URL"]
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
SECRET_KEY = os.environ["SECRET_KEY"]
# true в продакшене (HTTPS): cookie авторизации не уйдёт по HTTP
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false") == "true"
# тесты: задачи Celery выполняются сразу, без воркера
CELERY_EAGER = os.environ.get("CELERY_EAGER") == "1"
