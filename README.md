# ZK KYC - Zero-Knowledge Age Verification

Учебный пример системы проверки возраста (18+) с использованием zero-knowledge доказательств.

## Архитектура

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Frontend  │─────▶│    Circuit   │─────▶│   Backend   │
│  (snarkJS)  │      │   (Circom)   │      │   (Golang)  │
└─────────────┘      └──────────────┘      └─────────────┘
     │                      │                      │
     │  1. Ввод даты        │                      │
     │     рождения         │                      │
     │                      │                      │
     │  2. Генерация        │                      │
     │     доказательства   │                      │
     │─────────────────────▶│                      │
     │                      │                      │
     │                      │  3. Отправка proof   │
     │                      │─────────────────────▶│
     │                      │                      │
     │                      │  4. Верификация      │
     │                      │◀─────────────────────│
     │                      │                      │
     │  5. Результат        │                      │
     │◀─────────────────────│                      │
     │                      │                      │
```

## Компоненты

### 1. Circom Circuit (`circuits/circuit.circom`)
- Схема для доказательства что возраст >= 18
- Использует компаратор из circomlib
- Публичный вход: threshold (18)
- Приватный вход: age (реальный возраст пользователя)

### 2. Frontend (`frontend/`)
- HTML + JavaScript с snarkJS
- Генерация ZK-proof в браузере
- Не раскрывает точный возраст

### 3. Backend (`backend/`)
- Golang сервер
- Верификация доказательств
- REST API для проверки

## Быстрый старт

### Требования
- Go 1.21+
- Node.js 18+
- Circom (для компиляции схем)
- snarkjs

### 1. Компиляция схемы

```bash
cd circuits
./compile.sh
```

Это создаст:
- `circuit.wasm` - для генерации proof
- `circuit_final.zkey` - proving key
- `../keys/verification_key.json` - verification key

### 2. Запуск бэкенда

```bash
cd backend
go run main.go
```

Сервер запустится на порту 8080.

### 3. Запуск фронта

Откройте `frontend/index.html` в браузере или используйте локальный сервер:

```bash
cd frontend
python3 -m http.server 3000
```

## API

### POST /api/verify

Проверка ZK доказательства.

**Request:**
```json
{
  "proof": {
    "pi_a": ["...", "...", "..."],
    "pi_b": [["...", "..."], ["...", "..."], ["...", "..."]],
    "pi_c": ["...", "..."]
  },
  "pubSignals": ["1"]
}
```

**Response:**
```json
{
  "verified": true,
  "message": "User is 18+ years old (verified via ZK)"
}
```

### GET /api/health

Проверка статуса сервера.

## Как это работает

1. Пользователь вводит дату рождения
2. Frontend вычисляет возраст
3. Генерируется ZK-proof что возраст >= 18
4. Proof отправляется на backend
5. Backend верифицирует proof без знания точного возраста
6. Возвращается результат верификации

## Безопасность и приватность

✅ **Что скрыто:**
- Точная дата рождения
- Точный возраст
- Любые персональные данные

✅ **Что известно:**
- Факт того что пользователь 18+ (или нет)

## Структура проекта

```
zk-kyc/
├── backend/
│   ├── main.go           # Golang сервер
│   ├── go.mod            # Go модуль
│   └── bin/server        # Скомпилированный бинарник
├── frontend/
│   ├── index.html        # UI страница
│   └── app.js            # Логика snarkJS
├── circuits/
│   ├── circuit.circom    # Circom схема
│   ├── compile.sh        # Скрипт компиляции
│   └── circuit.wasm      # (после компиляции)
├── keys/
│   └── verification_key.json  # (после компиляции)
└── README.md
```

## Демо режим

Если файлы схемы ещё не скомпилированы, frontend работает в демо режиме:
- Генерируются фиктивные proof
- Верификация происходит локально
- Позволяет тестировать UI без полной настройки

## Следующие шаги

1. ✅ Бэкенд на Golang - готов
2. ✅ Фронтенд на JavaScript/snarkJS - готов
3. ✅ Circom схема - готова
4. ⏳ Компиляция схемы (требует установки circom)
5. ⏳ Интеграционное тестирование

## Ресурсы

- [Circom Documentation](https://docs.circom.io/)
- [snarkJS GitHub](https://github.com/iden3/snarkjs)
- [Zero-Knowledge Proofs Explained](https://zokrates.io/)
