// Create admin user in Supabase via service role
// Run: node create_supabase_admin.cjs
const SUPABASE_URL = 'https://wcykjbalqjqbfgchsqak.supabase.co';
// Service role key - get from Supabase Dashboard > Project Settings > API
// This is intentionally a server-side only script
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
    console.error('Set SUPABASE_SERVICE_ROLE_KEY env var before running.');
    process.exit(1);
}

async function main() {
    // 1. Create auth user
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
            email: 'admin@plannex.ai',
            password: 'ADMIN123123',
            email_confirm: true,
            user_metadata: { name: 'Admin Plannex', role: 'admin' }
        })
    });

    const user = await res.json();
    if (!res.ok) { console.error('Failed to create user:', user); process.exit(1); }
    console.log('Admin user created:', user.id);

    // 2. Upsert profile with role=admin
    const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify({ id: user.id, name: 'Admin Plannex', role: 'admin' })
    });

    if (profileRes.ok || profileRes.status === 201 || profileRes.status === 204) {
        console.log('Admin profile created/updated. Done!');
    } else {
        const err = await profileRes.text();
        console.error('Profile creation failed:', err);
    }
}

main().catch(console.error);
