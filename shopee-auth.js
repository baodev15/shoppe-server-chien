const https = require('https');
const axios = require('axios');
const crypto = require('crypto');

// Tạo UUID bằng crypto thay vì uuid module
function uuidv4() {
  return crypto.randomUUID();
}

class ShopeeClient {
  constructor() {
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
  }

  async createLivestreamingAuth(method, urlPath, body, queryString) {
    try {
      // Tạo auth_base
      const timeNow = Math.floor(Date.now() / 1000).toString();
      const randomUUID = uuidv4();
      const authBase = `ls_android_v1_10001_${timeNow}_${randomUUID}`;

      // Hash body request
      const bodyHash = this.hashRequestBody(body);

      // Tạo chuỗi để hash
      const dataToHash = `${authBase}\n${method}\n${urlPath}\n${bodyHash}\n${queryString.toLowerCase()}`;

      // Lấy hash từ server
      const hashResult = await this.getHashFromServer(dataToHash);
      
      // Tạo X-Livestreaming-Auth header
      return `${authBase}|${hashResult}`;
    } catch (error) {
      throw new Error(`Error creating livestreaming auth: ${error.message}`);
    }
  }

  hashRequestBody(body) {
    if (!body || body.length === 0) {
      return ''; // Trả về chuỗi rỗng nếu body rỗng
    }
    // Sử dụng MD5 thay vì SHA256 theo code Go
    return crypto.createHash('md5').update(body).digest('hex');
  }

  async getHashFromServer(dataToHash) {
    const hashReq = { data: dataToHash };

    // Retry logic: thử 8 lần
    let lastError;
    for (let attempt = 1; attempt <= 8; attempt++) {
      try {
        const response = await axios.post(
          'http://aitsoftware.ddns.me:1113/encrypt',
          hashReq,
          {
            httpsAgent: this.httpsAgent,
            timeout: 20000, // 20 giây
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`✅ Got hash from server after ${attempt} attempt(s)`);
      console.log(response.data)
        return response.data.encryptedResult;
      } catch (error) {
        lastError = error;
        
        if (attempt < 8) {
          if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            console.log(`⚠️  Hash server timeout/error (attempt ${attempt}/8), retrying in 1s...`);
            await this.sleep(1000);
          } else {
            console.log(`⚠️  Hash server error (attempt ${attempt}/8), retrying in 500ms...`);
            await this.sleep(500);
          }
        }
      }
    }

    throw new Error(`Failed to get hash after 8 attempts: ${lastError.message}`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export để sử dụng
module.exports = ShopeeClient;

// Ví dụ sử dụng
if (require.main === module) {
  const client = new ShopeeClient();
  
  // Test function
  async function testAuth() {
    try {
      const method = 'PUT';
      const urlPath = '/api/v1/session/31796678/add_items';
      const body = JSON.stringify({
        items: [{ item_id: 2019582160, shop_id: 113263917 }]
      });
      const queryString = '';

      const auth = await client.createLivestreamingAuth(method, urlPath, body, queryString);
      console.log('Generated auth:', auth);
    } catch (error) {
      console.error('Error:', error.message);
    }
  }

  testAuth();
}