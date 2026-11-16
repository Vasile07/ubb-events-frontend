export type EventFormMode = "create" | "edit";
export type EventTaskValue = { description: string; assigneeId: string };
export type EventFormValues = {
  title: string;
  description: string;
  location: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  capacity: string;
  registrationInformation: string;
  activeRegistrations?: number;
  status?: string;
  tasks: EventTaskValue[];
};
export type EventFormProps = {
  mode: EventFormMode;
  organizationId: number;
  initialValues?: Partial<EventFormValues>;
  onSubmit: (values: EventFormValues) => void | Promise<void>;
  submitting?: boolean;
  fieldErrors?: Record<string, string>;
  onDirtyChange?: (dirty: boolean) => void;
  submitLabel?: string;
  onCancel?: () => void;
};
