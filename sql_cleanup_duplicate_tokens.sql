-- Löscht ALLE Einträge aus fcm_tokens (die App registriert neu beim nächsten Start)
-- Nötig weil sich durch alte Registrierungen Dutzende doppelte Tokens angesammelt haben
TRUNCATE TABLE fcm_tokens;

-- Family-Fallback ebenfalls leeren
UPDATE family SET fcm_token = NULL WHERE fcm_token IS NOT NULL;
