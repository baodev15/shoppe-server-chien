const axios = require('axios');

async function testGetProductInfo() {
  try {
    console.log('Testing GET /api/products/check...');
    
    const response = await axios.get('http://localhost:3000/api/products/check', {
      params: {
        apiKey: 'Baole28372hd'
      }
    });
    
    console.log('✅ Get Product Success:', {
      success: response.data.success,
      item_id: response.data.data?.item_id,
      name: response.data.data?.name,
      statusUpVideo: response.data.data?.statusUpVideo
    });
    
    // Now test update with the actual item_id
    if (response.data.data?.item_id) {
      console.log('\nTesting PUT /api/products/info with actual item_id...');
      
      const updateData = {
        item_id: response.data.data.item_id,
        shop_id: response.data.data.shop_id || 'unknown',
        name: 'Updated Product Name - Test',
        rating_star: 4.5,
        shop_rating: 4.8,
        price: 150000,
        sold: 100,
        liked_count: 50,
        default_commission_rate: 10.5,
        seller_commission_rate: 8.0,
        product_link: response.data.data.product_link || 'https://shopee.vn/product-test',
        bestImageUrl: 'https://example.com/image.jpg',
        bestImageScore: 0.95
      };
      
      const updateResponse = await axios.put(
        'http://localhost:3000/api/products/info?apiKey=Baole28372hd',
        updateData,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Update Success:', {
        success: updateResponse.data.success,
        message: updateResponse.data.message,
        updatedItemId: updateResponse.data.data?.item_id,
        updatedName: updateResponse.data.data?.name,
        newStatus: updateResponse.data.data?.statusUpVideo
      });
    }
    
  } catch (error) {
    console.error('❌ Test Failed:', error.response?.data || error.message);
  }
}

testGetProductInfo();