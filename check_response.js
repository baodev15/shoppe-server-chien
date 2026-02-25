const axios = require('axios');

async function checkProducts() {
  try {
    console.log('Getting all products...');
    
    const response = await axios.get('http://localhost:3000/api/products?apiKey=Baole28372hd');
    
    console.log('Response structure:', Object.keys(response.data));
    console.log('Response data type:', typeof response.data);
    console.log('Response data:', response.data);
    
  } catch (error) {
    console.error('❌ Check Failed:', error.response?.data || error.message);
  }
}

checkProducts();