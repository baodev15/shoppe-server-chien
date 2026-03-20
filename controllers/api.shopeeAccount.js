
const Account = require('../models/shopeeAccount.model');

module.exports.getShopeeAccounts = async (req, res) => {
  try {
    const accounts = await Account.find({cookie_live: {$ne: null}, is_upload_api: true}).sort({ name: 1 });
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

module.exports.updateCookieLive = async (req, res) => {
  try {
    const { user_id, cookie_live, username, shopee_id } = req.body;
    const account = await Account.findOne({user_id});
    if (!account) {
      // tạo mới account
      if (!username || !shopee_id) {
        return res.status(400).json({
          success: false,
          message: 'Username and Shopee ID are required'
        });
      }
      account = new Account({
        user_id,
        cookie_live: cookie_live,
        time_update_cookie: Date.now(),
        username,
        shopee_id
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