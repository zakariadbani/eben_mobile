import React from "react";
import { Formik, FormikHelpers, FormikValues } from "formik";

interface AppFormProps<T extends FormikValues> {
  initialValues: T; // Initial values for the form, generic type
  onSubmit: (values: T, formikHelpers: FormikHelpers<T>) => void; // Function to handle form submission
  validationSchema?: unknown; // Schema for validation (e.g. a Yup schema object)
  enableReinitialize?: boolean; // Whether to enable reinitialization
  resetForm?: () => void; // Function to reset the form
  children: React.ReactNode; // Children to render inside Formik
}

function AppForm<T extends FormikValues>({
  initialValues,
  onSubmit,
  validationSchema,
  enableReinitialize = false,
  resetForm,
  children,
}: AppFormProps<T>) {
  return (
    <Formik
      initialValues={initialValues}
      onSubmit={onSubmit}
      resetForm={resetForm}
      validationSchema={validationSchema}
      enableReinitialize={enableReinitialize}
    >
      {() => <>{children}</>}
    </Formik>
  );
}

export default AppForm;
