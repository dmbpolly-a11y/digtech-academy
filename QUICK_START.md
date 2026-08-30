# 🚀 Quick Start - Supabase Integration

## Your Supabase Credentials ✅

- **Project URL**: `[YOUR_SUPABASE_PROJECT_URL]`
- **Anon Key**: `[YOUR_SUPABASE_ANON_KEY]`
- **Dashboard**: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
- **Login**: dm.bpolly@gmail.com / [YOUR_ADMIN_PASSWORD]

---

## 3-Step Setup (5 minutes)

### 1️⃣ Create Database Tables

```sql
-- Copy ALL content from supabase-schema.sql
-- Paste in Supabase > SQL Editor > New Query
-- Click RUN
```

✅ Creates 15 tables for users, courses, exams, analytics, etc.

### 2️⃣ Create Test Users

Go to **Authentication → Users** and create:

| Email | Password | Role |
|-------|----------|------|
| admin@digtechacademy.ug | [PASSWORD] | admin |
| tutor@digtechacademy.ug | [PASSWORD] | tutor |
| student@digtechacademy.ug | [PASSWORD] | student |
| principal@digtechacademy.ug | [PASSWORD] | principal |

**Copy each user's UUID after creation!**

### 3️⃣ Link Users to Roles

Run this in SQL Editor (replace UUIDs):

```sql
INSERT INTO users (id, email, full_name, role, status) VALUES
  ('<admin-uuid>', 'admin@digtechacademy.ug', 'Super Admin', 'admin', 'active'),
  ('<tutor-uuid>', 'tutor@digtechacademy.ug', 'Grace Nakato', 'tutor', 'active'),
  ('<student-uuid>', 'student@digtechacademy.ug', 'John Doe', 'student', 'active'),
  ('<principal-uuid>', 'principal@digtechacademy.ug', 'Principal User', 'principal', 'active');
```

---

## Test Login

```bash
npm run dev
```

1. Open http://localhost:8443
2. Click **Sign In**
3. Select **admin**
4. Login: admin@digtechacademy.ug / [PASSWORD]
5. ✅ Should redirect to Admin Dashboard!

---

## What's Integrated ✅

- ✅ Real authentication (replaces hardcoded credentials)
- ✅ Session persistence (stays logged in on refresh)
- ✅ Role-based access (admin/tutor/student/principal)
- ✅ Activity logging (tracks all logins)
- ✅ User registration with profile creation
- ✅ Database ready for courses, exams, certificates, payments

---

## Files to Check

- 📄 `SUPABASE_INTEGRATION_COMPLETE.md` - Full details
- 📄 `SUPABASE_SETUP_GUIDE.md` - Step-by-step guide
- 📄 `supabase-schema.sql` - Database schema
- 📄 `src/lib/supabase.ts` - Supabase client
- 📄 `.env.local` - Environment variables

---

## Troubleshooting

**Login fails?**
- Check users exist in Authentication panel
- Verify UUIDs in users table match Auth users
- Check browser console for errors

**Build fails?**
- Environment variables loaded? Restart dev server
- Dependencies installed? Run `npm install`

**Need help?**
- Check browser console (F12)
- Check Supabase logs (Dashboard → Logs)
- Read SUPABASE_INTEGRATION_COMPLETE.md

---

## Next Steps

After login works:

1. Connect Admin Dashboard to real database
2. Let Tutors create/edit courses
3. Track website visits
4. Integrate PesaPal payments
5. Deploy to production

**You're ready! 🎉**
