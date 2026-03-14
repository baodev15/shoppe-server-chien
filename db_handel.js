const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Product = require('./models/product.model');
const ShopeeAccount = require('./models/shopeeAccount.model');

// Kết nối MongoDB
const MONGO_URI = "mongodb+srv://doadmin:Y5omIP206nj438O1@db-mongodb-sgp1-95245-ce08c080.mongo.ondigitalocean.com/shopee_vn?replicaSet=db-mongodb-sgp1-95245&tls=true&authSource=admin";

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Đã kết nối đến MongoDB')
    // Chạy hàm xử lý
    console.time('Thời gian xử lý');
    
    // Đếm số product có điều kiện: img_checked != "", checked = True, is_created_video = False, name != ""
    try {
      console.log('=== THỐNG KÊ PRODUCT ===');
      
      // Đếm theo điều kiện yêu cầu
      const targetCount = await Product.countDocuments({
        img_checked: { $ne: "" },
        checked: true,
        is_created_video: false,
        name: { $ne: "" }
      });
      
      console.log(`✅ Số product có img_checked != "", checked = True, is_created_video = False, name != "": ${targetCount}`);
      
      // Thống kê bổ sung để hiểu rõ hơn
      const totalProducts = await Product.countDocuments();
      const hasImgChecked = await Product.countDocuments({ img_checked: { $exists: true, $ne: "" } });
      const isChecked = await Product.countDocuments({ checked: true });
      const notCreatedVideo = await Product.countDocuments({ is_created_video: false });
      const hasName = await Product.countDocuments({ name: { $ne: "" } });
      
      console.log(`📊 Tổng số product: ${totalProducts}`);
      console.log(`📷 Có img_checked: ${hasImgChecked}`);
      console.log(`✓ Đã checked: ${isChecked}`);
      console.log(`🎥 Chưa tạo video: ${notCreatedVideo}`);
      console.log(`🏷️ Có tên: ${hasName}`);
      
      // Tỷ lệ phần trăm
      const percentage = totalProducts > 0 ? ((targetCount / totalProducts) * 100).toFixed(2) : 0;
      console.log(`📈 Tỷ lệ product đạt điều kiện: ${percentage}%`);
      
      // Optional: Lấy danh sách để kiểm tra chi tiết
      if (targetCount > 0) {
        const products = await Product.find({
          img_checked: { $ne: "" },
          checked: true,
          is_created_video: false,
          name: { $ne: "" }
        }).limit(5).select('item_id name img_checked checked is_created_video statusUpVideo');
        
        console.log('\n5 product mẫu:');
        products.forEach((product, index) => {
          console.log(`${index + 1}. Item ID: ${product.item_id}`);
          console.log(`   Name: ${product.name}`);
          console.log(`   img_checked: ${product.img_checked}`);
          console.log(`   checked: ${product.checked}`);
          console.log(`   is_created_video: ${product.is_created_video}`);
          console.log(`   statusUpVideo: ${product.statusUpVideo}`);
          console.log('');
        });

      
      }
      
    } catch (error) {
      console.error('❌ Lỗi khi đếm product:', error);
    }
    
    console.timeEnd('Thời gian xử lý');
    console.log('Hoàn thành xử lý');
    
    // Đóng kết nối sau khi hoàn thành
    mongoose.connection.close();
    
  })
  .catch(err => {
    console.error('Lỗi kết nối MongoDB:', err);
    process.exit(1);
  });

