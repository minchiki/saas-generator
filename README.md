# CardGen

Генератор продающих карточек товаров для Wildberries и Ozon: заголовок, описание, преимущества и SEO-ключи. Next.js + Tailwind CSS, генерация текста через OpenRouter.

## Запуск

```bash
npm install
cp .env.example .env.local   # и впишите OPENROUTER_API_KEY
npm run dev
```

Приложение откроется на http://localhost:3000.

## Переменные окружения

| Переменная | Обязательна | Описание |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | да | Ключ OpenRouter: https://openrouter.ai/keys |
| `OPENROUTER_MODEL` | нет | Основная модель; по умолчанию `google/gemma-2-9b-it:free`, запасные заданы в `src/app/api/generate/route.ts` |
