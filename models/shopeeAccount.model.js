const mongoose = require('mongoose');


const liveConfigSchema = new mongoose.Schema(
  {
    avatar_file_id: { type: String },
    avatar_path: { type: String },
    shopee_category_ids: { type: [String] },
    product_quantity: {
      type: Number,
      default: 30,
    },
    live_mode: {
      type: String,
      enum: ["real", "test"],
      default: "real",
    },
  },
  { _id: false }
);

const shopeeAccountSchema = new mongoose.Schema(
  {
    user_id: { type: String ,  null: true, default: null},
    shop_id: { type: String, null: true, default: null },
    email: { type: String, null: true, default: null },
    email_password: { type: String, null: true, default: null },
    username: { type: String, null: true, default: null },
    phone: { type: String, null: true, default: null },
    password: { type: String, null: true, default: null },
    is_active: { type: Boolean, default: true },
    machine_id: { type: String, null: true, default: null },
    note: { type: String, null: true, default: null },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: false
    },
    live_config: liveConfigSchema,
    session_id: { type: String, null: true, default: null },
    state: { type: String, null: true, default: null },
    deviceInfo: { type: String, null: true, default: null },
    isMcn: { type: Boolean,  default: false },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    isCustomCart: { type: Boolean, default: false },
    videoFile: { type: String, null: true, default: null },
    deviceId: { type: String, null: true, default: null },
    videosUploaded: { type: Number, default: 0 },
    time_update_cookie: { type: String, null: true, default: null },
    cookie_live: { type: String, null: true, default: null },
    is_upload_api: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ShopeeAccount', shopeeAccountSchema);


