const axios = require('axios');
const fs = require('fs');

let config = { 
  method: 'get', 
  maxBodyLength: Infinity, 
  url: 'http://103.216.116.136:30897/api/products?apiKey=TBT&min_sold=500&min_default_commission_rate=5&limit=200000', 
  headers: { } 
}; 

axios.request(config) 
  .then((response) => { 
    // Ghi dữ liệu vào file JSON
    fs.writeFileSync('products.json', JSON.stringify(response.data, null, 2), 'utf8');
    console.log('Đã lưu dữ liệu vào file products.json thành công!');
  }) 
  .catch((error) => { 
    console.log('Lỗi khi gọi API:', error); 
  });