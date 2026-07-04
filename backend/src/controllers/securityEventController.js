const SecurityEvent = require('../models/SecurityEvent');
const { parsePagination, buildSafeRegex } = require('../utils/safeQuery');

const listSecurityEvents = async (req, res, next) => {
  try {
    const { eventType = 'all', search = '', page = 1, limit = 30 } = req.query;
    const pagination = parsePagination({ page, limit });
    const filter = {};
    if (eventType !== 'all') filter.eventType = eventType;
    const regex = buildSafeRegex(search);
    if (regex) {
      filter.$or = [{ message: regex }, { ipAddress: regex }, { deviceInfo: regex }];
    }

    const [events, total] = await Promise.all([
      SecurityEvent.find(filter)
        .populate('userId', 'fullName email phoneNumber')
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      SecurityEvent.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: events.map((e) => ({
        id: e._id,
        eventType: e.eventType,
        severity: e.severity,
        message: e.message,
        userName: e.userId?.fullName || 'Unknown',
        userEmail: e.userId?.email || '',
        ipAddress: e.ipAddress,
        deviceInfo: e.deviceInfo,
        location: e.location,
        metadata: e.metadata,
        createdAt: e.createdAt,
      })),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        pages: Math.ceil(total / pagination.limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { listSecurityEvents };
