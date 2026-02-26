/**
 * @fileOverview Lista centralizada de artigos para a Oferta Tèrmic Peralba.
 * Contém todos os itens solicitados para Maquinaria, Depósitos, Casa A e Termostatos.
 */

export type QuoteItem = {
    description: string;
    quantity: number;
    unitPrice: number;
    imageDataUrl?: string;
    discount?: number;
}

export const PERALBA_ITEMS: QuoteItem[] = [
    // --- SECÇÃO INICIAL ---
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "HABITATGE CASA A - 416mts2 terra radiant", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "HABITATGE CASA B - 383mts2 terra radiant", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "AEROTERMIA MONOBLOC 40kw calefaccio", quantity: 1, unitPrice: 0, discount: 0 },
    
    // --- MAQUINARIA ---
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "MAQUINARIA", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "MSHMEHPIBG0740Y MITSUBISHI - REFREDADORA BOMBA DE CALOR MEHP-iB-G07 40Y", quantity: 1, unitPrice: 23761, discount: 10 },
    { description: "*maquina inclou filtre i interruptor de fluxe", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "CLT20036000 ACC. FRED - BROOKLYN BASE SUPORT SBR TERRA 600X95X130 500KG (2U)", quantity: 1, unitPrice: 67.5, discount: 10 },
    { description: "GNB283008 GENEBRE - MANEGUET ANTIVIBRATORI ROSCA 1 1/2\"", quantity: 2, unitPrice: 32.42, discount: 10 },
    { description: "BAX7504412 BAXI - QUANTUM ECO 32H CIRCULADOR CALEFACCIO RACORDS 1 1/4\" MONOF.", quantity: 1, unitPrice: 1310, discount: 10 },
    { description: "TUC0201827A TMM - M-200 VALVULA ESFERA F-F 1 1/2\" PALANCA BLAVA", quantity: 2, unitPrice: 46.98, discount: 10 },
    { description: "GNB10307 GENEBRE - YORK VALVULA RETENCIO 1 1/2\"", quantity: 1, unitPrice: 28.59, discount: 10 },
    { description: "BAX7841698 BAXI - VALVULA ANTIGEL PER BOMBES DE CALOR MONOBLOC 1.1/2\"", quantity: 1, unitPrice: 242, discount: 10 },
    
    // --- DIPOSIT INERCIA ---
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "DIPOSIT INERCIA", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "SUIDI050X06RG SUICALSA - DIPOSIT INERCIA INOXIDABLE 6BAR DE 500LTS", quantity: 1, unitPrice: 2606, discount: 10 },
    { description: "BAX950053011 BAXI - VASOFLEX VAS EXP. MEM/FIXA CALEFACCIO 80LTS 1BAR", quantity: 1, unitPrice: 267, discount: 10 },
    { description: "BAX195230003 BAXI - PRESCOMANO VALVULA SEGURETAT 3/4\" 3BAR A/MANOMETRE", quantity: 1, unitPrice: 46.9, discount: 10 },
    { description: "TUC0201827A TMM - M-200 VALVULA ESFERA F-F 1 1/2\" PALANCA BLAVA", quantity: 4, unitPrice: 46.98, discount: 10 },
    
    // --- DIPOSIT ACS ---
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "DIPOSIT ACS 390lts", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "MITSUBISHI - VAL. 3 VIES 1 1/4 ACS/CALEFACCIO", quantity: 1, unitPrice: 356, discount: 10 },
    { description: "MITSUBISHI - KIT 2 SONDES ACS I INERCIA", quantity: 1, unitPrice: 70, discount: 10 },
    { description: "VSMZ026497 VIESSMANN - INTERACUMULADOR VITOCELL 100-V CVWB 390 L", quantity: 1, unitPrice: 3761, discount: 10 },
    { description: "BAX195200005 BAXI - VASOFLEX/S ACS VAS EXP. MEM/FIXA ACS 25LTS 4BAR", quantity: 1, unitPrice: 158, discount: 10 },
    { description: "BAX195230007 BAXI - FLEXBRANE GRUP SEGURETAT 1\"", quantity: 1, unitPrice: 117, discount: 10 },
    
    // --- RECIRCULACIO ACS ---
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "RECIRCULACIO ACS", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "BAX953035021 BAXI - SB-50XA CIRCULADOR ACS RACORDS 1\" MONOF.", quantity: 1, unitPrice: 554, discount: 10 },
    { description: "TMM0201825A TMM - M-200 VALVULA ESFERA F-F 1\" PALANCA BLAVA", quantity: 2, unitPrice: 20.41, discount: 10 },
    { description: "GNB10305 GENEBRE - YORK VALVULA RETENCIO 1\"", quantity: 1, unitPrice: 12.86, discount: 10 },
    
    // --- GRUPS HIDRAULICS ---
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "GRUPS HIDRAULICS DIRECTES", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "AQUAFLEX - COLECTOR 5M3/H 5 SORTIDES LONG.2MTS", quantity: 1, unitPrice: 747, discount: 10 },
    { description: "AQUAFLEX - ANCLATGE PARET COLECTOR", quantity: 1, unitPrice: 78, discount: 10 },
    { description: "AQU20355RP8 AQUAFLEX - 20355R-P8 GRUP HIDRAULIC IMPULSIO DIRECTE DN25", quantity: 5, unitPrice: 442, discount: 10 },
    
    // --- CASA A - ANDORRA ---
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "HABITATGE ANDORRA - 416mts2 - CASA A", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "PANELL LLIS", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "ALB18735 ALB - TR M2 PANELL LLIS ALUMINI ACUTEC H-25MM RT-0,80 ACÚSTIC (C-12M2)", quantity: 425, unitPrice: 25.20, discount: 10 },
    { description: "ALB18062 ALB - TR MTS. TUB ROTLLE MULTICAPA SUPERFLEX 16X2 (R-500MTS)", quantity: 4000, unitPrice: 1.90, discount: 10 },
    { description: "ALB18061 ALB - TR MTS. TUB ROTLLE MULTICAPA SUPERFLEX 16X2 (R-200MTS)", quantity: 200, unitPrice: 1.90, discount: 10 },
    { description: "ALB18687 ALB - TR GRAPA FIXACIO TUB A PANELL LLIS 20MM (C-200UD)", quantity: 12000, unitPrice: 0.12, discount: 10 },
    { description: "ALB18690 ALB - TR MTS. ROTLLE CINTA PERIMETRAL 150X8 MM. (R-50MTS)", quantity: 450, unitPrice: 3.26, discount: 10 },
    { description: "ALB18836 ALB - TR TAC PLÀSTIC PER FIXACIÓ PANELLS LLISOS (C-100UD)", quantity: 300, unitPrice: 0.33, discount: 10 },
    { description: "ALB18670 ALB - TR LTS. ADHITIU MORTER S.R. (ENVAS-10LTS)", quantity: 20, unitPrice: 5.42, discount: 10 },
    
    // --- COLECTORS ---
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "COLECTORS 8, 12, 12, 11, 10", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "ALBPD1020816 ALB - COL·LECTOR PREMUNTAT ULTRACOMPACTE \"2+3\" 8 SORT. A/CABALIMETRE A/CAIXA (TUB 16X2)", quantity: 1, unitPrice: 649.56, discount: 10 },
    { description: "ALBPD1121216 ALB - COLECTOR PREMUNTAT ULTRACOMPACTE 2+3\" DE 12 VIES", quantity: 2, unitPrice: 885.83, discount: 10 },
    { description: "ALBPD1121116 ALB - COL·LECTOR PREMUNTAT 11 VIES", quantity: 1, unitPrice: 827.10, discount: 10 },
    { description: "ALBPD1021016 ALB - COL.LECTOR ALB ULTRACOMPACTE 2+3 EN CAIXA ALB 10 VIES BICONOS 16", quantity: 1, unitPrice: 772.07, discount: 10 },
    
    // --- TERMOSTATS ---
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "PER ZONES - CONCRETAR NUMERO DE TERMOSTATS", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "ALB23623 ALB- TERMOSTAT DIGITAL PROGRAMABLE AMB WIFI DIGITAL", quantity: 15, unitPrice: 90.00, discount: 10 },
    { description: "ALB23232 ALB - MODUL CONNEXIO PER 8 TERMOSTATS", quantity: 5, unitPrice: 134.97, discount: 10 },
    { description: "ALB01561 ALB - CAPÇAL ELÈCTRIC 230V NC SENSE MICRO 2FILS", quantity: 53, unitPrice: 38.08, discount: 10 }
];
