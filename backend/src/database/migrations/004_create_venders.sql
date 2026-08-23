-- 1. Create Vendors Table
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Key connecting to Users table (1 user = 1 vendor profile max)
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Business Core Info
    business_name VARCHAR(150) NOT NULL,
    business_type VARCHAR(50) NOT NULL DEFAULT 'CATERING', -- CATERING, HALWAI, DECORATION, VENUE, etc.
    description TEXT,
    
    -- Contact & Communication
    email VARCHAR(255),
    contact_phone VARCHAR(15) NOT NULL,
    
    -- Address Details
    address_line TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    
    -- Status & Lifecycle
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, INACTIVE
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_business_type ON vendors(business_type);
CREATE INDEX IF NOT EXISTS idx_vendors_city ON vendors(city);