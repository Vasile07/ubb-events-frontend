import type { EventFormValues } from "./eventFormTypes";

export function validateEventForm(values: EventFormValues, mode: "create" | "edit") {
  const errors: Record<string, string> = {};
  if (!values.title.trim()) errors.title = "Title is required";
  if (!values.description.trim()) errors.description = "Description is required";
  if (!values.location.trim()) errors.location = "Location is required";
  if (!values.startDate) errors.startDate = "Start date is required";
  if (!values.startTime) errors.startTime = "Start time is required";
  if (!values.endDate) errors.endDate = "End date is required";
  if (!values.endTime) errors.endTime = "End time is required";
  if (values.startDate && values.startTime && values.endDate && values.endTime) {
    if (new Date(`${values.endDate}T${values.endTime}`) <= new Date(`${values.startDate}T${values.startTime}`)) errors.endTime = "End must be after the start";
  }
  const capacity = Number(values.capacity);
  if (!Number.isInteger(capacity) || capacity < 1) errors.capacity = "Capacity must be at least 1";
  if (mode === "edit" && values.activeRegistrations !== undefined && capacity < values.activeRegistrations) errors.capacity = "Capacity cannot be below the active registrations";
  return errors;
}
