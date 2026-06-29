/**
 * Application Constants
 * 
 * Centralized constants for the application
 * Update these values to match your actual configuration
 */

/**
 * Support Email Addresses
 * Update these with your actual support email addresses
 */
export const SUPPORT_EMAILS = {
  /** General support and inquiries */
  SUPPORT: 'support@beddora.com',
  
  /** Privacy and data protection inquiries */
  PRIVACY: 'privacy@beddora.com',
  
  /** Legal and compliance matters */
  LEGAL: 'legal@beddora.com',
  
  /** Amazon SP-API specific support */
  AMAZON_SUPPORT: 'amazon-support@beddora.com',
} as const

/**
 * Company Information
 */
export const COMPANY_INFO = {
  NAME: 'Beddora',
  DOMAIN: 'beddora.com',
  /** Legal jurisdiction for Terms of Service */
  JURISDICTION: 'United States',
} as const

/**
 * Business Hours
 */
export const BUSINESS_HOURS = {
  WEEKDAYS: 'Monday - Friday: 9:00 AM - 6:00 PM EST',
  WEEKEND: 'Saturday - Sunday: Closed',
} as const
