-- =========================================================
-- VendorOS - Clean Dev Reset & Extensions
-- =========================================================

-- Dev reset: Wipes public schema clean to allow fresh initialization.
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- AUTOMATED UPDATED_AT TRIGGER FUNCTION (Defined First)
-- =========================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
-- 9. CATEGORIES (Product Hierarchical Organization)
-- =========================================================

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT categories_business_name_unique UNIQUE (business_id, name)
);

-- =========================================================
-- 10. PRODUCTS (Base Product Attributes & Pricing)
-- =========================================================

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    sku VARCHAR(100),
    barcode VARCHAR(100),
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(30) DEFAULT 'pcs',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT products_business_sku_unique UNIQUE (business_id, sku)
);

-- =========================================================
-- 11. INVENTORY (Stock Quantities & Reorder Levels)
-- =========================================================

CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    available_stock NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    reorder_level NUMERIC(12, 2) NOT NULL DEFAULT 5.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 12. INVENTORY LEDGER (Audit Trail & Stock Transaction Logs)
-- =========================================================

CREATE TABLE inventory_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    qty_change NUMERIC(12, 2) NOT NULL, -- Positive for IN, Negative for OUT
    type VARCHAR(30) NOT NULL,          -- IN, OUT, ADJUST
    reference_id UUID,                  -- Optional link to Invoice ID or Purchase ID
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT inventory_ledger_type_check CHECK (
        type IN ('IN', 'OUT', 'ADJUST')
    )
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
CREATE INDEX idx_categories_business_id ON categories(business_id);
CREATE INDEX idx_products_business_id ON products(business_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_inventory_business_id ON inventory(business_id);
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_ledger_business_id ON inventory_ledger(business_id);
CREATE INDEX idx_inventory_ledger_product_id ON inventory_ledger(product_id);

-- =========================================================
-- AUTOMATED UPDATED_AT TRIGGERS
-- =========================================================

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

CREATE TRIGGER trg_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_inventory_updated_at
BEFORE UPDATE ON inventory
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- 13. INVOICES / SALES TRANSACTIONS (Sales & Billing Core)
-- =========================================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL,
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_mode VARCHAR(30) NOT NULL DEFAULT 'CASH',
    payment_status VARCHAR(30) NOT NULL DEFAULT 'PAID',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT invoices_payment_status_check CHECK (
        payment_status IN ('PAID', 'PENDING', 'CANCELLED')
    )
);

CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity NUMERIC(12, 2) NOT NULL,
    sold_price NUMERIC(12, 2) NOT NULL, -- Snapshot of selling price at checkout
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Snapshot of cost price at checkout
    total_price NUMERIC(12, 2) NOT NULL
);

-- Indexes for performance and lookup
CREATE INDEX idx_invoices_business_id ON invoices(business_id);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_product_id ON invoice_items(product_id);

-- Trigger for automated updated_at timestamp
CREATE TRIGGER trg_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- Database Trigger Function for Auto Inventory Deduction (Task T26)
-- =========================================================

CREATE OR REPLACE FUNCTION auto_deduct_inventory_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Insert Stock OUT entry into inventory_ledger
    INSERT INTO inventory_ledger (business_id, product_id, qty_change, type, reference_id, notes)
    SELECT 
        i.business_id, 
        NEW.product_id, 
        -ABS(NEW.quantity), 
        'OUT', 
        NEW.invoice_id, 
        CONCAT('Auto stock reduction for Invoice: ', i.invoice_number)
    FROM invoices i
    WHERE i.id = NEW.invoice_id;

    -- 2. Update physical available_stock in inventory table
    UPDATE inventory
    SET available_stock = available_stock - NEW.quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE product_id = NEW.product_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to invoice_items table
DROP TRIGGER IF EXISTS trg_auto_deduct_inventory ON invoice_items;
CREATE TRIGGER trg_auto_deduct_inventory
AFTER INSERT ON invoice_items
FOR EACH ROW EXECUTE FUNCTION auto_deduct_inventory_on_sale();

-- =========================================================
-- 15. PAYMENTS (Task T28 - Multi-mode Payment Tracking)
-- =========================================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    method VARCHAR(30) NOT NULL DEFAULT 'CASH', -- CASH, UPI, CARD, CREDIT
    reference_id VARCHAR(100),                -- Transaction reference / UTR number
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT payments_method_check CHECK (
        method IN ('CASH', 'UPI', 'CARD', 'CREDIT')
    )
);

CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_business_id ON payments(business_id);

-- =========================================================
-- 16. CUSTOMER LEDGER / UDHAAR CREDIT (Task T29 + T33)
-- =========================================================

-- Ledger Account Header: one record per customer per business (tracks running balance)
CREATE TABLE customer_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL, -- T33: linked to customers table
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Positive = customer owes (Udhaar outstanding)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_customer_phone_per_business UNIQUE (business_id, customer_phone)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- T33: CUSTOMER LEDGER ENTRIES — Double-Entry Transaction Log
-- Every udhaar purchase creates a DEBIT entry (customer owes more).
-- Every payment creates a CREDIT entry (customer owes less).
-- balance_snapshot stores the running balance AFTER this entry is applied.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE customer_ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_ledger_id UUID NOT NULL REFERENCES customer_ledger(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,   -- T33: direct FK to customers
    sale_id UUID REFERENCES invoices(id) ON DELETE SET NULL,        -- T33: linked sale/invoice
    credit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,             -- T33: amount paid in (reduces balance)
    debit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,              -- T33: amount owed (increases balance)
    balance_snapshot NUMERIC(12, 2) NOT NULL,                       -- T33: running balance AFTER this entry
    entry_type VARCHAR(30) NOT NULL,                                 -- CREDIT_SALE | PAYMENT_RECEIVED | ADJUSTMENT
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Double-entry integrity: exactly one of credit/debit must be non-zero per entry
    CONSTRAINT chk_ledger_entry_direction CHECK (
        (credit_amount > 0 AND debit_amount = 0) OR
        (debit_amount > 0 AND credit_amount = 0)
    ),
    CONSTRAINT chk_ledger_entry_type CHECK (
        entry_type IN ('CREDIT_SALE', 'PAYMENT_RECEIVED', 'ADJUSTMENT')
    )
);

-- Legacy transactions table (kept for backward compatibility with existing sales data)
CREATE TABLE customer_ledger_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_ledger_id UUID NOT NULL REFERENCES customer_ledger(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL,
    type VARCHAR(30) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customer_ledger_business ON customer_ledger(business_id);
CREATE INDEX idx_customer_ledger_customer_id ON customer_ledger(customer_id);
CREATE INDEX idx_ledger_entries_ledger ON customer_ledger_entries(customer_ledger_id);
CREATE INDEX idx_ledger_entries_sale ON customer_ledger_entries(sale_id);
CREATE INDEX idx_ledger_entries_customer ON customer_ledger_entries(customer_id);
CREATE INDEX idx_ledger_tx_customer ON customer_ledger_transactions(customer_ledger_id);

-- Trigger: auto-update customer_ledger.updated_at on balance change
CREATE TRIGGER trg_customer_ledger_updated_at
BEFORE UPDATE ON customer_ledger
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =========================================================
-- 17. CUSTOMERS (Phase 5 - Task T31: Customer Schema DB Model)
-- =========================================================

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_business_customer_phone UNIQUE (business_id, phone)
);

CREATE INDEX idx_customers_business_id ON customers(business_id);
CREATE INDEX idx_customers_phone ON customers(phone);

-- Trigger for automated updated_at timestamp
CREATE TRIGGER trg_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();