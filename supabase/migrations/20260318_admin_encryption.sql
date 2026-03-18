-- Enable pgcrypto for API token encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add unique constraint on portal_request_types for upsert support
ALTER TABLE portal_request_types
  ADD CONSTRAINT portal_request_types_portal_type_unique
  UNIQUE (portal_id, jira_request_type_id);

-- Create helper function for encrypting tokens from the app layer
CREATE OR REPLACE FUNCTION encrypt_token(token_value text, encryption_key text)
RETURNS text AS $$
BEGIN
  RETURN encode(pgp_sym_encrypt(token_value, encryption_key), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function for decrypting tokens
CREATE OR REPLACE FUNCTION decrypt_token(encrypted_value text, encryption_key text)
RETURNS text AS $$
BEGIN
  RETURN pgp_sym_decrypt(decode(encrypted_value, 'base64'), encryption_key);
EXCEPTION WHEN OTHERS THEN
  -- If decryption fails (e.g., plaintext value), return as-is
  RETURN encrypted_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
