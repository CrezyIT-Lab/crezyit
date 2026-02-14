#!/bin/bash
echo "🚀 CrazyIT Update..."
cd ~/crazyit

# Спри услугите
echo "⏸️  Спиране на услугите..."
sudo systemctl stop crazyit-web 2>/dev/null
sudo systemctl stop crazyit-ai 2>/dev/null

# Провери за git
if [ -d ".git" ]; then
    echo "📥 Git pull..."
    git pull origin main
else
    echo "⚠️  Няма Git repository - пропускам"
fi

# Инсталирай зависимости
echo "📦 Инсталиране на зависимости..."
bun install

# Обнови базата данни
echo "🗄️  Обновяване на базата данни..."
npx prisma db push --accept-data-loss
npx prisma generate

# Рестартирай услугите
echo "🔄 Рестартиране..."
sudo systemctl daemon-reload
sudo systemctl start crazyit-ai
sudo systemctl start crazyit-web

echo ""
echo "✅ Готово! Отворете: http://192.168.1.5:5000"
