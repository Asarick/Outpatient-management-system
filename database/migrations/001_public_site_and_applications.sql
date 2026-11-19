USE vitalhub;

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
