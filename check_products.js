const axios = require('axios');

async function checkProducts() {
  try {
    console.log('Getting all products...');
    
    const response = await axios.get('http://localhost:3000/api/products?apiKey=Baole28372hd');
    
    console.log(`Found ${response.data.length} products`);
    
    // Show first few products
    response.data.slice(0, 3).forEach((product, index) => {
      console.log(`Product ${index + 1}:`, {
        _id: product._id,
        item_id: product.item_id,
        name: product.name,
        statusUpVideo: product.statusUpVideo,
        isChecked: product.isChecked
      });
    });
    
    // Find product with specific item_id
    const targetProduct = response.data.find(p => p.item_id === '886c98a1cb13a280');
    if (targetProduct) {
      console.log('\n✅ Found target product:', {
        _id: targetProduct._id,
        item_id: targetProduct.item_id,
        name: targetProduct.name,
        statusUpVideo: targetProduct.statusUpVideo
      });
    } else {
      console.log('\n❌ Target product not found');
    }
    
  } catch (error) {
    console.error('❌ Check Failed:', error.response?.data || error.message);
  }
}

checkProducts();