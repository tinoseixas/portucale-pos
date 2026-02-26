/**
 * @fileOverview Lista centralizada de artigos para a Oferta Tèrmic Peralba.
 * Contém a oferta detalhada para a Casa C e o Resumo Geral do Edifício.
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
    { description: "HABITATGE ANDORRA - 383mts2 - CASA B", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "AEROTERMIA MONOBLOC 34kw calefaccio", quantity: 1, unitPrice: 0, discount: 0 },
    
    // --- MAQUINARIA ---
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "MAQUINARIA", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "MSHMEHPIBG0735Y MITSUBISHI - REFREDADORA BOMBA DE CALOR MEHP-iB-G07 35Y", quantity: 1, unitPrice: 20548, discount: 10 },
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
    { description: "AQUAFLEX - COLECTOR COL120/4-125", quantity: 1, unitPrice: 609, discount: 10 },
    { description: "AQUAFLEX - ANCLATGE PARET COLECTOR", quantity: 1, unitPrice: 78, discount: 10 },
    { description: "AQU20355RP8 AQUAFLEX - 20355R-P8 GRUP HIDRAULIC IMPULSIO DIRECTE DN25", quantity: 4, unitPrice: 442, discount: 10 },
    
    // --- CASA B - ANDORRA ---
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "PANELL LLIS", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "ALB18735 ALB - TR M2 PANELL LLIS ALUMINI ACUTEC H-25MM RT-0,80 ACÚSTIC", quantity: 387.50, unitPrice: 25.20, discount: 10 },
    { description: "ALB18062 ALB - TR MTS. TUB ROTLLE MULTICAPA SUPERFLEX 16X2 (R-500MTS)", quantity: 3500, unitPrice: 1.90, discount: 10 },
    { description: "ALB18687 ALB - TR GRAPA FIXACIO TUB A PANELL LLIS 20MM (C-200UD)", quantity: 11000, unitPrice: 0.12, discount: 10 },
    { description: "ALB18690 ALB - TR MTS. ROTLLE CINTA PERIMETRAL 150X8 MM. (R-50MTS)", quantity: 400, unitPrice: 3.26, discount: 10 },
    { description: "ALB18836 ALB - TR TAC PLÀSTIC PER FIXACIÓ PANELLS LLISOS (C-100UD)", quantity: 300, unitPrice: 0.33, discount: 10 },
    { description: "ALB18670 ALB - TR LTS. ADHITIU MORTER S.R. (ENVAS-10LTS)", quantity: 20, unitPrice: 5.42, discount: 10 },
    
    // --- COLECTORS ---
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "COLECTORS", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "ALBPD1121116 ALB - COL·LECTOR PREMUNTAT 11 VIES", quantity: 1, unitPrice: 827.10, discount: 10 },
    { description: "ALBPD1021016 ALB - COL.LECTOR ALB ULTRACOMPACTE 10 VIES", quantity: 3, unitPrice: 772.07, discount: 10 },
    
    // --- TERMOSTATS ---
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "TERMOSTATS", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "ALB23623 ALB- TERMOSTAT DIGITAL PROGRAMABLE AMB WIFI DIGITAL", quantity: 10, unitPrice: 90.00, discount: 10 },
    { description: "ALB01561 ALB - CAPÇAL ELÈCTRIC 230V NC SENSE MICRO 2FILS", quantity: 41, unitPrice: 38.08, discount: 10 },
    { description: "ALB23232 ALB - MODUL CONNEXIO PER 8 TERMOSTATS", quantity: 4, unitPrice: 134.97, discount: 10 }
];

export const BUILDING_SUMMARY_ITEMS: QuoteItem[] = [
    { description: "MEMÒRIA TÈCNICA I RESUM ECONÒMIC - EDIFICI", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Vivendas (A, B, C) + Garagem (-2) + Quadros + Mecanismos Siemens + Rede RJ45", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    
    { description: "🔷 1. INSTALAÇÃO ELÉTRICA – VIVENDAS (A, B, C)", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Execução completa em baixa tensão (pisos -1, 0, 1): Tubagens embebidas, cablagem,", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Quadros elétricos, Siemens Iris negro mate, Rede RJ45, Aerotermia trifásica 40kW,", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Sistema de terra e equipotencial, Ensaios finais e certificação BT.", quantity: 1, unitPrice: 0, discount: 0 },
    
    { description: "🔷 2. QUADROS ELÉTRICOS – VIVENDAS", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Inclui Quadro Geral (QG) com proteção magnetotérmica, diferencial, DPS e barramentos,", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "mais 3 Subquadros (um por piso) com diferencial próprio e reserva para ampliações (~15%).", quantity: 1, unitPrice: 0, discount: 0 },
    
    { description: "🔷 3. MECANISMOS – SIEMENS IRIS (NEGRO MATE)", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Linha decorativa completa: Tomadas 230V Schuko 16A com obturadores, Interruptores,", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Comutadores, Pulsadores e Tomadas RJ45 Cat6/6A integradas na mesma linha estética.", quantity: 1, unitPrice: 0, discount: 0 },
    
    { description: "🔷 4. REDE ESTRUTURADA (POR VIVENDA)", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "15 pontos RJ45 distribuídos, Cabo Cat6/6A, Mini-rack técnico, Patch panel e testes.", quantity: 1, unitPrice: 0, discount: 0 },
    
    { description: "🔷 5. AEROTERMIA TRIFÁSICA 40 kW (POR VIVENDA)", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Apenas parte elétrica: Linha dedicada trifásica, Proteções adequadas e cablagem.", quantity: 1, unitPrice: 0, discount: 0 },
    
    { description: "🔷 6. GARAGEM COMUM (-2)", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Instalação independente: Quadro próprio, Iluminação técnica, Sistema de Emergência", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Centralizado com baterias, Tomadas IP55 perimetrais e alimentação Portão Automático.", quantity: 1, unitPrice: 0, discount: 0 },
    
    { description: "🔷 7. SISTEMA DE TERRA", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Barramento principal por vivenda, Ligação equipotencial em banhos e continuidade geral.", quantity: 1, unitPrice: 0, discount: 0 },
    
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "🔷 8. MÃO DE OBRA E EXECUÇÃO (40 €/h)", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Instal·lació completa Casa A", quantity: 1, unitPrice: 40700, discount: 0 },
    { description: "Instal·lació completa Casa B", quantity: 1, unitPrice: 37960, discount: 0 },
    { description: "Instal·lació completa Casa C", quantity: 1, unitPrice: 36840, discount: 0 },
    { description: "Instal·lació completa Garagem (-2)", quantity: 1, unitPrice: 34300, discount: 0 },
    
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "🔷 9. IMPREVISTOS (15%)", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Cobre ajustes em obra, alterações de layout e aumentos de secção.", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Imprevistos Casa A (15%)", quantity: 1, unitPrice: 6105, discount: 0 },
    { description: "Imprevistos Casa B (15%)", quantity: 1, unitPrice: 5694, discount: 0 },
    { description: "Imprevistos Casa C (15%)", quantity: 1, unitPrice: 5526, discount: 0 },
    { description: "Imprevistos Garagem (15%)", quantity: 1, unitPrice: 5145, discount: 0 },
    
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "VALOR TOTAL ESTIMAT (Sense IGI)", quantity: 1, unitPrice: 0, discount: 0 }
];
