
/**
 * @fileOverview Llista centralitzada d'articles per a l'Oferta Tèrmic Peralba.
 * Conté l'oferta detallada per a la Casa C, o Resum General de l'Edifici e Proposta Hidrosanitària.
 */

export type QuoteItem = {
    description: string;
    quantity: number;
    unitPrice: number;
    imageDataUrl?: string;
    discount?: number;
    category?: string;
}

export type QuoteTemplate = {
    items: QuoteItem[];
    projectName: string;
    notes?: string;
}

export const PERALBA_ITEMS: QuoteItem[] = [
    // --- MAQUINARIA ---
    { category: "CASA A - MAQUINÀRIA", description: "MITSUBISHI - REFREDADORA BOMBA DE CALOR MEHP-iB-G07 35Y", quantity: 1, unitPrice: 20548, discount: 10 },
    { category: "CASA A - MAQUINÀRIA", description: "ACC. FRED - BROOKLYN BASE SUPORT SBR TERRA 600X95X130 500KG (2U)", quantity: 1, unitPrice: 67.5, discount: 10 },
    { category: "CASA A - MAQUINÀRIA", description: "GENEBRE - MANEGUET ANTIVIBRATORI ROSCA 1 1/2\"", quantity: 2, unitPrice: 32.42, discount: 10 },
    { category: "CASA A - MAQUINÀRIA", description: "BAXI - QUANTUM ECO 32H CIRCULADOR CALEFACCIÓ RACORDS 1 1/4\" MONOF.", quantity: 1, unitPrice: 1310, discount: 10 },
    { category: "CASA A - MAQUINÀRIA", description: "TMM - M-200 VÀLVULA ESFERA F-F 1 1/2\" PALANCA BLAVA", quantity: 2, unitPrice: 46.98, discount: 10 },
    { category: "CASA A - MAQUINÀRIA", description: "GENEBRE - YORK VÀLVULA RETENCIÓ 1 1/2\"", quantity: 1, unitPrice: 28.59, discount: 10 },
    { category: "CASA A - MAQUINÀRIA", description: "BAXI - VÀLVULA ANTIGEL PER BOMBES DE CALOR MONOBLOC 1.1/2\"", quantity: 1, unitPrice: 242, discount: 10 },
    
    // --- DIPOSIT INERCIA ---
    { category: "CASA A - DIPÒSIT INÈRCIA", description: "SUICALSA - DIPÒSIT INÈRCIA INOXIDABLE 6BAR DE 500LTS", quantity: 1, unitPrice: 2606, discount: 10 },
    { category: "CASA A - DIPÒSIT INÈRCIA", description: "BAXI - VASOFLEX VAS EXP. MEM/FIXA CALEFACCIÓ 80LTS 1BAR", quantity: 1, unitPrice: 267, discount: 10 },
    { category: "CASA A - DIPÒSIT INÈRCIA", description: "BAXI - PRESCOMANO VÀLVULA SEGURETAT 3/4\" 3BAR AMB MANÒMETRE", quantity: 1, unitPrice: 46.9, discount: 10 },
    { category: "CASA A - DIPÒSIT INÈRCIA", description: "TMM - M-200 VÀLVULA ESFERA F-F 1 1/2\" PALANCA BLAVA", quantity: 4, unitPrice: 46.98, discount: 10 },
    
    // --- DIPOSIT ACS ---
    { category: "CASA A - DIPÒSIT ACS", description: "MITSUBISHI - VAL. 3 VIES 1 1/4 ACS/CALEFACCIÓ", quantity: 1, unitPrice: 356, discount: 10 },
    { category: "CASA A - DIPÒSIT ACS", description: "MITSUBISHI - KIT 2 SONDES ACS I INÈRCIA", quantity: 1, unitPrice: 70, discount: 10 },
    { category: "CASA A - DIPÒSIT ACS", description: "VIESSMANN - INTERACUMULADOR VITOCELL 100-V CVWB 390 L", quantity: 1, unitPrice: 3761, discount: 10 },
    { category: "CASA A - DIPÒSIT ACS", description: "BAXI - VASOFLEX/S ACS VAS EXP. MEM/FIXA ACS 25LTS 4BAR", quantity: 1, unitPrice: 158, discount: 10 },
    { category: "CASA A - DIPÒSIT ACS", description: "BAXI - FLEXBRANE GRUP SEGURETAT 1\"", quantity: 1, unitPrice: 117, discount: 10 },
    
    // --- RECIRCULACIO ACS ---
    { category: "CASA A - RECIRCULACIÓ ACS", description: "BAXI - SB-50XA CIRCULADOR ACS RACORDS 1\" MONOF.", quantity: 1, unitPrice: 554, discount: 10 },
    { category: "CASA A - RECIRCULACIÓ ACS", description: "TMM - M-200 VÀLVULA ESFERA F-F 1\" PALANCA BLAVA", quantity: 2, unitPrice: 20.41, discount: 10 },
    { category: "CASA A - RECIRCULACIÓ ACS", description: "GENEBRE - YORK VÀLVULA RETENCIÓ 1\"", quantity: 1, unitPrice: 12.86, discount: 10 },
    
    // --- GRUPS HIDRAULICS ---
    { category: "CASA A - GRUPS HIDRÀULICS", description: "AQUAFLEX - COL·LECTOR COL120/4-125", quantity: 1, unitPrice: 609, discount: 10 },
    { category: "CASA A - GRUPS HIDRÀULICS", description: "AQUAFLEX - ANCORATGE PARET COL·LECTOR", quantity: 1, unitPrice: 78, discount: 10 },
    { category: "CASA A - GRUPS HIDRÀULICS", description: "AQUAFLEX - 20355R-P8 GRUP HIDRÀULIC IMPULSIÓ DIRECTE DN25", quantity: 4, unitPrice: 442, discount: 10 },
    
    // --- TERRA RADIANT ---
    { category: "CASA A - TERRA RADIANT", description: "ALB - TR M2 PANELL LLIS ALUMINI ACUTEC H-25MM RT-0,80 ACÚSTIC", quantity: 387.50, unitPrice: 25.20, discount: 10 },
    { category: "CASA A - TERRA RADIANT", description: "ALB - TR MTS. TUB ROTLLE MULTICAPA SUPERFLEX 16X2 (R-500MTS)", quantity: 3500, unitPrice: 1.90, discount: 10 },
    { category: "CASA A - TERRA RADIANT", description: "ALB - TR GRAPA FIXACIÓ TUB A PANELL LLIS 20MM (C-200UD)", quantity: 11000, unitPrice: 0.12, discount: 10 },
    { category: "CASA A - TERRA RADIANT", description: "ALB - TR MTS. ROTLLE CINTA PERIMETRAL 150X8 MM. (R-50MTS)", quantity: 400, unitPrice: 3.26, discount: 10 },
    { category: "CASA A - TERRA RADIANT", description: "ALB - TR TAC PLÀSTIC PER FIXACIÓ PANELLS LLISOS (C-100UD)", quantity: 300, unitPrice: 0.33, discount: 10 },
    { category: "CASA A - TERRA RADIANT", description: "ALB - TR LTS. ADHESIU MORTER S.R. (ENVÀS-10LTS)", quantity: 20, unitPrice: 5.42, discount: 10 },
    
    // --- COLECTORS ---
    { category: "CASA A - COL·LECTORS", description: "ALB - COL·LECTOR PREMUNTAT 11 VIES", quantity: 1, unitPrice: 827.10, discount: 10 },
    { category: "CASA A - COL·LECTORS", description: "ALB - COL·LECTOR ALB ULTRACOMPACTE 10 VIES", quantity: 3, unitPrice: 772.07, discount: 10 },
    
    // --- TERMOSTATS ---
    { category: "CASA A - TERMÒSTATS", description: "ALB- TERMÒSTAT DIGITAL PROGRAMABLE AMB WIFI DIGITAL", quantity: 10, unitPrice: 90.00, discount: 10 },
    { category: "CASA A - TERMÒSTATS", description: "ALB - CAPÇAL ELÈCTRIC 230V NC SENSE MICRO 2 FILS", quantity: 41, unitPrice: 38.08, discount: 10 },
    { category: "CASA A - TERMÒSTATS", description: "ALB - MÒDUL CONNEXIÓ PER 8 TERMÒSTATS", quantity: 4, unitPrice: 134.97, discount: 10 }
];

