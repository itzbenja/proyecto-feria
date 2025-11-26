const { createClient } = require('@supabase/supabase-js');
require('dotenv').config(); // Load env vars if available locally, though in Expo they are usually in .env

// Hardcode keys if necessary for the script, or rely on process.env
// Since this is a standalone script, we need to ensure it can access the keys.
// I will try to read them from the .env file if possible, or ask the user.
// For now, I'll assume standard .env loading works.

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Error: EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY not found in environment.");
    console.log("Please ensure .env file exists and contains these keys.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log("🔍 Diagnosing Supabase 'ventas' table...");

    // 1. Check if we can fetch a row
    console.log("1️⃣ Fetching latest sale...");
    const { data: sales, error: fetchError } = await supabase
        .from('ventas')
        .select('*')
        .limit(1);

    if (fetchError) {
        console.error("❌ Error fetching sales:", fetchError);
        return;
    }

    if (!sales || sales.length === 0) {
        console.log("⚠️ No sales found to test update. Please create a sale first.");
        return;
    }

    const sale = sales[0];
    console.log("✅ Fetched sale:", { id: sale.id, cliente: sale.cliente, pagado: sale.pagado });

    // 2. Try to update 'pagado' column
    console.log(`2️⃣ Attempting to update 'pagado' for sale ID: ${sale.id}...`);

    // Toggle the current value
    const newValue = !sale.pagado;

    const { data: updated, error: updateError } = await supabase
        .from('ventas')
        .update({ pagado: newValue })
        .eq('id', sale.id)
        .select();

    if (updateError) {
        console.error("❌ Error updating 'pagado' column:", updateError);
        console.error("👉 This likely means the 'pagado' column does not exist or RLS policies prevent update.");
        if (updateError.code === '42703') {
            console.error("🚨 CONFIRMED: Column 'pagado' does not exist in table 'ventas'.");
        }
    } else {
        console.log("✅ Update successful!", updated);
        console.log("🎉 The 'pagado' column exists and is writable.");

        // Revert change
        console.log("Reverting change...");
        await supabase.from('ventas').update({ pagado: sale.pagado }).eq('id', sale.id);
    }
}

diagnose();
