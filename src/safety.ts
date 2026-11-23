// Words and numbers we keep out of user-written text (quests, crew names, and so on).
// Rule: no numbers about weight, food or body size, and nothing about diets or fasting.
export const RISKY = /\b\d+(\.\d+)?\s?(kg|kgs|lb|lbs|pounds?|kcal|cals?|calories|cm|inch|inches)\b|\b(calorie|calories|kcal|diet|dieting|fasting|purge|purging|weigh|weigh-in|bmi)\b/i
export const RISKY_MESSAGE = 'Please leave out numbers about weight, food or body size, and anything about diets, fasting or exercise tips.'
