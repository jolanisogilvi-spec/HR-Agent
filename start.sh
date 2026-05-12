#!/bin/bash
set -e

echo "=========================================="
echo "  智能 HR Agent 启动脚本"
echo "=========================================="

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "[1/5] 未检测到 .env 文件，从 .env.example 复制..."
    cp .env.example .env
    echo "      请编辑 .env 文件，填入 ANTHROPIC_API_KEY 等必填配置后重新运行。"
    exit 1
fi

echo "[1/5] 配置文件已就绪"

# 启动 Docker 服务
echo "[2/5] 启动 PostgreSQL 和 Redis..."
docker-compose up -d
sleep 3

# 安装后端依赖并启动
echo "[3/5] 安装后端依赖..."
cd backend

if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate

pip install -r requirements.txt -q

# 复制 .env
if [ ! -f ".env" ]; then
    cp ../.env .env
fi

echo "[4/5] 启动后端 API 服务（端口 8000）..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

echo "      启动 Celery Worker..."
celery -A app.tasks.celery_tasks.celery_app worker --loglevel=warning &
CELERY_PID=$!

cd ..

# 安装前端依赖并启动
echo "[5/5] 安装前端依赖并启动开发服务器（端口 5173）..."
cd frontend

if [ ! -d "node_modules" ]; then
    npm install
fi

npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo "=========================================="
echo "  启动完成！"
echo "  前端界面：http://localhost:5173"
echo "  API 文档：http://localhost:8000/docs"
echo "=========================================="
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待并处理退出信号
trap "kill $BACKEND_PID $CELERY_PID $FRONTEND_PID 2>/dev/null; docker-compose stop" INT TERM
wait
