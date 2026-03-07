import type { Industry } from '../types/stock';

// Mapping of VN stock tickers to their industry groups
export const INDUSTRY_MAP: Record<string, Industry> = {
  // Ngân hàng
  VCB: 'Ngân hàng', BID: 'Ngân hàng', CTG: 'Ngân hàng', TCB: 'Ngân hàng',
  MBB: 'Ngân hàng', VPB: 'Ngân hàng', ACB: 'Ngân hàng', HDB: 'Ngân hàng',
  STB: 'Ngân hàng', TPB: 'Ngân hàng', LPB: 'Ngân hàng', MSB: 'Ngân hàng',
  OCB: 'Ngân hàng', EIB: 'Ngân hàng', SHB: 'Ngân hàng', SSB: 'Ngân hàng',
  BAB: 'Ngân hàng', ABB: 'Ngân hàng', NAB: 'Ngân hàng', VAB: 'Ngân hàng',
  VIB: 'Ngân hàng', KLB: 'Ngân hàng', PGB: 'Ngân hàng', BVB: 'Ngân hàng',
  NVB: 'Ngân hàng', SGB: 'Ngân hàng',

  // Bất động sản
  VIC: 'Bất động sản', VHM: 'Bất động sản', VRE: 'Bất động sản', NVL: 'Bất động sản',
  KDH: 'Bất động sản', DXG: 'Bất động sản', PDR: 'Bất động sản', NLG: 'Bất động sản',
  DIG: 'Bất động sản', HDG: 'Bất động sản', KBC: 'Bất động sản', IJC: 'Bất động sản',
  CEO: 'Bất động sản', LDG: 'Bất động sản', AGG: 'Bất động sản', DPG: 'Bất động sản',
  NTL: 'Bất động sản', QCG: 'Bất động sản', SCR: 'Bất động sản', TDC: 'Bất động sản',
  HDC: 'Bất động sản', API: 'Bất động sản', CII: 'Bất động sản', NBB: 'Bất động sản',
  ITA: 'Bất động sản', SZC: 'Bất động sản', IDC: 'Bất động sản', BCG: 'Bất động sản',
  HPX: 'Bất động sản', TCH: 'Bất động sản', DXS: 'Bất động sản', CRE: 'Bất động sản',
  HQC: 'Bất động sản', CCL: 'Bất động sản', TDH: 'Bất động sản', SJS: 'Bất động sản',
  HAR: 'Bất động sản', LEC: 'Bất động sản', DRH: 'Bất động sản', KHG: 'Bất động sản',

  // Chứng khoán
  SSI: 'Chứng khoán', VCI: 'Chứng khoán', HCM: 'Chứng khoán', VND: 'Chứng khoán',
  SHS: 'Chứng khoán', VDS: 'Chứng khoán', BSI: 'Chứng khoán', ORS: 'Chứng khoán',
  FTS: 'Chứng khoán', CTS: 'Chứng khoán', AGR: 'Chứng khoán', TVS: 'Chứng khoán',
  APS: 'Chứng khoán', APG: 'Chứng khoán', BMS: 'Chứng khoán', DSC: 'Chứng khoán',
  EVS: 'Chứng khoán', WSS: 'Chứng khoán', PSI: 'Chứng khoán', VIG: 'Chứng khoán',
  TVB: 'Chứng khoán', TCI: 'Chứng khoán', MBS: 'Chứng khoán',

  // Thép
  HPG: 'Thép', HSG: 'Thép', NKG: 'Thép', TLH: 'Thép',
  POM: 'Thép', SMC: 'Thép', VGS: 'Thép', DTL: 'Thép',
  TVN: 'Thép', TIS: 'Thép', VCA: 'Thép',

  // Dầu khí
  GAS: 'Dầu khí', PLX: 'Dầu khí', PVD: 'Dầu khí', PVS: 'Dầu khí',
  BSR: 'Dầu khí', OIL: 'Dầu khí', PVB: 'Dầu khí', PVC: 'Dầu khí',
  PVT: 'Dầu khí', PGC: 'Dầu khí', PGS: 'Dầu khí', ASP: 'Dầu khí',
  CNG: 'Dầu khí', POS: 'Dầu khí', PXS: 'Dầu khí', PSH: 'Dầu khí',

  // Điện
  POW: 'Điện', GEG: 'Điện', PC1: 'Điện', REE: 'Điện',
  NT2: 'Điện', PPC: 'Điện', HND: 'Điện', VSH: 'Điện',
  QTP: 'Điện', TTA: 'Điện', SBA: 'Điện', SJD: 'Điện',
  TBC: 'Điện', CHP: 'Điện', DVN: 'Điện', TV2: 'Điện',
  BCH: 'Điện',

  // Xây dựng
  CTD: 'Xây dựng', HBC: 'Xây dựng', VCG: 'Xây dựng', HUT: 'Xây dựng',
  FCN: 'Xây dựng', ROS: 'Xây dựng', C4G: 'Xây dựng', LCG: 'Xây dựng',
  VC3: 'Xây dựng', CIG: 'Xây dựng', HU3: 'Xây dựng', VNE: 'Xây dựng',
  SC5: 'Xây dựng', SDU: 'Xây dựng', TV1: 'Xây dựng', BCE: 'Xây dựng',

  // Bán lẻ
  MWG: 'Bán lẻ', FRT: 'Bán lẻ', PNJ: 'Bán lẻ', DGW: 'Bán lẻ',
  PET: 'Bán lẻ', AST: 'Bán lẻ', VGC: 'Bán lẻ',

  // Thực phẩm & Đồ uống
  VNM: 'Thực phẩm', MSN: 'Thực phẩm', SAB: 'Thực phẩm', KDC: 'Thực phẩm',
  QNS: 'Thực phẩm', SBT: 'Thực phẩm', LSS: 'Thực phẩm', HAG: 'Thực phẩm',
  HNG: 'Thực phẩm', MCH: 'Thực phẩm', NAF: 'Thực phẩm', TAC: 'Thực phẩm',
  GTN: 'Thực phẩm', BHN: 'Thực phẩm', CLC: 'Thực phẩm', SAF: 'Thực phẩm',
  BBC: 'Thực phẩm',

  // Công nghệ
  FPT: 'Công nghệ', CMG: 'Công nghệ', ELC: 'Công nghệ', ITD: 'Công nghệ',
  SAM: 'Công nghệ', ST8: 'Công nghệ', VGI: 'Công nghệ', ONE: 'Công nghệ',

  // Hóa chất
  DGC: 'Hóa chất', DCM: 'Hóa chất', CSV: 'Hóa chất', DPM: 'Hóa chất',
  LAS: 'Hóa chất', PAC: 'Hóa chất', HVT: 'Hóa chất', BFC: 'Hóa chất',
  PCE: 'Hóa chất', SFG: 'Hóa chất',

  // Dệt may
  TCM: 'Dệt may', TNG: 'Dệt may', VGT: 'Dệt may', MSH: 'Dệt may',
  STK: 'Dệt may', GIL: 'Dệt may', GMC: 'Dệt may', TVT: 'Dệt may',
  HTG: 'Dệt may', PPH: 'Dệt may',

  // Vận tải
  ACV: 'Vận tải', GMD: 'Vận tải', VTP: 'Vận tải', HAH: 'Vận tải',
  VOS: 'Vận tải', SGP: 'Vận tải', VNA: 'Vận tải', SCS: 'Vận tải',
  MVN: 'Vận tải', PHP: 'Vận tải', TCL: 'Vận tải', TMS: 'Vận tải',

  // Bảo hiểm
  BVH: 'Bảo hiểm', BMI: 'Bảo hiểm', PVI: 'Bảo hiểm', BIC: 'Bảo hiểm',
  MIG: 'Bảo hiểm', PTI: 'Bảo hiểm', VNR: 'Bảo hiểm', PRE: 'Bảo hiểm',
  ABI: 'Bảo hiểm',

  // Y tế
  DHG: 'Y tế', IMP: 'Y tế', TRA: 'Y tế', PME: 'Y tế',
  DBD: 'Y tế', DMC: 'Y tế', JVC: 'Y tế', AMV: 'Y tế',
  DP3: 'Y tế', OPC: 'Y tế', TNH: 'Y tế',

  // Khoáng sản
  KSB: 'Khoáng sản', DHA: 'Khoáng sản', BMC: 'Khoáng sản', KSA: 'Khoáng sản',
  DLG: 'Khoáng sản', MTL: 'Khoáng sản',

  // Cao su
  GVR: 'Cao su', PHR: 'Cao su', DPR: 'Cao su', TRC: 'Cao su',
  BRR: 'Cao su', TNC: 'Cao su', HRC: 'Cao su',

  // Phân bón
  DDV: 'Phân bón', PSW: 'Phân bón', LBM: 'Phân bón',

  // Viễn thông
  FOX: 'Viễn thông', VNP: 'Viễn thông', VTC: 'Viễn thông',

  // Thủy sản
  VHC: 'Thủy sản', ANV: 'Thủy sản', IDI: 'Thủy sản', CMX: 'Thủy sản',
  FMC: 'Thủy sản', ACL: 'Thủy sản', ABT: 'Thủy sản', MPC: 'Thủy sản',

  // Ô tô
  SVC: 'Ô tô', HHS: 'Ô tô', TMT: 'Ô tô', HAX: 'Ô tô',
  CTF: 'Ô tô', VEA: 'Ô tô',

  // Nhựa & Bao bì
  BMP: 'Nhựa & Bao bì', NTP: 'Nhựa & Bao bì', AAA: 'Nhựa & Bao bì',
  SPM: 'Nhựa & Bao bì', DAG: 'Nhựa & Bao bì',

  // Gỗ & Nội thất
  PTB: 'Gỗ & Nội thất', GDT: 'Gỗ & Nội thất', TTF: 'Gỗ & Nội thất',
};

export function getIndustry(ticker: string): Industry {
  return INDUSTRY_MAP[ticker] || 'Khác';
}

// All available industries for filter dropdown
export const ALL_INDUSTRIES: Industry[] = [
  'Ngân hàng', 'Bất động sản', 'Chứng khoán', 'Thép',
  'Dầu khí', 'Điện', 'Xây dựng', 'Bán lẻ',
  'Thực phẩm', 'Công nghệ', 'Hóa chất', 'Dệt may',
  'Vận tải', 'Bảo hiểm', 'Y tế', 'Khoáng sản',
  'Cao su', 'Phân bón', 'Viễn thông', 'Thủy sản',
  'Ô tô', 'Nhựa & Bao bì', 'Gỗ & Nội thất', 'Khác',
];
