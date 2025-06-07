import Stripe from 'stripe';

// STRIPE DISABLED FOR NOW
// if (!process.env.STRIPE_SECRET_KEY) {
//   throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
// }

// export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
//   apiVersion: '2024-12-18.acacia',
//   typescript: true,
// });

// Placeholder stripe object to prevent errors
export const stripe = null as any;

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

export const PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    features: {
      resumeParsing: 1,
      aiDocuments: 2,
      jobMatches: 5,
      applicationTracking: 10,
    },
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    price: 1900, // $19.00 in cents
    priceId: process.env.STRIPE_PRO_PRICE_ID || '',
    features: {
      resumeParsing: -1, // unlimited
      aiDocuments: 25,
      jobMatches: 50,
      applicationTracking: -1,
      linkedinOptimization: true,
      priorityProcessing: true,
    },
  },
  BUSINESS: {
    id: 'business',
    name: 'Business',
    price: 4900, // $49.00 in cents
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID || '',
    features: {
      resumeParsing: -1,
      aiDocuments: 100,
      jobMatches: -1,
      applicationTracking: -1,
      linkedinOptimization: true,
      priorityProcessing: true,
      apiAccess: true,
      teamMembers: 5,
      customTemplates: true,
      analytics: true,
    },
  },
};

export type PlanId = keyof typeof PLANS;
export type Plan = typeof PLANS[PlanId];