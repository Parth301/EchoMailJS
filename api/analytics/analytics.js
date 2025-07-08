// /api/analytics/analytics.js
import db from '../../utils/db.js';
import verifyToken from '../../utils/verifyToken.js';

export default async function handler(req, res) {
  console.log('📥 Incoming request to /api/analytics/analytics');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Verify Token
  try {
    await new Promise((resolve, reject) => {
      verifyToken(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (err) {
    console.error('❌ Token verification failed:', err);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.user?.id;
  console.log('🧑‍💻 User ID:', userId);

  if (!userId) {
    return res.status(401).json({ error: 'User ID not found in token' });
  }

  try {
    const conn = db.promise();

    // 2. Email action counts
    const [analyticsRows] = await conn.query(`
      SELECT 
        COUNT(*) AS total_emails,
        SUM(CASE WHEN action = 'generated' THEN 1 ELSE 0 END) AS generated_count,
        SUM(CASE WHEN action = 'refined' THEN 1 ELSE 0 END) AS refined_count,
        SUM(CASE WHEN action = 'sent' THEN 1 ELSE 0 END) AS sent_count
      FROM logs
      WHERE user_id = ?;
    `, [userId]);

    const analytics = analyticsRows[0] || {
      total_emails: 0,
      generated_count: 0,
      refined_count: 0,
      sent_count: 0
    };

    console.log('📊 Analytics counts:', analytics);

    // 3. Weekday trend (Sun–Sat)
    const [trendRows] = await conn.query(`
      SELECT 
        DATE_FORMAT(created_at, '%a') AS day,
        COUNT(*) AS count
      FROM logs
      WHERE user_id = ?
      GROUP BY DAYOFWEEK(created_at), day;
    `, [userId]);

    console.log('📈 Raw trend rows:', trendRows);

    const weekdayOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const trendMap = {};
    trendRows.forEach(row => {
      trendMap[row.day] = row.count;
    });

    const trend = weekdayOrder.map(day => ({
      day,
      count: trendMap[day] || 0
    }));

    const response = {
      ...analytics,
      trend
    };

    console.log('✅ Final Analytics Response:', response);
    return res.json(response);

  } catch (err) {
    console.error('❌ ERROR in /api/analytics/analytics:', err.stack || err);
    return res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}
