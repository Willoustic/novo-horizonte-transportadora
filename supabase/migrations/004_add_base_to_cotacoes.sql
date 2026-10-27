-- Migration: add base column to cotacoes
ALTER TABLE cotacoes ADD COLUMN IF NOT EXISTS base TEXT;