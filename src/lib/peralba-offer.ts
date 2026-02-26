
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
}

export type QuoteTemplate = {
    items: QuoteItem[];
    projectName: string;
    notes?: string;
}

export const PERALBA_ITEMS: QuoteItem[] = [
    // --- SECÇÃO INICIAL ---
    { description: "HABITATGE ANDORRA - 342mts2 - CASA C", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "AEROTERMIA MONOBLOC 34kw calefaccio", quantity: 1, unitPrice: 0, discount: 0 },
    
    // --- MAQUINARIA ---
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "MAQUINÀRIA", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "MSHMEHPIBG0735Y MITSUBISHI - REFREDADORA BOMBA DE CALOR MEHP-iB-G07 35Y", quantity: 1, unitPrice: 20548, discount: 10 },
    { description: "*la màquina inclou filtre i interruptor de flux", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "CLT20036000 ACC. FRED - BROOKLYN BASE SUPORT SBR TERRA 600X95X130 500KG (2U)", quantity: 1, unitPrice: 67.5, discount: 10 },
    { description: "GNB283008 GENEBRE - MANEGUET ANTIVIBRATORI ROSCA 1 1/2\"", quantity: 2, unitPrice: 32.42, discount: 10 },
    { description: "BAX7504412 BAXI - QUANTUM ECO 32H CIRCULADOR CALEFACCIÓ RACORDS 1 1/4\" MONOF.", quantity: 1, unitPrice: 1310, discount: 10 },
    { description: "TUC0201827A TMM - M-200 VÀLVULA ESFERA F-F 1 1/2\" PALANCA BLAVA", quantity: 2, unitPrice: 46.98, discount: 10 },
    { description: "GNB10307 GENEBRE - YORK VÀLVULA RETENCIÓ 1 1/2\"", quantity: 1, unitPrice: 28.59, discount: 10 },
    { description: "BAX7841698 BAXI - VÀLVULA ANTIGEL PER BOMBES DE CALOR MONOBLOC 1.1/2\"", quantity: 1, unitPrice: 242, discount: 10 },
    
    // --- DIPOSIT INERCIA ---
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "DIPÒSIT INÈRCIA", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "SUIDI050X06RG SUICALSA - DIPÒSIT INÈRCIA INOXIDABLE 6BAR DE 500LTS", quantity: 1, unitPrice: 2606, discount: 10 },
    { description: "BAX950053011 BAXI - VASOFLEX VAS EXP. MEM/FIXA CALEFACCIÓ 80LTS 1BAR", quantity: 1, unitPrice: 267, discount: 10 },
    { description: "BAX195230003 BAXI - PRESCOMANO VÀLVULA SEGURETAT 3/4\" 3BAR AMB MANÒMETRE", quantity: 1, unitPrice: 46.9, discount: 10 },
    { description: "TUC0201827A TMM - M-200 VÀLVULA ESFERA F-F 1 1/2\" PALANCA BLAVA", quantity: 4, unitPrice: 46.98, discount: 10 },
    
    // --- DIPOSIT ACS ---
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "DIPÒSIT ACS 390lts", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "MITSUBISHI - VAL. 3 VIES 1 1/4 ACS/CALEFACCIÓ", quantity: 1, unitPrice: 356, discount: 10 },
    { description: "MITSUBISHI - KIT 2 SONDES ACS I INÈRCIA", quantity: 1, unitPrice: 70, discount: 10 },
    { description: "VSMZ026497 VIESSMANN - INTERACUMULADOR VITOCELL 100-V CVWB 390 L", quantity: 1, unitPrice: 3761, discount: 10 },
    { description: "BAX195200005 BAXI - VASOFLEX/S ACS VAS EXP. MEM/FIXA ACS 25LTS 4BAR", quantity: 1, unitPrice: 158, discount: 10 },
    { description: "BAX195230007 BAXI - FLEXBRANE GRUP SEGURETAT 1\"", quantity: 1, unitPrice: 117, discount: 10 },
    
    // --- RECIRCULACIO ACS ---
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "RECIRCULACIÓ ACS", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "BAX953035021 BAXI - SB-50XA CIRCULADOR ACS RACORDS 1\" MONOF.", quantity: 1, unitPrice: 554, discount: 10 },
    { description: "TMM0201825A TMM - M-200 VÀLVULA ESFERA F-F 1\" PALANCA BLAVA", quantity: 2, unitPrice: 20.41, discount: 10 },
    { description: "GNB10305 GENEBRE - YORK VÀLVULA RETENCIÓ 1\"", quantity: 1, unitPrice: 12.86, discount: 10 },
    
    // --- GRUPS HIDRAULICS ---
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "GRUPS HIDRÀULICS DIRECTES", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "AQUAFLEX - COL·LECTOR COL120/4-125", quantity: 1, unitPrice: 609, discount: 10 },
    { description: "AQUAFLEX - ANCORATGE PARET COL·LECTOR", quantity: 1, unitPrice: 78, discount: 10 },
    { description: "AQU20355RP8 AQUAFLEX - 20355R-P8 GRUP HIDRÀULIC IMPULSIÓ DIRECTE DN25", quantity: 4, unitPrice: 442, discount: 10 },
    
    // --- CASA C - ANDORRA ---
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "PANELL LLIS (CASA C - 342m2)", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "ALB18735 ALB - TR M2 PANELL LLIS ALUMINI ACUTEC H-25MM RT-0,80 ACÚSTIC", quantity: 350.00, unitPrice: 25.20, discount: 10 },
    { description: "ALB18062 ALB - TR MTS. TUB ROTLLE MULTICAPA SUPERFLEX 16X2 (R-500MTS)", quantity: 3500, unitPrice: 1.90, discount: 10 },
    { description: "ALB18687 ALB - TR GRAPA FIXACIÓ TUB A PANELL LLIS 20MM (C-200UD)", quantity: 11000, unitPrice: 0.12, discount: 10 },
    { description: "ALB18690 ALB - TR MTS. ROTLLE CINTA PERIMETRAL 150X8 MM. (R-50MTS)", quantity: 350, unitPrice: 3.26, discount: 10 },
    { description: "ALB18836 ALB - TR TAC PLÀSTIC PER FIXACIÓ PANELLS LLISOS (C-100UD)", quantity: 300, unitPrice: 0.33, discount: 10 },
    { description: "ALB18670 ALB - TR LTS. ADHESIU MORTER S.R. (ENVÀS-10LTS)", quantity: 20, unitPrice: 5.42, discount: 10 },
    
    // --- COLECTORS ---
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "COL·LECTORS", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "ALBPD1020816 ALB - COL·LECTOR PREMUNTAT ULTRACOMPACTE 8 SORTIDES", quantity: 1, unitPrice: 649.56, discount: 10 },
    { description: "ALBPD1021016 ALB - COL·LECTOR ALB ULTRACOMPACTE 10 VIES", quantity: 2, unitPrice: 772.07, discount: 10 },
    { description: "ALBPD1121116 ALB - COL·LECTOR PREMUNTAT 11 VIES", quantity: 1, unitPrice: 827.10, discount: 10 },
    
    // --- TERMOSTATS ---
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "TERMÒSTATS", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "ALB23623 ALB- TERMÒSTAT DIGITAL PROGRAMABLE AMB WIFI DIGITAL", quantity: 10, unitPrice: 90.00, discount: 10 },
    { description: "ALB01561 ALB - CAPÇAL ELÈCTRIC 230V NC SENSE MICRO 2 FILS", quantity: 39, unitPrice: 38.08, discount: 10 },
    { description: "ALB23232 ALB - MÒDUL CONNEXIÓ PER 8 TERMÒSTATS", quantity: 4, unitPrice: 134.97, discount: 10 }
];

