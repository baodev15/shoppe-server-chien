const mongoose = require('mongoose');

const commissionStatsSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    index: true
  },
  shopee_account_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShopeeAccount',
    required: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  stats: {
    total_commission: {
      type: Number,
      default: 0
    },
    total_orders: {
      type: Number,
      default: 0
    },
    total_sales: {
      type: Number,
      default: 0
    },
    total_clicks: {
      type: Number,
      default: 0
    },
    conversion_rate: {
      type: Number,
      default: 0
    },
    items_sold: {
      type: Number,
      default: 0
    },
    // Additional metrics from the new response format
    live_clicks: {
      type: Number,
      default: 0
    },
    live_orders: {
      type: Number,
      default: 0
    },
    live_commission: {
      type: Number,
      default: 0
    },
    live_items_sold: {
      type: Number,
      default: 0
    }
  },
  raw_data: {
    type: Object
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for faster queries
commissionStatsSchema.index({ username: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('CommissionStats', commissionStatsSchema);