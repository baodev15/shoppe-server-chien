
const Account = require('../models/shopeeAccount.model');
const ShopeeAccountApiLog = require('../models/shopeeAccountApiLog.model');
const mongoose = require('mongoose');

module.exports.getShopeeAccounts = async (req, res) => {
  try {
    const accounts = await Account.find({ cookie_live: { $ne: null }, is_upload_api: true }).sort({ name: 1 });
    res.json({
      success: true,
      accounts
    });
  } catch (error) {
    console.error('Error fetching shopee accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}


module.exports.uploadVideoStatus = async (req, res) => {
  try {
    const { user_id, video_status } = req.body;
    let account = await Account.findOne({ user_id });
    if (!account) {
      return res.status(400).json({
        success: false,
        message: 'Account not found'
      });
    }

    if (video_status == "DONE") {
      account.totalVideosUploaded++;
      if (account.last_upload_time.getDate() !== new Date().getDate()) {
        account.dalyVideosUploaded = 1;
        account.last_upload_time = new Date();
      } else {
        account.dalyVideosUploaded++;
      }
      account.last_status_upload = "Đăng video thành công";
    } else if (video_status == "COOKIE_EXPIRED") {
      account.is_upload_api = false;
      account.last_status_upload = "Cookie hết hạn! Vui lòng cập nhật lại cookie mới.";
    } else {
      account.last_status_upload = video_status;
    }
    await account.save();
    res.json({
      success: true,
      message: 'Video status updated successfully'
    });
  } catch (error) {
    console.error('Error updating video status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}

module.exports.updateCookieLive = async (req, res) => {
  try {
    const { user_id, cookie_live, username, shop_id } = req.body;
    let account = await Account.findOne({ user_id });
    if (!account) {
      // tạo mới account
      if (!username) {
        return res.status(400).json({
          success: false,
          message: 'Username and Shop ID are required'
        });
      }
      account = new Account({
        user_id,
        cookie_live: cookie_live,
        time_update_cookie: Date.now(),
        username,
        shop_id
      });
      await account.save();
      return res.json({
        success: true,
        message: 'Account created successfully',
        account
      });
    }
    if (!cookie_live) {
      return res.status(400).json({
        success: false,
        message: 'Cookie live is required'
      });
    }
    account.cookie_live = cookie_live;
    account.time_update_cookie = Date.now();
    await account.save();
    res.json({
      success: true,
      message: 'Cookie live updated successfully',
      account
    });
  } catch (error) {
    console.error('Error updating cookie live:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}

module.exports.logApiCall = async (req, res) => {
  try {
    const { user_id, status, message, job_id, source, payload } = req.body || {};

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required'
      });
    }
    let account = await Account.findOne({ user_id });
    if (!account) {
      return res.status(400).json({
        success: false,
        message: 'Account not found'
      });
    }
    const created = await ShopeeAccountApiLog.create({
      account: account._id,
      status: status || '',
      message: message || '',
      job_id: job_id || '',
      source: source || 'upload_api',
      payload: payload || {}
    });

    return res.json({
      success: true,
      message: 'Log saved',
      id: created._id
    });
  } catch (error) {
    console.error('Error saving api log:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}