export const BUILDING_SUMMARY_ITEMS: QuoteItem[] = [
    { category: "CASA A - INSTAL·LACIÓ ELÈCTRICA", description: "Execució de la instal·lació elèctrica completa Habitatge A", quantity: 1, unitPrice: 46805, discount: 0 },
    { category: "CASA B - INSTAL·LACIÓ ELÈCTRICA", description: "Execució de la instal·lació elèctrica completa Habitatge B", quantity: 1, unitPrice: 43654, discount: 0 },
    { category: "CASA C - INSTAL·LACIÓ ELÈCTRICA", description: "Execució de la instal·lació elèctrica completa Habitatge C", quantity: 1, unitPrice: 42366, discount: 0 },
    { category: "GARATGE", description: "Execució de la instal·lació elèctrica completa Garatge (-2)", quantity: 1, unitPrice: 39445, discount: 0 }
];

export const HIDROSANITARIA_ITEMS: QuoteItem[] = [
    { category: "HIDROSANITÀRIA A", description: "Execució Instal·lació Hidrosanitària completa Habitatge A", quantity: 1, unitPrice: 84500, discount: 0 },
    { category: "HIDROSANITÀRIA B", description: "Execució Instal·lació Hidrosanitària completa Habitatge B", quantity: 1, unitPrice: 84500, discount: 0 },
    { category: "HIDROSANITÀRIA C", description: "Execució Instal·lació Hidrosanitària completa Habitatge C", quantity: 1, unitPrice: 84500, discount: 0 },
    { category: "HIDROSANITÀRIA GARATGE", description: "Execució Instal·lació Hidrosanitària Garatge (-2)", quantity: 1, unitPrice: 6500, discount: 0 }
];

export const HIDROSANITARIA_NOTES = `30% a la signatura del contracte
40% amb instal·lacions executades (abans de tancament de paraments)
20% en muntatge d’aparells sanitaris
10% a la finalització i lliurament amb proves realitzades

El termini d'execució depèn de diversos factors i, per tant, no podem donar un termini fix.`;

export const DEFAULT_NOTES = `40% per iniciar el treball i la resta es pagarà mensualment a combinar.

El termini d'execució depèn de diversos factors i, per tant, no podem donar un termini fix.`;
