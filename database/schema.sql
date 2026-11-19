CREATE DATABASE IF NOT EXISTS vitalhub
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE vitalhub;

CREATE TABLE IF NOT EXISTS organizations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(180) NOT NULL,
    slug VARCHAR(180) NOT NULL UNIQUE,
    email VARCHAR(190) NULL,
    phone VARCHAR(40) NULL,
    address VARCHAR(500) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_organizations_active (is_active, name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS service_catalog (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organization_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(200) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_service_catalog_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
    CONSTRAINT chk_service_catalog_price CHECK (unit_price > 0),
    UNIQUE KEY uq_service_catalog_organization_name (organization_id, name),
    INDEX idx_service_catalog_organization_active (organization_id, is_active, name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    organization_id BIGINT UNSIGNED NULL,
    role ENUM('platform_admin', 'receptionist', 'nurse', 'doctor', 'billing', 'admin') NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    must_change_password TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
    INDEX idx_users_role_active (role, is_active),
    INDEX idx_users_organization_role (organization_id, role, is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS patients (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organization_id BIGINT UNSIGNED NOT NULL,
    patient_number VARCHAR(20) NULL UNIQUE,
    full_name VARCHAR(160) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender ENUM('Female', 'Male', 'Other') NOT NULL,
    phone VARCHAR(40) NOT NULL,
    email VARCHAR(190) NULL,
    address VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_patients_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
    INDEX idx_patients_name (full_name),
    INDEX idx_patients_phone (phone),
    INDEX idx_patients_organization_created (organization_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS visits (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    patient_id BIGINT UNSIGNED NOT NULL,
    organization_id BIGINT UNSIGNED NOT NULL,
    checked_in_by BIGINT UNSIGNED NOT NULL,
    reason VARCHAR(500) NOT NULL,
    status ENUM('checked_in', 'triaged', 'awaiting_billing', 'awaiting_payment', 'completed') NOT NULL DEFAULT 'checked_in',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_visits_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_visits_checkin_user FOREIGN KEY (checked_in_by) REFERENCES users(id),
    CONSTRAINT fk_visits_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
    INDEX idx_visits_status_created (status, created_at),
    INDEX idx_visits_patient_created (patient_id, created_at),
    INDEX idx_visits_organization_status (organization_id, status, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS triage (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    visit_id BIGINT UNSIGNED NOT NULL UNIQUE,
    nurse_id BIGINT UNSIGNED NOT NULL,
    triage_level TINYINT UNSIGNED NOT NULL,
    temperature DECIMAL(4,1) NOT NULL,
    blood_pressure VARCHAR(20) NOT NULL,
    heart_rate SMALLINT UNSIGNED NOT NULL,
    respiratory_rate SMALLINT UNSIGNED NOT NULL,
    oxygen_saturation TINYINT UNSIGNED NOT NULL,
    weight DECIMAL(5,1) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_triage_visit FOREIGN KEY (visit_id) REFERENCES visits(id),
    CONSTRAINT fk_triage_nurse FOREIGN KEY (nurse_id) REFERENCES users(id),
    CONSTRAINT chk_triage_level CHECK (triage_level BETWEEN 1 AND 5),
    INDEX idx_triage_priority (triage_level, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS consultations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    visit_id BIGINT UNSIGNED NOT NULL UNIQUE,
    doctor_id BIGINT UNSIGNED NOT NULL,
    notes TEXT NOT NULL,
    diagnosis VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_consultations_visit FOREIGN KEY (visit_id) REFERENCES visits(id),
    CONSTRAINT fk_consultations_doctor FOREIGN KEY (doctor_id) REFERENCES users(id),
    INDEX idx_consultations_doctor_created (doctor_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS prescriptions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    consultation_id BIGINT UNSIGNED NOT NULL,
    medication VARCHAR(160) NOT NULL,
    dosage VARCHAR(100) NULL,
    frequency VARCHAR(100) NULL,
    duration VARCHAR(100) NULL,
    instructions VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_prescriptions_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(id),
    INDEX idx_prescriptions_consultation (consultation_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bills (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    visit_id BIGINT UNSIGNED NOT NULL UNIQUE,
    status ENUM('pending', 'partial', 'paid') NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bills_visit FOREIGN KEY (visit_id) REFERENCES visits(id),
    CONSTRAINT chk_bills_total CHECK (total_amount >= 0),
    INDEX idx_bills_status_created (status, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bill_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    bill_id BIGINT UNSIGNED NOT NULL,
    description VARCHAR(200) NOT NULL,
    quantity SMALLINT UNSIGNED NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bill_items_bill FOREIGN KEY (bill_id) REFERENCES bills(id),
    CONSTRAINT chk_bill_items_quantity CHECK (quantity > 0),
    CONSTRAINT chk_bill_items_price CHECK (unit_price >= 0 AND line_total >= 0),
    INDEX idx_bill_items_bill (bill_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    bill_id BIGINT UNSIGNED NOT NULL,
    received_by BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    method ENUM('cash', 'card', 'insurance') NOT NULL,
    reference VARCHAR(120) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_bill FOREIGN KEY (bill_id) REFERENCES bills(id),
    CONSTRAINT fk_payments_user FOREIGN KEY (received_by) REFERENCES users(id),
    CONSTRAINT chk_payments_amount CHECK (amount > 0),
    INDEX idx_payments_bill_created (bill_id, created_at),
    INDEX idx_payments_created (created_at)
) ENGINE=InnoDB;

-- Stage A: public site and hospital applications (also in database/migrations/001_*.sql)

CREATE TABLE IF NOT EXISTS hospital_applications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reference VARCHAR(20) NOT NULL UNIQUE,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    facility_name VARCHAR(180) NOT NULL,
    facility_type VARCHAR(40) NOT NULL,
    ownership VARCHAR(40) NOT NULL,
    year_established SMALLINT NULL,
    services VARCHAR(1000) NULL,
    staff_estimate INT NULL,
    county VARCHAR(80) NOT NULL,
    town VARCHAR(120) NOT NULL,
    address VARCHAR(500) NOT NULL,
    phone VARCHAR(40) NOT NULL,
    email VARCHAR(190) NOT NULL,
    website VARCHAR(255) NULL,
    license_number VARCHAR(80) NOT NULL,
    licensing_body VARCHAR(160) NOT NULL,
    license_expiry DATE NOT NULL,
    license_document VARCHAR(255) NULL,
    license_document_name VARCHAR(255) NULL,
    admin_name VARCHAR(160) NOT NULL,
    admin_title VARCHAR(120) NOT NULL,
    admin_email VARCHAR(190) NOT NULL,
    admin_phone VARCHAR(40) NOT NULL,
    admin_password_hash VARCHAR(255) NULL,
    declaration_accepted TINYINT(1) NOT NULL DEFAULT 0,
    review_note VARCHAR(1000) NULL,
    reviewed_by BIGINT UNSIGNED NULL,
    reviewed_at DATETIME NULL,
    organization_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_applications_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id),
    CONSTRAINT fk_applications_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
    INDEX idx_applications_status (status, created_at),
    INDEX idx_applications_license (license_number),
    INDEX idx_applications_admin_email (admin_email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inquiries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    email VARCHAR(190) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('new', 'read', 'resolved') NOT NULL DEFAULT 'new',
    admin_note VARCHAR(1000) NULL,
    handled_by BIGINT UNSIGNED NULL,
    handled_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_inquiries_handler FOREIGN KEY (handled_by) REFERENCES users(id),
    INDEX idx_inquiries_status (status, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS faqs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    question VARCHAR(300) NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(60) NOT NULL DEFAULT 'General',
    sort_order INT NOT NULL DEFAULT 0,
    is_published TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_faqs_published (is_published, sort_order)
) ENGINE=InnoDB;
