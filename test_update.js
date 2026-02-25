const axios = require('axios');

async function testUpdateProductInfo() {
  try {
    console.log('Testing PUT /api/products/info...');
    
    const updateData = {
      item_id: '1e1384865105d85a', // item_id của product
      shop_id: 'unknown',
      name: 'Updated Product Name',
      rating_star: 4.5,
      shop_rating: 4.8,
      price: 150000,
      sold: 100,
      liked_count: 50,
      default_commission_rate: 10.5,
      seller_commission_rate: 8.0,
      product_link: 'https://shopee.vn/product-test',
      bestImageUrl: 'https://example.com/image.jpg',
      bestImageScore: 0.95
    };
    
    const response = await axios.put(
      'http://localhost:3000/api/products/info?apiKey=Baole28372hd',
      updateData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Update Success:', {
      success: response.data.success,
      message: response.data.message,
      updatedItemId: response.data.data?.item_id,
      updatedName: response.data.data?.name
    });
    
  } catch (error) {
    console.error('❌ Update Failed:', error.response?.data || error.message);
  }
}

testUpdateProductInfo();