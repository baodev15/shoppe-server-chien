const mongoose = require('mongoose');

const shopeeAccountApiLogSchema = new mongoose.Schema({
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopeeAccount', required: true },
  status: { type: String, default: '' },
  message: { type: String, default: '' },
  job_id: { type: String, default: '' },
  source: { type: String, default: 'upload_api' },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

shopeeAccountApiLogSchema.index({ createdAt: -1 });
shopeeAccountApiLogSchema.index({ user_id: 1, createdAt: -1 });

module.exports = mongoose.model('ShopeeAccountApiLog', shopeeAccountApiLogSchema);
