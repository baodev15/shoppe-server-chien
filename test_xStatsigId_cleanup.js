const mongoose = require('mongoose');
const XStatsigId = require('./models/grok_xStatsigId.model');

// Test the cleanup functionality
async function testCleanup() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shopee-server', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Create some test records
    console.log('Creating test records...');
    for (let i = 0; i < 150; i++) {
      await XStatsigId.create({
        content: `Test content ${i + 1}`,
        createdAt: new Date(Date.now() - (i * 60000)) // Stagger by 1 minute each
      });
    }
    
    console.log('Created 150 test records');
    
    // Count records before cleanup
    const countBefore = await XStatsigId.countDocuments();
    console.log(`Records before cleanup: ${countBefore}`);
    
    // Run cleanup
    console.log('Running cleanup...');
    const deletedCount = await XStatsigId.cleanupOldRecords();
    console.log(`Deleted ${deletedCount} records`);
    
    // Count records after cleanup
    const countAfter = await XStatsigId.countDocuments();
    console.log(`Records after cleanup: ${countAfter}`);
    
    // Verify the remaining records are the newest ones
    const remainingRecords = await XStatsigId.find().sort({ createdAt: -1 });
    console.log(`Newest record: ${remainingRecords[0].content} (created: ${remainingRecords[0].createdAt})`);
    console.log(`Oldest record: ${remainingRecords[remainingRecords.length - 1].content} (created: ${remainingRecords[remainingRecords.length - 1].createdAt})`);
    
    // Test pre-save hook by creating a new record
    console.log('\nTesting pre-save hook...');
    const newRecord = new XStatsigId({ content: 'New test record' });
    await newRecord.save();
    console.log('New record saved successfully');
    
    const finalCount = await XStatsigId.countDocuments();
    console.log(`Final record count: ${finalCount}`);
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
testCleanup();