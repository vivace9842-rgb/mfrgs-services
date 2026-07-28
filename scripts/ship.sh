#!/usr/bin/env bash
set -e

MSG=${1:-"feat: automated infrastructure update v1.3.0"}

echo "================================================="
echo "🔍 1/4 - Verificando Tipagem TypeScript..."
echo "================================================="
npx tsc --noEmit

echo "================================================="
echo "📦 2/4 - Compilando Projeto (Build de Produção)..."
echo "================================================="
npm run build

echo "================================================="
echo "🛡️ 3/4 - Adicionando Alterações ao Git..."
echo "================================================="
git add .

echo "================================================="
echo "🚀 4/4 - Executando Commit e Envio Global..."
echo "================================================="
git commit -m "$MSG" || echo "Nenhuma alteração para commitar."
git push origin master

echo "================================================="
echo "✅ PIPELINE CONCLUÍDO COM SUCESSO!"
echo "🌐 Deploy acionado na Vercel e GitHub Actions."
echo "================================================="
