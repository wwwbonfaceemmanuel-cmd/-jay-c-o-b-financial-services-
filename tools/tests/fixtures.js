/* Test fixtures.
   These records exist only inside the test process: they are written into
   storage by the suites so screens with real content can be exercised. No
   fixture is shipped to a browser — the site itself starts empty. */
"use strict";

/* A customer document as the dashboard receives it from Supabase. */
function customerDoc() {
  return {
    profile: {
      fullName: "Test Borrower", email: "borrower@example.com", phone: "+265 991 000 111",
      nid: "MWI-0000-0000", district: "Lilongwe", kyc: "Verified", memberSince: "2025-01-15",
      accountNumber: "JC-ACC-000001", accountStatus: "Active", verification: "Verified",
      monthlyIncome: 900000, monthlyExpenses: 300000, avatar: "TB"
    },
    applications: [{
      ref: "APP-2026-0412", product: "Personal Loan", amount: 5000000, term: 24,
      purpose: "Shop expansion", submitted: "2026-09-01T09:00:00.000Z",
      status: "approved", stage: 7, reviewer: "Approved at 24% p.a., 24 months.", documents: []
    }],
    loans: [], tickets: [], notifications: [], transactions: [], deposits: [],
    withdrawals: [], transfers: [], documents: [], statements: [], drafts: [],
    sessions: [], logins: [],
    savings: { accountNumber: "", balance: 0, interestEarned: 0, rate: 0, status: "Not opened", opened: "", goals: [] },
    security: {
      mfa: false, passwordChanged: null, failedAttempts: 0, locked: false,
      lastLogin: null, recoveryEmail: "", recoveryPhone: ""
    },
    settings: {
      language: "en", currency: "MWK",
      notifications: { email: true, sms: true, inApp: true, repaymentReminders: true, marketing: false, security: true },
      privacy: { shareWithAdvisors: true, analytics: false },
      accessibility: { largeText: false, reduceMotion: false, highContrast: false }
    },
    wallet: {}
  };
}

/* A console book as portal_docs → main stores it. */
function portalBook() {
  return {
    customers: [], products: [], applications: [], loans: [], repayments: [],
    deposits: [], withdrawals: [], transfers: [], kycDocs: [], guarantors: [],
    collateral: [], tickets: [], notifications: [], admins: [], workflows: [],
    auditL: [], sessions: [], savings: [], fees: [], ledger: [], recon: [],
    statements: [], branches: [], officers: [], investors: [], agents: [],
    payroll: [], legal: [], apis: [], fraud: [], templates: [], backups: [],
    tasks: [], activities: [], ptps: [], glAccounts: [],
    settings: { biz: "JAY C O B FINANCIAL SERVICES", reg: "MBRS-2024-11882", currency: "MWK", tz: "Africa/Blantyre", hotline: "+265 999 123 456", graceDays: 3, penaltyRate: 5, maxDTI: 60 }
  };
}

module.exports = { customerDoc, portalBook };
