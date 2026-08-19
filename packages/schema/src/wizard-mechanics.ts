import type { RuntimeValueRef, TriggerData, UsageLimitData } from "./mechanics.js";

export interface SpellbookAdditionProgressionData {
  initial?: RuntimeValueRef;
  perLevel?: RuntimeValueRef;
  allowLowerLevel?: boolean;
}

export interface SpellSlotRecoveryBudgetData {
  poolId: string;
  trigger: TriggerData;
  budget: RuntimeValueRef;
  maxSlotLevel?: number;
  usage?: UsageLimitData;
}

export interface SpellPreparationChangeData {
  trigger: TriggerData;
  fromCollectionId: string;
  collectionId: string;
  replaceCount: RuntimeValueRef;
}

export interface SkillExpertiseChoiceData {
  count: number;
  options: readonly string[];
  requireProficiency?: boolean;
}

export interface SpellMasteryData {
  choices: readonly { spellLevel: number; count: number }[];
  fromCollectionId: string;
  castWithoutSlot: boolean;
  atLowestLevel?: boolean;
  replaceOn?: "longRest" | "shortRest" | "levelUp" | "manual" | "custom";
}

export interface SignatureSpellsData {
  spellLevel: number;
  count: number;
  fromCollectionId: string;
  alwaysPrepared?: boolean;
  freeUsesEach?: RuntimeValueRef;
  recovery?: "shortRest" | "longRest" | "shortOrLongRest" | "custom";
  replaceOn?: "longRest" | "shortRest" | "levelUp" | "manual" | "custom";
}

export interface SpellbookAdditionRuleData {
  school: string;
  level?: number;
  count: number;
  maxSpellLevel?: number;
  cost?: "free" | "normal" | "custom";
  trigger?: "newSpellSlotLevel" | "levelUp" | "manual" | "custom";
}

export interface SpellTargetProtectionData {
  school?: string;
  protectedTargets: RuntimeValueRef;
  automaticSaveSuccess?: boolean;
  noDamageOnSuccessfulSave?: boolean;
}

export interface OverchannelData {
  spellSlotLevels: readonly number[];
  maximizeDamageOnCastTurn?: boolean;
  firstUseSafe?: boolean;
  reuseDamage?: {
    type: string;
    dicePerSlotLevel: string;
    increasePerAdditionalUse?: string;
    ignoresResistance?: boolean;
    ignoresImmunity?: boolean;
  };
  recovery?: "longRest" | "shortRest" | "shortOrLongRest" | "custom";
}

declare module "./class-mechanics.js" {
  interface SpellCollectionData {
    /** Optional source collection used to constrain selections, such as prepared spells drawn from a spellbook. */
    fromCollectionId?: string;
    /** Structured progression for collections that grow automatically, such as a Wizard spellbook. */
    additions?: SpellbookAdditionProgressionData;
  }
}

declare module "./class-rules.js" {
  interface ClassRuleData {
    spellSlotRecoveryBudgets?: readonly SpellSlotRecoveryBudgetData[];
    spellPreparationChanges?: readonly SpellPreparationChangeData[];
    skillExpertise?: readonly SkillExpertiseChoiceData[];
    spellMastery?: SpellMasteryData;
    signatureSpells?: SignatureSpellsData;
    spellbookAdditions?: readonly SpellbookAdditionRuleData[];
    spellTargetProtection?: readonly SpellTargetProtectionData[];
    overchannel?: OverchannelData;
  }
}
