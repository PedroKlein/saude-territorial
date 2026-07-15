/**
 * Synthetic patient data for development and visual testing.
 *
 * LGPD: ALL data here is 100% synthetic. Names generated with faker patterns,
 * CNS numbers are random 15-digit strings, addresses are real streets but
 * patients are fictional.
 *
 * This file provides demo data for ALL layers so every feature can be
 * visually tested without a connected Google Sheet.
 */

import type { LayerId } from "@/config/layers.config";

export interface DemoPatient {
  cns: string;
  nomeCompleto: string;
  dataNascimento: string;
  idade: number;
  telefone: string;
  rua: string;
  numero: string;
  lat: number;
  lng: number;
  microarea: string;
  dataUltimaAtualizacao: string;
  [key: string]: unknown;
}

// Real streets near US Moab Caldas (from extensao-gat4 curated data)
const STREETS = [
  { nome: "Avenida Moab Caldas", lat: -30.0693, lng: -51.2168, ma: "MA1" },
  { nome: "Rua Gabriel Fialho Camargo", lat: -30.0691, lng: -51.2159, ma: "MA1" },
  { nome: "Rua Abelardo Marquês", lat: -30.0709, lng: -51.2162, ma: "MA1" },
  { nome: "Rua Januário Scalzilli", lat: -30.0719, lng: -51.2160, ma: "MA2" },
  { nome: "Rua Felipe Weimann", lat: -30.0736, lng: -51.2172, ma: "MA2" },
  { nome: "Rua Professor Manoel Lobato", lat: -30.0718, lng: -51.2179, ma: "MA2" },
  { nome: "Avenida Deputado Aramy Silva", lat: -30.0741, lng: -51.2181, ma: "MA2" },
  { nome: "Rua Nossa Senhora do Brasil", lat: -30.0704, lng: -51.2226, ma: "MA3" },
  { nome: "Rua Mutualidade", lat: -30.0717, lng: -51.2252, ma: "MA3" },
  { nome: "Rua Corrêa Lima", lat: -30.0701, lng: -51.2265, ma: "MA3" },
  { nome: "Rua Cruzeiro do Sul", lat: -30.0770, lng: -51.2239, ma: "MA4" },
  { nome: "Rua Aracy de Azevedo José", lat: -30.0779, lng: -51.2233, ma: "MA4" },
  { nome: "Avenida Joracy Camargo", lat: -30.0767, lng: -51.2214, ma: "MA4" },
  { nome: "Rua Flores", lat: -30.0753, lng: -51.2245, ma: "MA5" },
  { nome: "Rua Caixa Econômica", lat: -30.0738, lng: -51.2228, ma: "MA5" },
];

function offset(): number {
  return (Math.random() - 0.5) * 0.0004;
}

