const axios = require('axios');
const SHOPEE_ORIGIN = (process.env.SHOPEE_ORIGIN || 'https://shopee.vn').startsWith('http')
  ? (process.env.SHOPEE_ORIGIN || 'https://shopee.vn')
  : `https://${process.env.SHOPEE_ORIGIN || 'shopee.vn'}`;

(async () => {
  try {
    const headers = {
      'User-Agent': 'Android app Shopee appver=36024 app_type=1 platform=native_android os_ver=29 Cronet/102.0.5005.61', 
    'x-api-source': 'rn', 
    'if-none-match-': '55b03-4d7ec75a3c7a57dc0a7675f5c0fa843d', 
    'shopee_http_dns_mode': '1', 
    'x-shopee-client-timezone': 'Asia/Krasnoyarsk', 
    'cache-control': 'no-cache, no-store', 
    'client-request-id': '2dc23afd-a631-48b5-b18c-99a95797474c.927', 
    };
    const targetUrl = `${SHOPEE_ORIGIN}/a-i.807132655.45103071381`;
    const response = await axios.get(`https://mall.shopee.vn/api/v4/generic_sharing/get_sharing_info?url=${encodeURIComponent(targetUrl)}`, { headers });
    console.log('data:', response.data);
  } catch (error) {
    console.error('Error fetching license keys:', error);
  }
})();
