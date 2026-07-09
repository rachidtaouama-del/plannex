const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://powdaypfodfopcycspmq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd2RheXBmb2Rmb3BjeWNzcG1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1Mzc5MzMsImV4cCI6MjA5MjExMzkzM30.3nXPWaYnpxLZklR3uIa6uAxFypf3_PBx5QUTQMYhSdM'
);

(async () => {
    const { data, error } = await supabase.auth.signUp({
        email: 'admin@plannex.com',
        password: 'ADMIN1231',
        options: {
            data: {
                full_name: 'RACHID TAOUAMA',
            }
        }
    });

    if (error) {
        console.error('Sign up error:', error);
    } else {
        console.log('User created:', data.user.id);
    }
})();
