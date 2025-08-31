# Тестирование

## Запуск автотестов

```bash
# Все тесты
npm test

# Валидационные тесты
npm run test:validation

# Интеграционные тесты
npm run test:integration
```

## Ручные тесты API

Запустить сервер:

```bash
npm run dev
```

## Базовые тесты приложения

### 1. Health check - возвращает статус ОК

```bash
curl http://localhost:3000/health
# Ожидаем: {"status":"ОК"}
```

### 2. Информация об API

```bash
curl http://localhost:3000/
# Ожидаем: {"message":"API социальной платформы","version":"1.0.0"}
```

### 3. 404 для несуществующих маршрутов

```bash
curl http://localhost:3000/nonexistent-route
# Ожидаем: 404, {"error":"Не найдено"}
```

## Валидационные тесты

### 4. Регистрация с пустыми полями

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{}'
# Ожидаем: 400, {"error":"Заполните все поля"}
```

### 5. Регистрация с коротким паролем

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"123"}'
# Ожидаем: 400, {"error":"Пароль должен быть минимум 6 символов"}
```

### 6. Регистрация без email

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'
# Ожидаем: 400, {"error":"Заполните все поля"}
```

### 7. Вход с пустыми полями

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{}'
# Ожидаем: 400, {"error":"Введите логин и пароль"}
```

### 8. Вход без пароля

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser"}'
# Ожидаем: 400, {"error":"Введите логин и пароль"}
```

### 9. Вход без имени пользователя

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"password123"}'
# Ожидаем: 400, {"error":"Введите логин и пароль"}
```

### 10. Профиль без токена

```bash
curl http://localhost:3000/auth/profile
# Ожидаем: 401, {"error":"Токен отсутствует"}
```

### 11. Профиль с неверным токеном

```bash
curl -H "Authorization: Bearer invalidtoken" http://localhost:3000/auth/profile
# Ожидаем: 401, {"error":"Неверный токен"}
```

### 12. Профиль без Bearer префикса

```bash
curl -H "Authorization: sometoken" http://localhost:3000/auth/profile
# Ожидаем: 401, {"error":"Неверный токен"}
```

### 13. Профиль с пустым заголовком

```bash
curl -H "Authorization: " http://localhost:3000/auth/profile
# Ожидаем: 401, {"error":"Токен отсутствует"}
```

### 14. POST к несуществующему auth роуту

```bash
curl -X POST http://localhost:3000/auth/unknown \
  -H "Content-Type: application/json" \
  -d '{}'
# Ожидаем: 404, {"error":"Не найдено"}
```

### 15. GET к несуществующему auth роуту

```bash
curl http://localhost:3000/auth/unknown
# Ожидаем: 404, {"error":"Не найдено"}
```

## Интеграционные тесты

### 16. Успешная регистрация пользователя

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser123","email":"test123@example.com","password":"securepassword"}'
# Ожидаем: 201, {"message":"Регистрация успешна","token":"...","user":{...}}
```

### 17. Успешная авторизация пользователя

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser123","password":"securepassword"}'
# Ожидаем: 200, {"message":"Вход успешен","token":"...","user":{...}}
```

### 18. Авторизация по email

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test123@example.com","password":"securepassword"}'
# Ожидаем: 200, {"message":"Вход успешен",...}
```

### 19. Получение профиля с токеном (замени TOKEN на реальный)

```bash
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/auth/profile
# Ожидаем: 200, {"message":"Профиль пользователя","user":{...}}
```

### 20. Дублирующий username

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser123","email":"another@example.com","password":"password123"}'
# Ожидаем: 400, {"error":"Пользователь уже существует"}
```

### 21. Дублирующий email

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"anothername","email":"test123@example.com","password":"password123"}'
# Ожидаем: 400, {"error":"Пользователь уже существует"}
```

### 22. Неверный пароль при входе

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser123","password":"wrongpassword"}'
# Ожидаем: 401, {"error":"Неверные данные"}
```

### 23. Несуществующий пользователь

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"nonexistent","password":"password123"}'
# Ожидаем: 401, {"error":"Неверные данные"}
```
