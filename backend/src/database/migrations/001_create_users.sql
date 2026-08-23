-- Enable UUID extension agar pehle se enabled nahi hai
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table Creation for AUTH-01
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(15) UNIQUE NOT NULL,
    phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    name VARCHAR(100),
    email VARCHAR(255),
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);