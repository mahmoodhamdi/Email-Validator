export const RATE_LIMITS = {
  singleValidation: { max: 100, window: 60000 },
  bulkValidation: { max: 10, window: 60000 },
  maxBulkSize: 1000,
};

export const VALIDATION_TIMEOUTS = {
  dns: 5000,
  smtp: 10000,
};

export const MAX_EMAIL_LENGTH = 254;

export const SCORE_WEIGHTS = {
  syntax: 20,
  domain: 20,
  mx: 25,
  disposable: 15,
  roleBased: 5,
  typo: 10,
  blacklist: 5,
};

export const SCORE_THRESHOLDS = {
  high: 80,
  medium: 50,
};
