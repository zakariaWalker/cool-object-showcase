// ===== AI Layer (NVIDIA NIM) =====
// Local engines solve — NVIDIA NIM only explains in natural language.
// NIM API is OpenAI-compatible: POST to /v1/chat/completions.

import { getProfile, PROFILES } from "./profile-store";

const NIM_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";
const NIM_MODEL = "meta/llama-3.3-70b-instruct"; // best open model on NIM

let _apiKey: string | null = null;

export function setApiKey(key: string) {
  _apiKey = key;
  localStorage.setItem("nim_api_key", key);
}

export function getApiKey(): string | null {
  return _apiKey || localStorage.getItem("nim_api_key");
}

function getSystemModifier(): string {
  const pId = getProfile();
  if (!pId) return "";
  const p = PROFILES[pId];
  return `\n\n[STUDENT COGNITIVE PROFILE: ${p.id.toUpperCase()}]\nPedagogical Instruction: ${p.systemPromptModifier}`;
}

async function callNIM(systemPrompt: string, userContent: string): Promise<string> {
  const key = getApiKey();
  if (!key) throw new Error("Clé API NVIDIA NIM manquante");

  const fullSystemPrompt = systemPrompt + getSystemModifier();

  const res = await fetch(NIM_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: NIM_MODEL,
      messages: [
        { role: "system", content: fullSystemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.4,
      max_tokens: 1000,
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.choices?.[0]?.message?.content || "";
}

// ─── Statistics explanation ──────────────────────────────────────────────────

const STATS_SYSTEM = `Tu es un professeur de mathématiques au collège/lycée algérien, expert en statistiques.
L'élève vient de calculer les statistiques d'un jeu de données. Tu reçois les résultats numériques exacts.
Donne une explication pédagogique concise (5-7 phrases) en FRANÇAIS ou en ARABE selon la langue de l'élève.
- Commence par ce que révèle la moyenne par rapport à la médiane (symétrie ou asymétrie)
- Commente l'écart-type dans le contexte des données
- Identifie si l'IQR signale des valeurs atypiques
- Utilise des exemples concrets tirés des données
- Ne redonne PAS les formules, l'élève les voit déjà.`;

export async function explainStatistics(result: any, language: string): Promise<string> {
  const content = `Données (n=${result.n}): [${result.data.join(", ")}]
Moyenne: ${result.mean}, Médiane: ${result.median}, Mode: ${result.mode.join(",") || "∄"}
Variance: ${result.variance}, Écart-type: ${result.stdDev}
Étendue: ${result.range}, Q1: ${result.q1}, Q3: ${result.q3}, IQR: ${result.iqr}
Langue élève: ${language}`;
  return callNIM(STATS_SYSTEM, content);
}

// ─── Probability explanation ──────────────────────────────────────────────────

const PROB_SYSTEM = `Tu es un professeur de mathématiques au collège/lycée algérien, expert en probabilités.
L'élève vient de résoudre un problème de probabilités. Tu reçois les événements et probabilités calculés localement.
Donne une explication pédagogique concise (5-7 phrases) qui:
- Interprète intuitivement les probabilités (ex: "en moyenne sur 100 lancers, on obtient X fois...")
- Signale les événements complémentaires ou la règle des probabilités totales si pertinent
- Donne un conseil de vérification (somme des probabilités = 1)
- Répond dans la même langue que la question.`;

export async function explainProbability(result: any, language: string): Promise<string> {
  const eventsDesc = result.events
    .map((e: any) => `${e.nameAr}: ${e.fraction} = ${(e.probability * 100).toFixed(1)}%`)
    .join("\n");
  const content = `Expérience: ${result.experimentDescription}
Espace échantillon: |Ω| = ${result.totalOutcomes}
Événements:\n${eventsDesc}
Langue élève: ${language}`;
  return callNIM(PROB_SYSTEM, content);
}

// ─── Algebra explanation ─────────────────────────────────────────────────────

const ALGEBRA_SYSTEM = `Tu es un professeur de mathématiques au collège/lycée algérien.
L'élève vient de développer/simplifier une expression algébrique. L'engine local a fait le calcul.
Explique en 4-5 phrases concises:
- Quelle règle principale a été appliquée (distributivité, identités remarquables...)
- Pourquoi chaque étape est nécessaire
- Un conseil pour ne pas refaire l'erreur classique liée à cette règle
Réponds dans la même langue que la question.`;

export async function explainAlgebra(
  input: string,
  steps: Array<{ ruleName: string; description: string }>,
  output: string,
  language: string
): Promise<string> {
  const stepsDesc = steps.map((s, i) => `${i + 1}. ${s.ruleName}: ${s.description}`).join("\n");
  const content = `Expression: ${input}
Étapes:\n${stepsDesc}
Résultat: ${output}
Langue élève: ${language}`;
  return callNIM(ALGEBRA_SYSTEM, content);
}

// ─── Misconception feedback ───────────────────────────────────────────────────

const MISCONCEPTION_SYSTEM = `Tu es un professeur de mathématiques bienveillant au lycée algérien.
Un élève a fait une erreur dans un calcul algébrique. On t'indique le type d'erreur détecté.
Donne une explication courte (3-4 phrases), encourageante, qui:
- Nomme l'erreur clairement sans être négatif
- Explique POURQUOI c'est une erreur (contre-exemple si possible)
- Donne la règle correcte
- Réponds dans la même langue que la question (AR ou FR).`;

export async function explainMisconception(
  errorType: string,
  studentAttempt: string,
  correctAnswer: string,
  language: string
): Promise<string> {
  const content = `Type d'erreur: ${errorType}
Tentative de l'élève: ${studentAttempt}
Réponse correcte: ${correctAnswer}
Langue: ${language}`;
  return callNIM(MISCONCEPTION_SYSTEM, content);
}
