# 智能 HR Agent

AI 驱动的招聘自动化系统，涵盖岗位发布、简历解析、智能筛选、人才库管理到面试调度的全流程。

## 技术栈

- **前端**：React 18 + TypeScript + Ant Design 5 + ECharts 5
- **后端**：Python 3.11 + FastAPI + SQLAlchemy 2
- **数据库**：PostgreSQL 16 + Redis 7
- **AI**：DeepSeek API (deepseek-v4)，兼容 OpenAI 接口协议
- **文档解析**：PyMuPDF (PDF) + python-docx (DOCX)
- **任务队列**：Celery + Redis
- **文件监控**：watchdog

## 目录结构

```
HR-Agent/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 入口
│   │   ├── config.py            # 配置管理
│   │   ├── database.py          # 数据库连接
│   │   ├── models/              # SQLAlchemy ORM 模型
│   │   ├── routes/              # API 路由
│   │   │   ├── jobs.py          # 岗位管理
│   │   │   ├── resumes.py       # 简历管理
│   │   │   └── interviews.py    # 面试管理
│   │   ├── services/            # 业务服务层
│   │   │   ├── ai_service.py    # OpenAI 兼容模型集成
│   │   │   ├── document_parser.py  # 文档解析
│   │   │   ├── email_service.py    # 邮件服务
│   │   │   ├── file_watcher.py     # 文件夹监控
│   │   │   └── pipeline_service.py # 招聘流程管理
│   │   └── tasks/
│   │       └── celery_tasks.py  # 异步任务
│   ├── requirements.txt
│   └── celery_worker.py
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard/       # 数据看板
│   │   │   ├── Jobs/            # 岗位管理
│   │   │   ├── Resumes/         # 人才库
│   │   │   └── Interviews/      # 面试管理
│   │   ├── services/api.ts      # API 调用层
│   │   └── types/index.ts       # TypeScript 类型
│   └── package.json
├── docker-compose.yml
└── .env.example
```

## 快速启动

### 1. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入以下必填项：
# AI_API_KEY=your_ai_api_key
# AI_BASE_URL=https://api.deepseek.com
# AI_MODEL=deepseek-v4-pro
# SMTP_USER, SMTP_PASSWORD（可选，用于邮件通知）
```

### 2. 启动数据库服务

```bash
docker-compose up -d
```

### 3. 启动后端

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp ../.env.example .env         # 编辑 .env 填入配置
uvicorn app.main:app --reload --port 8000
```

### 4. 启动 Celery Worker（可选，用于异步任务）

```bash
# 新开一个终端，在 backend 目录下
celery -A app.tasks.celery_tasks.celery_app worker --loglevel=info
```

### 5. 启动前端

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173 打开系统界面。

API 文档：http://localhost:8000/docs

## 功能模块

| 模块 | 功能 |
|------|------|
| 岗位管理 | 新建/编辑/删除岗位，一键生成岗位草稿和 AI 评估标准 |
| 简历解析 | 上传 PDF/DOCX 自动解析，文件夹监控自动入库 |
| AI 智能匹配 | OpenAI 兼容模型提取简历信息，按岗位打分（0-100），生成评估报告 |
| 人才库 | 多维筛选，雷达图技能对比，工作经历时间轴 |
| 面试调度 | 智能推荐时间，自动发送邀约/通过/淘汰邮件 |
| 数据看板 | 招聘漏斗图，投递趋势，岗位分布统计 |

## 环境变量说明

详见 `.env.example`，核心配置项：

| 变量 | 说明 | 必填 |
|------|------|------|
| `AI_API_KEY` | DeepSeek API 密钥 | ✅ |
| `AI_BASE_URL` | OpenAI 格式 Base URL（默认 `https://api.deepseek.com`） | ✅ |
| `AI_MODEL` | 模型名称（默认 `deepseek-v4-pro`）| ✅ |
| `DATABASE_URL` | PostgreSQL 连接串 | ✅ |
| `REDIS_URL` | Redis 连接串 | ✅ |
| `SMTP_HOST/USER/PASSWORD` | 邮件服务器配置 | 可选 |
| `RESUME_WATCH_DIR` | 简历监控文件夹路径 | 可选 |
