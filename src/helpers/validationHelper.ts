import * as Yup from "yup";
import { useTranslation } from "react-i18next";

interface FieldValidation {
  name: string;
  rules: string[];
  label?: string;
  errorMessages?: Record<string, string>;
  refField?: string;
}

export const useGlobalValidation = () => {
  const { t } = useTranslation();

  const createValidationSchema = (fields: FieldValidation[]) => {
    const shape: Record<string, Yup.AnySchema> = {};

    fields.forEach(({ name, rules, label, errorMessages = {}, refField }) => {
      if (rules.includes("checkbox")) {
        shape[name] = Yup.boolean()
          .oneOf([true], errorMessages.oneOf || t("Vous devez cocher ce champ"))
          .required(errorMessages.required || t("Vous devez accepter les conditions"));
        return;
      }

      let validator = Yup.string().label(t(label || ""));
      rules.forEach((rule) => {
        const [ruleName, ruleValue] = rule.split(":");
        switch (ruleName) {
          case "required":
            validator = validator.required(
              errorMessages.required ||
                (label ? `${t(label)} ${t("est obligatoire")}` : t("Ce champ est obligatoire")),
            );
            break;
          case "min":
            if (ruleValue) {
              validator = validator.min(
                Number.parseInt(ruleValue, 10),
                errorMessages.min || t(`Le champ doit contenir au moins ${ruleValue} caractères`),
              );
            }
            break;
          case "email":
            validator = validator.email(
              errorMessages.email || t("L'adresse e-mail doit être valide"),
            );
            break;
          case "oneOf":
            if (refField) {
              validator = validator.oneOf(
                [Yup.ref(refField)],
                errorMessages.oneOf || t("Les champs doivent correspondre"),
              );
            }
            break;
          case "numeric":
            validator = validator.matches(
              /^[0-9]*$/,
              errorMessages.numeric ||
                (label ? `${t(label)} ${t("doit être un nombre")}` : t("Le champ doit être un nombre")),
            );
            break;
        }
      });
      shape[name] = validator;
    });

    return Yup.object().shape(shape);
  };

  return { createValidationSchema };
};
