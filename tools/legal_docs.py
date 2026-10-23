"""Legal and policy content for JAY C O B FINANCIAL SERVICES (v3).

Each entry renders as its own page through tools/build.py. Wording is written
for a Malawian money-lending context.
"""

VERSION = "3.0"
UPDATED = "1 October 2026"


def doc(slug, nav, title, summary, sections):
    return {
        "slug": slug,
        "nav": nav,
        "title": title,
        "summary": summary,
        "sections": sections,
        "version": VERSION,
        "updated": UPDATED,
    }


LEGAL_DOCS = [
    doc("privacy", "Privacy policy", "Privacy Policy",
        "What personal data we collect, why we collect it, who we share it with and the choices you have.",
        [
            ("1. Who we are", [
                "JAY C O B FINANCIAL SERVICES (\u201cwe\u201d, \u201cus\u201d) is a licensed money lender based at Plot 47/3, Area 47, Sector 3, Lilongwe, Malawi. We are the data controller for the personal information described in this policy.",
                "This policy explains how we handle personal data when you visit our website, create an account, apply for credit, make repayments or contact support. It should be read together with our Data Protection Policy, Cookie Policy and Consent and Data Retention Statement.",
            ]),
            ("2. Information we collect", [
                "Identity and contact data: full name, date of birth, gender, national ID or passport number, phone number, email address and residential address.",
                "Financial data: income, expenses, existing debt obligations, employer or business details, bank or mobile money details, loan applications, repayment history and transaction records.",
                "Verification data: copies of identification, proof of income, proof of residence, business registration documents and photographs you upload.",
                "Technical data: IP address, device and browser type, pages visited, session timestamps and security logs, collected to keep your account safe.",
            ]),
            ("3. Why we use your data", [
                "To verify your identity and meet know-your-customer and anti-money-laundering obligations.",
                "To assess affordability and credit risk, including through credit reference bureaus where you have consented.",
                "To administer loans, process disbursements and repayments, generate statements and provide customer support.",
                "To detect and prevent fraud, secure accounts and comply with lawful requests from regulators or courts.",
                "To send service messages by email, SMS and in-app notification. Marketing messages are sent only where you have opted in and can be switched off in Settings at any time.",
            ]),
            ("4. Sharing", [
                "We share data with service providers who help us operate: payment and mobile money partners, credit reference bureaus, identity verification providers, hosting and communication providers, auditors and professional advisers. Each is bound by confidentiality and data-processing obligations.",
                "We may disclose information to the Reserve Bank of Malawi, law enforcement or other authorities where the law requires it, and to a purchaser or successor in the event of a corporate transaction.",
                "We never sell your personal data.",
            ]),
            ("5. Your rights", [
                "You can request access to the personal data we hold, ask us to correct it, request deletion where we no longer have a lawful basis to keep it, object to certain processing, and withdraw marketing consent.",
                "Requests can be made from Settings \u2192 Privacy and data requests in your dashboard, or by emailing privacy@jaycobfinancial.mw. We respond within 30 days and may ask you to verify your identity first.",
            ]),
            ("6. Security and retention", [
                "Data is encrypted in transit, access is limited to staff who need it, and sensitive identifiers are masked in screens, exports and notifications. We keep records only for as long as required for the loan relationship, regulatory record-keeping and dispute resolution.",
                "If a breach affects your rights, we will notify you and the relevant authority without undue delay.",
            ]),
        ]),

    doc("terms", "Terms & conditions", "Terms & Conditions",
        "The rules for using this website and our customer portal, including eligibility, acceptable use and liability.",
        [
            ("1. Acceptance", [
                "By using this website or the customer dashboard you agree to these terms, our Privacy Policy and any product-specific terms presented during an application. If you do not agree, please do not use the service.",
            ]),
            ("2. Eligibility and accounts", [
                "You must be at least 18 years old, resident in Malawi and legally able to enter into a credit agreement. You must provide accurate, current information and keep it up to date.",
                "You are responsible for keeping your password, one-time codes and devices secure, and for all activity carried out under your credentials. Tell us immediately if you suspect unauthorised access.",
            ]),
            ("3. Credit decisions", [
                "Every application is subject to identity verification, document checks, affordability assessment and credit assessment. We may approve, approve with conditions, request further information, decline or offer a different amount or term.",
                "Indicative figures on this site, including calculator outputs and eligibility results, are estimates and do not constitute an offer of credit. A binding agreement arises only when a loan agreement is signed by both parties and funds are disbursed.",
            ]),
            ("4. Acceptable use", [
                "You may not use the service to submit false information or forged documents, attempt to access another person\u2019s account, interfere with the security or availability of the platform, scrape content at scale or use the service for unlawful purposes.",
                "We may suspend or close an account, and report suspected fraud, where these rules are broken.",
            ]),
            ("5. Availability and liability", [
                "We aim to keep the service available but do not guarantee uninterrupted access. Maintenance, connectivity, mobile network availability and third-party services may cause downtime.",
                "To the extent permitted by Malawian law, we are not liable for indirect or consequential loss arising from use of the website. Nothing in these terms limits liability that cannot lawfully be excluded, including for fraud.",
            ]),
            ("6. Changes and governing law", [
                "We may update these terms; material changes are announced in the dashboard and take effect 30 days after publication. Continued use after that date means acceptance.",
                "These terms are governed by the laws of Malawi and disputes are handled under our Complaints and Dispute Resolution Policy before any court action.",
            ]),
        ]),

    doc("loan-agreement-terms", "Loan agreement terms", "Loan Agreement Terms",
        "The standard commercial terms that appear in every loan agreement: amount, rate, term, fees, repayment and default.",
        [
            ("1. The facility", [
                "The agreement records the principal amount in Malawi Kwacha (MWK), the annual interest rate, the interest method (flat or reducing balance), the repayment frequency (monthly or fortnightly), the number of instalments, the first due date and the maturity date.",
                "The approved amount may differ from the amount requested. Disbursement is made to the bank or mobile money account verified in your name.",
            ]),
            ("2. Interest and fees", [
                "Interest accrues from the disbursement date at the agreed annual rate, calculated on the agreed method. A processing fee, and where applicable an administration fee, is disclosed in the Fee Disclosure Statement and deducted or invoiced as stated.",
                "Rates, fees and charges are fixed for the term shown in the agreement. Any future variation applies only to new agreements, unless the agreement expressly provides otherwise.",
            ]),
            ("3. Repayment", [
                "Instalments fall due on the dates in the repayment schedule. Each instalment is applied first to charges then interest then principal, unless the agreement states otherwise.",
                "You may repay early. Early settlement figures are quoted on request and in your dashboard; an early repayment charge may apply as disclosed. Partial prepayments reduce principal and may shorten the term.",
            ]),
            ("4. Late payment and default", [
                "A late payment charge applies to overdue instalments as set out in the Fee Disclosure Statement. We will contact you by SMS, email and in-app notification before and after a due date.",
                "Persistent non-payment is a default. On default we may demand the outstanding balance, apply default interest, report the account to credit reference bureaus, recover through guarantors or collateral where applicable, and take lawful recovery action. We will always try to agree a restructure first.",
            ]),
            ("5. Security, guarantors and insurance", [
                "Secured loans require the collateral described in the agreement and its schedule. Guarantors confirm they understand their obligations and consent to their details being verified.",
                "Credit life or property insurance is optional unless the agreement states it is a condition. Any insurance premium is disclosed separately from interest.",
            ]),
            ("6. Statements and notices", [
                "Statements are available in your dashboard and by request. Notices are sent to the email address and phone number on record; you must tell us when those change.",
                "The agreement is governed by Malawian law. Copies, including a signed version, are provided to you and retained by us for the periods required by law.",
            ]),
        ]),

    doc("cookies", "Cookie policy", "Cookie Policy",
        "The cookies and local storage we use, what each one does, and how to control them.",
        [
            ("1. What we use", [
                "A strictly necessary session token in browser storage keeps you signed in between pages and protects forms against cross-site request forgery. Nothing else about you is kept on the device, and the site does not work without this token.",
                "Analytics storage helps us understand which pages are used so we can improve them. Marketing storage is used only where you opt in.",
            ]),
            ("2. Where your account data lives", [
                "Your account details, applications, loans, repayments, documents and notifications are stored in our secured database and are visible only to you and to authorised staff.",
                "Your browser keeps only a session token, so that moving between pages does not sign you out. No account record, balance or document is stored on your device. Signing out removes the token; the record in our database remains and is available when you sign in again.",
            ]),
            ("3. Third parties", [
                "Fonts are loaded from Google Fonts, which receives your IP address as part of the request. Payment, SMS and analytics providers may set their own cookies when those integrations are enabled.",
            ]),
            ("4. Managing cookies", [
                "You can block or delete cookies and site data in your browser settings. Blocking strictly necessary storage will prevent sign-in and applications from working.",
                "Where consent is required, a banner records your choice and you can change it later from Settings \u2192 Privacy.",
            ]),
        ]),

    doc("responsible-lending", "Responsible lending", "Responsible Lending Policy",
        "How we lend affordably, what we will never do, and how to get help if you are struggling.",
        [
            ("1. Our commitment", [
                "We lend only where the evidence shows you can repay without hardship. Affordability assessment considers verified income, essential living costs, existing debt and the proposed instalment.",
                "We do not use aggressive recovery tactics, we do not pressure customers into refinancing, and we do not lend to anyone we believe cannot afford the repayments.",
            ]),
            ("2. Affordability assessment", [
                "We look at disposable income after essential expenses, the total cost of credit, your repayment history and any signs of financial difficulty. As a guide, total debt repayments should stay below 40% of net monthly income.",
                "Where affordability is marginal we may offer a smaller amount, a longer term, a different product or suggest a savings plan first.",
            ]),
            ("3. Transparency", [
                "Before you sign, you receive the amount, rate, fees, total cost of credit, repayment schedule and the consequences of late payment in writing. There are no hidden charges.",
                "Calculator outputs and eligibility results are estimates. Only the signed agreement is binding.",
            ]),
            ("4. If you are struggling", [
                "Contact us before you miss a payment. We can discuss a payment plan, a restructure, a short payment holiday where policy allows, or referral to a debt counselling service.",
                "Never borrow from a third party to pay another lender without advice. Tell us if you are dealing with multiple lenders \u2014 we can help you prioritise essentials.",
            ]),
            ("5. Vulnerable customers", [
                "We take extra care with customers experiencing bereavement, illness, job loss, domestic abuse or mental health difficulties. Tell us and we will adapt how we communicate and give you time to respond.",
            ]),
            ("6. Complaints", [
                "If we get responsible lending wrong, complain. Our Complaints and Dispute Resolution Policy explains timescales and escalation, including to the Reserve Bank of Malawi consumer protection unit.",
            ]),
        ]),

    doc("complaints", "Complaints & disputes", "Complaints & Dispute Resolution",
        "How to raise a complaint, what happens next, timescales and how to escalate if you are unhappy.",
        [
            ("1. How to complain", [
                "Raise a complaint in the dashboard under Support \u2192 Complaint submission, email complaints@jaycobfinancial.mw, call +265 999 123 456 or write to Plot 47/3, Area 47, Sector 3, Lilongwe.",
                "Tell us what happened, when, what you want us to do and your preferred contact method. Attach any supporting documents. You will receive a ticket reference immediately.",
            ]),
            ("2. Our process", [
                "Acknowledgement within 2 working days. Investigation and a substantive response within 15 working days for most complaints, or 30 working days where third parties or complex records are involved. We will keep you updated if we need longer.",
                "If we uphold your complaint we will explain the remedy, correct our records and, where relevant, refund charges or correct credit bureau data.",
            ]),
            ("3. Escalation", [
                "If you are unhappy with our final response, or we have not responded within the stated period, you may ask for a review by our Complaints Officer and then escalate to the Reserve Bank of Malawi consumer protection unit or the relevant financial services regulator.",
                "You can also seek independent legal advice or mediation. Escalation does not affect your legal rights and we will not penalise you for complaining.",
            ]),
            ("4. Payment disputes", [
                "Report a missing or misapplied payment from My transactions \u2192 Report a missing payment. Include the mobile money or bank reference. We reconcile within 3 working days and correct any error with interest adjustment where appropriate.",
            ]),
            ("5. Records", [
                "We keep a complaint register, recording the issue, our response, the outcome and any remedy, for regulatory review and service improvement.",
            ]),
        ]),

    doc("data-protection", "Data protection", "Data Protection Policy",
        "Our internal standards for lawful, fair and secure processing of customer data.",
        [
            ("1. Principles", [
                "We process personal data lawfully, fairly and transparently; collect only what we need; keep it accurate; retain it only as long as necessary; and protect it with appropriate technical and organisational measures.",
                "Sensitive identifiers such as national ID numbers, account numbers and financial balances are masked by default in the interface and in exports.",
            ]),
            ("2. Lawful bases", [
                "We rely on contract performance for loan administration, legal obligation for KYC and AML records, legitimate interests for fraud prevention and service improvement, and consent for marketing and optional data uses.",
                "Where consent is the basis, you can withdraw it at any time without affecting processing already carried out.",
            ]),
            ("3. Access control", [
                "Access is role-based and least-privilege. Staff access to customer records is logged. Administrative actions require elevated rights and are reviewed.",
                "Data is encrypted in transit and at rest. Backups are protected and tested. Devices used by staff require screen locks and encryption.",
            ]),
            ("4. Third parties and transfers", [
                "Processors are appointed under written agreements with confidentiality, security and audit obligations. Cross-border transfers occur only where adequate protection exists or the customer has consented.",
            ]),
            ("5. Breach response", [
                "Suspected breaches are contained, assessed for risk to customers and reported to the relevant authority and affected individuals where required. We keep a breach register and apply lessons learned.",
            ]),
            ("6. Requests", [
                "Access, correction, deletion, restriction, portability and objection requests are handled within 30 days. Submit them in Settings \u2192 Privacy and data requests or email privacy@jaycobfinancial.mw.",
            ]),
        ]),

    doc("kyc", "KYC & identification", "KYC & Identification Policy",
        "The identity checks we must complete before lending and how to keep your documents valid.",
        [
            ("1. Why we verify", [
                "Know-your-customer checks confirm you are who you say you are, prevent identity fraud, and meet anti-money-laundering obligations. We cannot disburse a loan until verification is complete.",
            ]),
            ("2. What we accept", [
                "Primary identity: a valid Malawian national ID card, passport or driving licence. Documents must be current, legible, show the photo and number, and match the name on the application.",
                "Proof of residence: a utility bill, tenancy agreement, bank or mobile money statement, or a letter from a local authority dated within the last three months.",
                "Proof of income: payslips for the last three months, an employer letter, business bank or mobile money statements, or audited accounts for larger businesses.",
            ]),
            ("3. Liveness and matching", [
                "We may request a selfie or short video to confirm identity, and we cross-check names, dates of birth and ID numbers against the documents supplied and, where relevant, credit bureau records.",
                "On a mismatch we ask for clarification rather than automatically declining. Repeated mismatches or suspected forgery are escalated and may be reported.",
            ]),
            ("4. Document statuses", [
                "In your dashboard each document shows Approved, Pending, Rejected or Expired. Rejected documents include the reason and a replace action. Expired documents trigger a reminder before they lapse.",
            ]),
            ("5. Retention and security", [
                "Identity records are retained for at least five years after the end of the relationship, as required for AML purposes, and are stored encrypted with restricted access.",
                "You can view, download and correct your KYC record. Deletion requests are limited where retention is legally required; we will explain any limitation.",
            ]),
        ]),

    doc("aml", "AML & counter-terrorism", "AML & Counter-Terrorism Financing",
        "How we detect and report money laundering, fraud and terrorist financing.",
        [
            ("1. Our obligation", [
                "As a regulated lender we must monitor transactions, screen customers and report suspicious activity to the Financial Intelligence Authority. We do not tell customers when a report has been made, as the law prohibits tipping off.",
            ]),
            ("2. Customer due diligence", [
                "We identify and verify every customer, identify beneficial owners of corporate borrowers, screen against sanctions and politically exposed person lists, and apply enhanced due diligence to higher-risk relationships.",
                "We may ask for source-of-funds information, additional identification, or evidence of the purpose of a loan.",
            ]),
            ("3. Monitoring", [
                "Transactions are monitored for unusual size, frequency, round amounts, rapid disbursement and repayment patterns, mismatches with stated purpose, and use of accounts not in the customer\u2019s name.",
                "An alert does not mean you have done anything wrong. We investigate and may contact you for an explanation.",
            ]),
            ("4. Prohibited conduct", [
                "We do not lend for illegal activity, do not accept third-party repayments without verification, and will not process transactions connected to sanctioned persons or entities.",
            ]),
            ("5. Reporting and records", [
                "Suspicious activity reports are filed with the Financial Intelligence Authority. Records of customer due diligence, monitoring alerts and reports are kept for at least five years.",
            ]),
        ]),

    doc("credit-reporting", "Credit reporting", "Credit Reporting Policy",
        "How we use and share credit information, and how to correct an error on your credit record.",
        [
            ("1. What we share", [
                "With your consent, we may share your identity details, the type and amount of credit, repayment performance, arrears and default status with licensed credit reference bureaus.",
                "We share only accurate, up-to-date data and update bureaus when a balance changes, a dispute is resolved or an account is closed.",
            ]),
            ("2. What we receive", [
                "Credit bureau reports help us assess affordability and existing obligations. We also use them to verify identity and detect fraud.",
            ]),
            ("3. Your credit record", [
                "A late payment, arrears or default can stay on your record for several years and may affect future borrowing, employment checks or tenancy applications. Paying on time builds a positive record.",
                "You can request a free copy of your credit report from a licensed bureau and challenge inaccurate entries.",
            ]),
            ("4. Correcting errors", [
                "If you believe we have reported something incorrectly, raise it in Settings \u2192 Privacy and data requests or email credit@jaycobfinancial.mw. We investigate within 15 working days and correct the bureau record where we find an error.",
                "If you disagree with our finding you can add a statement of dispute to your record.",
            ]),
            ("5. Consent", [
                "You give consent to credit checks during the application, and that consent is recorded with the application reference. You can withdraw consent for future checks, though this may prevent us from lending to you.",
            ]),
        ]),

    doc("fees-disclosure", "Fees & charges", "Fees & Charges Disclosure Statement",
        "Every fee we charge, how it is calculated and when it applies, in line with full-cost disclosure.",
        [
            ("1. Interest", [
                "Interest is charged at the annual rate shown in your agreement, on either a flat or reducing-balance basis. The method is stated on every quote, calculator result and agreement.",
                "Indicative annual rates range from 18% to 29% depending on product, term, security and credit profile. The APR shown in our calculator reflects interest and disclosed fees.",
            ]),
            ("2. Up-front fees", [
                "Processing fee: 1.5%–3% of the approved principal, depending on product, payable at approval. It is deducted from the disbursed amount or invoiced, as stated in the agreement.",
                "Administration fee: MWK 0–25,000 for statement reissues, reference letters and duplicate agreements where requested.",
                "Valuation fee: for secured loans, the actual cost of an independent valuation, quoted before instruction.",
            ]),
            ("3. Ongoing and event fees", [
                "Late payment charge: 2% of the overdue instalment, capped at MWK 50,000 per instalment, applied once the instalment is more than 5 days overdue.",
                "Early repayment charge: 0%–2% of the outstanding principal, depending on product; disclosed in the agreement and quoted before settlement.",
                "Restructuring fee: MWK 15,000 per restructure, waived once per customer in hardship cases.",
                "Reconciliation or trace fee for third-party payment investigations: MWK 5,000, refunded where our error is found.",
            ]),
            ("4. What we never charge", [
                "No application fee to submit, no fee to receive a decision, no hidden commission, and no charge for accessing your own statements, repayment schedule or transaction history in the dashboard.",
            ]),
            ("5. Worked example", [
                "Borrow MWK 2,000,000 for 12 months at 24% reducing balance with a 2% processing fee. Instalment approximately MWK 189,100. Total interest approximately MWK 269,400. Processing fee MWK 40,000. Total cost of credit approximately MWK 309,400. Illustrative only; your agreement controls.",
            ]),
            ("6. Disclosure", [
                "All charges are shown in the pre-contract disclosure, the agreement schedule and your dashboard. If a charge is not disclosed, it is not payable. Query any unexpected charge through Support within 30 days.",
            ]),
        ]),

    doc("customer-rights", "Customer rights", "Customer Rights & Responsibilities",
        "What you can expect from us, and what we need from you.",
        [
            ("1. Your rights", [
                "To be treated fairly, with dignity and without discrimination. To clear, timely information in a language you understand. To privacy and protection of your data. To a copy of your agreement, schedule and statements.",
                "To know the full cost of credit before signing. To withdraw an application before disbursement. To repay early. To complain and to receive a reasoned response. To access your credit record and correct errors.",
            ]),
            ("2. Our commitments", [
                "We disclose rates, fees and total cost in writing. We assess affordability before lending. We respond to support requests within one working day and complaints within the published timescales.",
                "We provide accessible communication and reasonable adjustments for disability, illness or caring responsibilities.",
            ]),
            ("3. Your responsibilities", [
                "Provide accurate information and tell us when circumstances change. Keep your contact details current. Protect your password, PIN and one-time codes. Read the agreement before signing.",
                "Pay on time, or contact us early if you cannot. Do not use loan funds for unlawful purposes. Tell us immediately about suspected fraud on your account.",
            ]),
            ("4. Accessible banking", [
                "Our site supports keyboard navigation, screen readers, visible focus states and high-contrast text. If any part is difficult to use, tell us and we will provide the information another way.",
            ]),
            ("5. Fair treatment", [
                "No customer is disadvantaged because of age, gender, disability, marital status, ethnicity, religion, HIV status or political opinion. Lending decisions are based on affordability and credit assessment only.",
            ]),
        ]),

    doc("consent-retention", "Consent & retention", "Consent & Data Retention Statement",
        "What you consent to when you apply, how long we keep records and how consent is withdrawn.",
        [
            ("1. Consent at application", [
                "By submitting an application you confirm that the information is accurate and consent to identity verification, affordability and credit assessment, sharing with credit reference bureaus, and processing of your data as described in the Privacy Policy.",
                "You consent to service communications by email, SMS and in-app notification. Marketing consent is separate, optional and unticked by default.",
            ]),
            ("2. Recording consent", [
                "Each consent is timestamped and linked to the application reference. Security-sensitive actions such as transfers require a fresh one-time code.",
            ]),
            ("3. Withdrawing consent", [
                "Withdraw marketing consent in Settings \u2192 Notification preferences or by replying STOP to an SMS. Withdraw other consents by contacting us; where processing is necessary for a live loan or legal obligation, we will explain why it must continue.",
            ]),
            ("4. Retention periods", [
                "Application data for declined or withdrawn applications: 24 months. Active loan records: the life of the loan plus 6 years. KYC and AML records: at least 5 years after the relationship ends. Complaints: 5 years. Marketing preferences: until withdrawn plus 12 months.",
                "When a period ends, records are securely deleted or irreversibly anonymised for statistics.",
            ]),
            ("5. Your choices", [
                "Request a copy, correction, deletion or portability of your data from Settings \u2192 Privacy and data requests. We respond within 30 days and explain any legal limitation.",
            ]),
        ]),

    doc("licensing", "Licensing disclosure", "Licensing & Regulatory Disclosures",
        "Who we are, what we are licensed to do, how we are supervised and where to complain.",
        [
            ("1. Corporate details", [
                "Trading name: JAY C O B FINANCIAL SERVICES. Registered office: Plot 47/3, Area 47, Sector 3, Lilongwe, Malawi. Customer care: +265 999 123 456 · support@jaycobfinancial.mw.",
                "Business hours: Monday to Friday 08:00–17:00, Saturday 09:00–12:00 (Central Africa Time). Closed on public holidays.",
            ]),
            ("2. Licence and supervision", [
                "We operate as a licensed money lender under the laws of Malawi and are subject to supervision by the Reserve Bank of Malawi. Licence details, scope and any conditions are available on request and are displayed in our offices.",
                "We are not a bank. Deposits are not taken and balances shown in your account are not deposit accounts. Credit is provided from our own funds.",
            ]),
            ("3. Consumer protection", [
                "We follow responsible lending, fair treatment, transparent pricing and complaints-handling standards. These are summarised in our Responsible Lending Policy, Fee Disclosure Statement and Customer Rights statement.",
            ]),
            ("4. Regulator and escalation", [
                "If we cannot resolve a complaint, you may escalate to the Reserve Bank of Malawi consumer protection unit, or seek legal advice. We will provide contact details and a copy of our final response on request.",
            ]),
            ("5. Anti-fraud warning", [
                "We never ask for an up-front payment to release a loan, never request your password or one-time code, and never ask you to pay a fee to a personal mobile money number. Report anything suspicious to support@jaycobfinancial.mw immediately.",
            ]),
        ]),
]
