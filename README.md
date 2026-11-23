# SOLE MARKET PH — starter project

This is an early starter, not a finished or deployed marketplace.

## Included
- Public marketplace page showing approved products
- Seller email/password sign-up and login
- Seller listing form with optional photo upload
- Listings are submitted as `pending`
- Supabase database schema, basic row-level security, and product image bucket

## 1. Create the Supabase database
1. Open your Supabase project.
2. Open **SQL Editor** and choose **New query**.
3. Open `supabase/schema.sql` from this project.
4. Copy the entire file contents into the SQL editor.
5. Click **Run** once. Review the result for errors.

## 2. Add your Supabase public connection details
1. In Supabase, open **Project Settings → API** (or the API Keys page).
2. Copy the Project URL.
3. Copy the publishable key (or legacy anon public key).
4. In this project folder, duplicate `.env.example` and name the copy `.env.local`.
5. Put the Project URL and public key in `.env.local`.

Never put a Supabase service-role/secret key in a browser app or share it in chat.

## 3. Run on your computer
Install Node.js LTS, extract this ZIP, open a terminal in the project folder, then run:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Important limitations
- This is a starter for development and testing, not production-ready.
- There is no admin moderation dashboard yet. New products remain pending until an admin approves them in Supabase Table Editor.
- No product editing/deletion UI, seller verification, reviews, reporting, payments, shipping, or legal pages yet.
- Review security policies and test thoroughly before inviting real users.
- Configure Supabase Auth email confirmation and site URLs before launch.
