# Dear Lovely ♡

A vintage burgundy love advice website, using the Dear Lovely design: animated envelopes, public letters and official replies, anonymous submissions, and moderated reader comments.

**Public site:** `index.html` · **Private login:** `admin.html` (not linked in public navigation)

## Security essentials

GitHub Pages is **static hosting**: hiding a page is **not** a security control. The actual protection is Supabase Authentication plus **Postgres Row Level Security (RLS)**. People might know the `/admin.html` address, but without your authorized admin account they cannot see the inbox, unpublished letters, unapproved comments, or change published posts. A password is **not** stored in this repository.

Never paste an admin password, Supabase `service_role`, `sb_secret_...` key, database password, or any confidential private letter into GitHub. Only the browser-safe **publishable** (`sb_publishable_...`) or legacy **anon** key belongs in `config.js`.

## Setup — one time

1. At [supabase.com](https://supabase.com), create a project. Save the project password somewhere private (never in the website code).
2. Open **SQL Editor** and run all of `supabase-setup.sql` once. If the policies already exist, do not rerun the creation script without checking first.
3. Open **Authentication → Users → Add user** (or equivalent **Create user**) and make one email/password account **for you**. Set a strong unique password and verify/confirm the email as required by your project settings. For a single-editor site, consider turning off public email signups in Supabase Auth settings.
4. Copy that user's **UUID** from Authentication → Users. In Supabase **SQL Editor**, run this command with your real UUID:

   ```sql
   insert into public.admin_users (user_id)
   values ('PASTE-YOUR-AUTH-USER-UUID-HERE');
   ```

   **This is what actually authorizes you.** Other accounts (including someone who signs up independently) do not receive admin permissions.
5. Go to **Project Settings / Connect → API** (naming can vary). Copy **Project URL** and a **publishable key** (`sb_publishable_...`) or **legacy anon key**. In `config.js`, replace the two placeholders. A publishable key is designed to appear in browser JavaScript *when RLS is configured*.
6. Create a **GitHub repository**, e.g. `dear-lovely`. Upload **all extracted files** from this iPhone-friendly package directly into the repository root. There are no subfolders. Keep `admin.html` and `config.js` in the same root as `index.html`.
7. In GitHub repo **Settings → Pages**, set **Deploy from a branch** → `main` → **/(root)** → Save. GitHub will display your URL, usually `https://YOUR-USERNAME.github.io/dear-lovely/`.
8. Visit the public URL and try a test letter. Then visit `https://YOUR-USERNAME.github.io/dear-lovely/admin.html` directly, sign in, and publish your reply. Test comments as well. No admin link is shown to visitors.

### What visitors / admins can do

| Visitor | You (approved admin) |
|---|---|
| Read only published letters and replies | See unpublished submissions |
| Submit an anonymous letter | Edit letter text to remove identifying information before publication |
| Submit a comment for review | Write and publish your reply |
| See only approved comments | Approve/reject comments and delete letters |
| Cannot see the admin inbox | Edit replies to published letters |

## Security/privacy launch checklist

- Ensure the SQL above successfully created RLS policies **before** sharing the public link. The blank configuration does not accept letters.
- Never rely on a hidden menu button or a private repository for database security.
- If visitors can submit frequently, turn on bot protection, throttling, or spam prevention through a server/edge function and CAPTCHA before opening to a large public audience. This starter does not include automated anti-spam controls.
- All published letters and comments can be indexed or copied by others. Review and redact identifying details and avoid publishing threats, private contact details, or sensitive information without care.
- No email address is required from visitors. Anonymous means no account is required; it is not a promise of total anonymity from hosting/database infrastructure.
- Keep your admin password unique and turn on available account security features.
- For a fully **private HTML page** (rather than a public login shell with protected content), use a server-side access gateway or private-hosting service; GitHub Pages by itself cannot hide a static file from people who guess the URL.

## Visual design

The site keeps the burgundy + antique-paper aesthetic and envelope-opening animation. The logo asset is in `dear-lovely-logo.png`. Text, colors, and animation can be changed in `index.html` and `style.css`.

## Testing notes

No live site or Supabase project has been created by generating these files. Until you set up Supabase and GitHub Pages, the website displays a setup notice and won't send real letters. The admin page checks an actual Supabase Auth login and checks `admin_users` before rendering private content.
