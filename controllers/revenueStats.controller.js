const CommissionStats = require('../models/commissionStats.model');
const ShopeeAccount = require('../models/shopeeAccount.model');
const Commission = require('../models/commissionStats.model');
const Team = require('../models/team.model');

// Get revenue statistics page
exports.getRevenueStatsPage = async (req, res) => {
  try {
    // Get query parameters
    const { month, year, username, team } = req.query;
    
    // Set default month and year to current month if not provided
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    const selectedMonth = parseInt(month) || currentMonth;
    const selectedYear = parseInt(year) || currentYear;
    
    // Calculate days in month
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    
    // Build query for accounts
    const accountQuery = {};
    
    // Apply team filter based on user role
    if (req.user.role !== 'admin') {
      accountQuery.team = req.user.team;
    } else if (team) {
      let _team = await Team.findOne({ name: team });
      if (!_team) {
        req.flash('error', 'Team not found');
        return res.redirect('/revenue-stats');
      }
      accountQuery.team = _team._id;
    }
    
    if (username) {
      accountQuery.username = { $regex: username, $options: 'i' };
    }

    console.log('Account Query:', accountQuery);
    
    // Get all accounts matching the query
    const shopeeAccounts = await ShopeeAccount.find(accountQuery)
      .populate('team', 'name')
      .sort({ username: 1 });

    console.log('Found Accounts:', shopeeAccounts.length);
    
    // Get commission data for the selected month and year
    const startDate = new Date(selectedYear, selectedMonth - 1, 1);
    const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);
    
    console.log('Date Range:', { startDate, endDate });
    
    const commissionData = await Commission.find({
      date: { $gte: startDate, $lte: endDate }
    });

    console.log('Commission Data Count:', commissionData.length);
    
    // Process data for display
    const accounts = [];
    const dailyTotals = Array(daysInMonth).fill(0);
    const dailyItemsSoldTotals = Array(daysInMonth).fill(0);
    let grandTotal = 0;
    let totalItemsSold = 0;
    
    // Process each account
    shopeeAccounts.forEach(account => {
      const dailyData = Array(daysInMonth).fill(0);
      const dailyItemsSold = Array(daysInMonth).fill(0);
      let accountTotal = 0;
      let accountTotalItemsSold = 0;
      
      // Find commission data for this account
      commissionData.forEach(commission => {
        if (commission.shopee_account_id && 
            commission.shopee_account_id.toString() === account._id.toString()) {
          const day = commission.date.getDate() - 1;
          const amount = parseFloat(commission.stats.total_commission) || 0;
          const itemsSold = parseInt(commission.stats.items_sold) || 0;
          
          dailyData[day] += amount;
          dailyItemsSold[day] += itemsSold;
          
          dailyTotals[day] += amount;
          dailyItemsSoldTotals[day] += itemsSold;
          
          accountTotal += amount;
          accountTotalItemsSold += itemsSold;
          
          grandTotal += amount;
          totalItemsSold += itemsSold;
        }
      });
      
      accounts.push({
        id: account._id,
        username: account.username,
        team: account.team ? account.team.name : 'N/A',
        isMcn: account.isMcn || false,
        dailyData,
        dailyItemsSold,
        total: accountTotal,
        totalItemsSold: accountTotalItemsSold
      });
    });

    console.log('Processed Accounts:', accounts.length);
    console.log('Sample Account Data:', accounts[0]);
    
    // Get all teams for the filter dropdown
    const teams = await Team.find().distinct('name');
    
    // Render the page with data
    res.render('revenue-stats', {
      title: 'Thống kê doanh thu',
      activePage: 'revenue-stats',
      month: selectedMonth,
      year: selectedYear,
      username: username || '',
      team: team || '',
      daysInMonth,
      accounts,
      dailyTotals,
      dailyItemsSoldTotals,
      grandTotal,
      totalItemsSold,
      teams,
      showTeamFilter: req.user.role === 'admin'
    });
    
  } catch (error) {
    console.error('Error fetching revenue stats:', error);
    req.flash('error', 'Không thể tải dữ liệu thống kê doanh thu');
    res.status(500).render('error', { 
      message: 'Lỗi khi tải dữ liệu thống kê doanh thu',
      error: { status: 500, stack: process.env.NODE_ENV === 'development' ? error.stack : '' }
    });
  }
};