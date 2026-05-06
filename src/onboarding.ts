import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULT_PROFILE_NAME, resolveHermesHome, resolvePackageTemplatePath } from "./paths.js";

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
  questions: OnboardingQuestion[];
  written: boolean;
};

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  { id: "preferred_name", category: "profile", required: false, prompt: "What should the agent call you?" },
  { id: "locale_timezone_units", category: "profile", required: true, prompt: "What are your language, timezone, and units?" },
  { id: "body_basics", category: "profile", required: false, prompt: "Share age or birth year, height, weight, and gender/sex only if you want the agent to use that context." },
  { id: "primary_goal", category: "goals", required: true, prompt: "What is your primary wellness goal right now?" },
  { id: "secondary_goals", category: "goals", required: false, prompt: "What secondary goals matter: fat loss, muscle, endurance, sleep, recovery, tennis, longevity, stress, consistency?" },
  { id: "devices", category: "devices", required: true, prompt: "Which sources do you use: WHOOP, Garmin, Oura, Strava, Fitbit, Withings, Apple Health, Polar, Nourish, Exercise Catalog?" },
  { id: "training_context", category: "training", required: true, prompt: "What sports do you train, how often, and what does a normal week look like?" },
  { id: "nutrition_context", category: "nutrition", required: false, prompt: "What nutrition context should the agent know: meals, calories, macros, restrictions, allergies, or food preferences?" },
  { id: "exercise_preferences", category: "exercise", required: false, prompt: "What equipment, location, duration, exercises to avoid, or limitations should workouts respect?" },
  { id: "agent_preferences", category: "preferences", required: false, prompt: "Do you prefer concise Telegram replies, detailed explanations, pt-BR, English, videos, or logging confirmations?" },
  { id: "safety_context", category: "safety", required: false, prompt: "Any injuries, pain, medical constraints, or symptoms the agent should treat as a reason to be conservative?" }
];

export async function createOnboardingFile(options: {
  profileName?: string;
  hermesHome?: string;
  packageRoot?: string;
  write?: boolean;
} = {}): Promise<OnboardingResult> {
  const profileName = options.profileName ?? DEFAULT_PROFILE_NAME;
  const hermesHome = options.hermesHome ?? resolveHermesHome(profileName);
  const onboardingPath = path.join(hermesHome, "ONBOARDING.md");

  if (options.write) {
    await fs.mkdir(hermesHome, { recursive: true });
    await fs.copyFile(resolvePackageTemplatePath("ONBOARDING.md", options.packageRoot), onboardingPath);
  }

  return {
    profileName,
    hermesHome,
    onboardingPath,
    questions: ONBOARDING_QUESTIONS,
    written: Boolean(options.write)
  };
}

export function formatOnboardingQuestions(questions = ONBOARDING_QUESTIONS): string {
  return questions
    .map((question, index) => `${index + 1}. ${question.prompt}${question.required ? " [required]" : ""}`)
    .join("\n");
}
