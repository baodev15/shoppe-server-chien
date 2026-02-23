const { default: axios } = require("axios");
const shopeeAccountModel = require("../models/shopeeAccount.model");
const CommissionStats = require("../models/commissionStats.model");
const cron = require('node-cron');

exports.getComissionByUserName = async (req, res) => {
    const { username } = req.params;
    const { start_date, end_date } = req.query;
    console.log(req.query);
    if (!username)
        return res.status(400).json({ message: "Username is required" });
    
    const shopeeAccount = await shopeeAccountModel.findOne({
        username: username,
    });
    
    if (!shopeeAccount)
        return res.status(404).json({ message: "Shopee Account not found" });
    
    const apiHeader = shopeeAccount?.api_header?.content;
    if (!apiHeader)
        return res.status(404).json({ message: "API Header not found" });

    // start_date và end_date là chuỗi định dạng "YYYY-MM-DD"
    const start_time = Math.floor(new Date(start_date).getTime() / 1000);
    const end_time = Math.floor(new Date(end_date).getTime() / 1000);

    const apiHeaderContent = JSON.parse(apiHeader);
    const commissionRes = await axios.get(`https://affiliate.shopee.vn/api/v3/dashboard/detail?start_time=${start_time}&end_time=${end_time}`, {
        headers: apiHeaderContent,
    });

    if (commissionRes.status !== 200) {
        return res.status(404).json({ message: "Commission not found" });
    }

    const commission = commissionRes.data;

    if (!commission) return res.status(404).json({ message: "Commission not found" });

    res.json(commission);
};
function getUTCStartOfDay(date = new Date()) {
    const utcDate = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(), // giữ nguyên ngày UTC
      0, 0, 0, 0
    ));
    return utcDate;
  }
  function getStartAndEndTimeInGMT8(date) {
    const inputDate = new Date(date);

    // Giờ GMT+8 = UTC+8 => trừ 8 tiếng để được UTC tương ứng
    const startDate = new Date(Date.UTC(
        inputDate.getUTCFullYear(),
        inputDate.getUTCMonth(),
        inputDate.getUTCDate(),
        -8, 0, 0, 0  // 00:00 GMT+8 = 16:00 UTC ngày hôm trước
    ));

    const endDate = new Date(Date.UTC(
        inputDate.getUTCFullYear(),
        inputDate.getUTCMonth(),
        inputDate.getUTCDate(),
        15, 59, 59, 999 // 23:59:59 GMT+8 = 15:59:59 UTC
    ));

    return {
        start_time: Math.floor(startDate.getTime() / 1000),
        end_time: Math.floor(endDate.getTime() / 1000)
    };
}

