export type ChoiceAction =
  | { type: 'complete' }
  | { type: 'go_to_scene'; sceneId: string }
  | { type: 'open_interaction'; interactionId: string };

export type ChoiceOption = {
  id: string;
  label: string;
  description?: string;
  value?: string;
  action?: ChoiceAction;
};

export type ChoiceDefinition = {
  id: string;
  title: string;
  subtitle?: string;
  options: ChoiceOption[];
  mode?: 'instant' | 'confirm';
  required?: boolean;
  allowChange?: boolean;
};

export type ChoiceResult = {
  choiceId: string;
  optionId: string;
  value?: string | undefined;
  action?: ChoiceAction | undefined;
};

export type ChoiceState =
  | 'hidden'
  | 'entering'
  | 'active'
  | 'selected'
  | 'confirming'
  | 'completed'
  | 'exiting';

export type ChoiceInteractionEvent =
  | { type: 'choice_opened'; choiceId: string }
  | { type: 'option_selected'; choiceId: string; optionId: string }
  | { type: 'choice_completed'; choiceId: string; optionId: string };
