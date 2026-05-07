import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULT_PROFILE_NAME, resolveHermesHome, resolvePackageTemplatePath } from "./paths.js";
import { stringifyWellnessProfile, type WellnessLanguage } from "./wellness-profile.js";

export type OnboardingQuestion = {
  id: string;
  prompt: string;
  category: "profile" | "goals" | "devices" | "training" | "nutrition" | "exercise" | "preferences" | "safety";
  required: boolean;
};

export type OnboardingResult = {
  profileName: string;
  hermesHome: string;
  onboardingPath: string;
  wellnessProfilePath: string;
  questions: OnboardingQuestion[];
  written: boolean;
};

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  { id: "preferred_name", category: "profile", required: false, prompt: "What should the agent call you?" },
  { id: "locale_timezone_units", category: "profile", required: true, prompt: "What are your language, timezone, and units?" },
  { id: "body_basics", category: "profile", required: false, prompt: "Share age or birth year, height, weight, and gender/sex only if you want the agent to use that context." },
  { id: "primary_goal", category: "goals", required: true, prompt: "What is your primary wellness goal right now?" },
  { id: "secondary_goals", category: "goals", required: false, prompt: "What secondary goals matter: fat loss, muscle, endurance, sleep, recovery, tennis, longevity, stress, consistency?" },
  { id: "devices", category: "devices", required: true, prompt: "Which sources do you use: WHOOP, Garmin, Oura, Strava, Fitbit, Withings, Apple Health, Samsung Health, Polar, Nourish, Exercise Catalog?" },
  { id: "training_context", category: "training", required: true, prompt: "What sports do you train, how often, and what does a normal week look like?" },
  { id: "nutrition_context", category: "nutrition", required: false, prompt: "What nutrition context should the agent know: meals, calories, macros, restrictions, allergies, or food preferences?" },
  { id: "exercise_preferences", category: "exercise", required: false, prompt: "What equipment, location, duration, exercises to avoid, or limitations should workouts respect?" },
  { id: "agent_preferences", category: "preferences", required: false, prompt: "Do you prefer concise Telegram replies, detailed explanations, pt-BR, English, videos, or logging confirmations?" },
  { id: "safety_context", category: "safety", required: false, prompt: "Any injuries, pain, medical constraints, or symptoms the agent should treat as a reason to be conservative?" }
];

const PT_BR_PROMPTS: Record<string, string> = {
  preferred_name: "Como o agente deve te chamar?",
  locale_timezone_units: "Qual idioma, fuso horário e sistema de medidas você prefere?",
  body_basics: "Compartilhe idade ou ano de nascimento, altura, peso e gênero/sexo apenas se quiser que o agente use esse contexto.",
  primary_goal: "Qual é seu principal objetivo de wellness agora?",
  secondary_goals: "Quais objetivos secundários importam: perda de gordura, massa muscular, endurance, sono, recuperação, tênis, longevidade, estresse ou consistência?",
  devices: "Quais fontes você usa: WHOOP, Garmin, Oura, Strava, Fitbit, Withings, Apple Health, Samsung Health, Polar, Nourish ou Catálogo de Exercícios?",
  training_context: "Quais esportes você treina, com que frequência, e como é uma semana normal?",
  nutrition_context: "Que contexto nutricional o agente deve saber: refeições, calorias, macros, restrições, alergias ou preferências alimentares?",
  exercise_preferences: "Quais equipamentos, local, duração, exercícios a evitar ou limitações os treinos devem respeitar?",
  agent_preferences: "Você prefere respostas concisas no Telegram, explicações detalhadas, pt-BR, inglês, vídeos ou confirmações antes de registrar dados?",
  safety_context: "Há lesões, dor, restrições médicas ou sintomas que o agente deve tratar como motivo para ser conservador?"
};

export async function createOnboardingFile(options: {
  profileName?: string;
  hermesHome?: string;
  packageRoot?: string;
  write?: boolean;
  language?: WellnessLanguage;
} = {}): Promise<OnboardingResult> {
  const profileName = options.profileName ?? DEFAULT_PROFILE_NAME;
  const hermesHome = options.hermesHome ?? resolveHermesHome(profileName);
  const onboardingPath = path.join(hermesHome, "ONBOARDING.md");
  const wellnessProfilePath = path.join(hermesHome, "wellness-profile.json");

  if (options.write) {
    await fs.mkdir(hermesHome, { recursive: true });
    await fs.copyFile(resolvePackageTemplatePath("ONBOARDING.md", options.packageRoot), onboardingPath);
    if (!(await exists(wellnessProfilePath))) {
      await fs.writeFile(wellnessProfilePath, stringifyWellnessProfile(), "utf8");
    }
  }

  return {
    profileName,
    hermesHome,
    onboardingPath,
    wellnessProfilePath,
    questions: localizedQuestions(options.language ?? "en"),
    written: Boolean(options.write)
  };
}

export function formatOnboardingQuestions(
  questions = ONBOARDING_QUESTIONS,
  options: { language?: WellnessLanguage } = {}
): string {
  const selectedQuestions = options.language ? localizeQuestionSet(questions, options.language) : questions;
  return selectedQuestions
    .map((question, index) => `${index + 1}. ${question.prompt}${question.required ? " [required]" : ""}`)
    .join("\n");
}

function localizedQuestions(language: WellnessLanguage): OnboardingQuestion[] {
  return localizeQuestionSet(ONBOARDING_QUESTIONS, language);
}

function localizeQuestionSet(questions: OnboardingQuestion[], language: WellnessLanguage): OnboardingQuestion[] {
  if (language === "en") return questions;
  return questions.map((question) => ({
    ...question,
    prompt: PT_BR_PROMPTS[question.id] ?? question.prompt
  }));
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
}
