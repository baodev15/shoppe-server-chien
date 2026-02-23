const axios = require('axios');
const https = require('https');
const crypto = require('crypto');

// Tạo UUID bằng crypto
function uuidv4() {
  return crypto.randomUUID();
}

// Hàm tạo auth header
async function createLivestreamingAuth(method, urlPath, body, queryString) {
  try {
    // Tạo auth_base
    const timeNow = Math.floor(Date.now() / 1000).toString();
    const randomUUID = uuidv4();
    const authBase = `ls_android_v1_10001_${timeNow}_${randomUUID}`;

    // Hash body request
    const bodyHash = hashRequestBody(body);

    // Tạo chuỗi để hash
    const dataToHash = `${authBase}\n${method}\n${urlPath}\n${bodyHash}\n${queryString.toLowerCase()}`;

    // Lấy hash từ server
    const hashResult = await getHashFromServer(dataToHash);
    console.log(hashResult)
    // Tạo X-Livestreaming-Auth header
    return `${authBase}|${hashResult}`;
  } catch (error) {
    throw new Error(`Error creating livestreaming auth: ${error.message}`);
  }
}

function hashRequestBody(body) {
  if (!body || body.length === 0) {
    return ''; // Trả về chuỗi rỗng nếu body rỗng
  }
  // Sử dụng MD5 thay vì SHA256 theo code Go
  return crypto.createHash('md5').update(body).digest('hex');
}

