/**
 * Liste tab — client request list.
 *
 * Empty state  (List-empty):  illustration + "Explorer les produits" CTA + active requests section.
 * Full state   (List-full):   line items grouped by category, total count, info note,
 *                             "Ajouter des détails" section (images + note),
 *                             active requests section, sticky "Vérifier et envoyer" CTA.
 *
 * Uses a local draft stored in component state (no persistence yet).
 * Real persistence will be in a RequestDraftContext once wired.
 */

import React, { useState, useCallback } from "react";
import { StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter, Href } from "expo-router";
import { useTranslation } from "react-i18next";
import CustomIcon from "@/components/common/CustomIcon";

import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import TextInput from "@/components/common/TextInput";
import ImageInputList from "@/components/common/ImageInputList";

import TitleBlockComponent from "@/components/screens/shared/app/TitleBlockComponent";
import EmptyListComponent from "@/components/screens/shared/app/EmptyListComponent";
import ItemSubCategoryComponent from "@/components/screens/shared/app/ItemSubCategoryComponent";
import ItemRequestComponent from "@/components/screens/shared/app/ItemRequestComponent";

import { useConfirmation } from "@/context/ConfirmationContext";
import Colors from "@/constants/Colors";

import { dataRequests, dataSubCategories } from "@/data/ws";
import { createRequest } from "@/api/resources/requests";

export default function RequestListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ state?: string }>();
  const { showConfirmation } = useConfirmation();

  // Draft list items (populated by the "Commandez" builder flow)
  const [draftItems, setDraftItems] = useState(
    params.state === "empty" ? [] : dataSubCategories
  );
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  const isEmpty = draftItems.length === 0;

  const handleRemoveItem = useCallback(
    (item: (typeof draftItems)[number]) => {
      showConfirmation("", "", () => {
        setDraftItems((prev) => prev.filter((i) => i.id !== item.id));
      });
    },
    [showConfirmation]
  );

  const handleVerifyAndSend = useCallback(async () => {
    if (submitting || draftItems.length === 0) return;
    setSubmitting(true);
    setSubmitError(false);
    try {
      const result = await createRequest({
        vehicleId: 1,
        items: draftItems.map((item) => ({
          categoryId: item.id,
          categoryTitle: item.title,
          categoryTitleAr: item.title_ar,
          quantity: 1,
          condition: "occasion",
        })),
        notes: note.trim() || null,
      });
      router.push({
        pathname: "/(client)/requests/verification",
        params: { requestId: String(result.data.id), reference: result.data.reference },
      } as Href);
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  }, [draftItems, note, router, submitting]);

  return (
    <View style={styles.root}>
      <Screen padding scrollable>
        {isEmpty ? (
          /* ────────────────── EMPTY STATE ────────────────── */
          <>
            <TitleBlockComponent titleBlock="Ajouter des détails" />
            <EmptyListComponent
              title=""
              actionButton={{
                title: "Explorer les produits",
                iconType: "custom",
                rightIcon: "search",
                navigateTo: "/(client)/categories",
              }}
            />
          </>
        ) : (
          /* ────────────────── FULL STATE ────────────────── */
          <>
            {/* List number */}
            <Text type="headerTitle" semiBold style={styles.listRef} translate={false}>
              {t("requestList.reference", { reference: "F3924048483" })}
            </Text>

            {/* Line items */}
            <View style={styles.itemsContainer} gap={10}>
              {draftItems.map((item) => (
                <ItemSubCategoryComponent
                  key={item.id}
                  item={item}
                  showQty
                  showState
                  styleContainer={styles.itemCard}
                  actionButtonTwo={{
                    variant: "pink",
                    rightIcon: "trash",
                    iconType: "custom",
                    sizeIcon: 18,
                    onPress: () => handleRemoveItem(item),
                  }}
                />
              ))}

              {/* Total count */}
              <View flexDirection="row" gap={4} style={styles.totalRow}>
                <Text semiBold>Total :</Text>
                <Text semiBold translate={false}>
                  {draftItems.length}
                </Text>
                <Text semiBold>pièces</Text>
              </View>

              {/* Info notice banner */}
              <View flexDirection="row" gap={8} style={styles.infoRow} alignItems="flex-start">
                <CustomIcon name="clock" size={16} tintColor={Colors.noticeUnread} />
                <Text type="small" color={Colors.grayMidDark} style={styles.infoText}>
                  Les demandes de prix sont ouvertes de 8h à 18h, toute demande
                  envoyée après 18h sera satisfaite à 10h le jour ouvrable
                  suivant.
                </Text>
              </View>
            </View>

            {/* Add details section */}
            <TitleBlockComponent titleBlock="Ajouter des détails" />
            <View style={styles.imageContainer}>
              <ImageInputList />
            </View>
            <TextInput
              multiline
              label="Ajouter une note"
              placeholder="La voiture ne fonctionne pas bien..."
              inputStyle={styles.noteInput}
              value={note}
              onChangeText={setNote}
            />
          </>
        )}

        {/* Active requests section — always visible */}
        <View style={styles.activeRequestsSection}>
          <TitleBlockComponent
            titleBlock="Vos requêtes actives"
            seeAllPress={() => {}}
          />
          {dataRequests.map((item) => (
            <ItemRequestComponent
              key={item.id}
              item={item}
              onPress={() =>
                router.push(("/(client)/requests/" + item.id) as Href)
              }
            />
          ))}
        </View>

        {/* Bottom spacer so sticky CTA doesn't cover last item */}
        <View style={styles.bottomSpacer} />
      </Screen>

      {/* ── Sticky send CTA ── */}
      <View style={styles.sendBar}>
        {submitError ? (
          <Text type="small" color={Colors.error} center>
            {t("Une erreur est survenue. Veuillez réessayer.")}
          </Text>
        ) : null}
        <Button
          title="Vérifier et envoyer la liste"
          iconType="custom"
          rightIcon="send"
          onPress={handleVerifyAndSend}
          disabled={submitting || isEmpty}
        />
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  listRef: {
    fontSize: 26,
    marginTop: 24,
    marginBottom: 24,
  },
  itemCard: {
    minHeight: 104,
  },
  itemsContainer: {
    marginBottom: 24,
  },
  totalRow: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  infoRow: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
  },
  imageContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
  noteInput: {
    minHeight: 100,
    backgroundColor: Colors.backgroundGray,
    marginBottom: 24,
    borderWidth: 0,
    paddingHorizontal: 10,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  activeRequestsSection: {
    marginTop: 32,
  },
  bottomSpacer: {
    height: 90,
  },
  sendBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: Colors.white,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 8,
  },
});
