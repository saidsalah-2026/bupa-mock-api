/**
 * Bupa Arabia Mock API Server
 * Combined Express API for Code Engine deployment
 * Exposes 3 endpoints consumed by watsonx Orchestrate skills
 */

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ==================== MOCK DATA ====================

const mockMember = {
  memberId: "BUPA-KSA-4471",
  name: "Ahmed Al-Harbi",
  languagePreference: "Arabic",
  policyStatus: "Active",
  policyType: "Corporate Health Plan",
  employer: "Saudi Industrial Group",
  coverageClass: "Gold",
  deductibleStatus: "Met",
  networkAccess: "In-network allowed",
  notes: "Demo synthetic member; no real PHI."
};

const mockProvider = {
  providerId: "PROV-JED-ORTHO-221",
  providerName: "Jeddah Advanced Orthopedic Hospital",
  city: "Jeddah",
  networkStatus: "In-network",
  specialty: "Orthopedics",
  riskIndicators: {
    kneeArthroscopyUtilization: "Above peer benchmark",
    recentClaimCorrectionRate: "Medium",
    documentationCompleteness: "Medium"
  }
};

const mockAuthorization = {
  transactionType: "PriorAuthorization",
  source: "NPHIES-like mock payload",
  authorizationId: "AUTH-2026-00087",
  memberId: "BUPA-KSA-4471",
  providerId: "PROV-JED-ORTHO-221",
  diagnosisCode: "M23.2",
  diagnosisDescription: "Derangement of meniscus due to old tear or injury",
  requestedProcedureCode: "29881",
  requestedProcedureDescription: "Knee arthroscopy with meniscectomy",
  attachments: ["MRI report summary", "physician note"],
  missingDocuments: ["Conservative treatment evidence", "Detailed operative plan"],
  requestedDate: "2026-05-07"
};

const mockClaimsHistory = [
  {
    claimId: "CLM-2026-00111",
    service: "MRI Knee",
    status: "Rejected",
    rejectionReason: "Prior authorization was not submitted before service",
    providerId: "PROV-JED-ORTHO-221",
    amountSAR: 2500
  },
  {
    claimId: "CLM-2026-00178",
    service: "Physical therapy sessions",
    status: "Paid",
    amountSAR: 1800
  }
];

const mockClaim = {
  transactionType: "Claim",
  claimId: "CLM-2026-00390",
  authorizationId: "AUTH-2026-00087",
  memberId: "BUPA-KSA-4471",
  providerId: "PROV-JED-ORTHO-221",
  claimedProcedures: [
    { code: "29881", description: "Knee arthroscopy with meniscectomy", amountSAR: 14500 },
    { code: "29877", description: "Chondroplasty", amountSAR: 5200 },
    { code: "MRI-KNEE", description: "MRI Knee repeated charge", amountSAR: 2500 }
  ],
  expectedTariffRangeSAR: { min: 12000, max: 15500 },
  invoiceTotalSAR: 22200
};

// ==================== HELPERS ====================

function generateAnalysis() {
  return {
    caseSummary: `Member ${mockMember.name} (${mockMember.memberId}) requires knee arthroscopy for meniscus derangement. Previous MRI claim was rejected due to missing prior authorization. Current authorization request shows incomplete documentation for conservative treatment evidence.`,
    eligibilityFindings: [
      'Member status: Active',
      'Coverage class: Gold',
      'Deductible: Met',
      'Provider: In-network (Jeddah Advanced Orthopedic Hospital)',
      'Prior authorization: Required for this procedure'
    ],
    complexityDrivers: [
      'Previous MRI rejection creates context risk',
      'Missing conservative treatment evidence',
      'Provider has above-average utilization for knee arthroscopy',
      'Procedure code requires clinical review per policy guidelines'
    ],
    riskFlags: [
      'Previous claim rejection for same diagnosis (AUTH-related)',
      'Missing operative plan details',
      'Provider utilization above peer benchmark',
      'Documentation completeness rated as medium'
    ],
    recommendedReview: [
      'Clinical Review Required: Medical director should validate medical necessity',
      'Provider Relations: Request detailed operative plan and conservative treatment records',
      'Payment Integrity: Monitor for appropriate use and tariff alignment'
    ],
    nextActions: {
      clinicalReview: 'Route to medical director for review of medical necessity and appropriateness of requested procedure',
      providerRelations: 'Send structured document request to hospital for: (1) Detailed operative plan, (2) Conservative treatment evidence, (3) Latest clinical notes',
      claims: 'Hold authorization pending clinical review completion',
      customerCare: 'Prepare member communication explaining review process if member inquires',
      paymentIntegrity: 'Flag case for post-service review due to provider utilization pattern'
    },
    auditNotes: [
      `Case analyzed at ${new Date().toISOString()}`,
      'AI Agent identified complexity based on: prior denial, missing documentation, provider risk indicators',
      'No final clinical decision made by AI; routing to human clinical reviewer',
      'All actions logged for compliance and auditability'
    ]
  };
}

function generateWorkflow() {
  const now = new Date().toISOString();
  return [
    { step: 'intake', timestamp: now, actor: 'System', action: 'Received prior authorization request', source: 'NPHIES-like payload', rationale: 'Provider submitted authorization request for knee arthroscopy', status: 'completed' },
    { step: 'validation', timestamp: now, actor: 'AI Agent', action: 'Validated member eligibility and provider network status', source: 'Eligibility Service', rationale: 'Member is active with Gold coverage, provider is in-network', status: 'completed' },
    { step: 'history-check', timestamp: now, actor: 'AI Agent', action: 'Reviewed claims history', source: 'Claims Database', rationale: 'Found previous MRI rejection due to missing prior authorization', status: 'completed' },
    { step: 'clinical-review', timestamp: now, actor: 'AI Agent', action: 'Flagged for clinical review', source: 'Clinical Rules Engine', rationale: 'Missing conservative treatment evidence; previous MRI rejection; procedure requires clinical validation', status: 'in-progress' }
  ];
}