function randomCns(): string {
  return String(Math.floor(100000000000000 + Math.random() * 899999999999999));
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function randomStreet() {
  const s = STREETS[Math.floor(Math.random() * STREETS.length)];
  return { rua: s.nome, microarea: s.ma, lat: s.lat + offset(), lng: s.lng + offset() };
}

// ─────────────────────────────────────────────────────────────────
// GESTANTES — 12 patients with various urgency scenarios
// ─────────────────────────────────────────────────────────────────
const gestantes: DemoPatient[] = [
  // Critical: overdue consultation (>30 days), high risk
  { cns: "100000000000001", nomeCompleto: "Ana Beatriz Oliveira", dataNascimento: "15/03/1998", idade: 28, telefone: "51 998001001", rua: "Avenida Moab Caldas", numero: "220", lat: -30.0695 + offset(), lng: -51.2170 + offset(), microarea: "MA1", dataUltimaAtualizacao: daysAgo(45), dum: "10/01/2026", dpp: "17/10/2026", risco: "Alto", ig: 24 },
  // Critical: IG > 40 weeks
  { cns: "100000000000002", nomeCompleto: "Carla Souza Mendes", dataNascimento: "22/07/1995", idade: 31, telefone: "51 998001002", rua: "Rua Gabriel Fialho Camargo", numero: "88", lat: -30.0692 + offset(), lng: -51.2160 + offset(), microarea: "MA1", dataUltimaAtualizacao: daysAgo(5), dum: "01/09/2025", dpp: "08/06/2026", risco: "Alto", ig: 42 },
  // Attention: missing recent update (15 days)
  { cns: "100000000000003", nomeCompleto: "Daniela Ferreira Lima", dataNascimento: "03/11/2001", idade: 24, telefone: "51 998001003", rua: "Rua Januário Scalzilli", numero: "45", lat: -30.0720 + offset(), lng: -51.2161 + offset(), microarea: "MA2", dataUltimaAtualizacao: daysAgo(18), dum: "15/03/2026", dpp: "20/12/2026", risco: "Habitual", ig: 16 },
  // Normal: recent update, low risk
  { cns: "100000000000004", nomeCompleto: "Eduarda Santos Rocha", dataNascimento: "19/05/1999", idade: 27, telefone: "51 998001004", rua: "Rua Felipe Weimann", numero: "150", lat: -30.0737 + offset(), lng: -51.2173 + offset(), microarea: "MA2", dataUltimaAtualizacao: daysAgo(3), dum: "20/04/2026", dpp: "25/01/2027", risco: "Habitual", ig: 12 },
  // Normal
  { cns: "100000000000005", nomeCompleto: "Fernanda Costa Alves", dataNascimento: "28/01/1993", idade: 33, telefone: "51 998001005", rua: "Rua Nossa Senhora do Brasil", numero: "310", lat: -30.0705 + offset(), lng: -51.2227 + offset(), microarea: "MA3", dataUltimaAtualizacao: daysAgo(7), dum: "01/05/2026", dpp: "05/02/2027", risco: "Habitual", ig: 10 },
  // Critical: empty DUM
  { cns: "100000000000006", nomeCompleto: "Gabriela Martins Dias", dataNascimento: "12/09/2003", idade: 22, telefone: "51 998001006", rua: "Rua Cruzeiro do Sul", numero: "78", lat: -30.0771 + offset(), lng: -51.2240 + offset(), microarea: "MA4", dataUltimaAtualizacao: daysAgo(2), dum: "", dpp: "", risco: "Alto", ig: 0 },
  // More patients for visual density
  { cns: "100000000000007", nomeCompleto: "Helena Ribeiro Pereira", dataNascimento: "05/06/1997", idade: 29, telefone: "51 998001007", rua: "Rua Flores", numero: "55", lat: -30.0754 + offset(), lng: -51.2246 + offset(), microarea: "MA5", dataUltimaAtualizacao: daysAgo(10), dum: "25/02/2026", dpp: "02/12/2026", risco: "Habitual", ig: 19 },
  { cns: "100000000000008", nomeCompleto: "Isabela Moreira Nunes", dataNascimento: "17/12/2000", idade: 25, telefone: "51 998001008", rua: "Rua Mutualidade", numero: "200", lat: -30.0718 + offset(), lng: -51.2253 + offset(), microarea: "MA3", dataUltimaAtualizacao: daysAgo(1), dum: "10/04/2026", dpp: "15/01/2027", risco: "Habitual", ig: 13 },
  { cns: "100000000000009", nomeCompleto: "Juliana Vieira Campos", dataNascimento: "30/08/1996", idade: 29, telefone: "51 998001009", rua: "Avenida Joracy Camargo", numero: "400", lat: -30.0768 + offset(), lng: -51.2215 + offset(), microarea: "MA4", dataUltimaAtualizacao: daysAgo(35), dum: "05/12/2025", dpp: "11/09/2026", risco: "Alto", ig: 30 },
  { cns: "100000000000010", nomeCompleto: "Larissa Gomes Barros", dataNascimento: "08/04/2002", idade: 24, telefone: "51 998001010", rua: "Rua Professor Manoel Lobato", numero: "92", lat: -30.0719 + offset(), lng: -51.2180 + offset(), microarea: "MA2", dataUltimaAtualizacao: daysAgo(6), dum: "18/03/2026", dpp: "23/12/2026", risco: "Habitual", ig: 16 },
  { cns: "100000000000011", nomeCompleto: "Mariana Teixeira Lopes", dataNascimento: "14/02/1994", idade: 32, telefone: "51 998001011", rua: "Rua Abelardo Marquês", numero: "167", lat: -30.0710 + offset(), lng: -51.2163 + offset(), microarea: "MA1", dataUltimaAtualizacao: daysAgo(22), dum: "28/01/2026", dpp: "04/11/2026", risco: "Habitual", ig: 23 },
  { cns: "100000000000012", nomeCompleto: "Natália Cardoso Azevedo", dataNascimento: "25/10/2000", idade: 25, telefone: "51 998001012", rua: "Rua Caixa Econômica", numero: "33", lat: -30.0739 + offset(), lng: -51.2229 + offset(), microarea: "MA5", dataUltimaAtualizacao: daysAgo(4), dum: "12/05/2026", dpp: "16/02/2027", risco: "Habitual", ig: 9 },
];

// ─────────────────────────────────────────────────────────────────
// TUBERCULOSE — 5 patients
// ─────────────────────────────────────────────────────────────────
const tuberculose: DemoPatient[] = [
  { cns: "200000000000001", nomeCompleto: "Roberto Silva Gonçalves", dataNascimento: "10/03/1985", idade: 41, telefone: "51 998002001", ...randomStreet(), numero: "44", dataUltimaAtualizacao: daysAgo(10), baciloscopia: "Positiva", trm: "Detectável", cultura: "Pendente", formaClinica: "Pulmonar" },
  { cns: "200000000000002", nomeCompleto: "Marcos Andrade Pinto", dataNascimento: "22/08/1978", idade: 47, telefone: "51 998002002", ...randomStreet(), numero: "112", dataUltimaAtualizacao: daysAgo(3), baciloscopia: "Negativa", trm: "Não detectável", cultura: "Negativa", formaClinica: "Extrapulmonar" },
  { cns: "200000000000003", nomeCompleto: "Paulo Henrique Costa", dataNascimento: "05/11/1990", idade: 35, telefone: "51 998002003", ...randomStreet(), numero: "280", dataUltimaAtualizacao: daysAgo(40), baciloscopia: "Positiva", trm: "Detectável", cultura: "Positiva", formaClinica: "Pulmonar" },
  { cns: "200000000000004", nomeCompleto: "Lucas Oliveira Ramos", dataNascimento: "18/06/1982", idade: 43, telefone: "51 998002004", ...randomStreet(), numero: "67", dataUltimaAtualizacao: daysAgo(7), baciloscopia: "Negativa", trm: "Não detectável", cultura: "Negativa", formaClinica: "Pulmonar" },
  { cns: "200000000000005", nomeCompleto: "André Nascimento Braga", dataNascimento: "30/01/1975", idade: 51, telefone: "51 998002005", ...randomStreet(), numero: "195", dataUltimaAtualizacao: daysAgo(60), baciloscopia: "Positiva", trm: "Detectável", cultura: "Pendente", formaClinica: "Pulmonar" },
];

// ─────────────────────────────────────────────────────────────────
// DIABETES — 6 patients
// ─────────────────────────────────────────────────────────────────
const diabetes: DemoPatient[] = [
  { cns: "300000000000001", nomeCompleto: "Maria Aparecida Duarte", dataNascimento: "02/04/1960", idade: 66, telefone: "51 998003001", ...randomStreet(), numero: "89", dataUltimaAtualizacao: daysAgo(5), pmdid: "Sim" },
  { cns: "300000000000002", nomeCompleto: "José Carlos Medeiros", dataNascimento: "15/09/1955", idade: 70, telefone: "51 998003002", ...randomStreet(), numero: "234", dataUltimaAtualizacao: daysAgo(35), pmdid: "Não" },
  { cns: "300000000000003", nomeCompleto: "Antônia Pereira Machado", dataNascimento: "28/12/1968", idade: 57, telefone: "51 998003003", ...randomStreet(), numero: "156", dataUltimaAtualizacao: daysAgo(12), pmdid: "Sim" },
  { cns: "300000000000004", nomeCompleto: "Francisco Almeida Reis", dataNascimento: "07/07/1958", idade: 67, telefone: "51 998003004", ...randomStreet(), numero: "401", dataUltimaAtualizacao: daysAgo(50), pmdid: "Não" },
  { cns: "300000000000005", nomeCompleto: "Tereza Cristina Borges", dataNascimento: "20/02/1972", idade: 54, telefone: "51 998003005", ...randomStreet(), numero: "78", dataUltimaAtualizacao: daysAgo(8), pmdid: "Sim" },
  { cns: "300000000000006", nomeCompleto: "Sebastião Correia Neto", dataNascimento: "11/06/1963", idade: 63, telefone: "51 998003006", ...randomStreet(), numero: "320", dataUltimaAtualizacao: daysAgo(25), pmdid: "Não" },
];

// ─────────────────────────────────────────────────────────────────
// HIPERTENSÃO — 6 patients
// ─────────────────────────────────────────────────────────────────
const hipertensao: DemoPatient[] = [
  { cns: "400000000000001", nomeCompleto: "Cláudia Regina Fontes", dataNascimento: "03/05/1965", idade: 61, telefone: "51 998004001", ...randomStreet(), numero: "55", dataUltimaAtualizacao: daysAgo(4), dataUltimaConsulta: daysAgo(15) },
  { cns: "400000000000002", nomeCompleto: "Wilson Ferreira Santana", dataNascimento: "19/11/1958", idade: 67, telefone: "51 998004002", ...randomStreet(), numero: "188", dataUltimaAtualizacao: daysAgo(45), dataUltimaConsulta: daysAgo(90) },
  { cns: "400000000000003", nomeCompleto: "Neide Santos Vasconcelos", dataNascimento: "25/03/1970", idade: 56, telefone: "51 998004003", ...randomStreet(), numero: "267", dataUltimaAtualizacao: daysAgo(8), dataUltimaConsulta: daysAgo(20) },
  { cns: "400000000000004", nomeCompleto: "Geraldo Moura Pinheiro", dataNascimento: "14/08/1952", idade: 73, telefone: "51 998004004", ...randomStreet(), numero: "99", dataUltimaAtualizacao: daysAgo(60), dataUltimaConsulta: daysAgo(120) },
  { cns: "400000000000005", nomeCompleto: "Rita Barbosa Xavier", dataNascimento: "01/01/1975", idade: 51, telefone: "51 998004005", ...randomStreet(), numero: "340", dataUltimaAtualizacao: daysAgo(2), dataUltimaConsulta: daysAgo(7) },
  { cns: "400000000000006", nomeCompleto: "Osvaldo Lima Figueiredo", dataNascimento: "09/04/1948", idade: 78, telefone: "51 998004006", ...randomStreet(), numero: "12", dataUltimaAtualizacao: daysAgo(30), dataUltimaConsulta: daysAgo(65) },
];

// ─────────────────────────────────────────────────────────────────
// ACAMADOS — 4 patients
// ─────────────────────────────────────────────────────────────────
const acamados: DemoPatient[] = [
  { cns: "500000000000001", nomeCompleto: "Dorival Cunha Tavares", dataNascimento: "06/02/1940", idade: 86, telefone: "51 998005001", ...randomStreet(), numero: "23", dataUltimaAtualizacao: daysAgo(3), vacinas: "Em dia", statusVisita: "Visitado" },
  { cns: "500000000000002", nomeCompleto: "Elvira Machado Brito", dataNascimento: "12/10/1945", idade: 80, telefone: "51 998005002", ...randomStreet(), numero: "145", dataUltimaAtualizacao: daysAgo(40), vacinas: "Atrasada", statusVisita: "Pendente" },
  { cns: "500000000000003", nomeCompleto: "Benedito Souza Freitas", dataNascimento: "30/07/1938", idade: 87, telefone: "51 998005003", ...randomStreet(), numero: "78", dataUltimaAtualizacao: daysAgo(15), vacinas: "Em dia", statusVisita: "Visitado" },
  { cns: "500000000000004", nomeCompleto: "Iracema Leite Nogueira", dataNascimento: "24/12/1942", idade: 83, telefone: "51 998005004", ...randomStreet(), numero: "201", dataUltimaAtualizacao: daysAgo(55), vacinas: "Atrasada", statusVisita: "Não localizado" },
];

// ─────────────────────────────────────────────────────────────────
// Cross-layer patient (tests CNS dedup): same CNS in gestantes + diabetes
// ─────────────────────────────────────────────────────────────────
// Patient "100000000000001" (Ana Beatriz) also appears in diabetes with a conflict
const crossLayerDiabetes: DemoPatient = {
  cns: "100000000000001", // Same as gestante Ana Beatriz
  nomeCompleto: "Ana Beatriz Oliveira",
  dataNascimento: "15/03/1998",
  idade: 28,
  telefone: "51 998001001",
  rua: "Avenida Moab Caldas",
  numero: "220",
  lat: -30.0695,
  lng: -51.2170,
  microarea: "MA1",
  dataUltimaAtualizacao: daysAgo(10),
  pmdid: "Sim",
};

// ─────────────────────────────────────────────────────────────────
// EXPORT: grouped by layer
// ─────────────────────────────────────────────────────────────────

export const DEMO_DATA: Record<LayerId, DemoPatient[]> = {
  gestantes,
  tuberculose,
  diabetes: [...diabetes, crossLayerDiabetes],
  hipertensao,
  acamados,
  pse: [], // Not patient-based
  ilpi: [], // Not patient-based
};

/** Total demo patient count */
export const DEMO_PATIENT_COUNT = Object.values(DEMO_DATA).reduce(
  (sum, arr) => sum + arr.length,
  0
);
