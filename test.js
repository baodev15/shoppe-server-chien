// node >= 16 (khuyến nghị 18+)
const http2 = require("http2");
const zlib = require("zlib");
const crypto = require("crypto");

// Tạo UUID bằng crypto thay vì uuid module
function uuidv4() {
  return crypto.randomUUID();
}

// Import auth functions
const ShopeeClient = require("./shopee-auth");

function decodeBody(buffer, encoding) {
  if (!encoding) return buffer;
  encoding = encoding.toLowerCase();

  if (encoding.includes("gzip")) return zlib.gunzipSync(buffer);
  if (encoding.includes("deflate")) return zlib.inflateSync(buffer);

  // br (brotli) có từ Node 12+
  if (encoding.includes("br")) return zlib.brotliDecompressSync(buffer);

  // zstd: Node built-in KHÔNG có giải nén zstd mặc định
  // => nếu server trả zstd, bạn cần lib ngoài (vd: @mongodb-js/zstd / node-zstandard)
  if (encoding.includes("zstd")) return buffer;

  return buffer;
}

async function addItemsHttp2() {
  const origin = "https://live.shopee.vn";
  const urlPath = "/api/v1/session/31833006/add_items";

  const payloadObj = {
    items: [{ shop_id: 268193673, item_id: 26606975737 }],
  };
  const payload = Buffer.from(JSON.stringify(payloadObj), "utf8");

  // Khởi tạo Shopee client để tạo auth header
  const shopeeClient = new ShopeeClient();
  
  // Tạo auth header động
  const xLivestreamingAuth = await shopeeClient.createLivestreamingAuth(
    "PUT",
    urlPath,
    payload,
    ""
  );
  
  console.log("Generated auth header:", xLivestreamingAuth);

  // ĐỂ AN TOÀN: cookie/token để ở ENV
  const COOKIE = "SPC_CLIENTID=av96pDs2YRV+9lp7dqjipfhgydghcdcv; SPC_AFTID=f75f8246-6de6-425f-a0a4-6a2ac3c46c23; language=vi; shopee_app_version=36024; REC_T_ID=ae24ef33-f9a6-11f0-a37c-76d3d965362a; SPC_F=76015770043462f0_unknown; userid=554259072; shopid=554239491; username=mzkhanhvan; shopee_token=EGAHrBlpKnoqEBuG3ms9hwmnJMrbWydmyURNeOAOD6FI6AFCVPoR97wTycf6i6xbXAltyftRglYxFziW7tXbK9s=; SPC_U=554259072; SPC_R_T_ID=sV0852Tt72reHG+B7s0uae85WEpPXMxTjCFSQC0puovVkkjQoT4LC8FT1Q6Gj4lln9/L+zT8VNyiVA/IM/pmFqfo7wNe+UujOEznwszg+YLuIuuIJL+bU7h465xRR2npsvc7yB1cF1H1koATs/XQVVbCEFpn4eZjGL26OHigeR4=; SPC_T_ID=sV0852Tt72reHG+B7s0uae85WEpPXMxTjCFSQC0puovVkkjQoT4LC8FT1Q6Gj4lln9/L+zT8VNyiVA/IM/pmFqfo7wNe+UujOEznwszg+YLuIuuIJL+bU7h465xRR2npsvc7yB1cF1H1koATs/XQVVbCEFpn4eZjGL26OHigeR4=; SPC_T_IV=M3RTUmIxRTBhREd3bzN4RQ==; SPC_R_T_IV=M3RTUmIxRTBhREd3bzN4RQ==; _gcl_au=1.1.612652844.1769315499; _fbp=fb.1.1769315506682.20769496722814527; _sapid=73d53ed1af494bb848996aeca957ab63ccc57e9ad75ee7a013ee8bad; _QPWSDCXHZQA=19456321-463c-4420-a378-ae5d33c6156e; REC7iLP4Q=6e3eb2fc-b282-4bdb-8f54-899984329156; SPC_DH=EJb0jOdbsuDIUh7I6RYcWvMR4bRE9FDRx05M3D56PXRlOq51jjvuv5HP0ZkR/KXG9AUBxbLrVH2c.1kntd2l.ad4b2b66; SPC_SI=8pFTaQAAAABCbWtobUZJeVmSEQMAAAAANkR2bHBoQVk=; SPC_SEC_SI=v1-dVJhWE1YZVNFRTZNc3lGdk7Yif7/TmHjxAP7qQ1YcMXXWuxqWnflitOHWdj8b2vt1IyfqAe4tyuMRR7WeJsxRBF5ztkxCSTlATAE8cwd2T4=; SPC_B_SI=6lBTaQAAAABmVVBNYnNFYTiGGQEAAAAAYUZmY2Nuc1I=; _gid=GA1.2.901115755.1769911652; shopee_rn_version=1769767548; SPC_RNBV=6091004; shopee_rn_bundle_version=6091004; SPC_ST=.VDVWcDZFTE5OU3ZvUERDN+UeMJnKWFaE9QIiw70bOXuTtg3pfLHxOQvh73wNX7D8NGF/h58PVbgH8hcEpNSlWs1hdoBBaEvZm9UL6VUGW44HDb/PoptYCHv15zRf1NE1DA9FbbXUdwyu4tGK+HLGYMxZuEP5XtvqhrtqKQ2SB+yRQk19vMJm+ICVzItBS+I/ifucCgOlWR/l93yCP3Lb1I/PouC1/+qMqvTd80VFFy6V1EfhdCQGQCwsEG5HZeIDjvGRJ2q3BK02cRZOkaxLSQ==; csrftoken=ATePRGXhR3tQVPWMJOSp7pCw59vHFgTp; AC_CERT_D=U2FsdGVkX1/vN6Mp1wkWstwx8TaxZ+3V8gh7I6OjVGmRUCNqZljwkBkkEB5TddVTZuQjq3rT0ye9ETc2OwSW4okVF1FMzXXVPibr649QpsVwEUDHzJe6FotEM5XDrzxkdvfUewPqVlZmqb1sqhGHL1td+DyCzRDE+RiZy1S0O9YIssG+UVwY0dj5lDB35JKXtBpHo2FzAvlDSTDDzp66GMVIyIfOaEEYfMKUDe+z6z+9SClYwXvwXXjUofOVtlRN9k9JrBtz5oQH2ZSXhkDS+MOgeHumSE2e4o3o3icXnvyeKvbWLpyn3Bta3IGGzNP8z+n22kLu8P8tfHxrJlH/nk3gxFwktGSPzRDY/8P6+U4IzeHBZC+Mb9YYs8oYAIy7tEe7y1KZmZmWoogUpzoheiN6hK61RyzAjAT5aLrVRFc01CVjpKoKxiZzIi0XLmK02IolxepxViTDRZjnGnHa2rAvtOLGiX4VjkgAgkQPjZuGojjvZxDcRNiL8eyv5yG7VuvDJ1Ju4GSbh60V4bUnHYxNH9GbKcAFv1AM1QdXLfhUCNdjzpk5fNCzJigtqoArWFV/k/5q4feox1HSRBlGjbNbCBpvHru4vza4T+G9tTcczt7C544XKxnVY3a7wNuwN0R+JGd0/H57j3IpxKDdyKXvq30Q3iSBTNKJCOFaAY9cyL4xbEccgbo4wzaIYBRzdIzjxMh1ZH90R6BSlx4QV2aWRcBAjJxZSr7ZFDSLQLpW7giLaaAAeKEFWFoU7dXL9euY57YeUTE9Xca6bGTTTdiUKlc/03Y/3GuQE5PePciHN7A/r7IXLj2+aSlq6CySFH/UQlA7MInUDFO29FCejIIyPjO5atZ8u0pgMQkH/UaA5QVt0Uw55DEufMlGLmYTKEWG21qXWu0ZexpW4BN3x+khyBNXRtMNdBqGMMCnuRjO2F5DERkTVhPyOp5Ghj1ipUAtKJWItZfNCDy+7NNAsEi+VPs4OTfef3JTLlGeIgLjbx1J06i1a5kBeb6k0YdMJ0pFX1leTkdxHJdSvoH3TTxhEVi7bQRjW0K8RPtyAxq6HLhdj+AJMfKmHH0u7dEZPGk76kDD+5Gc/EE71JkKog==; UA=Mozilla%2F5.0%20%28Linux%3B%20Android%2010%3B%20SM-G960F%20Build%2FQP1A.190711.020%3B%20wv%29%20AppleWebKit%2F537.36%20%28KHTML%2C%20like%20Gecko%29%20Version%2F4.0%20Chrome%2F144.0.7559.59%20Mobile%20Safari%2F537.36%20Shopee%20Beeshop%20locale%2Fvi%20version%3D36024%20appver%3D36024%20rnver%3D1769767548%20app_type%3D1%20platform%3Dweb_android%20os_ver%3D29; _ga_4GPP1ZXG63=GS2.1.s1769962669$o4$g1$t1769963412$j59$l0$h464495272; AMP_TOKEN=%24NOT_FOUND; _ga=GA1.2.947067769.1769315504; _dc_gtm_UA-61914164-6=1; shopee_webUnique_ccd=VLugJhiYHpdrITRDwEfzhg%3D%3D%7CRhRQiOQ2ceoRZOIK4z9NvL5N5GDfC%2BaVbiIEa%2B4zM1zk%2B6xl20d3pEIygWaj0gHRpZhipcLD8U5ZltPQLzw%3D%7CmzTRiwJ5Au6YIwR1%7C08%7C3; ds=a85a6c678c6f07a28545bb078ad4fe8e; SPC_EC=.M1FGaHVjbUwzdWlKdTcxdXAQiP59t0qYL2GXHgk8Iwoe1ZDCCL4Es3fXPw1U374nPgF8wr/5sxlazmxXkIhDhSi/te2SdyR13Q7ysT6s8sx3emYCrKRgCTpRibOhkvBhH32+czZOp62c/Ndj5LbSafVb/kvVOTri8/Xgg6Toxx7tVumoUxddIDOozLfG2UBmOJEzvE688Ys1bl4aTwcE1RkRKjCl7nsNaag8sO7tnAW1w2//3sia19SMSLOotAPRlUpH2XixA7gBytfreAmOHA=="; // bạn set env SHOPEE_COOKIE="SPC_CLIENTID=...; ..."
  const X_LS_SZ_TOKEN =  "t+Eg48nlh0CTRtakIVqyEw==|e41eORIyF9QJ40YMUQcKRSEnXQPx1E0aul2oqEb/09XGFwDy6O0KUCPiC6QBVtQlkTrurqav8IlvOmVGT2vojDjqXCZc/cH43fTKPf9hCw==|0kf/X6x7HahUkPbK|08|1";
  const X_LIVESTREAMING_AUTH = xLivestreamingAuth; // Sử dụng auth header động

  const client = http2.connect(origin, {
    // nếu cần debug TLS/ALPN thì thêm options ở đây
  });

  client.on("error", (err) => {
    console.error("HTTP2 client error:", err);
  });

  const headers = {
    // PSEUDO-HEADERS (bắt buộc trong http2)
    ":method": "PUT",
    ":path": urlPath,

    // Normal headers (nên lowercase)
    "user-agent":
      'Mozilla/5.0 (Linux; Android 10; SM-G960F Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/144.0.7559.59 Mobile Safari/537.36 Shopee Beeshop locale/vi version=36024 appver=36024 rnver=1769767548 app_type=1 platform=web_android os_ver=29',
    accept: "application/json, text/plain, */*",
    "content-type": "application/json",

    // Nếu bạn muốn tự giải nén thì giữ gzip/br, còn muốn đơn giản thì dùng "identity"
    "accept-encoding": "gzip, deflate, br",

    "client-info":
      "os=0;platform=5;scene_id=17;language=vi;device_id=av96pDs2YRV%2B9lp7plCGuWVc0%2BrdYFlbfbUnLn%2Focbg%3D",
    "af-ac-enc-dat": "f7448b272ec1f0d3",
    "x-sap-ri": "ad7f7f6938ab24d8c055083303017577dfe4ff6dbd0d368cc6a4",

    // Các token/header nhạy cảm -> lấy từ env
    "x-ls-sz-token": X_LS_SZ_TOKEN,
    "x-livestreaming-auth": X_LIVESTREAMING_AUTH,

    "x-sz-sdk-version": "1.10.7",
    "x-livestreaming-source": "shopee",
    origin: "https://live.shopee.vn",
    "x-requested-with": "com.shopee.vn",
    referer:
      "https://live.shopee.vn/p/product-select?session=31833006&streamer_id=554259072&from_source=room_streamer&host_id=0&track=%7B%22moderator_permissions%22%3A%7B%22is_ban_pin_comments%22%3Afalse%2C%22is_intro_request%22%3Afalse%2C%22is_manage_item_bag%22%3Afalse%2C%22is_manage_streaming_price%22%3Afalse%2C%22is_add_voucher%22%3Afalse%2C%22is_coin_reward%22%3Afalse%2C%22is_block_keyword%22%3Afalse%7D%2C%22device_type%22%3A1%2C%22is_from_share_reward_link%22%3Afalse%7D&is_live=1",
    "accept-language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",

    cookie: COOKIE,

    "content-length": String(payload.length),
  };

  const req = client.request(headers);

  const chunks = [];
  let respHeaders;

  req.on("response", (h) => {
    respHeaders = h;
  });

  req.on("data", (chunk) => chunks.push(chunk));

  req.on("end", () => {
    try {
      const buf = Buffer.concat(chunks);
      const encoding = respHeaders?.["content-encoding"];
      const decoded = decodeBody(buf, encoding);
      const text = decoded.toString("utf8");

      console.log("Status:", respHeaders[":status"]);
      console.log("Resp headers:", respHeaders);
      console.log("Body:", text);

      // nếu là JSON:
      try {
        const json = JSON.parse(text);
        console.log("JSON:", json);
      } catch (_) { }
    } catch (e) {
      console.error("Parse/decode error:", e);
    } finally {
      req.close();
      client.close();
    }
  });

  req.on("error", (err) => {
    console.error("Request error:", err);
    req.close();
    client.close();
  });

  req.write(payload);
  req.end();
}

addItemsHttp2().catch(console.error);