function analyzeClaimMismatch() {
  const mismatches = [];
  const authorizedCode = mockAuthorization.requestedProcedureCode;
  mockClaim.claimedProcedures.forEach(p => {
    if (p.code !== authorizedCode && p.code !== 'MRI-KNEE') {
      mismatches.push(`Procedure ${p.code} (${p.description}) was not included in original authorization ${mockAuthorization.authorizationId}`);
    }
  });
  if (mockClaim.claimedProcedures.some(p => p.code === 'MRI-KNEE')) {
    mismatches.push('MRI Knee charge appears in claim despite previous rejection for lack of authorization');
  }
  if (mockClaim.invoiceTotalSAR > mockClaim.expectedTariffRangeSAR.max) {
    const excess = mockClaim.invoiceTotalSAR - mockClaim.expectedTariffRangeSAR.max;
    mismatches.push(`Invoice total (${mockClaim.invoiceTotalSAR} SAR) exceeds expected tariff range (${mockClaim.expectedTariffRangeSAR.max} SAR) by ${excess} SAR`);
  }
  return mismatches;
}

function generateArabicExplanation(memberName, authorizationId) {
  return `عزيزي ${memberName}،

نشكر لك تواصلك مع بوبا العربية.

بخصوص طلب الموافقة المسبقة لإجراء جراحة تنظير الركبة (رقم: ${authorizationId})، نود إفادتك بأن الطلب قيد المراجعة الطبية حالياً.

سبب المراجعة:
تم تقديم الطلب من المستشفى ويتطلب مراجعة بعض المستندات الطبية الإضافية للتأكد من أن الإجراء المطلوب يتوافق مع الحالة الطبية والتغطية التأمينية الخاصة بك.

الخطوات المتخذة:
- تم التحقق من أهليتك وتغطيتك التأمينية - وضعك نشط
- تم طلب مستندات إضافية من المستشفى
- سيتم مراجعة الحالة من قبل الفريق الطبي المختص

الخطوات القادمة:
سنقوم بإبلاغك بقرار الموافقة خلال 2-3 أيام عمل بعد استلام المستندات من المستشفى.

إذا كان لديك أي استفسار، يرجى التواصل معنا على الرقم 8001247272.

مع تحياتنا،
فريق خدمة العملاء - بوبا العربية`;
}

function generateEnglishExplanation(memberName, authorizationId) {
  return `Dear ${memberName},

Thank you for contacting Bupa Arabia.

Regarding your prior authorization request for knee arthroscopy (Reference: ${authorizationId}), we would like to inform you that your request is currently under medical review.

Reason for Review:
The hospital has submitted the request, and we need to review some additional medical documentation to ensure the requested procedure aligns with your medical condition and insurance coverage.

Actions Taken:
- Your eligibility and coverage have been verified - your status is active
- Additional documents have been requested from the hospital
- The case will be reviewed by our medical team

Next Steps:
We will notify you of the approval decision within 2-3 business days after receiving the documents from the hospital.

If you have any questions, please contact us at 8001247272.

Best regards,
Customer Care Team - Bupa Arabia`;
}

// ==================== ROUTES ====================

app.get('/', (req, res) => {
  res.json({
    service: 'Bupa Arabia Mock API',
    version: '1.0.0',
    endpoints: [
      'GET  /health',
      'POST /case-analysis  (body: { step: "analyze" | "default" })',
      'POST /claim-comparison (body: { authorizationId, claimId })',
      'POST /customer-care (body: { language, memberName, authorizationId })'
    ]
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Case Analysis
app.post('/case-analysis', (req, res) => {
  const step = (req.body && req.body.step) || 'default';
  const complexCase = {
    caseId: 'CASE-2026-00087',
    member: mockMember,
    provider: mockProvider,
    authorization: mockAuthorization,
    claimsHistory: mockClaimsHistory,
    workflow: generateWorkflow(),
    currentStep: 'clinical-review',
    status: 'under-review'
  };
  if (step === 'analyze') {
    complexCase.analysis = generateAnalysis();
  }
  res.json(complexCase);
});

// Claim Comparison
app.post('/claim-comparison', (req, res) => {
  const mismatches = analyzeClaimMismatch();
  res.json({
    authorizationId: (req.body && req.body.authorizationId) || mockAuthorization.authorizationId,
    claimId: (req.body && req.body.claimId) || mockClaim.claimId,
    authorization: {
      authorizationId: mockAuthorization.authorizationId,
      requestedProcedureCode: mockAuthorization.requestedProcedureCode,
      requestedProcedureDescription: mockAuthorization.requestedProcedureDescription
    },
    claim: mockClaim,
    mismatches,
    paymentIntegrityReviewRequired: mismatches.length > 0,
    timestamp: new Date().toISOString()
  });
});

// Customer Care
app.post('/customer-care', (req, res) => {
  const language = (req.body && req.body.language) || 'Arabic';
  const memberName = (req.body && req.body.memberName) || mockMember.name;
  const authorizationId = (req.body && req.body.authorizationId) || mockAuthorization.authorizationId;
  const memberId = (req.body && req.body.memberId) || mockMember.memberId;

  const explanation = language === 'English'
    ? generateEnglishExplanation(memberName, authorizationId)
    : generateArabicExplanation(memberName, authorizationId);

  res.json({
    language,
    memberId,
    memberName,
    authorizationId,
    explanation,
    timestamp: new Date().toISOString(),
    channel: 'customer-care',
    reviewRequired: true
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Bupa Mock API listening on port ${PORT}`);
});
