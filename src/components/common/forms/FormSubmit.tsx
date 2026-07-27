import React from "react";
import { useFormikContext } from "formik";
import Button from "../Button"; // Adjust the import path as needed

interface FormSubmitProps
  extends Omit<React.ComponentProps<typeof Button>, "onPress" | "title"> {
  title: string; // title prop is required and should be a string
}

const FormSubmit: React.FC<FormSubmitProps> = ({ title, ...otherProps }) => {
  const { handleSubmit } = useFormikContext();

  return <Button title={title} onPress={handleSubmit} {...otherProps} />;
};

export default FormSubmit;
