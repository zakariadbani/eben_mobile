import React, { useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  KeyboardTypeOptions,
} from "react-native";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import { FormField } from "@/components/common/forms";
import Button from "@/components/common/Button";
import CustomIcon from "../CustomIcon";
import { useFormikContext } from "formik";

interface FormEditableFieldProps {
  label?: string;
  value?: string;
  placeholder: string;
  iconName: string;
  editingField: string | null;
  fieldName: string;
  keyboardType?: KeyboardTypeOptions;
  textContentType?: string;
  secureTextEntry?: boolean;
  toggleEdit: (field: string) => void;
  submitHandler: (values: any) => void;
}

const FormEditableField: React.FC<FormEditableFieldProps> = ({
  label,
  value,
  placeholder,
  iconName,
  editingField,
  fieldName,
  keyboardType,
  textContentType,
  secureTextEntry,
  toggleEdit,
  submitHandler,
}) => {
  const isEditing = editingField === fieldName;
  const { errors, validateField, values } = useFormikContext<any>();
  // Local state to handle input changes
  const [localValue, setLocalValue] = useState(value);

  const handleConfirm = async () => {
    await validateField(fieldName); // Validate the field before proceeding

    if (!errors[fieldName]) {
      setLocalValue(values[fieldName]);
      submitHandler(values); // Call submit handler if no errors
      toggleEdit(fieldName); // Exit edit mode
    }
  };

  return (
    <View>
      <View flexDirection="row" alignItems="center" gap={8}>
        <CustomIcon name={iconName} size={26} />
        <View flex>
          <Text>{secureTextEntry ? "****************" : localValue}</Text>
        </View>

        {!isEditing ? (
          <Button
            title="Modifier"
            iconType="custom"
            rightIcon="pen"
            outline
            fit
            bordless
            variant="brand"
            onPress={() => toggleEdit(fieldName)}
          />
        ) : (
          <Button
            title="Confirmer"
            iconTypeName="AntDesign"
            rightIcon="checkcircleo"
            outline
            fit
            bordless
            sizeIcon={20}
            variant="greenDark"
            onPress={handleConfirm}
          />
        )}
      </View>

      {isEditing && (
        <View p={10}>
          <FormField
            leftIcon={iconName}
            iconType="custom"
            iconSize={26}
            label={label}
            placeholder={placeholder}
            name={fieldName}
            value={values[fieldName]} // Get value from Formik
            keyboardType={keyboardType}
            secureTextEntry={secureTextEntry}
            textContentType={textContentType}
          />
        </View>
      )}
    </View>
  );
};

export default FormEditableField;
