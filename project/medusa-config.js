const dotenv = require('dotenv')

// CORS when consuming Medusa from admin
const ADMIN_CORS = process.env.ADMIN_CORS || "http://localhost:7000,http://localhost:7001";

// CORS to avoid issues when consuming Medusa from a client
const STORE_CORS = process.env.STORE_CORS || "http://localhost:8000";

// Database URL (here we use a local database called medusa-development)
const DATABASE_URL =
    process.env.DATABASE_URL || "postgres://localhost/emc";

// Medusa uses Redis, so this needs configuration as well
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Stripe keys
const STRIPE_API_KEY = process.env.STRIPE_API_KEY || "sk_test_51KedmEDFUo7wZbIt7ceD43xQ7T4eYKEOUffBJ5ECOuumqFOx6y0riAviO9smqEBQVMLBlQGYXxkNAZhxG7Mg9Knb00Go9Mjo6X";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec_3c3f55b768a24bb92ed4165cb07c851c247f5e8710eb951294078647b05d9d7e";
const RETURN_URL = process.env.RETURN_URL || 'http://localhost:8000'
// This is the place to include plugins. See API documentation for a thorough guide on plugins.
const plugins = [
    `medusa-fulfillment-manual`,
    `medusa-payment-manual`,
    {
        resolve: `medusa-payment-stripe-subscription`,
        options: {
            api_key: STRIPE_API_KEY,
            webhook_secret: STRIPE_WEBHOOK_SECRET,
            return_url: RETURN_URL,
        },
    }
];

module.exports = {
    projectConfig: {
        redis_url: REDIS_URL,
        database_url: DATABASE_URL,
        database_type: "postgres",
        store_cors: STORE_CORS,
        admin_cors: ADMIN_CORS,
    },
    plugins,
};