async function getHashFromServer(dataToHash) {
  const hashReq = { data: dataToHash };
  
  // Tạo HTTPS agent với TLS skip verify
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false
  });

  // Retry logic: thử 8 lần
  let lastError;
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      const response = await axios.post(
        'http://aitsoftware.ddns.me:1113/encrypt',
        hashReq,
        {
          httpsAgent,
          timeout: 20000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`✅ Got hash from server after ${attempt} attempt(s)`);
      
      return response.data.encrypted_result;
    } catch (error) {
      lastError = error;
      
      if (attempt < 8) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          console.log(`⚠️  Hash server timeout/error (attempt ${attempt}/8), retrying in 1s...`);
          await sleep(1000);
        } else {
          console.log(`⚠️  Hash server error (attempt ${attempt}/8), retrying in 500ms...`);
          await sleep(500);
        }
      }
    }
  }

  throw new Error(`Failed to get hash after 8 attempts: ${lastError.message}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Hàm chính để test
async function addItemsHttp2() {
  const origin = "https://live.shopee.vn";
  const urlPath = "/api/v1/session/31833006/add_items";

  const payloadObj = {
    items: [{ shop_id: 268193673, item_id: 26606975737 }],
  };
  const payload = JSON.stringify(payloadObj);

  try {
    // Tạo auth header động
    const xLivestreamingAuth = await createLivestreamingAuth(
      "PUT",
      urlPath,
      payload,
      ""
    );
    
    
    console.log("Generated auth header:", xLivestreamingAuth);

    // Tạo HTTPS agent với TLS skip verify
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });

    // Các headers
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G960F Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/144.0.7559.59 Mobile Safari/537.36 Shopee Beeshop locale/vi version=29627 appver=29627 rnver=1769767548 app_type=1 platform=web_android os_ver=29',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Content-Type': 'application/json',
      'client-info': 'os=0;platform=5;scene_id=17;language=vi;device_id=av96pDs2YRV%2B9lp7plCGuWVc0%2BrdYFlbfbUnLn%2Focbg%3D',
      'af-ac-enc-dat': 'f7448b272ec1f0d3',
      'x-sap-ri': 'ad7f7f6938ab24d8c055083303017577dfe4ff6dbd0d368cc6a4',
      'x-ls-sz-token': 't+Eg48nlh0CTRtakIVqyEw==|e41eORIyF9QJ40YMUQcKRSEnXQPx1E0aul2oqEb/09XGFwDy6O0KUCPiC6QBVtQlkTrurqav8IlvOmVGT2vojDjqXCZc/cH43fTKPf9hCw==|0kf/X6x7HahUkPbK|08|1',
      'x-livestreaming-auth': xLivestreamingAuth,
      'x-sz-sdk-version': '1.10.7',
      'x-livestreaming-source': 'shopee',
      'Origin': 'https://live.shopee.vn',
      'X-Requested-With': 'com.shopee.vn',
      'Referer': 'https://live.shopee.vn/p/product-select?session=31833006&streamer_id=554259072&from_source=room_streamer&host_id=0&track=%7B%22moderator_permissions%22%3A%7B%22is_ban_pin_comments%22%3Afalse%2C%22is_intro_request%22%3Afalse%2C%22is_manage_item_bag%22%3Afalse%2C%22is_manage_streaming_price%22%3Afalse%2C%22is_add_voucher%22%3Afalse%2C%22is_coin_reward%22%3Afalse%2C%22is_block_keyword%22%3Afalse%7D%2C%22device_type%22%3A1%2C%22is_from_share_reward_link%22%3Afalse%7D&is_live=1',
      'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cookie': 'SPC_CLIENTID=av96pDs2YRV+9lp7dqjipfhgydghcdcv; SPC_AFTID=f75f8246-6de6-425f-a0a4-6a2ac3c46c23; language=vi; shopee_app_version=29627; REC_T_ID=ae24ef33-f9a6-11f0-a37c-76d3d965362a; SPC_F=76015770043462f0_unknown; userid=554259072; shopid=554239491; username=mzkhanhvan; shopee_token=EGAHrBlpKnoqEBuG3ms9hwmnJMrbWydmyURNeOAOD6FI6AFCVPoR97wTycf6i6xbXAltyftRglYxFziW7tXbK9s=; SPC_U=554259072; SPC_ST=.YW9laWZQakVBOTNyV1ZSODY6nCL/hYEBpGNThNIBPEtDXrRAOQ7ofGr15+3jIzHEoIcWMQFWwULSEHSPuyXmXvMwPovJy8bCj3+5M63fpOjVgoK7IwZdDLGtzfxiAOzL+AqHCE7xExIYBQX5TNTfiRBO5E0TclxdgzzpXjcgopSjAk5a0qiGeMGP1Nth16NKwLXi2uXxplgsiEymb2/SloSycgzJBjmWtnHXPvPuCZxIOYJUcr5vUF78WI6HcUctxqqD8m8BiGLZLrrjjRUlGQ==; SPC_R_T_ID=sV0852Tt72reHG+B7s0uae85WEpPXMxTjCFSQC0puovVkkjQoT4LC8FT1Q6Gj4lln9/L+zT8VNyiVA/IM/pmFqfo7wNe+UujOEznwszg+YLuIuuIJL+bU7h465xRR2npsvc7yB1cF1H1koATs/XQVVbCEFpn4eZjGL26OHigeR4=; SPC_T_IV=M3RTUmIxRTBhREd3bzN4RQ==; SPC_R_T_IV=M3RTUmIxRTBhREd3bzN4RQ==; SPC_B_SI=6lBTaQAAAABmVVBNYnNFYTiGGQEAAAAAYUZmY2Nuc1I=; _gcl_au=1.1.612652844.1769315499; _fbp=fb.1.1769315506682.20769496722814527; _sapid=73d53ed1af494bb848996aeca957ab63ccc57e9ad75ee7a013ee8bad; _QPWSDCXHZQA=19456321-463c-4420-a378-ae5d33c6156e; REC7iLP4Q=6e3eb2fc-b282-4bdb-8f54-899984329156; SPC_RNBV=6090003; shopee_rn_version=1769160695; shopee_rn_bundle_version=6090003; csrftoken=yYjUrU9zh0hWJ5SUCyr7qz9S7tlzVm7n; SPC_DH=EJb0jOdbsuDIUh7I6RYcWvMR4bRE9FDRx05M3D56PXRlOq51jjvuv5HP0ZkR/KXG9AUBxbLrVH2c.1kntd2l.ad4b2b66; SPC_SI=8pFTaQAAAABCbWtobUZJeVmSEQMAAAAANkR2bHBoQVk=; SPC_SEC_SI=v1-dVJhWE1YZVNFRTZNc3lGdk7Yif7/TmHjxAP7qQ1YcMXXWuxqWnflitOHWdj8b2vt1IyfqAe4tyuMRR7WeJsxRBF5ztkxCSTlATAE8cwd2T4=; SPC_B_SI=6lBTaQAAAABmVVBNYnNFYTiGGQEAAAAAYUZmY2Nuc1I='
    };

    // Gửi request với axios
    const response = await axios.put(
      `${origin}${urlPath}`,
      payloadObj,
      {
        httpsAgent,
        headers,
        timeout: 30000
      }
    );

    console.log("Status:", response.status);
    console.log("Response data:", response.data);

  } catch (error) {
    console.error("Error details:");
    console.error("Status:", error.response?.status);
    console.error("Data:", error.response?.data);
    console.error("Message:", error.message);
  }
}

// Chạy test
addItemsHttp2().catch(console.error);