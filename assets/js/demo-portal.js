/* =====================================================================
   JAY C O B FINANCIAL SERVICES — demonstration dataset for the console
   ---------------------------------------------------------------------
   Customers, staff, loans, repayments, deposits, withdrawals, KYC files,
   tickets, audit entries, sessions, ledgers and every other invented
   record live here and nowhere else.

   It is downloaded only when demonstration mode is on (?demo=1), so the
   live console starts with an empty book. Turn it off with ?demo=0.
   ===================================================================== */
(function () {
  "use strict";

function demoSeed(){
  var dAgo = window.JCOB_ADMIN_HELPERS.dAgo;
  var dFwd = window.JCOB_ADMIN_HELPERS.dFwd;
const C=[
 ['Chikondi Banda','+265 991 234 501','c.banda@gmail.com','NID-4829103','Lilongwe','Active','Verified',1840000,640000,'FDH Bank plc','Bank Officer',950000,'Tamanda Banda','+265 888 411 002','Spouse'],
 ['Thandiwe Phiri','+265 888 302 114','tphiri@yahoo.com','NID-7712045','Blantyre','Active','Verified',920000,410000,'Zomba City Council','Teacher',420000,'Rex Phiri','+265 995 118 730','Brother'],
 ['Mwayi Gondwe','+265 999 812 447','m.gondwe@outlook.com','NID-1188346','Mzuzu','Active','Verified',3100000,1250000,'Self — Gondwe Agro Dealers','Business Owner',1800000,'Esther Gondwe','+265 884 220 190','Spouse'],
 ['Blessings Chirwa','+265 887 154 992','bless.chirwa@gmail.com','NID-2290871','Lilongwe','Active','Pending',150000,90000,'Sunbird Hotels','Waiter',260000,'Mercy Chirwa','+265 999 430 517','Mother'],
 ['Tiwonge Kamanga','+265 995 671 208','tiwonge.k@gmail.com','NID-3341550','Zomba','Active','Verified',780000,300000,'MACRA','IT Support',680000,'Yamikani Kamanga','+265 881 762 334','Husband'],
 ['Samuel Mbewe','+265 884 903 156','s.mbewe@gmail.com','NID-5500482','Blantyre','Suspended','Verified',-120000,0,'Transglobe Produce','Driver',300000,'Annie Mbewe','+265 992 508 761','Spouse'],
 ['Zeleka Mwanza','+265 992 108 443','zeleka.m@gmail.com','NID-6609217','Kasungu','Active','Verified',460000,205000,'Self — Mwanza Farms','Farmer',550000,'Dziko Mwanza','+265 887 614 902','Son'],
 ['Patricia Nyirenda','+265 889 245 770','p.nyirenda@gmail.com','NID-7701884','Mangochi','Active','Pending',220000,110000,'Mangochi DHO','Nurse',610000,'Chikumbutso Nyirenda','+265 993 225 048','Brother'],
 ['Dumisani Tembo','+265 996 437 021','d.tembo@gmail.com','NID-8807259','Lilongwe','Blocked','Verified',-560000,0,'Airtel Malawi','Sales Agent',480000,'Wezi Tembo','+265 885 901 437','Spouse'],
 ['Faith Msiska','+265 881 590 336','faith.msiska@gmail.com','NID-9902406','Blantyre','Active','Verified',2650000,900000,'NBS Bank','Branch Manager',1250000,'Tendai Msiska','+265 990 782 615','Husband'],
 ['Limbani Mvula','+265 994 026 887','l.mvula@gmail.com','NID-10193​47','Mzuzu','Active','Verified',340000,150000,'Malawi Police Service','Officer',390000,'Mphatso Mvula','+265 886 140 229','Spouse'],
 ['Naomi Chawinga','+265 882 714 550','n.chawinga@gmail.com','NID-1123450','Lilongwe','Active','Pending',95000,40000,'Self — Salon Piyo','Salon Owner',380000,'Grace Chawinga','+265 997 300 184','Mother']
];
const customers=C.map((c,i)=>({id:'CUS-'+String(1001+i),name:c[0],phone:c[1],email:c[2],nid:c[3],district:c[4],status:c[5],kyc:c[6],balance:c[7],savings:c[8],employer:c[9],occupation:c[10],income:c[11],kin:{name:c[12],phone:c[13],rel:c[14]},joined:dAgo(400-i*28)}));
const products=[
 {id:'PRD-01',name:'Personal Loan',rate:6.5,min:100000,max:5000000,maxTerm:24,fee:2.5,active:true,desc:'Unsecured consumer credit for salaried and verified customers'},
 {id:'PRD-02',name:'Business Loan',rate:5.8,min:250000,max:25000000,maxTerm:36,fee:3.0,active:true,desc:'Working capital and expansion finance for SMEs'},
 {id:'PRD-03',name:'Emergency Loan',rate:8.5,min:20000,max:500000,maxTerm:6,fee:1.5,active:true,desc:'Fast-tracked small loans for urgent needs'},
 {id:'PRD-04',name:'Salary-Based Loan',rate:5.2,min:50000,max:3000000,maxTerm:18,fee:2.0,active:true,desc:'Repaid directly from payroll deduction agreements'},
 {id:'PRD-05',name:'Agricultural Loan',rate:4.9,min:150000,max:12000000,maxTerm:12,fee:2.0,active:true,desc:'Seasonal input finance aligned to harvest cycles'},
 {id:'PRD-06',name:'Asset-Backed Loan',rate:4.5,min:500000,max:40000000,maxTerm:48,fee:3.5,active:true,desc:'Secured lending against vehicles, land or equipment'}];
const applications=[
 {id:'APP-30141',cust:'Chikondi Banda',product:'Personal Loan',amount:1500000,term:12,date:dAgo(1),status:'Pending',officer:'Jane Kalua',score:78,purpose:'Home improvement'},
 {id:'APP-30138',cust:'Mwayi Gondwe',product:'Business Loan',amount:8500000,term:24,date:dAgo(2),status:'Under Review',officer:'Peter Nkhata',score:85,purpose:'Stock & depot expansion'},
 {id:'APP-30135',cust:'Naomi Chawinga',product:'Emergency Loan',amount:120000,term:3,date:dAgo(2),status:'Pending',officer:'Unassigned',score:61,purpose:'Medical bill'},
 {id:'APP-30129',cust:'Patricia Nyirenda',product:'Salary-Based Loan',amount:900000,term:12,date:dAgo(4),status:'Under Review',officer:'Jane Kalua',score:72,purpose:'School fees'},
 {id:'APP-30122',cust:'Blessings Chirwa',product:'Personal Loan',amount:400000,term:9,date:dAgo(6),status:'Pending',officer:'Unassigned',score:64,purpose:'Family expense'},
 {id:'APP-30118',cust:'Faith Msiska',product:'Asset-Backed Loan',amount:12000000,term:36,date:dAgo(8),status:'Approved',officer:'Peter Nkhata',score:91,purpose:'Delivery vehicle purchase'},
 {id:'APP-30112',cust:'Tiwonge Kamanga',product:'Personal Loan',amount:600000,term:10,date:dAgo(11),status:'Rejected',officer:'Jane Kalua',score:48,reason:'Affordability below threshold; existing obligations too high.',purpose:'Consumer purchase'},
 {id:'APP-30109',cust:'Zeleka Mwanza',product:'Agricultural Loan',amount:2400000,term:12,date:dAgo(13),status:'Approved',officer:'Peter Nkhata',score:80,purpose:'Fertilizer & seed for 12ha maize'}];
const mkSched=(st,months,emi)=>{const rows=[];for(let i=1;i<=months;i++){const d=new Date(st);d.setMonth(d.getMonth()+i);rows.push({n:i,due:d.toISOString(),amt:emi,paid:0,paidDate:null,status:'Scheduled'})}return rows};
const loans=[
 {id:'LN-88041',cust:'Mwayi Gondwe',product:'Business Loan',principal:5000000,rate:5.8,term:18,emis:302100,start:dAgo(320),maturity:dFwd(220),balance:1850000,paidTotal:3150000,status:'Active',method:'Bank — NBM 1023398847',schedule:mkSched(dAgo(320),18,302100),officer:'Peter Nkhata'},
 {id:'LN-88037',cust:'Faith Msiska',product:'Personal Loan',principal:2000000,rate:6.5,term:12,emis:173600,start:dAgo(250),maturity:dFwd(115),balance:520000,paidTotal:1480000,status:'Active',method:'Airtel Money',schedule:mkSched(dAgo(250),12,173600),officer:'Jane Kalua'},
 {id:'LN-88022',cust:'Tiwonge Kamanga',product:'Salary-Based Loan',principal:800000,rate:5.2,term:12,emis:68600,start:dAgo(200),maturity:dFwd(165),balance:410000,paidTotal:390000,status:'Active',method:'Payroll — MACRA',schedule:mkSched(dAgo(200),12,68600),officer:'Jane Kalua'},
 {id:'LN-88009',cust:'Zeleka Mwanza',product:'Agricultural Loan',principal:1600000,rate:4.9,term:10,emis:168800,start:dAgo(150),maturity:dFwd(150),balance:690000,paidTotal:910000,status:'Active',method:'Mpamba',schedule:mkSched(dAgo(150),10,168800),officer:'Peter Nkhata'},
 {id:'LN-87995',cust:'Limbani Mvula',product:'Personal Loan',principal:450000,rate:6.5,term:9,emis:54200,start:dAgo(210),maturity:dFwd(60),balance:163000,paidTotal:287000,status:'Active',method:'Mpamba',schedule:mkSched(dAgo(210),9,54200),officer:'Jane Kalua'},
 {id:'LN-87990',cust:'Samuel Mbewe',product:'Personal Loan',principal:750000,rate:6.5,term:12,emis:65100,start:dAgo(240),maturity:dFwd(125),balance:560000,paidTotal:190000,status:'Overdue',method:'Bank — FDH 4462001',schedule:mkSched(dAgo(240),12,65100),officer:'Peter Nkhata'},
 {id:'LN-87981',cust:'Dumisani Tembo',product:'Emergency Loan',principal:300000,rate:8.5,term:6,emis:54300,start:dAgo(190),maturity:dFwd(-8),balance:255000,paidTotal:45000,status:'Overdue',method:'Airtel Money',schedule:mkSched(dAgo(190),6,54300),officer:'Jane Kalua'},
 {id:'LN-87960',cust:'Patricia Nyirenda',product:'Salary-Based Loan',principal:500000,rate:5.2,term:12,emis:42900,start:dAgo(520),maturity:dAgo(155),balance:0,paidTotal:514800,status:'Closed',method:'Payroll — DHO',schedule:mkSched(dAgo(520),12,42900),officer:'Jane Kalua'},
 {id:'LN-87944',cust:'Faith Msiska',product:'Emergency Loan',principal:200000,rate:8.5,term:4,emis:52800,start:dAgo(430),maturity:dAgo(310),balance:0,paidTotal:211200,status:'Closed',method:'Airtel Money',schedule:mkSched(dAgo(430),4,52800),officer:'Peter Nkhata'},
 {id:'LN-87931',cust:'Chikondi Banda',product:'Asset-Backed Loan',principal:6000000,rate:4.5,term:36,emis:178100,start:dAgo(395),maturity:dFwd(700),balance:4750000,paidTotal:1250000,status:'Active',method:'Bank — NBM 1023398847',schedule:mkSched(dAgo(395),36,178100),officer:'Peter Nkhata'}];
// mark schedules consistent with paid totals
loans.forEach(l=>{let paidCount=l.status==='Closed'?l.schedule.length:Math.floor(l.paidTotal/l.emis);
 l.schedule.forEach((s,i)=>{if(i<paidCount){s.paid=s.amt;s.status='Paid';s.paidDate=s.due}
   else if(new Date(s.due)<new Date()){s.status='Overdue'}});
 if(l.status==='Overdue'&&l.schedule.filter(s=>s.status==='Overdue').length===0){const s=l.schedule.find(x=>!x.paidDate);if(s)s.status='Overdue'}});
const repayments=[
 {id:'REP-90012',loan:'LN-88041',cust:'Mwayi Gondwe',amount:302100,principal:278500,interest:23600,date:dAgo(3),method:'Bank Transfer',ref:'NBM-88213',status:'Completed'},
 {id:'REP-90008',loan:'LN-88009',cust:'Zeleka Mwanza',amount:168800,principal:162300,interest:6500,date:dAgo(4),method:'Mpamba',ref:'TNM-556210',status:'Completed'},
 {id:'REP-89995',loan:'LN-88022',cust:'Tiwonge Kamanga',amount:68600,principal:65100,interest:3500,date:dAgo(6),method:'Payroll',ref:'MACRA-PAY-09',status:'Completed'},
 {id:'REP-89971',loan:'LN-88037',cust:'Faith Msiska',amount:173600,principal:168200,interest:5400,date:dAgo(8),method:'Airtel Money',ref:'AM-771209',status:'Completed'},
 {id:'REP-89962',loan:'LN-87990',cust:'Samuel Mbewe',amount:30000,principal:26300,interest:3700,date:dAgo(9),method:'Cash — Lilongwe Branch',ref:'CSH-1182',status:'Completed'},
 {id:'REP-89944',loan:'LN-87995',cust:'Limbani Mvula',amount:54200,principal:52950,interest:1250,date:dAgo(12),method:'Mpamba',ref:'TNM-552388',status:'Completed'},
 {id:'REP-89902',loan:'LN-87931',cust:'Chikondi Banda',amount:178100,principal:155000,interest:23100,date:dAgo(14),method:'Bank Transfer',ref:'NBM-87741',status:'Completed'},
 {id:'REP-89890',loan:'LN-87981',cust:'Dumisani Tembo',amount:15000,principal:10600,interest:4400,date:dAgo(20),method:'Cash — Blantyre Branch',ref:'CSH-1146',status:'Reversed'},
 {id:'REP-89877',loan:'LN-88037',cust:'Faith Msiska',amount:173600,principal:167400,interest:6200,date:dAgo(38),method:'Airtel Money',ref:'AM-760144',status:'Completed'}];
const deposits=[
 {id:'DEP-5109',cust:'Faith Msiska',amount:400000,method:'Bank — NBS',date:dAgo(1),status:'Pending',ref:'NBS-66201'},
 {id:'DEP-5104',cust:'Chikondi Banda',amount:150000,method:'Airtel Money',date:dAgo(2),status:'Approved',ref:'AM-771090'},
 {id:'DEP-5096',cust:'Thandiwe Phiri',amount:80000,method:'Mpamba',date:dAgo(3),status:'Approved',ref:'TNM-554100'},
 {id:'DEP-5088',cust:'Mwayi Gondwe',amount:1200000,method:'Bank — NBM',date:dAgo(5),status:'Approved',ref:'NBM-87623'},
 {id:'DEP-5083',cust:'Naomi Chawinga',amount:30000,method:'Airtel Money',date:dAgo(6),status:'Pending',ref:'AM-770533'},
 {id:'DEP-5071',cust:'Limbani Mvula',amount:60000,method:'Cash — Mzuzu Branch',date:dAgo(8),status:'Approved',ref:'CSH-1175'},
 {id:'DEP-5069',cust:'Zeleka Mwanza',amount:250000,method:'Bank — Standard Bank',date:dAgo(9),status:'Reversed',ref:'SB-44120'}];
const withdrawals=[
 {id:'WDR-3302',cust:'Mwayi Gondwe',amount:500000,method:'Bank — NBM',date:dAgo(1),status:'Pending',ref:'WDR-3302'},
 {id:'WDR-3299',cust:'Thandiwe Phiri',amount:100000,method:'Airtel Money',date:dAgo(2),status:'Approved',ref:'WDR-3299'},
 {id:'WDR-3290',cust:'Faith Msiska',amount:250000,method:'Bank — NBS',date:dAgo(4),status:'Processed',ref:'NBS-66101'},
 {id:'WDR-3286',cust:'Blessings Chirwa',amount:45000,method:'Mpamba',date:dAgo(5),status:'Failed',ref:'WDR-3286',note:'Provider timeout — retry required'},
 {id:'WDR-3280',cust:'Naomi Chawinga',amount:20000,method:'Airtel Money',date:dAgo(8),status:'Processed',ref:'AM-769921'},
 {id:'WDR-3271',cust:'Tiwonge Kamanga',amount:120000,method:'Bank — FDH',date:dAgo(10),status:'Declined',ref:'WDR-3271',note:'Insufficient cleared balance'}];
const transfers=[
 {id:'TRF-7712',from:'Faith Msiska',to:'Thandiwe Phiri',amount:150000,fee:750,date:dAgo(1),status:'Completed',ref:'TRF-7712'},
 {id:'TRF-7705',from:'Chikondi Banda',to:'Mwayi Gondwe',amount:300000,fee:1500,date:dAgo(3),status:'Completed',ref:'TRF-7705'},
 {id:'TRF-7698',from:'Zeleka Mwanza',to:'Naomi Chawinga',amount:50000,fee:250,date:dAgo(5),status:'Pending Verification',ref:'TRF-7698'},
 {id:'TRF-7682',from:'Limbani Mvula',to:'Samuel Mbewe',amount:25000,fee:125,date:dAgo(9),status:'Reversed',ref:'TRF-7682'},
 {id:'TRF-7670',from:'Mwayi Gondwe',to:'Chikondi Banda',amount:800000,fee:0,date:dAgo(12),status:'Completed',ref:'TRF-7670'}];
const kycDocs=[
 {id:'KYC-220',cust:'Blessings Chirwa',type:'National ID',submitted:dAgo(3),status:'Pending_review',ref:'Scan — front & back'},
 {id:'KYC-219',cust:'Blessings Chirwa',type:'Customer Photograph',submitted:dAgo(3),status:'Pending_review',ref:'Selfie with ID'},
 {id:'KYC-218',cust:'Patricia Nyirenda',type:'Proof of Address',submitted:dAgo(4),status:'Pending_review',ref:'ESCOM bill — Sep 2026'},
 {id:'KYC-216',cust:'Naomi Chawinga',type:'Business Registration',submitted:dAgo(5),status:'Pending_review',ref:'MBRS certificate — Salon Piyo'},
 {id:'KYC-215',cust:'Patricia Nyirenda',type:'Employment Document',submitted:dAgo(6),status:'Pending_review',ref:'DHO payslip x3'},
 {id:'KYC-209',cust:'Faith Msiska',type:'National ID',submitted:dAgo(120),status:'Approved',ref:'NID-9902406',by:'Jane Kalua'},
 {id:'KYC-208',cust:'Mwayi Gondwe',type:'Business Registration',submitted:dAgo(140),status:'Approved',ref:'MBRS — Gondwe Agro',by:'Peter Nkhata'},
 {id:'KYC-200',cust:'Samuel Mbewe',type:'Proof of Address',submitted:dAgo(150),status:'Rejected',ref:'Illegible document',by:'Jane Kalua',note:'Resubmit clearer copy'}];
const guarantors=[
 {id:'GRN-110',loan:'LN-88041',name:'Esther Gondwe',rel:'Spouse',phone:'+265 884 220 190',status:'Verified',docs:'ID + signed consent'},
 {id:'GRN-108',loan:'LN-87931',name:'Tamanda Banda',rel:'Spouse',phone:'+265 888 411 002',status:'Verified',docs:'ID + signed consent'},
 {id:'GRN-104',loan:'LN-88037',name:'Tendai Msiska',rel:'Spouse',phone:'+265 990 782 615',status:'Verified',docs:'ID + signed consent'},
 {id:'GRN-101',loan:'LN-87990',name:'Annie Mbewe',rel:'Spouse',phone:'+265 992 508 761',status:'Pending Verification',docs:'ID only — consent pending'}];
const collateral=[
 {id:'COL-77',loan:'LN-87931',type:'Real Estate',desc:'Residential plot & 4-bed house — Area 47, Lilongwe',value:28000000,valuer:'Knight James Valuations',status:'Held'},
 {id:'COL-71',loan:'LN-88041',type:'Vehicle',desc:'Toyota Hilux 2021 — BZ 8821',value:18000000,valuer:'AA Malawi Assessors',status:'Held'},
 {id:'COL-63',loan:'LN-87960',type:'Equipment',desc:'Industrial sewing machines x4',value:900000,valuer:'Internal valuation',status:'Released'}];
const tickets=[
 {id:'TKT-8816',cust:'Samuel Mbewe',subject:'Cannot access mobile statement',cat:'Account access',pri:'High',status:'Open',agent:'Unassigned',date:dAgo(1)},
 {id:'TKT-8810',cust:'Dumisani Tembo',subject:'Disputing penalty charge on LN-87981',cat:'Repayment dispute',pri:'High',status:'In Progress',agent:'Chimwemwe S.',date:dAgo(3)},
 {id:'TKT-8805',cust:'Blessings Chirwa',subject:'How long does KYC approval take?',cat:'Loan application enquiry',pri:'Normal',status:'Open',agent:'Unassigned',date:dAgo(3)},
 {id:'TKT-8796',cust:'Faith Msiska',subject:'Request statement for visa application',cat:'General',pri:'Normal',status:'Resolved',agent:'Chimwemwe S.',date:dAgo(7)},
 {id:'TKT-8792',cust:'Naomi Chawinga',subject:'Deposit did not reflect',cat:'Complaint',pri:'High',status:'In Progress',agent:'Administrator',date:dAgo(9)}];
const notifications=[
 {id:'MSG-55214',cust:'Chikondi Banda',type:'Application received',channel:'SMS',date:dAgo(1),status:'Sent',body:'Dear Chikondi, your loan application APP-30141 of MWK 1,500,000 has been received.'},
 {id:'MSG-55201',cust:'Faith Msiska',type:'Approval notification',channel:'SMS + Email',date:dAgo(2),status:'Sent',body:'Congratulations! Your Asset-Backed Loan of MWK 12,000,000 has been approved.'},
 {id:'MSG-55178',cust:'Zeleka Mwanza',type:'Repayment reminder',channel:'SMS',date:dAgo(4),status:'Sent',body:'Reminder: instalment MWK 168,800 for LN-88009 falls due in 3 days.'},
 {id:'MSG-55155',cust:'Samuel Mbewe',type:'Overdue reminder',channel:'SMS',date:dAgo(5),status:'Failed',body:'Your instalment on LN-87990 is overdue. Please pay MWK 65,100 to avoid penalties.'},
 {id:'MSG-55149',cust:'Tiwonge Kamanga',type:'Deposit confirmation',channel:'SMS',date:dAgo(6),status:'Sent',body:'Deposit MWK 80,000 received. New savings balance MWK 380,000.'},
 {id:'MSG-55120',cust:'Dumisani Tembo',type:'Overdue reminder',channel:'SMS + Email',date:dAgo(9),status:'Failed',body:'Loan LN-87981 is in arrears. Contact JAY C O B immediately to restructure.'},
 {id:'MSG-55102',cust:'Mwayi Gondwe',type:'Disbursement confirmation',channel:'SMS',date:dAgo(60),status:'Sent',body:'MWK 5,000,000 disbursed to NBM 1023398847. Loan LN-88041 active.'}];
const admins=[
 {id:'ADM-01',name:'System Administrator',email:'admin@jaycobfinancial.mw',role:'Super Admin',status:'Active',lastLogin:dAgo(0)},
 {id:'ADM-02',name:'Jane Kalua',email:'j.kalua@jaycobfinancial.mw',role:'Loan Officer',status:'Active',lastLogin:dAgo(1)},
 {id:'ADM-03',name:'Peter Nkhata',email:'p.nkhata@jaycobfinancial.mw',role:'Loan Officer',status:'Active',lastLogin:dAgo(2)},
 {id:'ADM-04',name:'Chimwemwe Soko',email:'c.soko@jaycobfinancial.mw',role:'Support Agent',status:'Active',lastLogin:dAgo(1)},
 {id:'ADM-05',name:'Grace Kaunda',email:'g.kaunda@jaycobfinancial.mw',role:'Finance Officer',status:'Active',lastLogin:dAgo(4)},
 {id:'ADM-06',name:'Aaron Banda',email:'a.banda@jaycobfinancial.mw',role:'Compliance Officer',status:'Inactive',lastLogin:dAgo(45)}];
const roles=[
 {name:'Super Admin',perms:{customers:1,kyc:1,loanApprove:1,disburse:1,repayments:1,reverse:1,fees:1,reports:1,admins:1,roles:1,settings:1,writeoff:1}},
 {name:'Loan Officer',perms:{customers:1,kyc:1,loanApprove:1,disburse:0,repayments:1,reverse:0,fees:1,reports:1,admins:0,roles:0,settings:0,writeoff:0}},
 {name:'Finance Officer',perms:{customers:1,kyc:0,loanApprove:0,disburse:1,repayments:1,reverse:1,fees:1,reports:1,admins:0,roles:0,settings:0,writeoff:0}},
 {name:'Support Agent',perms:{customers:1,kyc:0,loanApprove:0,disburse:0,repayments:0,reverse:0,fees:0,reports:0,admins:0,roles:0,settings:0,writeoff:0}},
 {name:'Compliance Officer',perms:{customers:1,kyc:1,loanApprove:0,disburse:0,repayments:0,reverse:0,fees:0,reports:1,admins:0,roles:0,settings:0,writeoff:1}}];
const workflows=[
 {id:'WFL-318',type:'Loan approval',ref:'APP-30138 — Mwayi Gondwe · MWK 8,500,000',by:'Jane Kalua',stage:'2 of 2 (Manager)',date:dAgo(1)},
 {id:'WFL-315',type:'Disbursement approval',ref:'LN pending for APP-30118 — MWK 12,000,000',by:'Peter Nkhata',stage:'1 of 2 (Finance)',date:dAgo(2)},
 {id:'WFL-311',type:'Withdrawal approval',ref:'WDR-3302 — Mwayi Gondwe · MWK 500,000',by:'System',stage:'1 of 2 (Finance)',date:dAgo(1)},
 {id:'WFL-307',type:'Transaction reversal',ref:'REP-89890 — MWK 15,000 reversal',by:'Cashier — Blantyre',stage:'2 of 2 (Manager)',date:dAgo(3)},
 {id:'WFL-299',type:'Write-off approval',ref:'LN-87981 proposed write-off · MWK 255,000',by:'Collections',stage:'1 of 3 (Risk Committee)',date:dAgo(4)},
 {id:'WFL-291',type:'High-value authorization',ref:'TRF-7670 — MWK 800,000 internal transfer',by:'System',stage:'Completed',date:dAgo(12)}];
const auditL=[
 {id:'AUD-9912',user:'Administrator',action:'Disbursement confirmed — LN-88041, MWK 5,000,000 via NBM',module:'Disbursement',date:dAgo(60)},
 {id:'AUD-9908',user:'Jane Kalua',action:'Loan approved — APP-30118 · MWK 12,000,000',module:'Loan Applications',date:dAgo(8)},
 {id:'AUD-9905',user:'Jane Kalua',action:'Loan rejected — APP-30112 (affordability)',module:'Loan Applications',date:dAgo(11)},
 {id:'AUD-9901',user:'Grace Kaunda',action:'Manual repayment recorded — REP-89962 · MWK 30,000 (auth #4431)',module:'Repayments',date:dAgo(9)},
 {id:'AUD-9897',user:'Administrator',action:'Account suspended — Samuel Mbewe (arrears >60 days)',module:'Customer Management',date:dAgo(15)},
 {id:'AUD-9890',user:'Peter Nkhata',action:'KYC approved — Faith Msiska · National ID',module:'KYC',date:dAgo(40)},
 {id:'AUD-9885',user:'System',action:'Interest accrual run — 10 active loans',module:'Interest',date:dAgo(1)}];
const sessions=[
 {id:'SES-518',user:'Administrator',ip:'102.70.44.18',device:'Chrome · Windows 11 · Lilongwe',started:dAgo(0),status:'Active (this device)'},
 {id:'SES-516',user:'Jane Kalua',ip:'102.70.90.7',device:'Edge · Windows 10 · Lilongwe',started:dAgo(1),status:'Active'},
 {id:'SES-514',user:'Chimwemwe Soko',ip:'105.234.11.63',device:'Safari · iPhone · Blantyre',started:dAgo(1),status:'Active'},
 {id:'SES-502',user:'Grace Kaunda',ip:'102.70.12.90',device:'Chrome · macOS',started:dAgo(4),status:'Expired'},
 {id:'SES-499',user:'Unknown',ip:'196.216.8.44',device:'Unknown device · Lusaka',started:dAgo(6),status:'Failed login x4 — blocked'}];
const savings=[
 {id:'SVG-4401',cust:'Mwayi Gondwe',balance:1250000,rate:8.5,accrued:8840,maturity:dFwd(160),status:'Active'},
 {id:'SVG-4398',cust:'Faith Msiska',balance:900000,rate:8.5,accrued:6310,maturity:dFwd(200),status:'Active'},
 {id:'SVG-4380',cust:'Chikondi Banda',balance:640000,rate:7.0,accrued:3720,maturity:dFwd(90),status:'Active'},
 {id:'SVG-4351',cust:'Thandiwe Phiri',balance:410000,rate:7.0,accrued:2390,maturity:dFwd(140),status:'Active'},
 {id:'SVG-4322',cust:'Tiwonge Kamanga',balance:300000,rate:7.0,accrued:1740,maturity:dFwd(110),status:'Active'},
 {id:'SVG-4290',cust:'Zeleka Mwanza',balance:205000,rate:6.0,accrued:1020,maturity:dFwd(75),status:'Active'},
 {id:'SVG-4188',cust:'Patricia Nyirenda',balance:180000,rate:6.0,accrued:900,maturity:dAgo(20),status:'Matured'}];
const fees=[
 {id:'FEE-801',cust:'APP-30138 — Mwayi Gondwe',type:'Loan processing fee',amount:85000,status:'Charged',date:dAgo(2)},
 {id:'FEE-798',cust:'APP-30141 — Chikondi Banda',type:'Application fee',amount:5000,status:'Charged',date:dAgo(1)},
 {id:'FEE-790',cust:'LN-87981 — Dumisani Tembo',type:'Late-payment charge',amount:16400,status:'Charged',date:dAgo(9)},
 {id:'FEE-788',cust:'LN-87990 — Samuel Mbewe',type:'Late-payment charge',amount:9800,status:'Waived',date:dAgo(12),note:'First-time arrears — goodwill waiver'},
 {id:'FEE-780',cust:'WDR-3286 — Blessings Chirwa',type:'Service fee',amount:900,status:'Refunded',date:dAgo(5),note:'Failed payout'},
 {id:'FEE-776',cust:'TRF-7705',type:'Transfer fee',amount:1500,status:'Charged',date:dAgo(3)}];
const ledger=[
 {id:'JR-9201',date:dAgo(3),ref:'REP-90012',account:'Loan book — principal',debit:0,credit:278500,narr:'Repayment LN-88041'},
 {id:'JR-9200',date:dAgo(3),ref:'REP-90012',account:'Cash — bank clearing',debit:302100,credit:0,narr:'Repayment LN-88041'},
 {id:'JR-9199',date:dAgo(3),ref:'REP-90012',account:'Interest income',debit:0,credit:23600,narr:'Repayment LN-88041'},
 {id:'JR-9190',date:dAgo(5),ref:'DEP-5088',account:'Customer deposits liability',debit:0,credit:1200000,narr:'Deposit — Mwayi Gondwe'},
 {id:'JR-9189',date:dAgo(5),ref:'DEP-5088',account:'Cash — NBM current a/c',debit:1200000,credit:0,narr:'Deposit — Mwayi Gondwe'},
 {id:'JR-9180',date:dAgo(4),ref:'WDR-3290',account:'Customer deposits liability',debit:250000,credit:0,narr:'Withdrawal — Faith Msiska'},
 {id:'JR-9179',date:dAgo(4),ref:'WDR-3290',account:'Cash — bank clearing',debit:0,credit:250000,narr:'Withdrawal processed'},
 {id:'JR-9170',date:dAgo(2),ref:'FEE-801',account:'Fee income',debit:0,credit:85000,narr:'Processing fee APP-30138'},
 {id:'JR-9169',date:dAgo(2),ref:'FEE-801',account:'Fees receivable',debit:85000,credit:0,narr:'Processing fee APP-30138'},
 {id:'JR-9160',date:dAgo(60),ref:'LN-88041',account:'Loan book — principal',debit:5000000,credit:0,narr:'Disbursement — Gondwe'},
 {id:'JR-9159',date:dAgo(60),ref:'LN-88041',account:'Cash — NBM current a/c',debit:0,credit:5000000,narr:'Disbursement — Gondwe'},
 {id:'JR-9150',date:dAgo(9),ref:'FEE-788',account:'Fee income',debit:9800,credit:0,narr:'Waiver reversal'},
 {id:'JR-9149',date:dAgo(9),ref:'FEE-788',account:'Fees receivable',debit:0,credit:9800,narr:'Late fee waived — Mbewe'}];
const recon=[
 {id:'RC-202',provider:'Airtel Money',ref:'AM-771090',date:dAgo(2),system:150000,provider:150000,status:'Matched'},
 {id:'RC-201',provider:'Airtel Money',ref:'AM-771209',date:dAgo(3),system:173600,provider:173600,status:'Matched'},
 {id:'RC-199',provider:'Mpamba (TNM)',ref:'TNM-556210',date:dAgo(4),system:168800,provider:168800,status:'Matched'},
 {id:'RC-198',provider:'Mpamba (TNM)',ref:'TNM-552388',date:dAgo(5),system:54200,provider:54200,status:'Matched'},
 {id:'RC-197',provider:'Bank — NBM',ref:'NBM-88213',date:dAgo(3),system:302100,provider:302100,status:'Matched'},
 {id:'RC-196',provider:'Bank — NBM',ref:'NBM-87623',date:dAgo(5),system:1200000,provider:1200000,status:'Matched'},
 {id:'RC-195',provider:'Airtel Money',ref:'AM-770990',date:dAgo(2),system:45000,provider:45000,status:'Unmatched'},
 {id:'RC-194',provider:'Mpamba (TNM)',ref:'TNM-554882',date:dAgo(1),system:0,provider:32000,status:'Unmatched'},
 {id:'RC-193',provider:'Bank — NBS',ref:'NBS-66201',date:dAgo(1),system:400000,provider:400000,status:'Pending review'}];
const statements=[
 {id:'STM-4020',cust:'Faith Msiska',type:'Customer statement',range:'Jul–Sep 2026',by:'Faith Msiska (self-service)',date:dAgo(6)},
 {id:'STM-4014',cust:'Mwayi Gondwe',type:'Loan statement',range:'LN-88041 · YTD',by:'Administrator',date:dAgo(12)},
 {id:'STM-4009',cust:'Chikondi Banda',type:'Transaction statement',range:'Oct 2026',by:'Branch — Lilongwe',date:dAgo(18)}];
const branches=[
 {id:'BR-01',name:'Lilongwe Head Office',district:'Lilongwe',manager:'Administrator',cust:582,portfolio:8200000,cash:4500000},
 {id:'BR-02',name:'Blantyre Branch',district:'Blantyre',manager:'Grace Kaunda',cust:468,portfolio:5900000,cash:3100000},
 {id:'BR-03',name:'Mzuzu Branch',district:'Mzuzu',manager:'Jane Kalua',cust:286,portfolio:2850000,cash:1800000},
 {id:'BR-04',name:'Zomba Service Point',district:'Zomba',manager:'Peter Nkhata',cust:134,portfolio:870000,cash:640000}];
const officers=[
 {id:'LO-01',name:'Jane Kalua',branch:'Mzuzu',apps:46,portfolio:6120000,repaidRate:96.4,dpd30:'2.2%'},
 {id:'LO-02',name:'Peter Nkhata',branch:'Zomba',apps:39,portfolio:8440000,repaidRate:93.1,dpd30:'3.8%'}];
const investors=[
 {id:'INV-07',name:'Limbe Trust Holdings',capital:15000000,rate:14,returns:2100000,paid:1200000,status:'Active'},
 {id:'INV-05',name:'K. Chigumula',capital:5000000,rate:12.5,returns:620000,paid:620000,status:'Active'},
 {id:'INV-03',name:'Mwayi Gondwe',capital:2000000,rate:10,returns:150000,paid:0,status:'Pending distribution'}];
const agents=[
 {id:'AGT-21',name:'Area 25 Agency (B. Soko)',refs:34,commission:102000,paid:85000,status:'Active'},
 {id:'AGT-18',name:'Chitipa Partner Desk',refs:12,commission:31000,paid:31000,status:'Active'},
 {id:'AGT-15',name:'Dedza Mobile Agent',refs:0,commission:0,paid:0,status:'Deactivated'}];
const payroll=[
 {id:'PRL-33',cust:'Tiwonge Kamanga',employer:'MACRA',verified:true,deduction:68600,lastRun:dAgo(6),status:'Deducted'},
 {id:'PRL-30',cust:'Patricia Nyirenda',employer:'Mangochi DHO',verified:true,deduction:42900,lastRun:dAgo(34),status:'Closed'}];
const legal=[
 {id:'LGL-09',case:'LN-87981 — Dumisani Tembo',stage:'Demand letter issued',amount:255000,updated:dAgo(6),officer:'AA Attorneys'},
 {id:'LGL-06',case:'LN-87412 — Estate of R. Gama',stage:'Settlement agreement (MWK 25,000/mo)',amount:180000,updated:dAgo(30),officer:'AA Attorneys'}];
const apis=[
 {id:'API-11',name:'Airtel Money Africa',type:'Mobile money collection & payout',status:'Operational',errors24:0,latency:'320ms'},
 {id:'API-10',name:'TNM Mpamba OpenAPI',type:'Mobile money collection',status:'Operational',errors24:1,latency:'410ms'},
 {id:'API-08',name:'NBM Corporate Gateway',type:'Bank settlements',status:'Operational',errors24:0,latency:'-'},
 {id:'API-06',name:'Malawi SMS Gateway',type:'Notifications',status:'Degraded',errors24:6,latency:'-'},
 {id:'API-04',name:'National ID (NRB) Lookup',type:'KYC verification',status:'Operational',errors24:0,latency:'880ms'}];
const fraud=[
 {id:'FRD-88',title:'Duplicate application detected — NID matching APP-30135',sev:'High',status:'Open',date:dAgo(2)},
 {id:'FRD-85',title:'Unusual cash activity — 3 deposits under reporting threshold same day',sev:'Medium',status:'Under investigation',date:dAgo(5)},
 {id:'FRD-79',title:'Login from new country flag — admin a.banda@',sev:'High',status:'Resolved',date:dAgo(12)}];
const templates=[
 {id:'TPL-01',name:'Loan Agreement (Standard)',cat:'Agreements',updated:dAgo(90)},
 {id:'TPL-02',name:'Customer Consent & Data Form',cat:'Consent',updated:dAgo(120)},
 {id:'TPL-03',name:'Official Payment Receipt',cat:'Receipts',updated:dAgo(30)},
 {id:'TPL-04',name:'Customer Statement Template',cat:'Statements',updated:dAgo(60)},
 {id:'TPL-05',name:'Loan Offer Letter',cat:'Letters',updated:dAgo(45)},
 {id:'TPL-06',name:'Approval Letter',cat:'Letters',updated:dAgo(45)},
 {id:'TPL-07',name:'Rejection Letter',cat:'Letters',updated:dAgo(45)}];
const backups=[
 {id:'BKP-1813',date:dAgo(1),size:'412 MB',type:'Nightly full',status:'Verified'},
 {id:'BKP-1806',date:dAgo(8),size:'406 MB',type:'Weekly full',status:'Verified'},
 {id:'BKP-1799',date:dAgo(15),size:'398 MB',type:'Weekly full',status:'Integrity check failed',note:'Restored from BKP-1798 instead'}];
const tasks=[
 {id:'TSK-1',label:'Review 2 pending loan applications',to:'loanApps',n:2},
 {id:'TSK-2',label:'Verify 5 pending KYC submissions',to:'kyc',n:5},
 {id:'TSK-3',label:'Match 3 unreconciled provider transactions',to:'recon',n:3},
 {id:'TSK-4',label:'Follow up 2 overdue loans (>7 days)',to:'collections',n:2},
 {id:'TSK-5',label:'Approve withdrawal WDR-3302 (MWK 500k)',to:'withdrawals',n:1}];
const activities=[
 {t:'Loan approved and disbursed',d:'LN for APP-30118 — Faith Msiska · MWK 12,000,000',at:dAgo(0.4),ic:'💠',c:'var(--acc)'},
 {t:'KYC documents submitted',d:'Business registration — Naomi Chawinga',at:dAgo(1.2),ic:'🪪',c:'var(--purp)'},
 {t:'Repayment received',d:'MWK 302,100 from Mwayi Gondwe (LN-88041)',at:dAgo(2.5),ic:'💰',c:'var(--ok)'},
 {t:'Support ticket opened',d:'TKT-8816 — mobile statement access',at:dAgo(1.5),ic:'🎫',c:'var(--warn)'},
 {t:'Fraud alert raised',d:'FRD-88 — duplicate application on NID',at:dAgo(2),ic:'⚠️',c:'var(--bad)'},
 {t:'Deposit pending approval',d:'MWK 400,000 — Faith Msiska (bank transfer)',at:dAgo(0.8),ic:'🏦',c:'var(--teal)'}];
const glAccounts=[
 {code:'1010',name:'Cash — Bank & Mobile Money',type:'Asset',bal:19040000},
 {code:'1020',name:'Loan Book — Principal Outstanding',type:'Asset',bal:9138000},
 {code:'1030',name:'Fees Receivable',type:'Asset',bal:61300},
 {code:'2010',name:'Customer Deposits Liability',type:'Liability',bal:6115000},
 {code:'2020',name:'Investor Capital',type:'Liability',bal:22000000},
 {code:'3010',name:'Interest Income',type:'Income',bal:1294700},
 {code:'3020',name:'Fee & Commission Income',type:'Income',bal:884600},
 {code:'4010',name:'Staff Costs',type:'Expense',bal:1950000},
 {code:'4020',name:'Operations & Branch Costs',type:'Expense',bal:760000}];
const ptps=[
 {id:'PTP-14',cust:'Samuel Mbewe',loan:'LN-87990',amount:65100,date:dFwd(4),status:'Open',calls:3},
 {id:'PTP-11',cust:'Dumisani Tembo',loan:'LN-87981',amount:54300,date:dAgo(5),status:'Broken',calls:6}];
return{customers,products,applications,loans,repayments,deposits,withdrawals,transfers,kycDocs,guarantors,collateral,tickets,notifications,admins,roles,workflows,auditL,sessions,savings,fees,ledger,recon,statements,branches,officers,investors,agents,payroll,legal,apis,fraud,templates,backups,tasks,activities,ptps,glAccounts,
 settings:{biz:'JAY C O B FINANCIAL SERVICES',reg:'MBRS-2024-11882',currency:'MWK',tz:'Africa/Blantyre',hotline:'+265 999 123 456',graceDays:3,penaltyRate:5,maxDTI:60}};
}

  window.JCOB_DEMO_PORTAL = demoSeed;
})();
