export type WellnessLanguage = "en" | "pt-BR";

export type WellnessProfileDocument = {
  schema: "delx-wellness-profile/v1";
  generated_by: "delx-wellness-hermes";
  version: 1;
  profile: {
    preferred_name: string;
    language: WellnessLanguage;
    timezone: string;
    units: "metric" | "imperial";
    age_or_birth_year: string;
    height: string;
    weight: string;
    sex_or_gender_context: string;
  };
  goals: {
    primary: string;
    secondary: string[];
    training_focus: string;
    recovery_focus: string;
    nutrition_focus: string;
    sleep_focus: string;
    biggest_friction: string;
  };
  devices: {
    connected: string[];
    desired: string[];
    primary_recovery_source: string;
    primary_activity_source: string;
    primary_nutrition_source: string;
  };
  training: {
    sports: string[];
    weekly_schedule: string;
    equipment: string[];
    location: string[];
    preferred_duration_minutes: string;
    exercises_to_avoid: string[];
    limitations: string[];
  };
  nutrition: {
    dietary_preferences: string[];
    restrictions_or_allergies: string[];
    protein_target_g: string;
    hydration_target_ml: string;
    calorie_target: string;
  };
  preferences: {
    language_priority: WellnessLanguage[];
    reply_style: "concise" | "detailed";
    telegram_style: "concise" | "detailed";
    ask_before_logging: boolean;
    include_exercise_videos_when_available: boolean;
  };
  safety: {
    injuries_or_pain: string[];
    medical_constraints: string[];
    conservative_flags: string[];
  };
  notes: string;
};

export const DEFAULT_WELLNESS_PROFILE: WellnessProfileDocument = {
  schema: "delx-wellness-profile/v1",
  generated_by: "delx-wellness-hermes",
  version: 1,
  profile: {
    preferred_name: "",
    language: "en",
    timezone: "",
    units: "metric",
    age_or_birth_year: "",
    height: "",
    weight: "",
    sex_or_gender_context: ""
  },
  goals: {
    primary: "",
    secondary: [],
    training_focus: "",
    recovery_focus: "",
    nutrition_focus: "",
    sleep_focus: "",
    biggest_friction: ""
  },
  devices: {
    connected: [],
    desired: [],
    primary_recovery_source: "",
    primary_activity_source: "",
    primary_nutrition_source: "nourish"
  },
  training: {
    sports: [],
    weekly_schedule: "",
    equipment: [],
    location: [],
    preferred_duration_minutes: "",
    exercises_to_avoid: [],
    limitations: []
  },
  nutrition: {
    dietary_preferences: [],
    restrictions_or_allergies: [],
    protein_target_g: "",
    hydration_target_ml: "",
    calorie_target: ""
  },
  preferences: {
    language_priority: ["en", "pt-BR"],
    reply_style: "concise",
    telegram_style: "concise",
    ask_before_logging: true,
    include_exercise_videos_when_available: true
  },
  safety: {
    injuries_or_pain: [],
    medical_constraints: [],
    conservative_flags: []
  },
  notes: ""
};

export function createDefaultWellnessProfile(): WellnessProfileDocument {
  return JSON.parse(JSON.stringify(DEFAULT_WELLNESS_PROFILE)) as WellnessProfileDocument;
}

export function stringifyWellnessProfile(profile: WellnessProfileDocument = DEFAULT_WELLNESS_PROFILE): string {
  return `${JSON.stringify(profile, null, 2)}\n`;
}
