import React from "react";
import { useFormikContext } from "formik";
import { useTranslation } from "react-i18next";
import Button from "../Button"; // Adjust the import path as needed

interface FormSubmitProps
  extends Omit<React.ComponentProps<typeof Button>, "onPress" | "title"> {
  title: string;
  submittingTitle?: string;
}

const FormSubmit: React.FC<FormSubmitProps> = ({
  title,
  submittingTitle,
  disabled,
  accessibilityState,
  ...otherProps
}) => {
  const { handleSubmit, isSubmitting } = useFormikContext();
  const { t } = useTranslation();
  const visibleTitle = isSubmitting ? submittingTitle ?? title : title;

  return (
    <Button
      title={t(visibleTitle)}
      onPress={() => void handleSubmit()}
      disabled={disabled || isSubmitting}
      accessibilityState={{ ...accessibilityState, busy: isSubmitting }}
      {...otherProps}
    />
  );
};

export default FormSubmit;
