import { db } from './src/services/supabase.js';
(async () => {
  const rows = await db.get('rs_notifications');
  const bad = rows.filter(r => r.uid === r.profile_id && r.type !== 'token');
  for (const r of bad) {
    await db.del('rs_notifications', `id=eq.${r.id}`);
  }
  console.log('Deleted', bad.length, 'corrupted notifications');
})();
