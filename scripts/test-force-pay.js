const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Error: Env vars missing.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testForcePay() {
    console.log("🧪 Testing Force Pay on Sale with Debt...");

    // 1. Create a sale with debt
    // Total: 1000, Abono: 500
    const { data: sale, error: createError } = await supabase
        .from('ventas')
        .insert([{
            cliente: 'Test Force Pay',
            productos: [{ producto: 'Item', cantidad: 1, precio: 1000 }],
            metodo_pago: 'Efectivo',
            pagado: false,
            fecha: new Date().toISOString(),
            abonos: [{ fecha: new Date().toISOString(), monto: 500, metodo: 'Efectivo' }]
        }])
        .select()
        .single();

    if (createError) {
        console.error("❌ Error creating test sale:", createError);
        return;
    }

    console.log(`✅ Created test sale ID: ${sale.id}`);
    console.log(`   Initial State -> Pagado: ${sale.pagado}`);

    // 2. Try to force pagado = true
    console.log("👉 Attempting to set pagado = true...");

    const { data: updated, error: updateError } = await supabase
        .from('ventas')
        .update({ pagado: true })
        .eq('id', sale.id)
        .select()
        .single();

    if (updateError) {
        console.error("❌ Update failed with error:", updateError);
    } else {
        console.log(`   Result State -> Pagado: ${updated.pagado}`);

        if (updated.pagado === true) {
            console.log("✅ SUCCESS: The database ACCEPTED the force pay.");
        } else {
            console.log("❌ FAILURE: The database REJECTED the force pay (value remained false).");
            console.log("   ⚠️ This confirms a database trigger is enforcing consistency.");
        }
    }

    // 3. Cleanup
    console.log("🧹 Cleaning up...");
    await supabase.from('ventas').delete().eq('id', sale.id);
}

testForcePay();
