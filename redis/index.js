const redis = require('redis');
// new redis
const { redisClientPort, redisClientHost, accessRightsExpiry, companyCode } = require('../config/config');

// Create a Redis client
const client = redis.createClient({
    url: `redis://${redisClientHost}:${redisClientPort}`
});

// Connect to Redis
client.connect().then(() => {
    console.log('Redis client connected');
}).catch(err => {
    console.error('Redis connection error:', err);
});

// Helper function to handle errors
const handleError = (err) => {
    if (err) {
        console.error('Redis error:', err);
    }
};

// Set data in the cache
const setCachedData = async (key, data) => {
    const k = companyCode + key;
    const Data = JSON.stringify(data);

    try {
        await client.set(k, Data);

        if (key === "appLevelAccessRightEntitlementData") {
            await client.expire(k, accessRightsExpiry); // Cache for 1 month, only for app level entitlements data
        }
    } catch (err) {
        handleError(err);
    }
};

// Get data from the cache
const getCachedData = async (key) => {
    const k = companyCode + key;

    try {
        const data = await client.get(k);
        return data;
    } catch (err) {
        handleError(err);
    }
};

// Clear data from the cache
const clearCachedData = async (key) => {
    const k = companyCode + key;

    try {
        const response = await client.del(k);
        if (response === 1) {
            console.log("Deleted Successfully!");
        } else {
            console.log("Cannot delete");
        }
    } catch (err) {
        handleError(err);
    }
};

module.exports = {
    setCachedData,
    getCachedData,
    clearCachedData
};