// Function to fetch and store commission data for a single account
async function fetchAndStoreCommissionData(shopeeAccount, date) {
    try {
        if (!shopeeAccount.api_header?.content) {
            console.log(`API Header not found for account: ${shopeeAccount.username}`);
            return null;
        }

        // Set the date to the beginning of the day
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        
        // Set the end date to the end of the day
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        
        let {start_time, end_time} = getStartAndEndTimeInGMT8(date)
        console.log({start_time, end_time})
        const apiHeaderContent = JSON.parse(shopeeAccount.api_header.content);
        
        let responseData;
        
        // Check if the account is an MCN account
        if (shopeeAccount.isMcn) {
            console.log(`Account ${shopeeAccount.username} is an MCN account, using MCN API endpoint`);
            // Call the MCN-specific API endpoint
            const mcnCommissionRes = await axios.get(
                `https://affiliate.shopee.vn/api/v3/report/list?page_size=20&page_num=1&purchase_time_s=${start_time}&purchase_time_e=${end_time}&version=1`,
                { headers: apiHeaderContent }
            );
            
            if (mcnCommissionRes.status !== 200 || !mcnCommissionRes.data) {
                console.log(`Failed to fetch MCN commission data for account: ${shopeeAccount.username}`);
                return null;
            }
            
            responseData = mcnCommissionRes.data;
            
            // Check if the response has the expected structure
            if (responseData.code !== 0 || !responseData.data) {
                console.log(`Invalid MCN response format for account: ${shopeeAccount.username}`);
                return null;
            }
            
            // Process MCN data differently
            const mcnData = responseData.data;
            const mcnList = mcnData.list || [];
            
            // Calculate totals from MCN data
            let totalMcnCommission = 0;
            let totalMcnOrders = 0;
            let totalMcnSales = 0;
            let totalItems = 0;
            
            mcnList.forEach(checkout => {
                // Sum up the estimated total commission with MCN
                totalMcnCommission += parseFloat(checkout.estimated_total_commission_with_mcn || 0);
                
                // Count orders
                if (checkout.orders && checkout.orders.length) {
                    totalMcnOrders += checkout.orders.length;
                    
                    // Calculate total sales and items from orders
                    checkout.orders.forEach(order => {
                        if (order.items && order.items.length) {
                            order.items.forEach(item => {
                                totalMcnSales += parseFloat(item.actual_amount || 0);
                                totalItems += parseInt(item.qty || 0);
                            });
                        }
                    });
                }
            });
            
            // Create stats object for MCN data
            const stats = {
                total_commission: totalMcnCommission / 100000, // Convert to reasonable currency value
                total_orders: totalMcnOrders,
                total_sales: totalMcnSales / 100000, // Convert to reasonable currency value
                total_clicks: mcnData.total_count || 0,
                items_sold: totalItems,
                is_mcn_data: true,
                mcn_checkouts: mcnData.total_count || 0
            };
            
            console.log(`MCN stats for ${shopeeAccount.username}:`, stats);
            
            // Create or update the commission stats record for MCN
            const commissionStats = await CommissionStats.findOneAndUpdate(
                { 
                    username: shopeeAccount.username,
                    date: getUTCStartOfDay(startDate)
                },
                {
                    shopee_account_id: shopeeAccount._id,
                    stats: stats,
                    raw_data: responseData.data,
                    created_at: new Date(),
                    is_mcn_data: true
                },
                { 
                    upsert: true, 
                    new: true,
                    setDefaultsOnInsert: true
                }
            );
            
            console.log(`Stored MCN commission data for account: ${shopeeAccount.username}, date: ${startDate.toISOString().split('T')[0]}`);
            return commissionStats;
        } else {
            // Original code for non-MCN accounts
            const commissionRes = await axios.get(
                `https://affiliate.shopee.vn/api/v3/dashboard/detail?start_time=${start_time}&end_time=${end_time}`,
                { headers: apiHeaderContent }
            );
            
            if (commissionRes.status !== 200 || !commissionRes.data) {
                console.log(`Failed to fetch commission data for account: ${shopeeAccount.username}`);
                return null;
            }
            
            responseData = commissionRes.data;
            console.log(`Fetched commission data for account: ${responseData}`);
            
            // Check if the response has the expected structure
            if (responseData.code !== 0 || !responseData.data) {
                console.log(`Invalid response format for account: ${shopeeAccount.username}`);
                return null;
            }
            
            const commissionData = responseData.data;
            
            // Get the first day's data from the list (should be only one day)
            const dayData = commissionData.list && commissionData.list.length > 0 
                ? commissionData.list[0] 
                : null;
                
            // Extract relevant stats from the API response
            const stats = {
                total_commission: dayData ? parseFloat(dayData.est_commission) / 100000 : 0, // Convert to reasonable currency value
                total_orders: dayData ? dayData.cv_by_order : 0,
                total_sales: dayData ? parseFloat(dayData.order_amount) / 100000 : 0, // Convert to reasonable currency value
                total_clicks: dayData ? dayData.clicks : 0,
                conversion_rate: dayData ? dayData.order_cvr / 100 : 0, // Convert from basis points to percentage
                items_sold: dayData ? dayData.item_sold : 0,
                // Additional metrics from the new response format
                live_clicks: commissionData.live_clicks || 0,
                live_orders: commissionData.channel_breakdown?.live_order || 0,
                live_commission: parseFloat(commissionData.live_est_commission || 0) / 100000,
                live_items_sold: commissionData.live_item_sold || 0,
                is_mcn_data: false
            };
            
            console.log(stats);
            
            // Create or update the commission stats record
            const commissionStats = await CommissionStats.findOneAndUpdate(
                { 
                    username: shopeeAccount.username,
                    date: getUTCStartOfDay(startDate)
                },
                {
                    shopee_account_id: shopeeAccount._id,
                    stats: stats,
                    raw_data: responseData.data,
                    created_at: new Date(),
                    is_mcn_data: false
                },
                { 
                    upsert: true, 
                    new: true,
                    setDefaultsOnInsert: true
                }
            );
            
            console.log(`Stored commission data for account: ${shopeeAccount.username}, date: ${startDate.toISOString().split('T')[0]}`);
            return commissionStats;
        }
    } catch (error) {
        console.error(`Error fetching commission for ${shopeeAccount.username}:`, error.message);
        return null;
    }
}

