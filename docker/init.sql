-- Unified Service Scheduler Database Schema & Enum Seeds
-- Technical Assessment (Scenario A: Ownership)

-- 1. Reference / Enum Seed Tables
CREATE TABLE IF NOT EXISTS skill_codes (
    code VARCHAR(64) PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS service_types (
    code VARCHAR(64) PRIMARY KEY,
    name TEXT NOT NULL,
    duration_minutes INT NOT NULL
);

CREATE TABLE IF NOT EXISTS service_required_skills (
    service_type_code VARCHAR(64) NOT NULL REFERENCES service_types(code) ON DELETE CASCADE,
    skill_code VARCHAR(64) NOT NULL REFERENCES skill_codes(code) ON DELETE CASCADE,
    PRIMARY KEY (service_type_code, skill_code)
);

-- 2. Core Operational Tables
CREATE TABLE IF NOT EXISTS dealerships (
    id VARCHAR(64) PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_bays (
    id VARCHAR(64) PRIMARY KEY,
    dealership_id VARCHAR(64) NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    bay_type VARCHAR(32) NOT NULL DEFAULT 'GENERAL',
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS technicians (
    id VARCHAR(64) PRIMARY KEY,
    dealership_id VARCHAR(64) NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS technician_skills (
    technician_id VARCHAR(64) NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    skill_code VARCHAR(64) NOT NULL REFERENCES skill_codes(code) ON DELETE CASCADE,
    certified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (technician_id, skill_code)
);

CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(64) PRIMARY KEY,
    dealership_id VARCHAR(64) NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
    customer_id VARCHAR(64) NOT NULL,
    vehicle_vin VARCHAR(64) NOT NULL,
    service_bay_id VARCHAR(64) NOT NULL REFERENCES service_bays(id),
    technician_id VARCHAR(64) NOT NULL REFERENCES technicians(id),
    service_type VARCHAR(64) NOT NULL REFERENCES service_types(code)
        CONSTRAINT chk_appointments_service_type CHECK (service_type IN (
            'OIL_CHANGE', 'TIRE_ROTATION', 'BRAKE_INSPECTION', 'ENGINE_DIAGNOSTIC', 'BATTERY_EV_SERVICE'
        )),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'CONFIRMED'
        CONSTRAINT chk_appointments_status CHECK (status IN ('CONFIRMED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_dealership_time 
ON appointments(dealership_id, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_appointments_bay_tech_time 
ON appointments(service_bay_id, technician_id, start_time, end_time);

-- 3. Seed Enum Data (Skill Codes & Service Types)
INSERT INTO skill_codes (code, name, description) VALUES
('GENERAL_MAINTENANCE', 'General Maintenance', 'Routine fluids, filters, and tire service'),
('BRAKE_SYSTEMS', 'Brake Systems', 'Brake pads, rotors, hydraulics, and ABS'),
('ENGINE_ADVANCED', 'Advanced Engine Diagnostics', 'Engine internal, powertrain, and ECU diagnostics'),
('HIGH_VOLTAGE_EV', 'High-Voltage Electric Vehicle', 'EV traction battery, inverter, and high-voltage safety')
ON CONFLICT (code) DO NOTHING;

INSERT INTO service_types (code, name, duration_minutes) VALUES
('OIL_CHANGE', 'Oil & Filter Change', 30),
('TIRE_ROTATION', 'Tire Rotation', 30),
('BRAKE_INSPECTION', 'Brake Systems Inspection', 45),
('ENGINE_DIAGNOSTIC', 'Engine Advanced Diagnostics', 60),
('BATTERY_EV_SERVICE', 'High-Voltage EV Battery Service', 90)
ON CONFLICT (code) DO NOTHING;

INSERT INTO service_required_skills (service_type_code, skill_code) VALUES
('OIL_CHANGE', 'GENERAL_MAINTENANCE'),
('TIRE_ROTATION', 'GENERAL_MAINTENANCE'),
('BRAKE_INSPECTION', 'BRAKE_SYSTEMS'),
('ENGINE_DIAGNOSTIC', 'ENGINE_ADVANCED'),
('BATTERY_EV_SERVICE', 'HIGH_VOLTAGE_EV')
ON CONFLICT (service_type_code, skill_code) DO NOTHING;

-- 4. Seed Baseline Dealership Data
INSERT INTO dealerships (id, name, address)
VALUES ('D01', 'Flagship Dealership', '100 Automotive Blvd, London, UK')
ON CONFLICT (id) DO NOTHING;

INSERT INTO service_bays (id, dealership_id, name, bay_type, is_active) VALUES
('BAY-01', 'D01', 'Express Bay 1', 'GENERAL', true),
('BAY-02', 'D01', 'Diagnostic Bay 2', 'GENERAL', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO technicians (id, dealership_id, name, is_active) VALUES
('TECH-01', 'D01', 'John Doe', true),
('TECH-02', 'D01', 'Alice Smith', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO technician_skills (technician_id, skill_code) VALUES
('TECH-01', 'GENERAL_MAINTENANCE'),
('TECH-01', 'BRAKE_SYSTEMS'),
('TECH-01', 'ENGINE_ADVANCED'),
('TECH-02', 'GENERAL_MAINTENANCE'),
('TECH-02', 'HIGH_VOLTAGE_EV')
ON CONFLICT (technician_id, skill_code) DO NOTHING;
