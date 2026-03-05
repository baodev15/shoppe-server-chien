const XStatsigId = require('./models/grok_xStatsigId.model');

// Simple test to verify the model works
async function testModel() {
  try {
    console.log('Testing XStatsigId model...');
    
    // Test creating a new record
    const newRecord = new XStatsigId({
      content: 'Test content for xStatsigId'
    });
    
    await newRecord.save();
    console.log('✅ New record created successfully');
    
    // Test finding records
    const records = await XStatsigId.find().sort({ createdAt: -1 }).limit(5);
    console.log(`✅ Found ${records.length} recent records`);
    
    // Test cleanup method exists
    if (typeof XStatsigId.cleanupOldRecords === 'function') {
      console.log('✅ cleanupOldRecords method exists');
    } else {
      console.log('❌ cleanupOldRecords method not found');
    }
    
    console.log('✅ Model test completed successfully');
    
  } catch (error) {
    console.error('❌ Model test failed:', error);
  }
}

// Run the test
testModel();