// Function to fetch and store commission data for all accounts
exports.fetchAllAccountsCommissionData = async (req, res) => {
    try {
        const date = req.query.date ? new Date(req.query.date) : new Date();
        
        // Get all accounts with API headers
        const accounts = await shopeeAccountModel.find({
            'api_header.content': { $exists: true, $ne: null }
        });
        
        if (!accounts || accounts.length === 0) {
            return res.status(404).json({ message: "No accounts with API headers found" });
        }
        
        const results = [];
        
        // Process each account
        for (const account of accounts) {
            const result = await fetchAndStoreCommissionData(account, date);
            if (result) {
                results.push({
                    username: account.username,
                    date: date.toISOString().split('T')[0],
                    success: true
                });
            } else {
                results.push({
                    username: account.username,
                    date: date.toISOString().split('T')[0],
                    success: false
                });
            }
        }
        
        return res.json({
            success: true,
            message: `Processed ${results.length} accounts`,
            results: results
        });
    } catch (error) {
        console.error("Error fetching all accounts commission data:", error);
        return res.status(500).json({ 
            success: false,
            message: "Failed to fetch commission data",
            error: error.message
        });
    }
};

// Get commission stats for all accounts in a date range
exports.getCommissionStats = async (req, res) => {
    try {
        const { start_date, end_date, username } = req.query;
        
        if (!start_date || !end_date) {
            return res.status(400).json({ message: "Start date and end date are required" });
        }
        
        const startDate = new Date(start_date);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(end_date);
        endDate.setHours(23, 59, 59, 999);
        
        const query = {
            date: { $gte: startDate, $lte: endDate }
        };
        
        // Filter by username if provided
        if (username) {
            query.username = username;
        }
        
        const stats = await CommissionStats.find(query)
            .sort({ date: 1, username: 1 })
            .populate('shopee_account_id', 'username email team');
        
        return res.json({
            success: true,
            count: stats.length,
            data: stats
        });
    } catch (error) {
        console.error("Error fetching commission stats:", error);
        return res.status(500).json({ 
            success: false,
            message: "Failed to fetch commission stats",
            error: error.message
        });
    }
};

// Initialize the cron job to run at midnight every day
exports.initCommissionCronJob = () => {
    // Schedule task to run at midnight (00:00)
    cron.schedule('0 16 * * *', async () => {
        console.log('Running daily commission data collection job...');
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        try {
            // Get all accounts with API headers
            const accounts = await shopeeAccountModel.find({
                'api_header.content': { $exists: true, $ne: null }
            });
            
            console.log(`Found ${accounts.length} accounts to process`);
            
            // Process each account
            for (const account of accounts) {
                await fetchAndStoreCommissionData(account, yesterday);
            }
            
            console.log('Daily commission data collection completed');
        } catch (error) {
            console.error('Error in daily commission data collection:', error);
        }
    }, {
        timezone: "Asia/Ho_Chi_Minh" // Set to Vietnam timezone
    });
    
    console.log('Commission cron job initialized');
    
    // Run immediately to collect data for today and yesterday
   this.runCommissionCollection();
};

// Function to run commission collection immediately
exports.runCommissionCollection = async () => {
    console.log('Running immediate commission data collection...');
    
    try {
        // Collect data for today
        const today = new Date();
        console.log(`Collecting data for today: ${today.toISOString().split('T')[0]}`);
        
        // Get all accounts with API headers
        let accounts = await shopeeAccountModel.find({
            'api_header.content': { $exists: true, $ne: null }
        });
        
        console.log(`Found ${accounts.length} accounts to process`);
        
        
        let yesterday = new Date();
        yesterday.setDate(yesterday.getDate()-1);
        // console.log(`Collecting data for yesterday: ${yesterday.toISOString().split('T')[0]}`);
        // accounts =accounts.filter(account => account.isMcn===true);
        // console.log(`Found ${accounts.length} accounts to process`);
        // Process each account for yesterday
        for (const account of accounts) {
            await fetchAndStoreCommissionData(account, yesterday);
        }


        console.log('Immediate commission data collection completed');
    } catch (error) {
        console.error('Error in immediate commission data collection:', error);
    }
};

// Add a route handler to manually trigger data collection
exports.manualRunCollection = async (req, res) => {
    try {
        // Start the collection process in the background
        this.runCommissionCollection();
        
        return res.json({
            success: true,
            message: "Commission data collection started in the background"
        });
    } catch (error) {
        console.error("Error starting manual collection:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to start commission data collection",
            error: error.message
        });
    }
};