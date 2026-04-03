
const Account = require('../models/shopeeAccount.model');
const ShopeeAccountApiLog = require('../models/shopeeAccountApiLog.model');

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


module.exports.uploadVideoStatus = async (req, res) =>{
  try {
    const { username, video_status } = req.body;
    let account = await Account.findOne({username});
    if (!account) {
      return res.status(400).json({
        success: false,
        message: 'Account not found'
      });
    }
    account.last_status_upload = video_status;
    if(video_status=="DONE"){
      // thêm  totalVideosUploaded
       //dalyVideosUploaded => nếu ngày mới là ngày khác thì dalyVideosUploaded = 1
       //nếu ngày mới là ngày cùng thì dalyVideosUploaded++;
       account.totalVideosUploaded++;
   
       if(account.last_upload_time.getDate() !== new Date().getDate()){
        account.dalyVideosUploaded = 1;
        account.last_upload_time = new Date();
       }else{
            account.dalyVideosUploaded++;
       }
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
    let account = await Account.findOne({user_id});
    if (!account) {
      // tạo mới account
      if (!username || !shop_id) {
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
    const {username, status, message, job_id, source, payload } = req.body || {};

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'username is required'
      });
    }

    const created = await ShopeeAccountApiLog.create({
      username: username,
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
