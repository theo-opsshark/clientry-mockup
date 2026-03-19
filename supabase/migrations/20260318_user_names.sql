-- Add name fields to portal_users for welcome flow
ALTER TABLE portal_users ADD COLUMN first_name text;
ALTER TABLE portal_users ADD COLUMN last_name text;
