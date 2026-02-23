const User = require('../models/user.model');
const ShopeeAccount = require('../models/shopeeAccount.model');
const bcrypt = require('bcryptjs');
const Team = require('../models/team.model');

// Get all users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .populate('team', 'name')  // Populate team with name field
      .sort({ createdAt: -1 });
    
    res.render('admin/accounts', {
      users,
      title: 'User Management',
      activePage: 'admin-accounts'
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    req.flash('error', 'Failed to fetch users');
    res.redirect('/admin');
  }
};

// Get user creation form
exports.getUserForm = async (req, res) => {
  try {
    // Get all teams for the dropdown
    const teams = await Team.find({ active: true }).sort({ name: 1 });
    
    res.render('admin/account-form', {
      title: 'Tạo tài khoản mới',
      activePage: 'admin-accounts',
      user: {},
      teams
    });
  } catch (error) {
    console.error('Error loading user form:', error);
    req.flash('error', 'Không thể tải form tạo tài khoản');
    res.status(500).send('Server error');
  }
};

// Get user edit form
exports.getEditUserForm = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('team');
    if (!user) {
      req.flash('error', 'Không tìm thấy tài khoản');
      return res.redirect('/admin/accounts');
    }
    
    // Get all teams for the dropdown
    const teams = await Team.find({ active: true }).sort({ name: 1 });
    
    res.render('admin/account-form', {
      title: 'Chỉnh sửa tài khoản',
      activePage: 'admin-accounts',
      user,
      teams
    });
  } catch (error) {
    console.error('Error loading edit user form:', error);
    req.flash('error', 'Không thể tải form chỉnh sửa tài khoản');
    res.status(500).send('Server error');
  }
};

// Create new user
exports.createUser = async (req, res) => {
  try {
    const { username, password, role, team } = req.body;
    
    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username đã tồn tại'
      });
    }
    
    // Create new user
    const user = new User({
      username,
      password,
      role,
      team
    });
    
    await user.save();
    
    res.status(201).json({
      success: true,
      message: 'Tạo tài khoản thành công',
      data: user
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo tài khoản',
      error: error.message
    });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { role, team, password } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản'
      });
    }
    
    // Update user fields
    user.role = role;
    user.team = team;
    
    // Update password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Cập nhật tài khoản thành công',
      data: user
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật tài khoản',
      error: error.message
    });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản'
      });
    }
    
    // Prevent deleting admin users
    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa tài khoản admin'
      });
    }
    
    await user.remove();
    
    res.json({
      success: true,
      message: 'Xóa tài khoản thành công'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa tài khoản',
      error: error.message
    });
  }
};