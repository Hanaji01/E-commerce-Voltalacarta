-- Volta la Carta: database schema
-- Usage: mysql -u <user> -p < database/schema.sql

CREATE DATABASE IF NOT EXISTS volta_la_carta_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE volta_la_carta_db;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,          -- bcrypt hash
    is_admin TINYINT(1) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bouquets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,       -- must match ?name= in the product links
    description TEXT,
    price DECIMAL(8,2) NOT NULL,
    image_url VARCHAR(255),
    thumbnail_urls JSON                      -- array of image paths
);

CREATE TABLE IF NOT EXISTS fiori_singoli (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(8,2) NOT NULL,
    image_url VARCHAR(255),
    thumbnail_urls JSON,
    available_colors JSON                    -- array of colour names
);

CREATE TABLE IF NOT EXISTS ordini (
    ordine_id INT AUTO_INCREMENT PRIMARY KEY,
    data_ordine DATETIME NOT NULL,
    stato_ordine VARCHAR(50) NOT NULL,
    totale DECIMAL(10,2) NOT NULL,
    nome_cliente VARCHAR(255),
    email_cliente VARCHAR(255),
    indirizzo_spedizione TEXT,
    metodo_pagamento VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS dettagli_ordine (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ordine_id INT NOT NULL,
    prodotto_nome VARCHAR(255) NOT NULL,
    quantita INT NOT NULL,
    prezzo_unitario DECIMAL(8,2) NOT NULL,
    FOREIGN KEY (ordine_id) REFERENCES ordini(ordine_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS event_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipoEvento VARCHAR(100) NOT NULL,
    dataPrevista DATE NOT NULL,
    numeroPezzi INT,
    ideePreferenze TEXT,
    nome VARCHAR(255),
    telefono VARCHAR(50),
    email VARCHAR(255) NOT NULL,
    data_richiesta DATETIME NOT NULL
);
