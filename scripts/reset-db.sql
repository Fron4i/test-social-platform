DROP DATABASE IF EXISTS social_platform;

CREATE DATABASE social_platform 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

DROP USER IF EXISTS 'social_user'@'localhost';
CREATE USER 'social_user'@'localhost' IDENTIFIED BY 'social_password_2025';
GRANT ALL PRIVILEGES ON social_platform.* TO 'social_user'@'localhost';
FLUSH PRIVILEGES;

SELECT 'БД пересоздана' as Status;