export const BUILDING_SUMMARY_ITEMS: QuoteItem[] = [
    { description: "MEMÒRIA TÈCNICA I RESUM ECONÒMIC - EDIFICI", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Habitatges (A, B, C) + Garatge (-2) + Quadres + Mecanismes Siemens + Xarxa RJ45", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    
    { description: "🔷 1. INSTAL·LACIÓ ELÈCTRICA – HABITATGES (A, B, C)", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Execució de la instal·lació elèctrica completa en baixa tensió per a cada habitatge (plantes -1, 0 i 1), incloent:", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Tuberies encastades, Caixes de mecanismes i derivació, Conductors de coure aïllats,", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Quadres elèctrics (1 principal + 3 subquadres), Mecanismes Siemens Iris negre mate,", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Xarxa estructurada RJ45, Alimentació dedicada per a aerotèrmia trifàsica 40 kW,", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Sistema de terra i equipotencial, Assajos finals i certificació BT.", quantity: 1, unitPrice: 0, discount: 0 },
    
    { description: "🔷 2. QUADRES ELÈCTRICS – HABITATGES", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Inclou Quadre General (QG) amb protecció magnetotèrmica, diferencial, DPS i barraments,", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "més 3 Subquadres (un per planta) amb diferencial propi i reserva per a ampliacions (~15%).", quantity: 1, unitPrice: 0, discount: 0 },
    
    { description: "🔷 3. MECANISMES – SIEMENS IRIS (NEGRE MATE)", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Línia decorativa completa: Endolls 230V Schuko 16A amb obturadors, Interruptors,", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Commutadors, Pulsadors i Preses RJ45 Cat6/6A integrades en la mateixa línia estètica.", quantity: 1, unitPrice: 0, discount: 0 },
    
    { description: "🔷 4. XARXA ESTRUCTURADA (PER HABITATGE)", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "15 punts RJ45 distribuïts, Cable Cat6/6A, Mini-rack tècnic, Patch panel i tests.", quantity: 1, unitPrice: 0, discount: 0 },
    
    { description: "🔷 5. AEROTÈRMIA TRIFÀSICA 40 kW (PER HABITATGE)", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Només part elèctrica: Línia dedicada trifàsica, Proteccions adequades i cablatge.", quantity: 1, unitPrice: 0, discount: 0 },
    
    { description: "🔷 6. GARATGE COMÚ (-2)", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Instal·lació independent: Quadre propi, Il·luminació tècnica, Sistema d'Emergència", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Centralitzat amb bateries, Endolls IP55 perimetrals i alimentació Porta Automàtica.", quantity: 1, unitPrice: 0, discount: 0 },
    
    { description: "🔷 7. SISTEMA DE TERRA", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Barrament principal per habitatge, Connexió equipotencial en banys i continuïtàt general.", quantity: 1, unitPrice: 0, discount: 0 },
    
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "🔷 8. RESUM ECONÒMIC D'EXECUCIÓ", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Instal·lació elèctrica completa Habitatge A", quantity: 1, unitPrice: 46805, discount: 0 },
    { description: "Instal·lació elèctrica completa Habitatge B", quantity: 1, unitPrice: 43654, discount: 0 },
    { description: "Instal·lació elèctrica completa Habitatge C", quantity: 1, unitPrice: 42366, discount: 0 },
    { description: "Instal·lació elèctrica completa Garatge (-2)", quantity: 1, unitPrice: 39445, discount: 0 },
    
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "VALOR TOTAL ESTIMAT (Sense IGI)", quantity: 1, unitPrice: 0, discount: 0 }
];

export const HIDROSANITARIA_ITEMS: QuoteItem[] = [
    { description: "📄 PROPOSTA ECONÒMICA - INSTAL·LACIONS HIDROSANITÀRIES", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Vivendes A, B i C + Garatge", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "1️⃣ OBJECTE", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Execució completa de les instal·lacions d'aigua freda, aigua calenta sanitària (AQS), xarxa d'evacuació d'aigües residuals, subministrament i muntatge d'aparells sanitaris, mobles i aixeteria segons especificacions acordades.", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "2️⃣ DESCRIPCIÓ TÈCNICA DELS TREBALLS (PER VIVENDA)", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "🔹 8 Banys per vivenda:", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "• 8 sanitaris suspesos Roca One amb bastidors i cisterna encastada.", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "• Mobles: 1 Coverlam Traverti (suite) i 7 Alpine Roca.", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "• Aixeteria hansgrohe Logis i conjunts Vernis Shape 230 EcoSmart.", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "• Plats de dutxa: 1 Coverlam (suite) i 7 Roca Terran.", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "• 4 Bidets per vivenda amb aixeta hansgrohe Logis.", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "• 1 Banyera d'hidromassatge per vivenda amb aixeta Roca Evolution.", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "🔹 Cuina i Safareig:", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "• Punts AF/AQS per aigüera, rentavaixelles i rentadora.", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "• Safareig tècnic i xarxa de desguàs Ø50.", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "3️⃣ XARXES D'INSTAL·LACIÓ", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "• Tub multicapa insonoritzat, aïllament tèrmic i col·lectors per planta.", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "• Connexió hidràulica a aerotèrmia (sense màquina).", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "• Proves de pressió i estanquitat realitzades.", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "4️⃣ GARATGE (-2)", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "• 1 punt d'aigua de manteniment i 2 embornals sifònics.", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "5️⃣ IMPORT ECONÒMIC D'EXECUCIÓ", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "Execució Instal·lació Hidrosanitària completa Habitatge A", quantity: 1, unitPrice: 84500, discount: 0 },
    { description: "Execució Instal·lació Hidrosanitària completa Habitatge B", quantity: 1, unitPrice: 84500, discount: 0 },
    { description: "Execució Instal·lació Hidrosanitària completa Habitatge C", quantity: 1, unitPrice: 84500, discount: 0 },
    { description: "Execució Instal·lació Hidrosanitària Garatge (-2)", quantity: 1, unitPrice: 6500, discount: 0 },
    { description: "", quantity: 1, unitPrice: 0, discount: 0 },
    { description: "💰 IMPORT TOTAL CONTRACTE (Sense IGI)", quantity: 1, unitPrice: 0, discount: 0 }
];

export const HIDROSANITARIA_NOTES = `30% a la signatura del contracte
40% amb instal·lacions executades (abans de tancament de paraments)
20% en muntatge d’aparells sanitaris
10% a la finalització i lliurament amb proves realitzades`;

export const DEFAULT_NOTES = `40% per iniciar el treball i la resta es pagarà mensualment a combinar.`;
