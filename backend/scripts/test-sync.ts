import { syncAllMeetings } from '../src/services/meetingSyncService';

console.log('🚀 Testing meeting sync...\n');

syncAllMeetings()
  .then((result) => {
    console.log('\n✅ Sync complete:', result);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  });

