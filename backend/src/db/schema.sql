-- =========================================================
-- VendorOS - Clean Dev Reset & Extensions
-- =========================================================

-- WARNING: Dev reset only. Wipes public schema clean.
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- 1. ACCOUNTS (Primary Identity & Credentials)
-- =========================================================

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone_verified_at TIMESTAMP,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_VERIFICATION',
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT accounts_status_check CHECK (
        status IN ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'BLOCKED')
    )
);

-- =========================================================
-- 2. VENDORS (Vendor Entity Profile)
-- =========================================================

CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    onboarding_status VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT vendors_status_check CHECK (
        status IN ('ACTIVE', 'SUSPENDED', 'BLOCKED')
    ),
    CONSTRAINT vendors_onboarding_status_check CHECK (
        onboarding_status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')
    )
);

-- =========================================================
-- 3. BUSINESSES (Business Data Entity)
-- =========================================================

CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL UNIQUE REFERENCES vendors(id) ON DELETE CASCADE,
    business_name VARCHAR(150) NOT NULL,
    business_type VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    business_email VARCHAR(255),
    business_phone VARCHAR(20),
    whatsapp_number VARCHAR(20),
    address_line TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    website VARCHAR(255),
    logo_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 4. BUSINESS MEMBERS (Multi-user Team & Roles)
-- =========================================================

CREATE TABLE business_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    role VARCHAR(30) NOT NULL DEFAULT 'STAFF',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT business_members_role_check CHECK (
        role IN ('OWNER', 'MANAGER', 'ACCOUNTANT', 'STAFF')
    ),
    CONSTRAINT business_members_status_check CHECK (
        status IN ('ACTIVE', 'INACTIVE')
    ),
    CONSTRAINT business_members_unique UNIQUE (business_id, account_id)
);

-- =========================================================
-- 5. OTP CHALLENGES (Phone Verification & Resets)
-- =========================================================

CREATE TABLE otp_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    purpose VARCHAR(30) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    consumed_at TIMESTAMP,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    resend_count INTEGER NOT NULL DEFAULT 0,
    last_sent_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT otp_challenges_purpose_check CHECK (
        purpose IN ('PHONE_VERIFICATION', 'PASSWORD_RESET', 'PHONE_CHANGE')
    )
);

-- =========================================================
-- 6. SESSIONS (JWT Refresh Token Store)
-- =========================================================

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    device_id VARCHAR(100),
    device_name VARCHAR(100),
    platform VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 7. AUTH ATTEMPTS (Rate Limiting & Abuse Detection)
-- =========================================================

CREATE TABLE auth_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    identifier VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    reason VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 8. AUTH EVENTS (Audit Trail)
-- =========================================================

CREATE TABLE auth_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX idx_accounts_status ON accounts(status);
CREATE INDEX idx_business_members_account_id ON business_members(account_id);
CREATE INDEX idx_business_members_business_id ON business_members(business_id);
CREATE INDEX idx_otp_challenges_phone_purpose ON otp_challenges(phone, purpose);
CREATE INDEX idx_otp_challenges_account_id ON otp_challenges(account_id);
CREATE INDEX idx_otp_challenges_expires_at ON otp_challenges(expires_at);
CREATE INDEX idx_sessions_account_id ON sessions(account_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_revoked_at ON sessions(revoked_at);
CREATE INDEX idx_auth_attempts_identifier_time ON auth_attempts(identifier, created_at);
CREATE INDEX idx_auth_attempts_account_id ON auth_attempts(account_id);
CREATE INDEX idx_auth_attempts_ip_time ON auth_attempts(ip_address, created_at);
CREATE INDEX idx_auth_events_account_time ON auth_events(account_id, created_at);
CREATE INDEX idx_auth_events_type_time ON auth_events(event_type, created_at);

-- =========================================================
-- AUTOMATED UPDATED_AT TRIGGER FUNCTION
-- =========================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_accounts_updated_at
BEFORE UPDATE ON accounts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_vendors_updated_at
BEFORE UPDATE ON vendors
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_businesses_updated_at
BEFORE UPDATE ON businesses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_business_members_updated_at
BEFORE UPDATE ON business_members
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_otp_challenges_updated_at
BEFORE UPDATE ON otp_challenges
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_sessions_updated_at
BEFORE UPDATE ON sessions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();