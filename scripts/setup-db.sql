CREATE DATABASE IF NOT EXISTS social_platform 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'social_user'@'localhost' IDENTIFIED BY 'social_password_2025';
GRANT ALL PRIVILEGES ON social_platform.* TO 'social_user'@'localhost';
FLUSH PRIVILEGES;

SELECT 'БД создана' as Status;