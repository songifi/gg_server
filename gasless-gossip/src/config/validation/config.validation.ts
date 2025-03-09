import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // App
  PORT: Joi.number().port().default(3000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),

  // StarkNet
  STARKNET_PROVIDER_URL: Joi.string().uri().required().messages({
    'string.uri': 'STARKNET_PROVIDER_URL must be a valid URI',
    'any.required': 'STARKNET_PROVIDER_URL is required',
  }),
  STARKNET_NETWORK: Joi.string().valid('mainnet', 'testnet').default('testnet'),

  // Database
  MONGODB_URI: Joi.string()
    .required()
    .pattern(/^mongodb(\+srv)?:\/\//)
    .messages({
      'string.pattern.base': 'MONGODB_URI must be a valid MongoDB connection string',
      'any.required': 'MONGODB_URI is required',
    }),
  MONGODB_NAME: Joi.string().required().min(1).messages({
    'string.min': 'MONGODB_NAME cannot be empty',
    'any.required': 'MONGODB_NAME is required',
  }),

  // JWT
  JWT_SECRET: Joi.string().required().min(32).messages({
    'string.min': 'JWT_SECRET must be at least 32 characters long for security',
    'any.required': 'JWT_SECRET is required',
  }),
  JWT_EXPIRES_IN: Joi.string()
    .pattern(/^[0-9]+(s|m|h|d)$/)
    .default('7d')
    .messages({
      'string.pattern.base': 'JWT_EXPIRES_IN must be in format: {number}(s|m|h|d)',
    }),
});
