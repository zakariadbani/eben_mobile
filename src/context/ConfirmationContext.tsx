// src/context/ConfirmationContext.tsx

import ConfirmModal from "@/components/common/ConfirmModal";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import React, { createContext, useContext, useState, ReactNode } from "react";

interface ConfirmationContextType {
  showConfirmation: (
    message: string,
    item: string,

    onConfirm: () => void
  ) => void;
  closeConfirmation: () => void;
  isVisible: boolean;
  confirmationMessage: string | null;
  confirmAction: (() => void) | null;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(
  undefined
);

export const ConfirmationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(
    null
  );
  const [confirmationItem, setConfirmationItem] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  const defaultMessage = "Êtes-vous sûr de vouloir continuer ?";

  const showConfirmation = (
    message: string,
    item: string,
    onConfirm: () => void
  ) => {
    setConfirmationMessage(message || defaultMessage);
    setConfirmationItem(item);
    setConfirmAction(() => onConfirm);
    setIsVisible(true);
  };

  const closeConfirmation = () => {
    setIsVisible(false);
    setConfirmationMessage(null);
    setConfirmAction(null);
  };

  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction();
    }
    closeConfirmation();
  };

  return (
    <ConfirmationContext.Provider
      value={{
        showConfirmation,
        closeConfirmation,
        isVisible,
        confirmationMessage,
        confirmAction,
      }}
    >
      {children}
      {isVisible && (
        <ConfirmModal
          zIndexValue={999999}
          visible={isVisible}
          onClose={closeConfirmation}
          primaryButton={{
            title: "Oui, Continuer",
            variant: "pink",
            onPress: handleConfirm,
          }}
          secondaryButton={{
            title: "Non, Retourner",
            variant: "gray",
            onPress: closeConfirmation,
          }}
        >
          {/* <Text>{confirmationMessage}</Text> */}
          <View flex pb={60} pt={20} gap={20}>
            <Text type="headerTitle">{confirmationMessage}</Text>
            {confirmationItem && <Text>{confirmationItem}</Text>}
          </View>
        </ConfirmModal>
      )}
    </ConfirmationContext.Provider>
  );
};

export const useConfirmation = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error(
      "useConfirmation must be used within a ConfirmationProvider"
    );
  }
  return context;
};
